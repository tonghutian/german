(function () {
  'use strict';

  // Keep autoplay completely separate from pointer/mouse events.
  // Browser policy: autoplay starts after a user gesture (opening Study or changing card).
  let lastCardSignature = '';
  let autoplayTimer = null;
  let observerTimer = null;

  function getStudy() { return document.getElementById('view-study'); }

  function getCardSignature() {
    const scope = getStudy();
    if (!scope) return '';
    const card = scope.querySelector('.flashcard, .card, [class*="flashcard"]') || scope;
    return (card.innerText || '').slice(0, 500) + '|' + (card.querySelector('audio')?.src || '');
  }

  function playCardAudio() {
    const scope = getStudy();
    if (!scope) return;
    const media = scope.querySelector('audio,video');
    if (!media || !(media.src || media.currentSrc)) return;
    try { media.currentTime = 0; } catch (e) {}
    const p = media.play();
    if (p && p.catch) p.catch(function () {});
  }

  function scheduleAutoplay(force) {
    clearTimeout(autoplayTimer);
    autoplayTimer = setTimeout(function () {
      const sig = getCardSignature();
      if (force || (sig && sig !== lastCardSignature)) {
        lastCardSignature = sig;
        playCardAudio();
      }
    }, 150);
  }

  // Only these explicit user actions can trigger autoplay.
  document.addEventListener('click', function (e) {
    const target = e.target;
    if (!target || !target.closest) return;

    const studyTab = target.closest('button[data-tab="study"]');
    if (studyTab) {
      lastCardSignature = '';
      scheduleAutoplay(true);
      return;
    }

    // Card navigation controls only — NEVER mouseenter/mousemove/hover.
    if (target.closest('#view-study .play-btn')) return;
    if (target.closest('#view-study button')) {
      scheduleAutoplay(false);
    }
  }, false);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') scheduleAutoplay(false);
  }, false);

  // Watch for actual card replacement, but debounce it and never react to attributes/hover.
  function watchStudy() {
    const study = getStudy();
    if (!study || study.dataset.audioWatcherInstalled) return;
    study.dataset.audioWatcherInstalled = '1';
    const observer = new MutationObserver(function (mutations) {
      const meaningful = mutations.some(function (m) {
        return m.type === 'childList' && (m.addedNodes.length || m.removedNodes.length);
      });
      if (!meaningful) return;
      clearTimeout(observerTimer);
      observerTimer = setTimeout(function () {
        const sig = getCardSignature();
        if (sig && sig !== lastCardSignature) {
          lastCardSignature = sig;
          playCardAudio();
        }
      }, 120);
    });
    observer.observe(study, { childList: true, subtree: true });
  }

  // Browser storage manager.
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function(c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  async function refreshStorage() {
    const list = document.getElementById('storageList');
    if (!list) return;
    const rows = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      let value = '';
      try { value = localStorage.getItem(key) || ''; } catch (e) {}
      rows.push({type:'LocalStorage', name:key, size:value.length});
    }
    if (window.indexedDB && indexedDB.databases) {
      try {
        const dbs = await indexedDB.databases();
        dbs.forEach(function(db) { if (db.name) rows.push({type:'IndexedDB', name:db.name}); });
      } catch (e) {}
    }
    if (!rows.length) {
      list.innerHTML = '<div class="storage-empty">No browser-stored data found.</div>';
      return;
    }
    list.innerHTML = rows.map(function(r) {
      const attr = encodeURIComponent(r.name);
      const meta = r.type + (r.size == null ? '' : ' · ' + r.size.toLocaleString() + ' characters');
      const action = r.type === 'LocalStorage'
        ? '<button type="button" class="btn ghost small" data-storage-local="'+attr+'">Delete</button>'
        : '<button type="button" class="btn ghost small" data-storage-db="'+attr+'">Delete DB</button>';
      return '<div class="storage-row"><div><div class="storage-name">'+esc(r.name)+'</div><div class="storage-meta">'+esc(meta)+'</div></div>'+action+'</div>';
    }).join('');
  }

  function mountStorage() {
    if (document.getElementById('browserStorageManager')) { refreshStorage(); return; }
    const host = document.querySelector('#view-import .divider') || document.querySelector('#view-import');
    if (!host) return setTimeout(mountStorage, 500);
    const box = document.createElement('div');
    box.id = 'browserStorageManager';
    box.innerHTML = '<div class="browser-storage-panel"><div class="browser-storage-head"><div><h3 style="font-family:Fraunces,serif;font-size:17px;margin:0 0 3px">Browser storage</h3><div class="hint" style="margin:0">Manually remove data saved in this browser. This does not delete files from your computer.</div></div><button type="button" class="btn ghost small" id="refreshStorageBtn">Refresh</button></div><div class="storage-list" id="storageList"><div class="storage-empty">Loading…</div></div><div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn small" id="clearLocalStorageBtn">Clear local browser data</button><button type="button" class="btn ghost small" id="clearIndexedDbBtn">Clear IndexedDB databases</button></div></div>';
    host.parentNode.insertBefore(box, host);
    document.getElementById('refreshStorageBtn').addEventListener('click', refreshStorage);
    document.getElementById('clearLocalStorageBtn').addEventListener('click', function() {
      if (confirm('Clear ALL localStorage data for this website? Your saved deck may be removed.')) {
        localStorage.clear(); refreshStorage();
      }
    });
    document.getElementById('clearIndexedDbBtn').addEventListener('click', async function() {
      if (!indexedDB.databases || !confirm('Clear ALL IndexedDB databases for this website? Imported audio/data may be removed.')) return;
      try {
        const dbs = await indexedDB.databases();
        dbs.forEach(function(db) { if (db.name) indexedDB.deleteDatabase(db.name); });
      } catch (e) {}
      setTimeout(refreshStorage, 500);
    });
  }

  document.addEventListener('click', function(e) {
    const local = e.target.closest && e.target.closest('[data-storage-local]');
    if (local) {
      const key = decodeURIComponent(local.dataset.storageLocal);
      if (confirm('Delete browser data for “'+key+'”?')) { localStorage.removeItem(key); refreshStorage(); }
      return;
    }
    const db = e.target.closest && e.target.closest('[data-storage-db]');
    if (db) {
      const key = decodeURIComponent(db.dataset.storageDb);
      if (confirm('Delete IndexedDB database “'+key+'”? This can remove imported audio/data.')) {
        indexedDB.deleteDatabase(key); setTimeout(refreshStorage, 300);
      }
    }
  }, false);

  function addStyles() {
    if (document.getElementById('browser-storage-style')) return;
    const st = document.createElement('style');
    st.id = 'browser-storage-style';
    st.textContent = '.browser-storage-panel{margin:18px 0 0;border-top:1px solid var(--line);padding-top:18px}.browser-storage-head{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}.storage-list{margin-top:10px;border:1px solid var(--line);border-radius:5px;background:#fffdf8;overflow:hidden}.storage-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 11px;border-bottom:1px solid #ecdfc4;font-size:12px}.storage-row:last-child{border-bottom:0}.storage-name{font-weight:600;overflow-wrap:anywhere}.storage-meta{color:var(--ink-soft);font-size:11px;margin-top:2px}.storage-empty{padding:12px;color:var(--ink-soft);font-size:12px;text-align:center}';
    document.head.appendChild(st);
  }

  function init() {
    addStyles();
    mountStorage();
    watchStudy();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
