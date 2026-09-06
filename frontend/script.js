'use strict';

/* ═══ CONFIG (Relative API Paths for Vercel Deployment) ═══ */
const BASE_API = '/api';

/* ═══ STATE MANAGEMENT ═══ */
let allFiles     = [];     
let activeFolder = 'all';
let pendingKey   = null;

/* ═══ PANEL ROUTING ═══ */
function goPanel(name, el) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('on'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('p-' + name).classList.add('on');
  el.classList.add('active');
  if (name === 'files') loadFiles();
}

/* ═══ UTILITIES & HELPERS ═══ */
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function ext(key)   { return (key.split('.').pop() || '').toLowerCase(); }
function fname(key) { return key.split('/').pop(); }

function chipType(key) {
  const e = ext(key);
  if (['jpg','jpeg','png','gif','webp','svg','bmp','ico'].includes(e)) return ['img', 'IMG'];
  if (e === 'pdf') return ['pdf', 'PDF'];
  return ['other', ext(key).toUpperCase().slice(0,4) || 'FILE'];
}

function fsize(b) {
  if (!b && b !== 0) return '';
  if (b < 1024)       return b + ' B';
  if (b < 1048576)    return (b/1024).toFixed(1) + ' KB';
  return (b/1048576).toFixed(1) + ' MB';
}

/* ═══ TOAST NOTIFICATIONS ═══ */
function toast(msg, type = 'ok') {
  const icons = {
    ok:  '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>',
    err: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    inf: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
  };
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML = (icons[type] || '') + esc(msg);
  document.getElementById('tz').appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('on')));
  setTimeout(() => { el.classList.remove('on'); setTimeout(() => el.remove(), 400); }, 4000);
}

/* ═══ DRAG & DROP EVENT HANDLERS ═══ */
function dzOver(e) { e.preventDefault(); document.getElementById('dz').classList.add('over'); }
function dzLeave()  { document.getElementById('dz').classList.remove('over'); }
function dzDrop(e)  { e.preventDefault(); dzLeave(); handleFiles(e.dataTransfer.files); }

/* ═══ FILE VALIDATION & UPLOAD WORKFLOW ═══ */
function handleFiles(files) {
  if (!files || !files.length) return;
  const fileArray = Array.from(files);

  const MAX_BYTES = 50 * 1024 * 1024; // 50MB Limit
  for (const f of fileArray) {
    if (f.size > MAX_BYTES) {
      toast(`File "${f.name}" exceeds 50MB limit!`, 'err');
      return;
    }
  }

  fileArray.forEach(uploadOne);
  document.getElementById('fi').value = '';
}

function uploadOne(file) {
  const id   = 'u' + Date.now() + Math.random().toString(36).slice(2,5);
  const [ct, label] = chipType(file.name);

  const row = document.createElement('div');
  row.className = 'urow'; row.id = id;
  row.innerHTML = `
    <div class="ftype-chip ftype-${ct}">${label}</div>
    <div class="umeta">
      <div class="uname">${esc(file.name)}</div>
      <div class="usize">${fsize(file.size)}</div>
    </div>
    <div class="uspin" id="sp-${id}"></div>
    <span class="ust uploading" id="st-${id}">Uploading…</span>
    <div style="width:100%;grid-column:1/-1;display:none" id="pb-wrap-${id}">
      <div class="prog-track"><div class="prog-fill" id="pb-${id}"></div></div>
    </div>`;
  document.getElementById('uq').prepend(row);

  const pbWrap = document.getElementById('pb-wrap-' + id);
  pbWrap.style.display = 'block';
  row.style.flexWrap = 'wrap';

  let pct = 0;
  const tick = setInterval(() => {
    pct += Math.random() * 16 + 4;
    if (pct >= 90) { clearInterval(tick); pct = 90; }
    document.getElementById('pb-' + id).style.width = pct + '%';
  }, 170);

  const fd = new FormData();
  fd.append('file', file);

  fetch(BASE_API + '/upload', { method: 'POST', body: fd })
    .then(async res => {
      clearInterval(tick);
      const sp = document.getElementById('sp-' + id);
      const st = document.getElementById('st-' + id);
      const pb = document.getElementById('pb-' + id);
      pb.style.width = '100%';
      if (sp) sp.style.display = 'none';

      if (res.ok) {
        pb.className = 'prog-fill done';
        st.textContent = '✓ Uploaded'; st.className = 'ust done';
        toast(file.name + ' uploaded to Amazon S3!', 'ok');
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || ('HTTP ' + res.status));
      }
    })
    .catch(err => {
      clearInterval(tick);
      const sp = document.getElementById('sp-' + id);
      const st = document.getElementById('st-' + id);
      const pb = document.getElementById('pb-' + id);
      pb.style.width = '100%'; pb.className = 'prog-fill err';
      if (sp) sp.style.display = 'none';
      st.textContent = '✗ Failed'; st.className = 'ust err';
      toast('Upload failed: ' + err.message, 'err');
    });
}

