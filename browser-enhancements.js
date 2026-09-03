(function () {
  'use strict';

  // IMPORTANT: the main app already has the correct audio implementation:
  // audioMap + findAudioForSong() + playSnippet() + autoPlayAudio.
  // Do not create a second audio player here. The imported MP3s are Object URLs
  // held by the main app, so there is no <audio> element for this helper to find.
  // Leaving autoplay entirely to the main app also avoids hover/mouse re-renders.

  function esc(s) {
    return String(s).replace(/[&<>\"']/g, function(c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c];
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
      rows.push({ type: 'Saved browser data', name: key, size: value.length });
    }

    if (window.indexedDB && indexedDB.databases) {
      try {
        const dbs = await indexedDB.databases();
        dbs.forEach(function(db) {
          if (db.name) rows.push({ type: 'IndexedDB', name: db.name });
        });
      } catch (e) {}
    }

    if (!rows.length) {
      list.innerHTML = '<div class="storage-empty">No saved browser data found.</div>';
      return;
    }

    list.innerHTML = rows.map(function(r) {
      const attr = encodeURIComponent(r.name);
      const meta = r.type + (r.size == null ? '' : ' · ' + r.size.toLocaleString() + ' characters');
      const action = r.type === 'IndexedDB'
        ? '<button type="button" class="btn ghost small" data-storage-db="' + attr + '">Delete</button>'
        : '<button type="button" class="btn ghost small" data-storage-local="' + attr + '">Delete</button>';
      return '<div class="storage-row"><div><div class="storage-name">' + esc(r.name) + '</div><div class="storage-meta">' + esc(meta) + '</div></div>' + action + '</div>';
    }).join('');
  }

  function mountStorage() {
    if (document.getElementById('browserStorageManager')) {
      refreshStorage();
      return;
    }

    const view = document.getElementById('view-import');
    if (!view) return setTimeout(mountStorage, 500);

    const box = document.createElement('div');
    box.id = 'browserStorageManager';
    box.innerHTML = '<div class="browser-storage-panel">' +
      '<div class="browser-storage-head">' +
        '<div><h3 style="font-family:Fraunces,serif;font-size:17px;margin:0 0 3px">Browser storage</h3>' +
        '<div class="hint" style="margin:0">Remove saved data from this website in this browser. Imported MP3 files are temporary and are not stored after a page refresh.</div></div>' +
        '<button type="button" class="btn ghost small" id="refreshStorageBtn">Refresh</button>' +
      '</div>' +
      '<div class="storage-list" id="storageList"><div class="storage-empty">Loading…</div></div>' +
      '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">' +
        '<button type="button" class="btn small" id="clearLocalStorageBtn">Clear all saved browser data</button>' +
        '<button type="button" class="btn ghost small" id="clearIndexedDbBtn">Clear IndexedDB data</button>' +
      '</div>' +
    '</div>';

    view.appendChild(box);

    document.getElementById('refreshStorageBtn').addEventListener('click', refreshStorage);

    document.getElementById('clearLocalStorageBtn').addEventListener('click', function() {
      if (confirm('Clear ALL saved data for this website in this browser? Your saved cards and progress will be removed.')) {
        localStorage.clear();
        refreshStorage();
      }
    });

    document.getElementById('clearIndexedDbBtn').addEventListener('click', async function() {
      if (!indexedDB.databases || !confirm('Delete ALL IndexedDB data for this website?')) return;
      try {
        const dbs = await indexedDB.databases();
        await Promise.all(dbs.filter(db => db.name).map(db => new Promise(resolve => {
          const req = indexedDB.deleteDatabase(db.name);
          req.onsuccess = req.onerror = req.onblocked = () => resolve();
        })));
      } catch (e) {}
      setTimeout(refreshStorage, 300);
    });
  }

  document.addEventListener('click', function(e) {
    const local = e.target.closest && e.target.closest('[data-storage-local]');
    if (local) {
      const key = decodeURIComponent(local.dataset.storageLocal);
      if (confirm('Delete saved browser data for “' + key + '”?')) {
        localStorage.removeItem(key);
        refreshStorage();
      }
      return;
    }

    const db = e.target.closest && e.target.closest('[data-storage-db]');
    if (db) {
      const key = decodeURIComponent(db.dataset.storageDb);
      if (confirm('Delete IndexedDB data “' + key + '”?')) {
        const req = indexedDB.deleteDatabase(key);
        req.onsuccess = req.onerror = req.onblocked = function() { refreshStorage(); };
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
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
