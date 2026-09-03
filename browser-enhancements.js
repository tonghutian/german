(function () {
  'use strict';
  function playCardAudio() {
    const scope = document.querySelector('#view-study') || document;
    const media = scope.querySelectorAll('audio,video');
    for (const el of media) {
      if (el.src || el.currentSrc) {
        try { el.currentTime = 0; } catch (e) {}
        const p = el.play();
        if (p && p.catch) p.catch(function () {});
        return true;
      }
    }
    const btn = scope.querySelector('.play-btn');
    if (btn && !btn.disabled) { try { btn.click(); return true; } catch (e) {} }
    return false;
  }
  let timer;
  function autoplay() { clearTimeout(timer); timer = setTimeout(playCardAudio, 100); }
  document.addEventListener('click', function (e) {
    if (e.target.closest('#view-study') || (e.target.closest('nav.tabs') && e.target.closest('button[data-tab="study"]'))) autoplay();
  }, true);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === ' ') autoplay();
  }, true);
  const study = document.getElementById('view-study');
  if (study) new MutationObserver(autoplay).observe(study, {childList:true,subtree:true,attributes:true});

  function esc(s) { return String(s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  async function refreshStorage() {
    const list = document.getElementById('storageList');
    if (!list) return;
    const rows = [];
    for (let i=0; i<localStorage.length; i++) {
      const key = localStorage.key(i); let value = '';
      try { value = localStorage.getItem(key) || ''; } catch(e) {}
      rows.push({type:'LocalStorage',name:key,size:value.length});
    }
    if (window.indexedDB && indexedDB.databases) {
      try { const dbs = await indexedDB.databases(); dbs.forEach(db => { if (db.name) rows.push({type:'IndexedDB',name:db.name}); }); } catch(e) {}
    }
    if (!rows.length) { list.innerHTML = '<div class="storage-empty">No browser-stored data found.</div>'; return; }
    list.innerHTML = rows.map(r => {
      const attr = encodeURIComponent(r.name);
      const meta = r.type + (r.size == null ? '' : ' · ' + r.size.toLocaleString() + ' characters');
      const action = r.type === 'LocalStorage' ? '<button class="btn ghost small" data-storage-local="'+attr+'">Delete</button>' : '<button class="btn ghost small" data-storage-db="'+attr+'">Delete DB</button>';
      return '<div class="storage-row"><div><div class="storage-name">'+esc(r.name)+'</div><div class="storage-meta">'+esc(meta)+'</div></div>'+action+'</div>';
    }).join('');
  }
  function mountStorage() {
    if (document.getElementById('browserStorageManager')) { refreshStorage(); return; }
    const host = document.querySelector('#view-import .divider') || document.querySelector('#view-import');
    if (!host) return setTimeout(mountStorage, 300);
    const box = document.createElement('div');
    box.id = 'browserStorageManager';
    box.innerHTML = '<div class="browser-storage-panel"><div class="browser-storage-head"><div><h3 style="font-family:Fraunces,serif;font-size:17px;margin:0 0 3px">Browser storage</h3><div class="hint" style="margin:0">Manually remove data saved in this browser. This does not delete files from your computer.</div></div><button class="btn ghost small" id="refreshStorageBtn">Refresh</button></div><div class="storage-list" id="storageList"><div class="storage-empty">Loading…</div></div><div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn small" id="clearLocalStorageBtn">Clear local browser data</button><button class="btn ghost small" id="clearIndexedDbBtn">Clear IndexedDB databases</button></div></div>';
    host.parentNode.insertBefore(box, host);
    document.getElementById('refreshStorageBtn').addEventListener('click', refreshStorage);
    document.getElementById('clearLocalStorageBtn').addEventListener('click', function(){ if(confirm('Clear ALL localStorage data for this website? Your saved deck may be removed.')) { localStorage.clear(); refreshStorage(); } });
    document.getElementById('clearIndexedDbBtn').addEventListener('click', async function(){ if(!indexedDB.databases || !confirm('Clear ALL IndexedDB databases for this website? Imported audio/data may be removed.')) return; const dbs=await indexedDB.databases(); dbs.forEach(db=>db.name&&indexedDB.deleteDatabase(db.name)); setTimeout(refreshStorage,500); });
    refreshStorage();
  }
  document.addEventListener('click', function(e){
    const l=e.target.closest('[data-storage-local]');
    if(l){ const k=decodeURIComponent(l.dataset.storageLocal); if(confirm('Delete browser data for “'+k+'”?')){localStorage.removeItem(k);refreshStorage();} }
    const d=e.target.closest('[data-storage-db]');
    if(d){ const k=decodeURIComponent(d.dataset.storageDb); if(confirm('Delete IndexedDB database “'+k+'”? This can remove imported audio/data.')){indexedDB.deleteDatabase(k);setTimeout(refreshStorage,300);} }
  });
  function addStyles(){
    if(document.getElementById('browser-storage-style')) return;
    const st=document.createElement('style'); st.id='browser-storage-style'; st.textContent='.browser-storage-panel{margin:18px 0 0;border-top:1px solid var(--line);padding-top:18px}.browser-storage-head{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}.storage-list{margin-top:10px;border:1px solid var(--line);border-radius:5px;background:#fffdf8;overflow:hidden}.storage-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 11px;border-bottom:1px solid #ecdfc4;font-size:12px}.storage-row:last-child{border-bottom:0}.storage-name{font-weight:600;overflow-wrap:anywhere}.storage-meta{color:var(--ink-soft);font-size:11px;margin-top:2px}.storage-empty{padding:12px;color:var(--ink-soft);font-size:12px;text-align:center}'; document.head.appendChild(st);
  }
  function init(){ addStyles(); mountStorage(); autoplay(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