/* ═══ LIST FILES WORKFLOW ═══ */
async function loadFiles() {
  const box = document.getElementById('fileBox');
  const cnt = document.getElementById('fcount');
  const btn = document.getElementById('refBtn');

  box.innerHTML = `<div class="fload"><div class="uspin"></div>Fetching objects from S3…</div>`;
  btn.classList.add('spin');
  cnt.textContent = 'Loading…';

  try {
    const res = await fetch(BASE_API + '/files');
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || ('Server returned ' + res.status));
    }

    const data = await res.json();
    allFiles = Array.isArray(data) ? data.map(item => typeof item === 'string' ? item : item.key) : [];

    btn.classList.remove('spin');
    updateSidebar(allFiles.length);
    renderFiles();

  } catch (err) {
    btn.classList.remove('spin');
    cnt.textContent = 'Error loading files';
    box.innerHTML = `
      <div class="fstate">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Could not load S3 files —<br><strong>${esc(err.message)}</strong>
      </div>`;
    toast('Failed to load: ' + err.message, 'err');
  }
}

function renderFiles() {
  const box = document.getElementById('fileBox');
  const cnt = document.getElementById('fcount');

  const filtered = activeFolder === 'all'
    ? allFiles
    : allFiles.filter(k => k.startsWith(activeFolder + '/'));

  cnt.textContent = `${allFiles.length} total · ${filtered.length} in view`;
  setBadge(allFiles.length);

  if (!filtered.length) {
    box.innerHTML = `
      <div class="fstate">
        <svg viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        ${allFiles.length ? 'No files in this folder' : 'Your Amazon S3 bucket is empty'}<br>
        <strong>${allFiles.length ? 'Switch to All Files' : 'Upload some files to get started'}</strong>
      </div>`;
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'file-grid';

  filtered.forEach(key => {
    const [ct, label] = chipType(key);
    const name = fname(key);
    const row = document.createElement('div');
    row.className = 'frow'; row.id = 'row-' + btoa(key).replace(/[^a-z0-9]/gi,'');
    row.innerHTML = `
      <div class="ftype-chip ftype-${ct}">${label}</div>
      <div class="frow-meta">
        <div class="frow-name" title="${esc(name)}">${esc(name)}</div>
        <div class="frow-path">${esc(key)}</div>
      </div>
      <div class="frow-acts">
        <button class="fact dl" onclick="window.open('${BASE_API}/download/${esc(key)}')">
          <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download
        </button>
        <button class="fact del" onclick="openDelOv('${esc(key)}')">
          <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
          Delete
        </button>
      </div>`;
    grid.appendChild(row);
  });

  box.innerHTML = '';
  box.appendChild(grid);
}

function filterFolder(folder, btn) {
  activeFolder = folder;
  document.querySelectorAll('.ftab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  if (allFiles.length) renderFiles();
}

function setBadge(n) {
  const b = document.getElementById('nb');
  b.textContent = n;
  b.classList.toggle('on', n > 0);
}

function updateSidebar(n) {
  setBadge(n);
  document.getElementById('swStat').textContent = n;
  document.getElementById('swSub').textContent = n === 1 ? '1 object stored' : `${n} objects stored`;
  document.getElementById('swFill').style.width = Math.min(n * 5, 100) + '%';
}

/* ═══ DELETE OBJECT WORKFLOW ═══ */
function openDelOv(key) {
  pendingKey = key;
  document.getElementById('mFile').textContent = key;
  document.getElementById('delOv').classList.add('on');
}
function closeDelOv() {
  pendingKey = null;
  document.getElementById('delOv').classList.remove('on');
}

async function doDelete() {
  if (!pendingKey) return;
  const key = pendingKey;
  closeDelOv();

  try {
    const res = await fetch(`${BASE_API}/delete/${key}`, { method: 'DELETE' });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || ('HTTP ' + res.status));
    }

    allFiles = allFiles.filter(k => k !== key);
    updateSidebar(allFiles.length);

    const rowId = 'row-' + btoa(key).replace(/[^a-z0-9]/gi,'');
    const row = document.getElementById(rowId);
    if (row) {
      row.style.transition = 'opacity .28s, transform .28s';
      row.style.opacity = '0'; row.style.transform = 'translateX(18px)';
      setTimeout(() => renderFiles(), 300);
    } else {
      renderFiles();
    }

    toast(fname(key) + ' deleted from S3', 'ok');
  } catch (err) {
    toast('Delete failed: ' + err.message, 'err');
  }
}

/* ═══ DOWNLOAD OBJECT WORKFLOW ═══ */
function doDownload() {
  const name = document.getElementById('dlIn').value.trim();
  if (!name) { toast('Please enter a valid file path', 'inf'); return; }
  window.open(`${BASE_API}/download/${name}`);
}

/* ═══ EVENT BINDINGS ═══ */
document.getElementById('delOv').addEventListener('click', e => {
  if (e.target === document.getElementById('delOv')) closeDelOv();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDelOv(); });
