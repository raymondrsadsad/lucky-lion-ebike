/* staff.js — staff portal: users, scheduled repairs, create user. */
let ME = null;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// nt(): escape + wrap a proper noun (branch / model / brand name) so Google Translate won't mangle it
const nt = (s) => `<span translate="no">${esc(s)}</span>`;

/* ---------- #1: red asterisk on required fields (observer-driven) ---------- */
function markRequired(root = document) {
  root.querySelectorAll('label').forEach(label => {
    const ctrl = label.querySelector(':scope > input[required], :scope > select[required], :scope > textarea[required]');
    if (!ctrl || label.querySelector(':scope > .req-line')) return;
    const first = label.firstChild;
    if (!first || first.nodeType !== 3 || !first.textContent.trim()) return;
    const line = document.createElement('span');
    line.className = 'req-line';
    label.insertBefore(line, first);
    line.appendChild(first);
    const star = document.createElement('span');
    star.className = 'req'; star.textContent = ' *'; star.setAttribute('aria-hidden', 'true'); star.title = 'required';
    line.appendChild(star);
  });
}
let _reqObsTimer = null;
function startRequiredObserver() {
  markRequired();
  const obs = new MutationObserver(() => { clearTimeout(_reqObsTimer); _reqObsTimer = setTimeout(() => markRequired(), 80); });
  obs.observe(document.body, { childList: true, subtree: true });
}

/* ---------- #7: styled confirmation dialog (replaces native confirm) ---------- */
let _confirmHost = null;
function confirmAction(message, opts = {}) {
  const { title = 'Please confirm', confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false } = opts;
  return new Promise(resolve => {
    if (!_confirmHost) {
      _confirmHost = document.createElement('div');
      _confirmHost.className = 'modal-backdrop hidden confirm-backdrop';
      _confirmHost.innerHTML = `<div class="modal modal-sm" role="dialog" aria-modal="true">
        <h3 class="modal-title" id="confirmTitle"></h3>
        <p class="modal-note" id="confirmMsg"></p>
        <div class="confirm-actions">
          <button type="button" class="btn btn-ghost" id="confirmNo"></button>
          <button type="button" class="btn btn-primary" id="confirmYes"></button>
        </div></div>`;
      document.body.appendChild(_confirmHost);
    }
    const host = _confirmHost;
    host.querySelector('#confirmTitle').textContent = title;
    host.querySelector('#confirmMsg').textContent = message;
    const yes = host.querySelector('#confirmYes'), no = host.querySelector('#confirmNo');
    yes.textContent = confirmLabel; no.textContent = cancelLabel;
    yes.classList.toggle('btn-danger', !!danger);
    host.classList.remove('hidden'); document.body.style.overflow = 'hidden';
    const done = (val) => { host.classList.add('hidden'); document.body.style.overflow = ''; yes.onclick = no.onclick = host.onclick = null; resolve(val); };
    yes.onclick = () => done(true);
    no.onclick = () => done(false);
    host.onclick = (e) => { if (e.target === host) done(false); };
  });
}

// ---- fixed e-bike colour palette (single source of truth; A→Z, capitalized) ----
// Owner can tweak any swatch hex here; the same 13 choices back the poster, the Models
// colour editor, and the per-unit colour label. "Other…" keeps a free-text/custom escape.
const EBIKE_COLORS = [
  { name: 'Black', hex: '#111111' }, { name: 'Blue', hex: '#1f5fd0' }, { name: 'Brown', hex: '#7a4a1e' },
  { name: 'Gray', hex: '#808080' }, { name: 'Green', hex: '#1f9d3a' }, { name: 'Maroon', hex: '#800000' },
  { name: 'Orange', hex: '#f07d18' }, { name: 'Pink', hex: '#ff6fae' }, { name: 'Red', hex: '#d5202a' },
  { name: 'Silver', hex: '#c8ccd0' }, { name: 'Violet', hex: '#7a3fbf' }, { name: 'White', hex: '#ffffff' },
  { name: 'Yellow', hex: '#f4c518' },
];
const COLOR_OTHER = '__other__';
const colorHexOf = (name) => (EBIKE_COLORS.find(c => c.name.toLowerCase() === String(name || '').toLowerCase()) || {}).hex || null;
const isFixedColor = (name) => !!colorHexOf(name);
const colorNameOfHex = (hex) => (EBIKE_COLORS.find(c => c.hex.toLowerCase() === String(hex || '').toLowerCase()) || {}).name || '';
// <option>s for a colour <select>; selects the match (case-insensitive), else "Other…" for a
// non-blank custom value, else the (optional) leading placeholder when nothing is chosen yet.
function colorOptionsHtml(selectedName, otherLabel, placeholder) {
  const sel = String(selectedName || '').trim(), matched = isFixedColor(sel), blank = !sel;
  const head = placeholder ? `<option value=""${blank ? ' selected' : ''}>${esc(placeholder)}</option>` : '';
  const opts = EBIKE_COLORS.map(c =>
    `<option value="${c.name}"${matched && c.name.toLowerCase() === sel.toLowerCase() ? ' selected' : ''}>${c.name}</option>`).join('');
  const otherSel = !matched && !(placeholder && blank);   // Other only for a real custom value
  return head + opts + `<option value="${COLOR_OTHER}"${otherSel ? ' selected' : ''}>${esc(otherLabel || 'Other…')}</option>`;
}
const colorNameCanon = (nm) => (EBIKE_COLORS.find(c => c.name.toLowerCase() === String(nm || '').toLowerCase()) || {}).name || nm;
// swatch-hex a colour field is currently showing (fixed option, or the custom hex/CSS value)
function cfSwatchColor(scope) {
  const sel = scope.querySelector('.cf-select'); if (!sel) return '';
  if (sel.value === COLOR_OTHER) { const hx = scope.querySelector('.cf-hex'); if (hx) return hx.value; const cn = scope.querySelector('.cf-name'); return cn ? cn.value.trim() : ''; }
  return colorHexOf(sel.value) || sel.value;
}
// build a colour picker field: swatch + fixed-palette <select> + hidden "Other…" custom inputs.
// selName = current colour name; selHex = current swatch hex (variants); withHex adds a custom shade picker.
function colorLabelField(selName, selHex, withHex, placeholder) {
  const nm = String(selName || '').trim();
  const custom = !isFixedColor(nm) && nm !== '';           // a real "Other…" value (not just blank)
  const hex = /^#[0-9a-f]{6}$/i.test(selHex || '') ? selHex : (colorHexOf(nm) || '#1f6fd4');
  const swBg = nm === '' ? 'transparent' : (isFixedColor(nm) ? colorHexOf(nm) : (withHex ? esc(hex) : (nm || 'transparent')));
  const hexInput = withHex ? `<input class="cf-hex" name="customHex" type="color" value="${esc(hex)}" title="Custom shade" />` : '';
  return `<span class="cf-row">
    <span class="pc-swatch cf-swatch" style="background:${swBg}"></span>
    <select class="cf-select" name="colorChoice" aria-label="Colour">${colorOptionsHtml(nm, null, placeholder)}</select>
    <span class="cf-other"${custom ? '' : ' hidden'}>
      <input class="cf-name" name="customName" list="cssColorNames" value="${custom ? esc(nm) : ''}" placeholder="Colour name / #hex" />
      ${hexInput}
    </span>
  </span>`;
}
// resolve the colour a cf-field currently represents (fixed option name, or the custom text)
function cfColorValue(scope) {
  const sel = scope.querySelector('.cf-select');
  if (!sel) { const el = scope.querySelector('[name="color"]'); return el ? el.value.trim() : ''; }
  if (sel.value === COLOR_OTHER) { const cn = scope.querySelector('.cf-name'); return cn ? cn.value.trim() : ''; }
  return sel.value;
}
// point a cf-field at colour `name` (used when a variant is chosen)
function setColorField(scope, name) {
  const sel = scope.querySelector('.cf-select'); if (!sel) return;
  const nm = String(name || '').trim(), other = scope.querySelector('.cf-other');
  const hasBlank = [...sel.options].some(o => o.value === '');
  if (nm === '' && hasBlank) { sel.value = ''; if (other) other.hidden = true; }
  else if (isFixedColor(nm)) { sel.value = colorNameCanon(nm); if (other) other.hidden = true; }
  else { sel.value = COLOR_OTHER; if (other) { other.hidden = false; const cn = other.querySelector('.cf-name'); if (cn) cn.value = nm; } }
  const sw = scope.querySelector('.cf-swatch'); if (sw) sw.style.background = cfSwatchColor(scope) || 'transparent';
}
// delegated wiring for every cf-field (toggle "Other…" inputs + repaint swatch); call once
function wireColorFields() {
  const repaint = (scope) => { if (!scope) return; const sw = scope.querySelector('.cf-swatch'); if (sw) sw.style.background = cfSwatchColor(scope) || 'transparent'; };
  document.addEventListener('change', e => {
    const sel = e.target.closest && e.target.closest('.cf-select'); if (!sel) return;
    const scope = sel.closest('.cf-row'); const other = scope && scope.querySelector('.cf-other');
    if (other) { other.hidden = sel.value !== COLOR_OTHER; if (sel.value === COLOR_OTHER) { const cn = other.querySelector('.cf-name'); if (cn) cn.focus(); } }
    repaint(scope);
  });
  document.addEventListener('input', e => {
    const t = e.target.closest && (e.target.closest('.cf-hex') || e.target.closest('.cf-name'));
    if (t) repaint(t.closest('.cf-row'));
  });
}

// staff avatar — photo if set, otherwise an initial-letter placeholder circle
function avatarImg(u, cls) {
  const initial = ((u && (u.name || u.username)) || '?').trim().charAt(0).toUpperCase();
  return (u && u.avatarUrl)
    ? `<img class="avatar ${cls || ''}" src="${esc(u.avatarUrl)}" alt="${esc(u.name || u.username)}" />`
    : `<span class="avatar avatar-ph ${cls || ''}" aria-hidden="true">${esc(initial)}</span>`;
}

// the company's home branch info (main = Buhay na Tubig) from content.json, for poster + contact defaults
const homeBranchInfo = () => { const c = STORE.content || {}; return (c.branches && c.branches[c.mainBranch || 'main']) || {}; };

// ---- role + branch scoping helpers (staff = one branch; admin = oversees all) ----
const isAdmin = () => !!(ME && ME.role === 'admin');
const myBranch = () => (ME && ME.branch) || null;
// canonical userId -> user lookup (REP_USERS is filled with EVERY user by renderRepairs)
const userById = (id) => REP_USERS[id];
const branchOfUser = (id) => { const u = REP_USERS[id]; return u ? u.branch : null; };
// admin-only views (staff cannot open these; their drawer links are hidden too)
const ADMIN_ONLY_VIEWS = ['analytics', 'models', 'photos', 'settings'];
// which branch an oversight view is currently showing. null = all (admin default); staff = own branch.
let VIEW_BRANCH = null;

document.addEventListener('DOMContentLoaded', init);

async function init() {
  await API.init();
  await STORE.load();

  // guard: staff or admin only
  const me = await API.currentUser();
  if (!me || (me.role !== 'staff' && me.role !== 'admin')) { window.location.replace('index.html'); return; }
  // #8: a temporary-password account must set a new password before using the portal.
  if (me.mustChangePassword) { await forceStaffPasswordChange(me); return; }
  ME = me;
  // staff oversight views default to their own branch; admin defaults to "all"
  VIEW_BRANCH = isAdmin() ? null : myBranch();
  document.body.classList.toggle('is-admin', isAdmin());
  document.body.classList.toggle('is-staff', !isAdmin());
  // reflect the role in the browser tab + header wordmark (Admin vs Staff)
  const roleWord = isAdmin() ? 'Admin' : 'Staff';
  document.title = `Lucky Lion eBike — ${roleWord}`;
  const brandSmall = document.querySelector('.brand-text small');
  if (brandSmall) brandSmall.textContent = roleWord;
  const staffMenuName = $('#staffMenuName'); if (staffMenuName) staffMenuName.textContent = roleWord;
  $('#staffName').textContent = `Signed in as ${me.name || me.username}`;
  wireColorFields();   // delegated colour-picker behaviour for variants + unit forms
  // user/unit actions (delegated; survives re-renders)
  $('#usersList').addEventListener('click', async e => {
    const delU = e.target.closest('.del-user');
    const delE = e.target.closest('.del-ebike');
    const addE = e.target.closest('.add-ebike');
    const editBtn = e.target.closest('.unit-edit-btn');
    if (delU) {
      if (!(await confirmAction(`Delete "${delU.dataset.name}"? This removes the account and their repair records.`, { title: 'Delete account', confirmLabel: 'Delete', danger: true }))) return;
      delU.disabled = true;
      try { await API.deleteUser(delU.dataset.id); await renderUsers(); }
      catch (ex) { alert('Delete failed: ' + ex.message); delU.disabled = false; }
    } else if (delE) {
      if (!(await confirmAction('Remove this e-bike from the customer?', { title: 'Remove unit', confirmLabel: 'Remove', danger: true }))) return;
      delE.disabled = true;
      const det = delE.closest('details[data-user]');
      try { await API.removeUserEbike(delE.dataset.id); if (det) await refreshUnits(det.dataset.user); }
      catch (ex) { alert('Failed: ' + ex.message); delE.disabled = false; }
    } else if (addE) {
      const box = addE.closest('.add-unit');
      const detail = readUnitDetail(box);
      // the unit is handed over by the customer's branch → decrement that branch's stock
      const cust = CUSTOMERS.find(c => c.id === addE.dataset.user);
      detail.branch = (cust && cust.branch) || myBranch();
      const modelId = box.querySelector('.unit-model').value;
      if (!(await confirmAction('Add this e-bike to the customer?', { title: 'Add unit', confirmLabel: 'Add unit' }))) return;
      addE.disabled = true;
      try {
        await API.addUserEbike(addE.dataset.user, modelId, detail);
        await loadVariants(); await loadStockMeta(); await refreshUnits(addE.dataset.user);
        toast('Unit added.');
      }
      catch (ex) { alert('Failed: ' + ex.message); addE.disabled = false; }
    } else if (editBtn) {
      const form = e.target.closest('.unit-row-full').querySelector('.unit-edit-form');
      if (form) form.classList.toggle('hidden');
    }
  });
  // repopulate the colour dropdown (+ colour label) when a unit's model changes
  $('#usersList').addEventListener('change', e => {
    const modelSel = e.target.closest('.unit-model');
    if (modelSel) {
      const box = modelSel.closest('.add-unit');
      fillVariantSelect(box.querySelector('.unit-variant'), modelSel.value, null);
      const price = box.querySelector('.unit-price');            // prefill total price with the listed price
      if (price) price.value = listedPrice(modelSel.value) || '';
      return;
    }
    const varSel = e.target.closest('select[name="variantId"]');
    if (varSel) { const box = varSel.closest('.add-unit') || varSel.closest('.unit-edit-form'); autoColour(box, varSel); }
  });
  // save edited unit details
  $('#usersList').addEventListener('submit', async e => {
    const form = e.target.closest('.unit-edit-form');
    if (!form) return;
    e.preventDefault();
    if (!(await confirmAction('Save changes to this unit?', { title: 'Save unit', confirmLabel: 'Save changes' }))) return;
    const detail = readUnitDetail(form);
    const det = form.closest('details[data-user]');
    try {
      await API.updateUserEbike(form.dataset.id, { modelId: form.dataset.model, ...detail });
      if (det) await refreshUnits(det.dataset.user);
      toast('Unit details saved.');
    } catch (ex) { alert('Save failed: ' + ex.message); }
  });
  $('#logoutBtn').addEventListener('click', async () => { await API.logout(); window.location.href = 'index.html'; });
  wireStaffMenu(me);
  wireDrawer(me);

  await loadVariants();
  fillModelOptions();
  await renderUsers();
  await renderRepairs();
  wireCreate();
  await renderStorePhotos();
  wireStorePhotos();
  await renderSettings();
  wireSettings();
  await renderModels();
  wireAddModel();
  wireModelPhotoInput();
  wireNewModelPhotos();
  await loadStockMeta();
  await initPoster();

  renderDashboard();
  updateInboxBadgeCount();
  wireStaffNotifications();          // #16: notification bell
  refreshStaffNotifications();
  setInterval(() => { updateInboxBadgeCount(); refreshStaffNotifications(); }, 20000);   // keep badges fresh
  showView(viewFromHash(), false);
  startRequiredObserver();   // #1: red * on required fields
}

/* ---------- #8: blocking "set a new password" screen for staff/admin ---------- */
function forceStaffPasswordChange(me) {
  const host = document.createElement('div');
  host.className = 'modal-backdrop force-pw';
  host.innerHTML = `<div class="modal modal-sm" role="dialog" aria-modal="true">
    <h3 class="modal-title">🔒 Set a new password</h3>
    <p class="modal-note">Your account uses a temporary password. Please choose a new one to continue.</p>
    <form class="form" id="forcePwForm">
      <label>New password <input name="next" type="password" required minlength="4" autocomplete="new-password" /></label>
      <label>Confirm new password <input name="confirm" type="password" required minlength="4" autocomplete="new-password" /></label>
      <p class="form-error hidden" id="forcePwErr"></p>
      <button class="btn btn-primary full" type="submit">Save new password</button>
    </form></div>`;
  document.body.appendChild(host);
  document.body.style.overflow = 'hidden';
  const err = host.querySelector('#forcePwErr');
  host.querySelector('#forcePwForm').addEventListener('submit', async e => {
    e.preventDefault(); err.classList.add('hidden');
    const f = new FormData(e.target);
    if (f.get('next') !== f.get('confirm')) { err.textContent = 'The passwords do not match.'; err.classList.remove('hidden'); return; }
    try { await API.setNewPassword(me.id, f.get('next')); location.reload(); }
    catch (ex) { err.textContent = ex.message; err.classList.remove('hidden'); }
  });
}

/* ================= SIDE DRAWER + VIEW ROUTER =================
   One section is visible at a time; the burger opens a grouped menu. */
const VIEWS = ['dashboard', 'analytics', 'users', 'create', 'repairs', 'inbox', 'registry', 'models', 'photos', 'poster', 'settings'];
const viewFromHash = () => {
  const h = (location.hash || '').replace('#', '');
  return VIEWS.includes(h) ? h : 'dashboard';
};

function showView(view, push = true) {
  if (!VIEWS.includes(view)) view = 'dashboard';
  // staff can't open admin-only views (Models / Store Photos / Site Settings)
  if (!isAdmin() && ADMIN_ONLY_VIEWS.includes(view)) view = 'dashboard';
  $$('main .view').forEach(s => s.classList.toggle('is-active', s.id === view));
  $$('#drawerNav .drawer-link').forEach(a => a.classList.toggle('is-active', a.dataset.view === view));
  // pushState (not replaceState) so the browser Back button steps between portal views
  // instead of jumping straight out to the public page. hashchange handles Back/Forward.
  if (push && location.hash !== '#' + view) history.pushState(null, '', '#' + view);
  if (view !== 'inbox') { clearInterval(INBOX_POLL); INBOX_POLL = null; }
  if (view === 'dashboard') renderDashboard();
  if (view === 'analytics') renderAnalytics();
  if (view === 'registry') renderRegistry();
  if (view === 'inbox') renderInbox();
  window.scrollTo({ top: 0, behavior: 'auto' });
}

function openDrawer(open) {
  $('#staffDrawer').classList.toggle('open', open);
  $('#staffDrawer').setAttribute('aria-hidden', String(!open));
  $('#drawerScrim').classList.toggle('hidden', !open);
  $('#drawerBtn').setAttribute('aria-expanded', String(open));
  document.body.style.overflow = open ? 'hidden' : '';
}

function wireDrawer(me) {
  const name = me.name || me.username;
  $('#drawerName').textContent = name;
  const roleWord = isAdmin() ? 'Admin' : 'Staff';
  const branchBit = (!isAdmin() && me.branch) ? ` · ${branchShort(me.branch)}` : '';
  $('#drawerRole').textContent = me.memberId ? `${roleWord} · ${me.memberId}${branchBit}` : `${roleWord} account`;
  paintStaffAvatars(me);

  // Models / Store Photos / Site Settings are admin-only; hide those drawer links for staff.
  if (!isAdmin()) {
    ADMIN_ONLY_VIEWS.forEach(v => { const a = $(`#drawerNav .drawer-link[data-view="${v}"]`); if (a) a.classList.add('hidden'); });
  }
  // Relabel Create User → "Create User / Staff" for admins.
  const createLink = $('#drawerNav .drawer-link[data-view="create"]');
  if (createLink && isAdmin()) createLink.lastChild.textContent = 'Create User / Staff';

  $$('.view-back').forEach(b => b.addEventListener('click', () => showView('dashboard')));
  $('#drawerBtn').addEventListener('click', () => openDrawer(!$('#staffDrawer').classList.contains('open')));
  $('#drawerClose').addEventListener('click', () => openDrawer(false));
  $('#drawerScrim').addEventListener('click', () => openDrawer(false));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') openDrawer(false); });

  $$('#drawerNav .drawer-link[data-view]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    if (a.dataset.view === 'inbox') INBOX_OPEN = null;   // drawer → always show the thread list
    showView(a.dataset.view);
    openDrawer(false);
  }));
  $('#drawerViewSite').addEventListener('click', () => openDrawer(false));
  window.addEventListener('hashchange', () => showView(viewFromHash(), false));
}

// header + drawer avatars follow the signed-in staff member's photo
function paintStaffAvatars(me) {
  const initial = ((me.name || me.username) || '?').trim().charAt(0).toUpperCase();
  [['#staffAvatarBtn', ''], ['#drawerAvatar', 'avatar-lg']].forEach(([sel, cls]) => {
    const el = $(sel);
    if (!el) return;
    el.outerHTML = avatarImg(me, cls).replace('class="avatar', `id="${sel.slice(1)}" class="avatar`);
  });
}

/* ================= DASHBOARD ================= */
const dayName = d => d.toLocaleDateString('en-PH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const greetWord = h => h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
const initialOf = n => (String(n || '?').trim().charAt(0) || '?').toUpperCase();
// "2026-07-26" → "Sun, Jul 26" (+ "Today" / "Tomorrow" when it's close)
function niceDate(iso) {
  if (!iso) return 'No date';
  const t = today10();
  if (iso === t) return 'Today';
  const tm = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
  if (iso === tm) return 'Tomorrow';
  const d = new Date(iso + 'T00:00:00');
  return isNaN(d) ? iso : d.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });
}

function renderDashboard() {
  if (isAdmin()) { renderAdminDashboard(); return; }
  const host = $('#dashBody');
  if (!host) return;
  const now = new Date();
  // staff dashboard is scoped to their own branch
  const myB = myBranch();
  const mine = REPAIRS.filter(r => branchOfUser(r.userId) === myB);
  const scheduled = mine.filter(r => r.status !== 'done' && r.status !== 'cancelled');
  const overdue = scheduled.filter(r => r.date && r.date < today10());
  const todays = scheduled.filter(r => r.date === today10());
  const working = scheduled.filter(r => r.status === 'in-progress');
  const done = mine.filter(r => r.status === 'done');
  const earned = done.reduce((s, r) => s + (Number(r.cost) || 0), 0);
  const myCustomers = CUSTOMERS.filter(c => c.branch === myB);
  const myStaff = STAFFS.filter(s => s.branch === myB);
  const withBikes = myCustomers.filter(c => (EBIKES_BY_USER[c.id] || []).length).length;
  const upcoming = [...scheduled].sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999')).slice(0, 5);
  const recentDone = [...done].sort((a, b) => (b.completedAt || b.date || '').localeCompare(a.completedAt || a.date || '')).slice(0, 3);
  const themeLabel = (typeof THEMES !== 'undefined' && THEMES[SETTINGS.active_theme]) ? THEMES[SETTINGS.active_theme].label : 'Default';

  $('#dashHello').innerHTML = `${nt(branchName(myB))} — your branch at a glance.`;
  const badge = $('#navRepairCount');
  badge.textContent = scheduled.length;
  badge.classList.toggle('hidden', !scheduled.length);

  const tile = (view, icon, label, num, sub, tone) => `
    <button class="tile${tone ? ' tile-' + tone : ''}" data-go="${view}">
      <span class="t-icon">${icon}</span>
      <span class="t-num">${num}</span>
      <span class="t-label">${label}</span>
      ${sub ? `<span class="t-sub">${sub}</span>` : ''}
    </button>`;

  const repairLine = r => {
    const m = STORE.modelById(r.modelId);
    const u = REP_USERS[r.userId];
    const late = r.date && r.date < today10();
    const name = repNameOf(r.userId);
    return `<div class="rep-line${late ? ' is-late' : ''}">
      <span class="rl-ava">${esc(initialOf(name))}</span>
      <div class="rl-main">
        <strong>${esc(name)}</strong>
        <span class="rl-sub">${esc(m ? m.name : r.modelId)}${r.repairType ? ` · ${esc(r.repairType)}` : ''}</span>
      </div>
      <div class="rl-when">
        <strong class="${late ? 'is-late-txt' : ''}">${esc(niceDate(r.date))}</strong>
        <span class="rl-sub">${esc(r.timeSlot || '—')}</span>
      </div>
      <span class="rep-pill rep-${esc(late ? 'overdue-pill' : r.status)}">${esc(late ? 'overdue' : r.status)}</span>
      ${u && u.phone ? `<a class="rl-call" href="tel:${esc(u.phone)}" title="Call ${esc(name)}">📞</a>` : ''}
    </div>`;
  };

  const doneLine = r => {
    const m = STORE.modelById(r.modelId);
    const name = repNameOf(r.userId);
    const when = r.completedAt ? new Date(r.completedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : (r.date || '—');
    return `<div class="rep-line">
      <span class="rl-ava rl-done">✓</span>
      <div class="rl-main">
        <strong>${esc(name)}</strong>
        <span class="rl-sub">${esc(m ? m.name : r.modelId)}${r.repairType ? ` · ${esc(r.repairType)}` : ''}</span>
      </div>
      <div class="rl-when">
        <strong>${esc(when)}</strong>
        <span class="rl-sub">${r.cost ? esc(peso(r.cost)) : 'no charge'}</span>
      </div>
    </div>`;
  };

  const action = (view, icon, label) => `<button class="qa" data-go="${view}"><span class="qa-icon">${icon}</span>${label}</button>`;

  host.innerHTML = `
    <div class="dash-hero">
      ${avatarImg(ME || {}, 'avatar-lg')}
      <div class="dh-txt">
        <strong>${greetWord(now.getHours())}, ${esc(ME ? (ME.name || ME.username) : 'staff')}</strong>
        <span>${esc(dayName(now))}</span>
      </div>
      <div class="dh-chips">
        <span class="dh-chip">🎨 Theme: <strong>${esc(themeLabel)}</strong></span>
        ${primaryPhone() ? `<span class="dh-chip">📞 ${esc(primaryPhone())}</span>` : ''}
      </div>
    </div>

    ${overdue.length || todays.length ? `
      <div class="dash-alert${overdue.length ? ' is-bad' : ''}">
        <span class="da-icon">${overdue.length ? '⏰' : '📅'}</span>
        <div class="da-txt">
          <strong>${overdue.length ? `${overdue.length} repair${overdue.length === 1 ? ' is' : 's are'} past the booked date` : `${todays.length} repair${todays.length === 1 ? '' : 's'} booked for today`}</strong>
          <span>${overdue.length && todays.length ? `${todays.length} also booked for today.` : 'Tap to open the repair list.'}</span>
        </div>
        <button class="btn btn-primary btn-sm" data-go="repairs">Open repairs</button>
      </div>` : ''}

    <div class="tile-row">
      ${tile('repairs', '🛠️', 'Open repairs', scheduled.length, working.length ? `${working.length} in progress` : 'none in progress')}
      ${tile('repairs', '⏰', 'Overdue', overdue.length, overdue.length ? 'needs attention' : 'all on time', overdue.length ? 'bad' : '')}
      ${tile('repairs', '📅', 'Booked today', todays.length, now.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }))}
      ${tile('repairs', '✅', 'Completed', done.length, earned ? peso(earned) + ' logged' : 'no charges logged')}
      <button class="tile tile-inbox${INBOX_UNREAD ? ' has-unread' : ''}" data-go="inbox">
        <span class="tile-note" id="dashInboxDot"${INBOX_UNREAD ? '' : ' hidden'}>${INBOX_UNREAD > 99 ? '99+' : INBOX_UNREAD}</span>
        <span class="t-icon">💬</span>
        <span class="t-num" id="dashInboxNum">${INBOX_UNREAD}</span>
        <span class="t-label">Inbox</span>
        <span class="t-sub" id="dashInboxSub">${INBOX_UNREAD ? 'unread — tap to open' : 'all caught up'}</span>
      </button>
    </div>

    <div class="dash-cols">
      <div class="dash-main">
        <div class="dash-card">
        <div class="dc-head">
          <h3>Next repairs</h3>
          ${scheduled.length ? `<button class="btn btn-ghost btn-sm" data-go="repairs">See all ${scheduled.length}</button>` : ''}
        </div>
        <p class="dash-sub">${scheduled.length ? 'Soonest first — red means the booked date has passed.' : 'Nothing booked right now. 🎉'}</p>
        <div class="rep-lines">
          ${upcoming.map(repairLine).join('') || '<p class="dash-empty">No open repairs.</p>'}
        </div>
        </div>

      <div class="dash-card">
          <div class="dc-head">
            <h3>Recently completed</h3>
            ${done.length ? `<button class="btn btn-ghost btn-sm" data-go="repairs">Open history</button>` : ''}
          </div>
          <p class="dash-sub">${done.length ? `${done.length} finished repair${done.length === 1 ? '' : 's'}${earned ? ` · ${peso(earned)} logged` : ''}` : 'No completed repairs yet.'}</p>
          <div class="rep-lines">
            ${recentDone.map(doneLine).join('') || '<p class="dash-empty">Nothing here yet.</p>'}
          </div>
        </div>
      </div>

      <div class="dash-side">
        <div class="dash-card">
          <h3>Quick actions</h3>
          <div class="qa-grid">
            ${action('create', '➕', 'Create user')}
            ${action('repairs', '🛠️', 'Repairs')}
            ${action('inbox', '💬', 'Inbox')}
            ${action('registry', '📇', 'Registry')}
            ${action('poster', '🎨', 'Poster')}
            <a class="qa" href="index.html?preview=1" target="_blank" rel="noopener"><span class="qa-icon">🌐</span>View site ↗</a>
          </div>
        </div>

        <div class="dash-card">
          <h3>My branch</h3>
          <ul class="mini-list">
            <li data-go="users"><span>👥 Customers</span><strong>${myCustomers.length}</strong></li>
            <li data-go="users"><span>🚲 With an e-bike registered</span><strong>${withBikes}</strong></li>
            <li data-go="repairs"><span>🛠️ Open repairs</span><strong>${scheduled.length}</strong></li>
            <li data-go="registry"><span>🪪 Branch staff</span><strong>${myStaff.length}</strong></li>
          </ul>
        </div>
      </div>
    </div>`;

  $$('#dashBody [data-go]').forEach(b => b.addEventListener('click', e => {
    if (e.target.closest('a')) return;                      // let the tap-to-call link through
    showView(b.dataset.go);
  }));
}

// Open a view scoped to one branch (from the per-branch tables). Each column routes to its own page.
function navBranch(view, branch) {
  VIEW_BRANCH = branch;
  switch (view) {
    case 'users': USERS_BRANCH = branch; renderUsers(); break;
    case 'registry': REG_BRANCH = branch; break;                 // showView renders registry
    case 'repairs': REP_BRANCH = branch; paintRepairs(); break;
    case 'inbox': INBOX_BRANCH = branch; INBOX_OPEN = null; break; // showView renders inbox
  }
  showView(view);
}
// wire per-cell routing on a per-branch table (each cell has data-nav; row has data-branch)
function wireBranchTableNav(scopeSel) {
  $$(`${scopeSel} .admin-table tbody tr[data-branch]`).forEach(tr => tr.addEventListener('click', e => {
    const cell = e.target.closest('[data-nav]');
    navBranch(cell ? cell.dataset.nav : 'repairs', tr.dataset.branch);
  }));
}

/* ================= ADMIN DASHBOARD (company-wide, read-only oversight) ================= */
async function renderAdminDashboard() {
  const host = $('#dashBody');
  if (!host) return;
  const now = new Date();
  const t10 = today10();
  $('#dashHello').textContent = 'All branches at a glance.';

  // unread customer messages, per branch (best-effort)
  let msgs = [];
  try { msgs = await API.getAllMessages(); } catch { }
  const unreadByBranch = {};
  msgs.filter(m => m.sender === 'customer' && !m.read).forEach(m => {
    const br = branchOfUser(m.userId); unreadByBranch[br] = (unreadByBranch[br] || 0) + 1;
  });

  const active = REPAIRS.filter(r => r.status !== 'done' && r.status !== 'cancelled');
  const repairsTodayAll = REPAIRS.filter(r => r.date === t10);
  const doneAll = REPAIRS.filter(r => r.status === 'done');
  const cancelledAll = REPAIRS.filter(r => r.status === 'cancelled');
  const unreadAll = Object.values(unreadByBranch).reduce((a, b) => a + b, 0);

  const badge = $('#navRepairCount');
  if (badge) { badge.textContent = active.length; badge.classList.toggle('hidden', !active.length); }

  // per-branch rows (repairs + messages only)
  const rows = BRANCHES.map(b => {
    const k = b.key;
    const brRepairs = REPAIRS.filter(r => branchOfUser(r.userId) === k);
    return {
      key: k, name: b.name, short: b.short,
      customers: CUSTOMERS.filter(c => c.branch === k).length,
      open: brRepairs.filter(r => r.status !== 'done' && r.status !== 'cancelled').length,
      done: brRepairs.filter(r => r.status === 'done').length,
      cancelled: brRepairs.filter(r => r.status === 'cancelled').length,
      overdue: brRepairs.filter(r => r.status !== 'done' && r.status !== 'cancelled' && r.date && r.date < t10).length,
      unread: unreadByBranch[k] || 0
    };
  });
  const totalCustomers = CUSTOMERS.length;

  // KPI tile with an accent tone (icon sits in a tinted disc); admin tiles are non-clickable
  const tile = (icon, num, label, sub, tone) => `
    <div class="atile atile-${tone || 'ink'}">
      <span class="atile-ic">${icon}</span>
      <span class="atile-body"><span class="atile-num">${num}</span><span class="atile-label">${label}</span>${sub ? `<span class="atile-sub">${sub}</span>` : ''}</span>
    </div>`;

  const row = r => `
    <tr data-branch="${r.key}">
      <th scope="row" data-nav="users" title="Open ${esc(r.short)} customers">${esc(r.name)}</th>
      <td data-label="Customers" data-nav="users" title="Open customers">${r.customers}</td>
      <td data-label="Open" class="grp-start ${r.overdue ? 'is-warn' : ''}" data-nav="repairs" title="Open repairs">${r.open}${r.overdue ? ` <span class="mini-warn">(${r.overdue} overdue)</span>` : ''}</td>
      <td data-label="Done" class="ok-num" data-nav="repairs" title="Open repairs">${r.done}</td>
      <td data-label="Cancelled" class="muted-num" data-nav="repairs" title="Open repairs">${r.cancelled}</td>
      <td data-label="Unread" class="grp-start ${r.unread ? 'is-warn' : ''}" data-nav="inbox" title="Open inbox">${r.unread}</td>
    </tr>`;

  host.innerHTML = `<div class="admin-dash">
    <div class="dash-hero admin-hero">
      ${avatarImg(ME || {}, 'avatar-xl')}
      <div class="dh-txt">
        <span class="admin-eyebrow">Owner / Admin · read-only oversight</span>
        <strong>${greetWord(now.getHours())}, ${esc(ME ? (ME.name || ME.username) : 'admin')}</strong>
        <span>${esc(dayName(now))}</span>
      </div>
      <div class="dh-chips">
        <span class="dh-chip">🏢 ${BRANCHES.length} branches</span>
        <span class="dh-chip">👥 ${totalCustomers} customers</span>
        <span class="dh-chip">🛠️ ${active.length} pending repairs</span>
      </div>
      <button class="btn btn-primary btn-sm admin-hero-cta" data-go="analytics">📈 Analytics</button>
    </div>

    <div class="admin-tiles">
      ${tile('📅', repairsTodayAll.length, 'Repairs today', `${repairsTodayAll.filter(r => r.status === 'done').length} done`, 'blue')}
      ${tile('🛠️', active.length, 'Pending repairs', 'awaiting or in progress', 'amber')}
      ${tile('✅', doneAll.length, 'Completed', `${cancelledAll.length} cancelled`, 'green')}
      ${tile('💬', unreadAll, 'Unread messages', unreadAll ? 'needs a reply' : 'all caught up', unreadAll ? 'red' : 'ink')}
    </div>

    ${(() => { const overdueAll = active.filter(r => r.date && r.date < t10).length; return (overdueAll || unreadAll) ? `
      <div class="dash-alert${overdueAll ? ' is-bad' : ''}">
        <span class="da-icon">${overdueAll ? '⏰' : '🔔'}</span>
        <div class="da-txt">
          <strong>${[overdueAll ? `${overdueAll} overdue repair${overdueAll === 1 ? '' : 's'}` : '', unreadAll ? `${unreadAll} unread message${unreadAll === 1 ? '' : 's'}` : ''].filter(Boolean).join(' · ')}</strong>
          <span>Open Analytics for the full per-branch picture.</span>
        </div>
        <button class="btn btn-primary btn-sm" data-go="analytics">Open Analytics</button>
      </div>` : ''; })()}

    <div class="dash-card">
      <div class="dc-head"><h3>Per-branch summary</h3><button class="btn btn-ghost btn-sm" data-go="analytics">📈 Full analytics →</button></div>
      <p class="dash-sub">Tap a branch row to open it.</p>
      <div class="admin-table-wrap">
        <table class="admin-table admin-grouped">
          <thead>
            <tr class="grp">
              <th class="blank"></th><th class="blank"></th>
              <th class="grp-start" colspan="3">🛠️ Repairs</th>
              <th class="grp-start">💬</th>
            </tr>
            <tr>
              <th>Branch</th><th>Customers</th>
              <th class="grp-start" title="Repairs booked or in progress (not yet finished)">Open</th>
              <th title="Repairs finished">Done</th>
              <th title="Repairs that were cancelled">Cancelled</th>
              <th class="grp-start" title="Unread customer messages">Unread</th>
            </tr>
          </thead>
          <tbody>${rows.map(row).join('')}</tbody>
        </table>
      </div>
    </div>

    <div class="dash-card">
      <h3>Oversight</h3>
      <div class="qa-grid">
        <button class="qa" data-go="analytics"><span class="qa-icon">📈</span>Analytics</button>
        <button class="qa" data-go="users"><span class="qa-icon">👥</span>Users &amp; E-Bikes</button>
        <button class="qa" data-go="repairs"><span class="qa-icon">🛠️</span>Repairs</button>
        <button class="qa" data-go="inbox"><span class="qa-icon">💬</span>Inbox</button>
        <button class="qa" data-go="registry"><span class="qa-icon">📇</span>Registry</button>
        <button class="qa" data-go="models"><span class="qa-icon">🛵</span>Models</button>
        <button class="qa" data-go="poster"><span class="qa-icon">🎨</span>Poster</button>
        <button class="qa" data-go="settings"><span class="qa-icon">⚙️</span>Settings</button>
      </div>
    </div>
  </div>`;

  $$('#dashBody [data-go]').forEach(b => b.addEventListener('click', () => showView(b.dataset.go)));
  wireBranchTableNav('#dashBody');   // each column routes to its own page, scoped to that branch
}

/* ================= ADMIN ANALYTICS (deep per-branch performance) ================= */
let ANALYTICS_RANGE = '30';   // today | 7 | 30 | all
async function renderAnalytics() {
  const host = $('#analyticsBody'); if (!host) return;
  if (!isAdmin()) { host.innerHTML = '<p class="section-lead">Admins only.</p>'; return; }
  host.innerHTML = '<p class="section-lead">Loading…</p>';
  // refresh everything this view derives from
  await loadStockMeta();
  try { EBIKES_BY_USER = {}; (await API.getAllUserEbikes()).forEach(e => (EBIKES_BY_USER[e.user_id] ??= []).push(e)); } catch { }
  try { REPAIRS = await API.getRepairs(); } catch { }
  try { const us = await API.getUsers(); REP_USERS = {}; us.forEach(u => REP_USERS[u.id] = u); CUSTOMERS = us.filter(u => u.role === 'customer'); STAFFS = us.filter(u => u.role === 'staff'); } catch { }
  let msgs = []; try { msgs = await API.getAllMessages(); } catch { }

  const range = ANALYTICS_RANGE, start = rangeStart(range);
  const unreadByBranch = {};
  msgs.filter(m => m.sender === 'customer' && !m.read).forEach(m => { const b = branchOfUser(m.userId); unreadByBranch[b] = (unreadByBranch[b] || 0) + 1; });

  const rows = BRANCHES.map(b => {
    const k = b.key;
    const bReps = REPAIRS.filter(r => branchOfUser(r.userId) === k);
    return {
      key: k, name: b.name, short: b.short,
      customers: CUSTOMERS.filter(c => c.branch === k).length,
      today: bReps.filter(r => r.date === today10()).length,
      open: bReps.filter(r => r.status !== 'done' && r.status !== 'cancelled').length,
      done: bReps.filter(r => r.status === 'done' && inRangeDate(r.completedAt || r.date, start)).length,
      cancelled: bReps.filter(r => r.status === 'cancelled' && inRangeDate(r.date, start)).length,
      overdue: bReps.filter(r => r.status !== 'done' && r.status !== 'cancelled' && r.date && r.date < today10()).length,
      unread: unreadByBranch[k] || 0
    };
  });

  const totDone = rows.reduce((s, r) => s + r.done, 0);
  const totOpen = rows.reduce((s, r) => s + r.open, 0);
  const totOverdue = rows.reduce((s, r) => s + r.overdue, 0);
  const totCancel = rows.reduce((s, r) => s + r.cancelled, 0);
  const totUnread = rows.reduce((s, r) => s + r.unread, 0);
  const topBy = sel => rows.slice().sort((a, b) => sel(b) - sel(a))[0] || {};
  const topDoneB = topBy(r => r.done), topOpenB = topBy(r => r.open), topUnreadB = topBy(r => r.unread);
  const maxDone = Math.max(1, ...rows.map(r => r.done));
  const chartRows = rows.slice().sort((a, b) => b.done - a.done);
  const attention = rows.filter(r => r.overdue || r.unread);

  const seg = (k, lbl) => `<button type="button" class="seg-btn${range === k ? ' is-active' : ''}" data-range="${k}">${lbl}</button>`;
  const tile = (icon, num, label) => `<div class="tile" style="cursor:default"><span class="t-icon">${icon}</span><span class="t-num">${num}</span><span class="t-label">${label}</span></div>`;
  const lead = (medal, title, r, valHtml) => `<div class="lead-card"><span class="lead-medal">${medal}</span><div class="lead-txt"><span class="lead-title">${title}</span><strong>${esc(r.name || '—')}</strong><span class="lead-val">${valHtml}</span></div></div>`;

  const chart = `
    <div class="dash-card">
      <div class="dc-head"><h3>Repairs completed by branch</h3><span class="b-meta">${RANGE_LABEL[range]}</span></div>
      <div class="chart-rows">
        ${chartRows.map(r => `
          <div class="chart-row" title="${esc(r.name)}: ${r.done} completed">
            <span class="chart-label">${esc(r.short)}</span>
            <span class="chart-track"><span class="chart-bar" style="width:${Math.round(r.done / maxDone * 100)}%"></span></span>
            <span class="chart-val">${r.done}</span>
          </div>`).join('')}
      </div>
    </div>`;

  const tableRows = rows.map(r => `<tr data-branch="${r.key}">
      <th scope="row" data-nav="users">${esc(r.name)}</th>
      <td data-label="Customers" data-nav="users">${r.customers}</td>
      <td data-label="Open" class="grp-start" data-nav="repairs">${r.open}</td>
      <td data-label="Done" class="ok-num" data-nav="repairs">${r.done}</td>
      <td data-label="Cancelled" class="muted-num" data-nav="repairs">${r.cancelled}</td>
      <td data-label="Overdue" class="${r.overdue ? 'is-warn' : ''}" data-nav="repairs">${r.overdue}</td>
      <td data-label="Unread" class="grp-start ${r.unread ? 'is-warn' : ''}" data-nav="inbox">${r.unread}</td>
    </tr>`).join('');

  host.innerHTML = `
    <p class="section-lead">Repairs &amp; customer messages across all branches. The range applies to <em>completed</em> and <em>cancelled</em> repairs.</p>
    <div class="seg" role="tablist" style="margin-bottom:1rem">${seg('today', 'Today')}${seg('7', '7 days')}${seg('30', '30 days')}${seg('all', 'All time')}</div>

    <div class="tile-row">
      ${tile('✅', totDone, 'Repairs completed')}
      ${tile('🛠️', totOpen, 'Pending (open)')}
      ${tile('⏰', totOverdue, 'Overdue')}
      ${tile('✖', totCancel, 'Cancelled')}
      ${tile('💬', totUnread, 'Unread messages')}
    </div>

    <div class="lead-grid">
      ${lead('🥇', 'Most completed', topDoneB, `${topDoneB.done || 0} in range`)}
      ${lead('🛠️', 'Most pending', topOpenB, `${topOpenB.open || 0} open`)}
      ${lead('💬', 'Most unread', topUnreadB, `${topUnreadB.unread || 0} unread`)}
    </div>

    ${chart}

    ${attention.length ? `
    <div class="dash-card">
      <div class="dc-head"><h3>Needs attention</h3></div>
      <div class="attn-list">
        ${attention.map(r => `<div class="attn-row"><strong>${esc(r.name)}</strong>
          ${r.overdue ? `<span class="attn-pill bad">⏰ ${r.overdue} overdue</span>` : ''}
          ${r.unread ? `<span class="attn-pill">💬 ${r.unread} unread</span>` : ''}
        </div>`).join('')}
      </div>
    </div>` : ''}

    <div class="dash-card">
      <div class="dc-head"><h3>Per-branch breakdown</h3><span class="b-meta">${RANGE_LABEL[range]}</span></div>
      <div class="admin-table-wrap">
        <table class="admin-table admin-grouped">
          <thead>
            <tr class="grp">
              <th class="blank"></th><th class="blank"></th>
              <th class="grp-start" colspan="4">🛠️ Repairs (${RANGE_LABEL[range]})</th>
              <th class="grp-start">💬</th>
            </tr>
            <tr>
              <th>Branch</th><th>Customers</th>
              <th class="grp-start" title="Repairs awaiting or in progress">Open</th>
              <th title="Repairs finished in range">Done</th>
              <th title="Repairs cancelled in range">Cancelled</th>
              <th title="Open repairs past their date">Overdue</th>
              <th class="grp-start" title="Unread customer messages">Unread</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    </div>`;

  $$('#analyticsBody .seg-btn').forEach(b => b.addEventListener('click', () => { ANALYTICS_RANGE = b.dataset.range; renderAnalytics(); }));
  wireBranchTableNav('#analyticsBody');   // each column routes to its own page, scoped to that branch
}

/* ================= POSTER MAKER ================= */
async function initPoster() {
  const form = $('#posterForm'), modelSel = $('#posterModel'), tmplSel = $('#posterTemplate');
  const canvas = $('#posterCanvas');
  if (!form || !canvas || typeof Poster === 'undefined') return;
  form.addEventListener('submit', e => e.preventDefault());   // live preview — never reload on Enter
  const fld = n => form.elements[n];                          // NB: form.name is the form's attr, not the field — use elements[]

  // template + model pickers
  tmplSel.innerHTML = Poster.templates().map(t => `<option value="${esc(t.key)}">${esc(t.label)}</option>`).join('');
  modelSel.innerHTML = `<option value="">— choose a model to pre-fill —</option>` +
    STORE.products.models.map(m => `<option value="${esc(m.id)}">${esc(m.name)}</option>`).join('');
  if (!ALL_VARIANTS.length) { try { await loadVariants(); } catch { } }

  let meta = {}, settings = {};
  try { meta = await API.getModelMeta(); } catch { }
  try { settings = await API.getSettings(); } catch { }
  const branch = homeBranchInfo();

  await Poster.placeholder(canvas, tmplSel.value);            // show the flyer itself as the empty state

  // ---- editor state (this closure) ----
  let photo = null;                                          // { img, cx, cy, scale, fit }
  const colors = [];                                         // colour values (hex or custom string; max 5)
  const DEFAULT_COLORS = ['Black', 'Gray', 'Red', 'White', 'Blue'].map(colorHexOf);
  let renderTimer = null;
  const templateKey = () => tmplSel.value || 'flyer2026';
  const cssOk = v => { const s = new Option().style; s.color = ''; try { s.color = v; } catch { } return s.color !== ''; };

  const gather = () => {
    const g = n => { const el = fld(n); return el && el.value ? el.value.trim() : ''; };
    return {
      name: g('name'), battery: g('battery'), motorW: g('motorW'), loadKg: g('loadKg'), brake: g('brake'), maxSpeed: g('maxSpeed'),
      salePrice: g('salePrice'), phone: g('phone'),
      colors: colors.filter(c => c && c.trim() !== ''),
      features: ['f1', 'f2', 'f3', 'f4', 'f5', 'f6'].map(g),
    };
  };
  const renderNow = async () => { await Poster.render(canvas, { templateKey: templateKey(), values: gather(), photo }); $('#posterDownload').disabled = false; };
  const scheduleRender = () => { clearTimeout(renderTimer); renderTimer = setTimeout(renderNow, 140); };

  // ---- colours UI (add/remove, max 5; fixed palette dropdown + "Other…" custom, swatch previews live) ----
  const posterColors = $('#posterColors'), addColorBtn = $('#posterAddColor');
  const swatchBg = v => (v && cssOk(v)) ? esc(v) : 'repeating-linear-gradient(45deg,#eee,#eee 6px,#ddd 6px,#ddd 12px)';
  function paintColors() {
    posterColors.innerHTML = colors.map((c, i) => {
      const nm = colorNameOfHex(c);                          // fixed swatch? (c holds its hex)
      const isOther = !nm;                                   // custom string (hex/CSS name) → Other…
      return `<div class="pc-row">
        <span class="pc-swatch" style="background:${swatchBg(c)}"></span>
        <select class="pc-select" name="posterColor" aria-label="Colour" data-i="${i}">${colorOptionsHtml(nm)}</select>
        <input class="pc-input" name="posterColorText" aria-label="Custom colour" list="cssColorNames" data-i="${i}" value="${isOther ? esc(c) : ''}" placeholder="colour name or #hex"${isOther ? '' : ' hidden'} />
        <button type="button" class="pc-del" data-i="${i}" title="Remove">✕</button>
      </div>`;
    }).join('');
    addColorBtn.disabled = colors.length >= 5;
    const setRow = (i, val, swatchEl) => { colors[i] = val; swatchEl.style.background = swatchBg(val); scheduleRender(); };
    posterColors.querySelectorAll('.pc-select').forEach(sel => sel.addEventListener('change', () => {
      const i = +sel.dataset.i, row = sel.closest('.pc-row'), custom = row.querySelector('.pc-input'), swatch = row.querySelector('.pc-swatch');
      if (sel.value === COLOR_OTHER) { custom.hidden = false; setRow(i, custom.value.trim(), swatch); custom.focus(); }
      else { custom.hidden = true; setRow(i, colorHexOf(sel.value), swatch); }
    }));
    posterColors.querySelectorAll('.pc-input').forEach(inp => inp.addEventListener('input', () => {
      const i = +inp.dataset.i, swatch = inp.closest('.pc-row').querySelector('.pc-swatch');
      setRow(i, inp.value.trim(), swatch);
    }));
    posterColors.querySelectorAll('.pc-del').forEach(b => b.addEventListener('click', () => { colors.splice(+b.dataset.i, 1); paintColors(); scheduleRender(); }));
  }
  addColorBtn.addEventListener('click', () => { if (colors.length < 5) { colors.push(EBIKE_COLORS[0].hex); paintColors(); scheduleRender(); } });

  // ---- prefill from the chosen model ----
  modelSel.addEventListener('change', () => {
    const m = STORE.modelById(modelSel.value) || {}, x = meta[modelSel.value] || {};
    if (modelSel.value) {
      fld('name').value = x.name || m.name || '';
      fld('battery').value = x.battery || m.battery || '';
      const mw = x.motor_w != null ? x.motor_w : m.motorW;
      fld('motorW').value = mw != null ? mw + 'W' : '';
      fld('brake').value = x.brakes || m.brakes || '';
      const srp = x.srp != null ? x.srp : m.srp;
      fld('salePrice').value = (x.on_sale && x.sale_cash != null) ? x.sale_cash : (srp != null ? srp : '');
      const vars = VARIANTS_BY_MODEL[modelSel.value] || [];
      colors.length = 0;
      // prefer the variant's canonical hex (from the fixed palette); fall back to its name as a CSS colour
      if (vars.length) vars.slice(0, 5).forEach(v => colors.push(colorHexOf(v.name) || v.color_hex || (cssOk(v.name) ? v.name : '#888888')));
      else DEFAULT_COLORS.forEach(c => colors.push(c));
      paintColors();
    }
    scheduleRender();
  });

  // ---- contact prefill + saved-number picker (each branch's number) ----
  const contactNums = BRANCHES.map(b => ({ label: branchShort(b.key), number: branchPhoneOf(b.key) })).filter(x => x.number);
  fld('phone').value = branchPhoneOf(HOME_BRANCH_KEY) || (contactNums[0] && contactNums[0].number) || '';
  const pick = $('#posterPhonePick');
  if (pick) {
    pick.innerHTML = `<option value="">+ use a saved number…</option>` +
      contactNums.map(n => `<option value="${esc(n.number)}">${esc(n.label)} — ${esc(n.number)}</option>`).join('');
    pick.addEventListener('change', () => { if (!pick.value) return; fld('phone').value = pick.value; pick.value = ''; scheduleRender(); });
  }

  // ---- photo: upload, size, clear ----
  const fileInput = $('#posterPhotoInput'), sizeSlider = $('#posterPhotoSize'), clearBtn = $('#posterPhotoClear');
  $('#posterPhotoBtn').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const st = Poster.defaultPhotoState(templateKey(), img);
        photo = { img, cx: st.cx, cy: st.cy, scale: st.scale, fit: st.fit };
        sizeSlider.value = 100; sizeSlider.disabled = false; clearBtn.disabled = false;
        renderNow();
      };
      img.onerror = () => alert('Could not read that image. Please upload a PNG/JPG.');
      img.src = reader.result;
    };
    reader.readAsDataURL(file); fileInput.value = '';
  });
  sizeSlider.addEventListener('input', () => { if (!photo) return; photo.scale = photo.fit * (Number(sizeSlider.value) / 100); scheduleRender(); });
  clearBtn.addEventListener('click', () => { photo = null; sizeSlider.disabled = true; clearBtn.disabled = true; renderNow(); });

  // ---- drag the photo on the canvas (mouse + touch) ----
  const toCanvas = e => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * (canvas.width / r.width), y: (e.clientY - r.top) * (canvas.height / r.height) }; };
  const inPhoto = (x, y) => { if (!photo) return false; const dw = photo.img.width * photo.scale, dh = photo.img.height * photo.scale; return x >= photo.cx - dw / 2 && x <= photo.cx + dw / 2 && y >= photo.cy - dh / 2 && y <= photo.cy + dh / 2; };
  let dragging = false, grab = null;
  canvas.addEventListener('pointerdown', e => {
    const p = toCanvas(e); if (!inPhoto(p.x, p.y)) return;
    dragging = true; grab = { dx: photo.cx - p.x, dy: photo.cy - p.y };
    canvas.setPointerCapture(e.pointerId); canvas.classList.add('grabbing'); e.preventDefault();
  });
  canvas.addEventListener('pointermove', e => {
    if (!dragging) { if (photo) { const p = toCanvas(e); canvas.classList.toggle('grab', inPhoto(p.x, p.y)); } return; }
    const p = toCanvas(e); photo.cx = p.x + grab.dx; photo.cy = p.y + grab.dy;
    Poster.previewFast(canvas, { templateKey: templateKey(), photo }); e.preventDefault();
  });
  const endDrag = () => { if (!dragging) return; dragging = false; canvas.classList.remove('grabbing'); renderNow(); };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('wheel', e => {
    if (!photo) return; e.preventDefault();
    photo.scale = Math.max(photo.fit * 0.1, Math.min(photo.fit * 3, photo.scale * (e.deltaY < 0 ? 1.06 : 0.94)));
    sizeSlider.value = Math.round((photo.scale / photo.fit) * 100);
    Poster.previewFast(canvas, { templateKey: templateKey(), photo });
    clearTimeout(renderTimer); renderTimer = setTimeout(renderNow, 200);
  }, { passive: false });

  // ---- download ----
  $('#posterDownload').addEventListener('click', async () => {
    await renderNow();
    const nm = (fld('name').value || 'poster').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    canvas.toBlob(blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = `lucky-lion-${nm || 'poster'}.png`;
      a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, 'image/png');
  });

  // initial colours + live-render wiring + first paint
  DEFAULT_COLORS.forEach(c => colors.push(c)); paintColors();
  form.querySelectorAll('input[name]').forEach(inp => inp.addEventListener('input', scheduleRender));
  tmplSel.addEventListener('change', async () => { await Poster.placeholder(canvas, tmplSel.value); scheduleRender(); });
  renderNow();
}

/* ================= MODELS MANAGER ================= */
const badge = (m) => `${m.on_sale ? '<span class="badge badge-sale"><span class="badge-ic">🔥</span>SALE</span>' : ''}${m.is_new ? '<span class="badge badge-new"><span class="badge-ic">✨</span>NEW</span>' : ''}`;
const numOrEmpty = (v) => (v == null || v === '') ? '' : v;
let MODEL_PHOTOS = {}, MP_TARGET = null, MP_VARIANT = null;   // MP_VARIANT tags a photo to a colour
let ALL_VARIANTS = [], VARIANTS_BY_MODEL = {};               // colour variants (+ stock), grouped by model
async function loadVariants() {
  try { ALL_VARIANTS = await API.getAllModelVariants(); } catch { ALL_VARIANTS = []; }
  VARIANTS_BY_MODEL = {};
  ALL_VARIANTS.forEach(v => (VARIANTS_BY_MODEL[v.model_id] ??= []).push(v));
}

// ---- model_meta cache (keyed by id) — used across the admin views ----
let META_ALL = {};
async function loadStockMeta() {
  try { META_ALL = await API.getModelMeta(); } catch { META_ALL = {}; }
}

// ---- sales revenue helpers (a "sale" = a unit handed to a customer; repairs are NOT revenue) ----
// the listed price of one model (sale price if on sale, else SRP, else the bundled base SRP)
function unitPriceOf(modelId) {
  const x = META_ALL[modelId] || {};
  if (x.on_sale && x.sale_cash != null && x.sale_cash !== '') return Number(x.sale_cash) || 0;
  if (x.srp != null && x.srp !== '') return Number(x.srp) || 0;
  const base = STORE.modelById(modelId) || {};
  return Number(base.srp) || 0;
}
// every owned unit across all customers, tagged with its owner's branch + revenue price.
// Revenue uses the ACTUAL recorded sale_price when present; otherwise the model's listed price.
const unitRevenue = (e) => (e && e.sale_price != null && e.sale_price !== '' && Number(e.sale_price) > 0)
  ? Number(e.sale_price) : unitPriceOf(e.model_id);
function allOwnedUnits() {
  const out = [];
  Object.entries(EBIKES_BY_USER).forEach(([uid, arr]) => {
    const br = branchOfUser(uid);
    (arr || []).forEach(e => out.push({ ...e, branch: br, price: unitRevenue(e) }));
  });
  return out;
}
// inclusive start date (YYYY-MM-DD) for a range key; 'all' => everything
function rangeStart(key) {
  if (key === 'all') return '0000-00-00';
  const d = new Date();
  if (key === '7') d.setDate(d.getDate() - 6);
  else if (key === '30') d.setDate(d.getDate() - 29);
  // 'today' => d unchanged
  return d.toISOString().slice(0, 10);
}
const RANGE_LABEL = { today: 'Today', '7': 'Last 7 days', '30': 'Last 30 days', all: 'All time' };
const inRangeDate = (dateStr, start) => !!dateStr && String(dateStr).slice(0, 10) >= start;
// <option>s for a model's colour variants (with stock hints), for unit-detail selects
function variantOptions(modelId, selectedId) {
  const vs = VARIANTS_BY_MODEL[modelId] || [];
  return `<option value="">— colour —</option>` + vs.map(v =>
    `<option value="${esc(v.id)}" data-name="${esc(v.name || '')}" ${v.id === selectedId ? 'selected' : ''}>${esc(v.name || 'Colour')}</option>`).join('');
}
function fillVariantSelect(sel, modelId, selectedId) {
  if (sel) { sel.innerHTML = variantOptions(modelId, selectedId); autoColour(sel.closest('.add-unit') || sel.closest('.unit-edit-form'), sel); }
}
// when a colour is chosen, point the colour-label field at the variant's name
function autoColour(box, varSel) {
  if (!box || !varSel) return;
  const opt = varSel.selectedOptions[0];
  if (opt) setColorField(box, opt.dataset.name || '');
}
// read the unit detail out of an add-unit box or edit form
function readUnitDetail(box) {
  const val = n => { const el = box.querySelector(`[name="${n}"]`); return el ? el.value.trim() : ''; };
  return {
    variantId: val('variantId') || null, color: cfColorValue(box), chassisNo: val('chassisNo'), batteryNo: val('batteryNo'), motorNo: val('motorNo'), acquiredAt: val('acquiredAt'),
    saleNote: val('saleNote')
  };
}
const todayISO = () => new Date().toISOString().slice(0, 10);

// mode-of-payment options for the sale fields
const PAYMENT_MODES = ['Cash', 'Home Credit', 'Credit Card', 'Other'];
const paymentOptions = (sel) => `<option value="">— payment —</option>` + PAYMENT_MODES.map(m => `<option value="${esc(m)}"${m === sel ? ' selected' : ''}>${esc(m)}</option>`).join('');
// the model's listed price (sale price if on sale, else SRP) — used to prefill the sale-price field
function listedPrice(modelId) {
  const x = META_ALL[modelId] || {};
  if (x.on_sale && x.sale_cash != null && x.sale_cash !== '') return Number(x.sale_cash) || 0;
  if (x.srp != null && x.srp !== '') return Number(x.srp) || 0;
  return Number((STORE.modelById(modelId) || {}).srp) || 0;
}

/* ================= TOAST (louder notifications) ================= */
let _toastHost = null;
function toast(msg, kind = 'ok') {
  if (!_toastHost) { _toastHost = document.createElement('div'); _toastHost.className = 'toast-host'; document.body.appendChild(_toastHost); }
  const t = document.createElement('div');
  t.className = `toast toast-${kind}`;
  t.innerHTML = `<span class="toast-ic">${kind === 'err' ? '⚠️' : '✅'}</span><span>${esc(msg)}</span>`;
  _toastHost.appendChild(t);
  requestAnimationFrame(() => t.classList.add('in'));
  setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 300); }, 3200);
}
let MODEL_STATS = { total: 0, sale: 0, hidden: 0 };           // filled by renderModels(), shown on the dashboard
// the brand-new models manager (pre-loved was removed)
const MANAGERS = {
  models: { host: '#modelsList', groups: [], tab: null }
};
let NEW_MODEL_PHOTOS = [];                                   // staged photos for the "Add a new model" form
const tmpId = () => 'tmp-' + Math.random().toString(36).slice(2, 9);

// pointer-based drag-to-reorder for a photo grid — works on mouse AND touch.
// Items must carry data-sort-id; onReorder(ids) runs once after a drop.
function makeSortable(grid, onReorder) {
  if (!grid) return;
  grid.querySelectorAll('[data-sort-id]').forEach(item => {
    item.addEventListener('pointerdown', e => {
      if (e.target.closest('button')) return;                // let the ↑ ↓ × buttons work
      item._drag = { moved: false };
      try { item.setPointerCapture(e.pointerId); } catch { }
    });
    item.addEventListener('pointermove', e => {
      if (!item._drag) return;
      if (!item._drag.moved) { item._drag.moved = true; item.classList.add('dragging'); }
      e.preventDefault();
      item.style.pointerEvents = 'none';
      const under = document.elementFromPoint(e.clientX, e.clientY);
      item.style.pointerEvents = '';
      const target = under && under.closest('[data-sort-id]');
      if (target && target !== item && target.parentElement === grid) {
        const r = target.getBoundingClientRect();
        const after = e.clientX > r.left + r.width / 2;       // insert before/after the hovered tile
        grid.insertBefore(item, after ? target.nextSibling : target);
      }
    });
    const end = () => {
      if (!item._drag) return;
      const moved = item._drag.moved; item._drag = null;
      item.classList.remove('dragging'); item.style.pointerEvents = '';
      if (moved && onReorder) onReorder([...grid.querySelectorAll('[data-sort-id]')].map(x => x.dataset.sortId));
    };
    item.addEventListener('pointerup', end);
    item.addEventListener('pointercancel', end);
  });
}

// a valid 6-digit hex for <input type=color>, else a neutral grey
const hex6 = (c) => (/^#[0-9a-f]{6}$/i.test(c || '')) ? c : '#888888';

// staff: colour variants + per-colour photos for one model
function variantEditor(modelId, v) {
  const photos = (MODEL_PHOTOS[modelId] || []).filter(p => p.variant_id === v.id);
  const tiles = photos.map(p => `<div class="photo-item" data-id="${esc(p.id)}">
      <img src="${esc(p.url)}" alt="${esc(v.name)} photo" draggable="false" />
      <button type="button" class="del vp-del" data-model="${esc(modelId)}" data-id="${esc(p.id)}" data-path="${esc(p.path || '')}" title="Delete">&times;</button>
    </div>`).join('');
  return `<div class="var-row" data-id="${esc(v.id)}" data-model="${esc(modelId)}">
    <form class="form var-edit" data-id="${esc(v.id)}">
      <div class="var-add-row">
        ${colorLabelField(v.name, v.color_hex, true)}
        <button class="btn btn-primary btn-sm" type="submit">Save</button>
        <button class="btn btn-ghost btn-sm var-del" type="button" data-id="${esc(v.id)}" data-model="${esc(modelId)}" title="Delete colour">Delete</button>
      </div>
    </form>
    <div class="var-photos">
      <div class="photo-grid vp-grid">${tiles || '<span class="b-meta" style="color:var(--muted)">No photos for this colour yet.</span>'}</div>
      <button type="button" class="btn btn-ghost btn-sm vp-add" data-model="${esc(modelId)}" data-vid="${esc(v.id)}">+ Add ${esc(v.name || 'colour')} photo</button>
    </div>
  </div>`;
}
function variantsBlock(modelId) {
  const vs = VARIANTS_BY_MODEL[modelId] || [];
  return `<div class="var-block" data-model="${esc(modelId)}">
    <p class="mp-hint">Each colour has its own photos. On the store, picking a colour swaps the gallery to that colour's photos.</p>
    ${vs.map(v => variantEditor(modelId, v)).join('') || '<p class="b-meta" style="color:var(--muted)">No colours yet — add one below.</p>'}
    <form class="form var-add" data-model="${esc(modelId)}">
      <div class="var-add-row">
        ${colorLabelField('Blue', colorHexOf('Blue'), true)}
        <button class="btn btn-ghost btn-sm" type="submit">+ Add colour</button>
      </div>
    </form>
  </div>`;
}

// The general "Main photo" panel: a SINGLE image shown when a customer first opens the unit
// (before choosing a colour). Colour-specific photos live in the Colours panel.
function modelPhotosBlock(id) {
  const list = (MODEL_PHOTOS[id] || []).filter(p => !p.variant_id);   // general (non-colour) photos
  const builtIn = ((STORE.modelById(id) || {}).images) || [];        // the bundled products.json photo
  const main = list[0];   // only the first general photo is used as the main image
  let tile, canAdd;
  if (main) {
    canAdd = false;   // one main photo max — delete to replace
    tile = `<div class="photo-item" data-id="${esc(main.id)}">
        <img src="${esc(main.url)}" alt="main photo" draggable="false" />
        <span class="tagdefault">main</span>
        <button type="button" class="del mp-del" data-id="${esc(main.id)}" data-path="${esc(main.path || '')}" title="Delete">&times;</button>
      </div>`;
  } else if (builtIn.length) {
    canAdd = true;    // showing the bundled fallback; staff can still set their own main
    tile = `<div class="photo-item photo-builtin">
        <img src="${esc(builtIn[0])}" alt="built-in photo" draggable="false" onerror="this.closest('.photo-item').style.display='none'" />
        <span class="tagdefault">built-in</span>
      </div>`;
  } else {
    canAdd = true;
    tile = '<p class="b-meta" style="color:var(--muted)">No main photo yet.</p>';
  }
  return `<div class="mp-block" data-model="${esc(id)}">
    <div class="mp-head">
      ${canAdd ? `<button type="button" class="btn btn-ghost btn-sm mp-add" data-model="${esc(id)}">+ Set main photo</button>` : ''}
    </div>
    <p class="mp-hint">This is the <strong>main photo</strong> shown when a customer first opens the unit (before choosing a colour) — you can set one. Colour-specific photos are added in <strong>🎨 Colours</strong> below. The <em>built-in</em> photo is the one bundled with the app.</p>
    <div class="photo-grid mp-grid">${tile}</div>
  </div>`;
}

// effective (staff-edited) spec values for a model row
function effSpecs(r) {
  const b = r.base, x = r.x;
  const pick = (xv, bv) => (xv != null && xv !== '') ? xv : bv;
  return {
    name: pick(x.name, b.name),
    wheels: pick(x.wheels, b.wheels),
    motorW: pick(x.motor_w, b.motorW),
    battery: pick(x.battery, b.battery),
    brakes: pick(x.brakes, b.brakes),
    srp: pick(x.srp, b.srp)
  };
}

function modelRow(r, first, last) {
  const b = r.base, x = r.x, e = effSpecs(r);
  const cats = STORE.products.categories || {};
  const wheelOpts = Object.entries(cats).map(([k, lbl]) =>
    `<option value="${esc(k)}" ${e.wheels === k ? 'selected' : ''}>${esc(lbl)}</option>`).join('');
  const hasMain = ((MODEL_PHOTOS[b.id] || []).filter(p => !p.variant_id).length + (((STORE.modelById(b.id) || {}).images) || []).length) > 0;
  const varCount = (VARIANTS_BY_MODEL[b.id] || []).length;
  return `<details class="acc" data-model="${esc(b.id)}" data-wheels="${esc(e.wheels)}">
    <summary>
      <span class="acc-left"><span class="acc-title">${esc(e.name)}</span> ${badge(x)} ${x.hidden ? '<span class="home-badge" style="background:#888">HIDDEN</span>' : ''}</span>
      <span class="acc-right">
        <span class="model-move">
          <span class="mv model-mv${first ? ' is-disabled' : ''}" data-dir="up" data-id="${esc(b.id)}" title="Move up">↑</span>
          <span class="mv model-mv${last ? ' is-disabled' : ''}" data-dir="down" data-id="${esc(b.id)}" title="Move down">↓</span>
        </span>
        <span class="acc-hint">Edit</span><span class="acc-chev">▾</span></span>
    </summary>
    <div class="acc-body">
      <div class="b-meta">${e.motorW}W · ${esc(e.battery || '—')} · ${esc(e.brakes || '—')} · SRP ₱${Number(e.srp || 0).toLocaleString('en-PH')}${r.custom ? ' · <em>custom</em>' : ''}</div>

      <details class="model-sub">
        <summary>📷 Main photo <span class="pill sm">${hasMain ? '✓' : '—'}</span></summary>
        <div class="model-sub-body">${modelPhotosBlock(b.id)}</div>
      </details>

      <details class="model-sub">
        <summary>🎨 Colours <span class="pill sm">${varCount}</span></summary>
        <div class="model-sub-body">${variantsBlock(b.id)}</div>
      </details>

      <form class="form model-form" data-id="${esc(b.id)}">
        <details class="model-sub">
          <summary>⚙️ Specs</summary>
          <div class="model-sub-body">
            <label>Name <input name="mname" value="${esc(e.name)}" /></label>
            <label>Type <select name="wheels">${wheelOpts}</select></label>
            <div class="grid3">
              <label>Motor (Watts) <input name="motor_w" type="number" value="${numOrEmpty(e.motorW)}" /></label>
              <label>Battery <input name="battery" value="${esc(e.battery || '')}" /></label>
              <label>Brakes <input name="brakes" value="${esc(e.brakes || '')}" /></label>
            </div>
          </div>
        </details>

        <details class="model-sub">
          <summary>💵 Price</summary>
          <div class="model-sub-body">
            <label>Price (SRP) <input name="srp" type="number" value="${numOrEmpty(e.srp)}" /></label>
          </div>
        </details>

        <div class="row-actions">
          <button class="btn btn-primary btn-sm" type="submit">Save</button>
          ${r.custom
      ? `<button class="btn btn-ghost btn-sm del-model danger" type="button" data-id="${esc(b.id)}" data-name="${esc(e.name)}">Delete model</button>`
      : `<button class="btn btn-ghost btn-sm remove-model danger" type="button" data-id="${esc(b.id)}" data-name="${esc(e.name)}">Delete</button>`}
          <span class="form-ok hidden">Saved.</span>
        </div>
      </form>
    </div>
  </details>`;
}

// build wheel-type groups from the model rows
function groupModelRows(rows) {
  const cats = STORE.products.categories || {};
  const wheelOf = r => effSpecs(r).wheels;
  const bySort = (a, b) => (a.x.sort || 0) - (b.x.sort || 0);
  const sel = rows.filter(r => !r.x.hidden);   // deleted (hidden) models live in the Deleted section
  const groups = [];
  Object.entries(cats).forEach(([key, label]) => {
    const list = sel.filter(r => wheelOf(r) === key).sort(bySort);
    if (list.length) groups.push({ label, list });
  });
  const known = new Set(Object.keys(cats));
  const other = sel.filter(r => !known.has(wheelOf(r))).sort(bySort);
  if (other.length) groups.push({ label: 'Other', list: other });
  return groups;
}

// (re)render the brand-new Models manager from one data load
async function renderModels() {
  let meta = {};
  try { meta = await API.getModelMeta(); } catch (e) { /* table not set up yet */ }
  MODEL_PHOTOS = {};
  try { (await API.getAllModelPhotos()).forEach(p => (MODEL_PHOTOS[p.model_id] ??= []).push(p)); } catch (e) { /* model_photos table not set up yet */ }
  await loadVariants();
  const base = STORE.products.models;
  const rows = base.map(m => ({ base: m, x: meta[m.id] || {}, custom: false }));
  Object.values(meta).forEach(x => {
    if (x.is_custom && !base.find(b => b.id === x.id)) {
      rows.push({ base: { id: x.id, name: x.name || 'New Model', wheels: x.wheels, motorW: x.motor_w, battery: x.battery, brakes: x.brakes, srp: x.srp }, x, custom: true });
    }
  });

  MODEL_STATS = {
    total: rows.filter(r => !r.x.hidden).length,
    sale: rows.filter(r => r.x.on_sale && !r.x.hidden).length,
    hidden: rows.filter(r => r.x.hidden).length,
  };

  Object.keys(MANAGERS).forEach(key => {
    const mgr = MANAGERS[key];
    mgr.groups = groupModelRows(rows);
    mgr.deleted = rows.filter(r => r.x.hidden);   // soft-deleted models, restorable
    if (!mgr.groups.some(g => g.label === mgr.tab)) mgr.tab = mgr.groups.length ? mgr.groups[0].label : null;
    paintModelGroup(key);
  });
}

// paints one manager's category picker + the picked category's rows into its own host
function paintModelGroup(key = 'models') {
  const mgr = MANAGERS[key];
  const host = $(mgr.host);
  if (!host) return;
  const noun = 'model';
  // collapsed "Deleted models" section (restorable) — shown whether or not any live models remain
  const del = mgr.deleted || [];
  const deletedHtml = del.length ? `
    <details class="deleted-models">
      <summary>🗑 Deleted models <span class="pill sm">${del.length}</span></summary>
      <div class="deleted-body">
        <p class="dm-note">Removed from the public store. Restore to bring one back.</p>
        ${del.map(r => `<div class="dm-row"><span class="dm-name">${nt(effSpecs(r).name)}</span>
          <button class="btn btn-ghost btn-sm restore-model" type="button" data-id="${esc(r.base.id)}">Restore</button></div>`).join('')}
      </div>
    </details>` : '';

  if (!mgr.groups.length) {
    host.innerHTML = `<p class="empty-note">No ${noun}s yet.</p>${deletedHtml}`;
    wireModelForms(mgr.host);
    return;
  }
  const plural = n => `${n} ${noun}${n === 1 ? '' : 's'}`;
  const g = mgr.groups.find(x => x.label === mgr.tab) || mgr.groups[0];

  host.innerHTML = `
    <div class="wheel-picker" role="tablist">
      ${mgr.groups.map(x => `
        <button type="button" class="wheel-tab${x.label === g.label ? ' is-active' : ''}" role="tab" data-tab="${esc(x.label)}">
          <span class="wt-label">${esc(x.label)}</span>
          <span class="wt-count">${plural(x.list.length)}</span>
        </button>`).join('')}
    </div>
    <div class="wheel-body">
      ${g.list.map((r, j) => modelRow(r, j === 0, j === g.list.length - 1)).join('') || `<p class="empty-note">No ${noun}s in this category.</p>`}
    </div>
    ${deletedHtml}`;

  $$(`${mgr.host} .wheel-tab`).forEach(b => b.addEventListener('click', () => {
    mgr.tab = b.dataset.tab;
    paintModelGroup(key);
  }));
  wireModelForms(mgr.host);
  wireModelPhotos(mgr.host);
  wireModelReorder(mgr.host);
  wireModelVariants(mgr.host);
}

// add / edit / delete colour variants and their photos (scoped to a manager's host)
function wireModelVariants(root = '#modelsList') {
  // read the chosen colour (fixed option → its palette hex; "Other…" → the custom name + shade)
  const readColour = (form) => {
    const name = cfColorValue(form), sel = form.querySelector('.cf-select');
    const hex = (sel && sel.value === COLOR_OTHER) ? ((form.querySelector('.cf-hex') || {}).value || '#888888') : (colorHexOf(name) || '#888888');
    return { name, colorHex: hex };
  };
  $$(`${root} .var-add`).forEach(form => form.addEventListener('submit', async e => {
    e.preventDefault();
    const modelId = form.dataset.model;
    const { name, colorHex } = readColour(form);
    if (!name) { alert('Please choose a colour.'); return; }
    try {
      await API.addVariant(modelId, { name, colorHex });
      await refreshModel(modelId); toast('Colour added.');
    } catch (ex) { alert('Add colour failed: ' + ex.message + ' (Is the model_variants table set up?)'); }
  }));
  $$(`${root} .var-edit`).forEach(form => form.addEventListener('submit', async e => {
    e.preventDefault();
    const modelId = form.closest('.var-row').dataset.model;
    const { name, colorHex } = readColour(form);
    if (!name) { alert('Please choose a colour.'); return; }
    try {
      await API.updateVariant(form.dataset.id, { name, colorHex });
      await refreshModel(modelId); toast('Colour saved.');
    } catch (ex) { alert('Save failed: ' + ex.message); }
  }));
  $$(`${root} .var-del`).forEach(b => b.addEventListener('click', async () => {
    if (!(await confirmAction('Delete this colour and its photos?', { title: 'Delete colour', confirmLabel: 'Delete', danger: true }))) return;
    try { await API.deleteVariant(b.dataset.id); await refreshModel(b.dataset.model); toast('Colour deleted.'); }
    catch (ex) { alert('Delete failed: ' + ex.message); }
  }));
  $$(`${root} .vp-add`).forEach(b => b.addEventListener('click', () => {
    MP_TARGET = b.dataset.model; MP_VARIANT = b.dataset.vid; $('#modelPhotoInput').click();
  }));
  $$(`${root} .vp-del`).forEach(b => b.addEventListener('click', async () => {
    if (!(await confirmAction('Delete this photo?', { title: 'Delete photo', confirmLabel: 'Delete', danger: true }))) return;
    b.disabled = true;
    try { await API.deleteModelPhoto(b.dataset.id, b.dataset.path); await refreshModel(b.dataset.model); }
    catch (ex) { alert('Delete failed: ' + ex.message); b.disabled = false; }
  }));
}

// ↑ / ↓ reorder within the shown wheel group — persists model_meta.sort for the group.
function wireModelReorder(root = '#modelsList') {
  $$(`${root} .model-mv`).forEach(btn => btn.addEventListener('click', async e => {
    e.preventDefault(); e.stopPropagation();               // don't toggle the accordion
    const body = btn.closest('.wheel-body');
    const ids = $$('.acc', body).map(d => d.dataset.model);
    const idx = ids.indexOf(btn.dataset.id), j = idx + (btn.dataset.dir === 'up' ? -1 : 1);
    if (j < 0 || j >= ids.length) return;
    [ids[idx], ids[j]] = [ids[j], ids[idx]];
    $$('.model-mv', body).forEach(b => b.classList.add('is-disabled'));
    try {
      for (let i = 0; i < ids.length; i++) await API.upsertModelMeta(ids[i], { sort: i });
      await renderModels();
    } catch (ex) { alert('Reorder failed: ' + ex.message); await renderModels(); }
  }));
}

function wireModelPhotos(root = '#modelsList') {
  const modelOf = el => el.closest('.mp-block').dataset.model;
  $$(`${root} .mp-add`).forEach(b => b.addEventListener('click', () => {
    MP_TARGET = b.dataset.model;
    $('#modelPhotoInput').click();
  }));
  $$(`${root} .mp-del`).forEach(b => b.addEventListener('click', async () => {
    if (!(await confirmAction('Delete this photo?', { title: 'Delete photo', confirmLabel: 'Delete', danger: true }))) return;
    const id = modelOf(b); b.disabled = true;
    try { await API.deleteModelPhoto(b.dataset.id, b.dataset.path); await refreshModel(id); }
    catch (e) { alert('Delete failed: ' + e.message); b.disabled = false; }
  }));
  $$(`${root} .mp-mv`).forEach(b => b.addEventListener('click', async () => {
    const id = modelOf(b), ids = (MODEL_PHOTOS[id] || []).filter(p => !p.variant_id).map(p => p.id);
    const idx = ids.indexOf(b.dataset.id), j = idx + (b.dataset.dir === 'up' ? -1 : 1);
    if (j < 0 || j >= ids.length) return;
    [ids[idx], ids[j]] = [ids[j], ids[idx]];
    try { await API.reorderModelPhotos(ids); await refreshModel(id); }
    catch (e) { alert('Failed: ' + e.message); }
  }));
  // drag-to-reorder each model's photo grid
  $$(`${root} .mp-block`).forEach(block => {
    const id = block.dataset.model, grid = block.querySelector('.mp-grid');
    makeSortable(grid, async ids => {
      grid.style.opacity = '.5';
      try { await API.reorderModelPhotos(ids); await refreshModel(id); }
      catch (e) { alert('Reorder failed: ' + e.message); grid.style.opacity = ''; }
    });
  });
}

// one-time: the shared hidden file input that feeds the cropper for model photos.
// MP_TARGET is a model id for an existing model, or '__new__' to stage onto the add-model form.
function wireModelPhotoInput() {
  const input = $('#modelPhotoInput');
  if (!input) return;
  input.addEventListener('change', () => {
    const file = input.files && input.files[0];
    input.value = '';
    if (!file || !file.type.startsWith('image/') || !MP_TARGET) return;
    const target = MP_TARGET, variantId = MP_VARIANT;
    MP_VARIANT = null;                       // consume the variant tag for this pick
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (target === '__new__') {
        // stage locally; uploaded on submit once the model has an id
        openCropper(img, async blob => { NEW_MODEL_PHOTOS.forEach(p => URL.revokeObjectURL(p.url)); NEW_MODEL_PHOTOS = [{ id: tmpId(), blob, url: URL.createObjectURL(blob) }]; renderNewModelPhotos(); });
      } else {
        openCropper(img, async blob => { await API.addModelPhoto(target, blob, variantId); await refreshModel(target); });
      }
    };
    img.src = url;
  });
}

/* ---- staged photos for the "Add a new model" form (uploaded on submit) ---- */
function renderNewModelPhotos() {
  const host = $('#newModelPhotos');
  if (!host) return;
  host.innerHTML = NEW_MODEL_PHOTOS.map((p, i) => `<div class="photo-item" data-sort-id="${esc(p.id)}" data-id="${esc(p.id)}">
      <img src="${esc(p.url)}" alt="photo ${i + 1}" draggable="false" />
      <span class="photo-num">${i + 1}</span>
      ${i === 0 ? '<span class="tagdefault">main</span>' : ''}
      <div class="photo-move">
        <button type="button" class="mv nm-mv" data-dir="up" data-id="${esc(p.id)}" ${i === 0 ? 'disabled' : ''} title="Move earlier">↑</button>
        <button type="button" class="mv nm-mv" data-dir="down" data-id="${esc(p.id)}" ${i === NEW_MODEL_PHOTOS.length - 1 ? 'disabled' : ''} title="Move later">↓</button>
      </div>
      <button type="button" class="del nm-del" data-id="${esc(p.id)}" title="Remove">&times;</button>
    </div>`).join('');
  $$('#newModelPhotos .nm-del').forEach(b => b.addEventListener('click', () => {
    const i = NEW_MODEL_PHOTOS.findIndex(p => p.id === b.dataset.id);
    if (i >= 0) { URL.revokeObjectURL(NEW_MODEL_PHOTOS[i].url); NEW_MODEL_PHOTOS.splice(i, 1); renderNewModelPhotos(); }
  }));
  $$('#newModelPhotos .nm-mv').forEach(b => b.addEventListener('click', () => {
    const i = NEW_MODEL_PHOTOS.findIndex(p => p.id === b.dataset.id), j = i + (b.dataset.dir === 'up' ? -1 : 1);
    if (j < 0 || j >= NEW_MODEL_PHOTOS.length) return;
    [NEW_MODEL_PHOTOS[i], NEW_MODEL_PHOTOS[j]] = [NEW_MODEL_PHOTOS[j], NEW_MODEL_PHOTOS[i]];
    renderNewModelPhotos();
  }));
  makeSortable(host, ids => {
    NEW_MODEL_PHOTOS.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    renderNewModelPhotos();
  });
}

function wireNewModelPhotos() {
  const btn = $('#newModelAddPhoto');
  if (!btn) return;
  btn.addEventListener('click', () => { MP_TARGET = '__new__'; $('#modelPhotoInput').click(); });
  renderNewModelPhotos();
}

async function refreshModel(id) {
  await renderModels();
  const det = document.querySelector(`#modelsList details[data-model="${id}"]`);
  if (det) det.open = true;
}

function wireModelForms(root = '#modelsList') {
  const num = v => { v = (v || '').toString().trim(); return v === '' ? null : Number(v); };
  $$(`${root} .model-form`).forEach(form => {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const el = e.target;
      const str = v => { v = (v || '').toString().trim(); return v === '' ? null : v; };
      const patch = {
        name: str(el.mname.value), wheels: el.wheels.value || null,
        motor_w: num(el.motor_w.value), battery: str(el.battery.value), brakes: str(el.brakes.value),
        srp: num(el.srp.value)
      };
      const ok = el.querySelector('.form-ok');
      try { await API.upsertModelMeta(el.dataset.id, patch); ok.classList.remove('hidden'); await refreshModel(el.dataset.id); }
      catch (ex) { alert('Save failed: ' + ex.message + ' (Is the model_meta table set up?)'); }
    });
  });
  // base model → soft-delete via the hidden flag (removed from store + list, restorable below)
  $$(`${root} .remove-model`).forEach(b => b.addEventListener('click', async () => {
    if (!(await confirmAction(`Delete "${b.dataset.name || 'this model'}"? It's removed from the store. You can restore it from "Deleted models".`, { title: 'Delete model', confirmLabel: 'Delete', danger: true }))) return;
    try { await API.upsertModelMeta(b.dataset.id, { hidden: true }); await renderModels(); }
    catch (ex) { alert('Failed: ' + ex.message); }
  }));
  // restore a soft-deleted model
  $$(`${root} .restore-model`).forEach(b => b.addEventListener('click', async () => {
    try { await API.upsertModelMeta(b.dataset.id, { hidden: false }); await renderModels(); }
    catch (ex) { alert('Failed: ' + ex.message); }
  }));
  // custom model → permanent delete (its meta row is the only place it exists)
  $$(`${root} .del-model`).forEach(b => b.addEventListener('click', async () => {
    if (!(await confirmAction(`Permanently delete "${b.dataset.name || 'this model'}"? This can't be undone.`, { title: 'Delete permanently', confirmLabel: 'Delete', danger: true }))) return;
    try { await API.deleteModelMeta(b.dataset.id); await renderModels(); }
    catch (ex) { alert('Failed: ' + ex.message); }
  }));
}

function wireAddModel() {
  $('#addModelForm').addEventListener('submit', async e => {
    e.preventDefault();
    const f = new FormData(e.target); const err = $('#addModelErr'), ok = $('#addModelOk');
    err.classList.add('hidden'); ok.classList.add('hidden');
    const slug = (f.get('name') || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const id = `custom-${slug || 'model'}-${Math.random().toString(36).slice(2, 6)}`;
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      await API.upsertModelMeta(id, {
        name: f.get('name'), wheels: f.get('wheels'), motor_w: Number(f.get('motor_w') || 0),
        battery: f.get('battery'), brakes: f.get('brakes'), srp: Number(f.get('srp') || 0),
        is_custom: true
      });
      // upload the staged photos in the chosen order (first = main card image)
      if (NEW_MODEL_PHOTOS.length) {
        btn.textContent = 'Uploading photos…';
        for (const p of NEW_MODEL_PHOTOS) { try { await API.addModelPhoto(id, p.blob); } catch (_) { } }
        NEW_MODEL_PHOTOS.forEach(p => URL.revokeObjectURL(p.url)); NEW_MODEL_PHOTOS = [];
        renderNewModelPhotos();
      }
      // seed 2 placeholder colour variants so the new model matches the rest
      try {
        await API.addVariant(id, { name: 'Red', colorHex: colorHexOf('Red'), sort: 0 });
        await API.addVariant(id, { name: 'Black', colorHex: colorHexOf('Black'), sort: 1 });
      } catch (_) { }
      ok.classList.remove('hidden'); e.target.reset(); await renderModels();
      toast('Model added with 2 placeholder colours.');
    } catch (ex) { err.textContent = ex.message + ' (Is the model_meta table set up?)'; err.classList.remove('hidden'); }
    finally { btn.disabled = false; btn.textContent = 'Add model'; }
  });
}

/* ================= E-BIKE REGISTRY (all owned units across all users) ================= */
let REG_QUERY = '', REG_WHEEL = 'all', REG_SORT = 'acquired-desc', REG_ROWS = null, REG_BRANCH = 'all';
const wheelLabelOf = w => (STORE.products.categories || {})[w] || w;

async function renderRegistry() {
  const host = $('#registryList');
  if (!host) return;
  let ebikes = [], users = [], meta = {};
  try { ebikes = await API.getAllUserEbikes(); } catch { }
  try { users = await API.getUsers(); } catch { }
  try { meta = await API.getModelMeta(); } catch { }
  await loadVariants();
  const userById = {}; users.forEach(u => userById[u.id] = u);
  const nameOf = id => (meta[id] && meta[id].name) || (STORE.modelById(id) || {}).name || id;
  const wheelsOf = id => (meta[id] && meta[id].wheels) || (STORE.modelById(id) || {}).wheels || 'other';
  REG_ROWS = ebikes.map(e => {
    const u = userById[e.user_id];
    return {
      e, owner: u ? (u.name || u.username) : '(unknown user)', memberId: u ? (u.memberId || '') : '', phone: u ? (u.phone || '') : '',
      branch: u ? u.branch : null,
      model: nameOf(e.model_id), wheels: wheelsOf(e.model_id),
      colour: e.color || (VARIANTS_BY_MODEL[e.model_id] || []).find(v => v.id === e.variant_id)?.name || '',
      payment: e.payment_mode || '', salePrice: (e.sale_price != null && e.sale_price !== '') ? Number(e.sale_price) : null,
      acquired: e.acquired_at || ''
    };
  });

  const cats = STORE.products.categories || {};
  const chips = [['all', 'All']].concat(Object.entries(cats));
  host.innerHTML = `
    <div class="reg-toolbar">
      <input class="user-search" id="regSearch" type="search" autocomplete="off" aria-label="Search registry" placeholder="Search chassis no., owner, model…" value="${esc(REG_QUERY)}" />
      <div class="reg-controls">
        <div class="reg-chips" id="regChips">
          ${chips.map(([k, l]) => `<button type="button" class="chip${k === REG_WHEEL ? ' is-active' : ''}" data-wheel="${esc(k)}">${esc(l)}</button>`).join('')}
        </div>
        <div class="reg-filters">
          <label class="reg-sort">Branch
            <select id="regBranch">${branchOptionsHtml(REG_BRANCH === 'all' ? '' : REG_BRANCH, { all: true, allLabel: 'All branches' })}</select>
          </label>
          <label class="reg-sort">Sort
            <select id="regSort">
              <option value="acquired-desc">Acquired: newest</option>
              <option value="acquired-asc">Acquired: oldest</option>
              <option value="owner">Owner A–Z</option>
            </select>
          </label>
        </div>
      </div>
    </div>
    <div id="regBody"></div>`;
  $('#regSearch').addEventListener('input', e => { REG_QUERY = e.target.value; paintRegistry(); });
  const regBranch = $('#regBranch');
  if (regBranch) regBranch.addEventListener('change', () => { REG_BRANCH = regBranch.value || 'all'; paintRegistry(); });
  const sortSel = $('#regSort'); sortSel.value = REG_SORT;
  sortSel.addEventListener('change', () => { REG_SORT = sortSel.value; paintRegistry(); });
  $$('#regChips .chip').forEach(b => b.addEventListener('click', () => {
    REG_WHEEL = b.dataset.wheel;
    $$('#regChips .chip').forEach(x => x.classList.toggle('is-active', x === b));
    paintRegistry();
  }));
  paintRegistry();
}

// filter/sort the cached rows and paint just the table (keeps the search box focused)
function paintRegistry() {
  const body = $('#regBody');
  if (!body || !REG_ROWS) return;
  let rows = REG_ROWS.slice();
  if (REG_WHEEL !== 'all') rows = rows.filter(r => r.wheels === REG_WHEEL);
  if (REG_BRANCH !== 'all') rows = rows.filter(r => r.branch === REG_BRANCH);
  const q = REG_QUERY.toLowerCase().trim();
  if (q) rows = rows.filter(r => `${r.e.chassis_no || ''} ${r.e.battery_no || ''} ${r.e.motor_no || ''} ${r.owner} ${r.memberId} ${r.model} ${r.colour}`.toLowerCase().includes(q));
  if (REG_SORT === 'acquired-desc') rows.sort((a, b) => (b.acquired || '').localeCompare(a.acquired || ''));
  else if (REG_SORT === 'acquired-asc') rows.sort((a, b) => (a.acquired || '').localeCompare(b.acquired || ''));
  else if (REG_SORT === 'owner') rows.sort((a, b) => a.owner.localeCompare(b.owner));

  const tr = rows.map(r => `<tr>
      <td data-label="Owner"><strong>${nt(r.owner)}</strong>${r.memberId ? ` <span class="reg-mid">${esc(r.memberId)}</span>` : ''}${r.phone ? `<div class="reg-sub"><a href="tel:${esc(r.phone)}">📞 ${esc(r.phone)}</a></div>` : ''}</td>
      <td data-label="Branch">${r.branch ? nt(branchShort(r.branch)) : '—'}</td>
      <td data-label="Model">${nt(r.model)}</td>
      <td data-label="Wheels">${esc(wheelLabelOf(r.wheels))}</td>
      <td data-label="Colour">${esc(r.colour || '—')}</td>
      <td data-label="Chassis no.">${esc(r.e.chassis_no || '—')}</td>
      <td data-label="Motor no.">${esc(r.e.motor_no || '—')}</td>
      <td data-label="Battery no.">${esc(r.e.battery_no || '—')}</td>
      <td data-label="Acquired">${esc(r.acquired || '—')}</td>
    </tr>`).join('');
  body.innerHTML = `
    <p class="section-lead">${rows.length} unit${rows.length === 1 ? '' : 's'}${REG_QUERY || REG_WHEEL !== 'all' || REG_BRANCH !== 'all' ? ' shown' : ' registered'}.</p>
    <div class="table-scroll">
      <table class="reg-table">
        <thead><tr><th>Owner</th><th>Branch</th><th>Model</th><th>Wheels</th><th>Colour</th><th>Chassis no.</th><th>Motor no.</th><th>Battery no.</th><th>Acquired</th></tr></thead>
        <tbody>${tr || '<tr><td colspan="9" class="reg-empty">No units match.</td></tr>'}</tbody>
      </table>
    </div>`;
}

/* ================= INBOX (customer messages) ================= */
let INBOX_OPEN = null, INBOX_POLL = null;
function shortTime(iso) {
  const d = new Date(iso); if (isNaN(d)) return '';
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay ? d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}
function renderChat(host, msgs, mySide) {
  if (!host) return;
  if (!msgs.length) { host.innerHTML = `<p class="chat-empty">No messages yet.</p>`; return; }
  host.innerHTML = msgs.map(m => {
    const mine = m.sender === mySide;
    const d = new Date(m.createdAt);
    const time = isNaN(d) ? '' : d.toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    return `<div class="bubble ${mine ? 'mine' : 'theirs'}"><div class="bubble-body">${esc(m.body)}</div><div class="bubble-time">${esc(time)}</div></div>`;
  }).join('');
}
let INBOX_UNREAD = 0;   // latest unread-message count (for the drawer badge + the dashboard Inbox tile)
function updateInboxBadge(n) {
  const el = $('#navInboxCount'); if (!el) return;
  el.textContent = n > 99 ? '99+' : String(n);
  el.classList.toggle('hidden', !n);
}
// keep the dashboard's Inbox tile (staff view) in sync with INBOX_UNREAD
function paintDashInbox() {
  const num = document.getElementById('dashInboxNum'); if (!num) return;
  num.textContent = INBOX_UNREAD;
  const dot = document.getElementById('dashInboxDot');
  if (dot) { dot.textContent = INBOX_UNREAD > 99 ? '99+' : INBOX_UNREAD; dot.hidden = !INBOX_UNREAD; }
  const sub = document.getElementById('dashInboxSub'); if (sub) sub.textContent = INBOX_UNREAD ? 'unread — tap to open' : 'all caught up';
  const tile = num.closest('.tile'); if (tile) tile.classList.toggle('has-unread', !!INBOX_UNREAD);
}
async function updateInboxBadgeCount() {
  let n = 0;
  try {
    const msgs = (await API.getAllMessages()).filter(m => m.sender === 'customer' && !m.read);
    if (isAdmin()) n = msgs.length;                       // admin: total unread across all branches
    else {
      // staff: their branch's unread, plus any branch-less/unknown thread (safety net, matches the inbox filter)
      const byId = {}; try { (await API.getUsers()).forEach(u => byId[u.id] = u); } catch { }
      n = msgs.filter(m => { const b = (byId[m.userId] || {}).branch; return b === myBranch() || !b; }).length;
    }
  } catch { }
  INBOX_UNREAD = n;
  updateInboxBadge(n);
  paintDashInbox();
}

/* ---------- #16: staff/admin notification bell — new/changed repair schedules ---------- */
let STAFF_NOTIF = [];
const staffNotifKey = () => `ll_staff_notif_${(ME && ME.id) || 'x'}`;
function wireStaffNotifications() {
  const bell = $('#notifBell'), panel = $('#notifPanel');
  if (!bell || !panel) return;
  bell.addEventListener('click', e => {
    e.stopPropagation();
    const show = panel.classList.toggle('hidden') === false;
    bell.setAttribute('aria-expanded', String(show));
    if (show) markStaffNotifSeen();
  });
  document.addEventListener('click', e => { if (!e.target.closest('.notif')) panel.classList.add('hidden'); });
  $('#notifList').addEventListener('click', e => { if (e.target.closest('.notif-item')) { panel.classList.add('hidden'); showView('repairs'); } });
}
async function refreshStaffNotifications() {
  let reps = [], users = {};
  try { reps = await API.getRepairs(); } catch { return; }
  try { (await API.getUsers()).forEach(u => users[u.id] = u); } catch { }
  const inScope = r => isAdmin() || ((r.branch || (users[r.userId] || {}).branch) === myBranch());
  reps = reps.filter(inScope);
  let seen = {};
  try { seen = JSON.parse(localStorage.getItem(staffNotifKey()) || '{}') || {}; } catch { }
  const nameOf = id => { const u = users[id]; return u ? (u.name || u.username) : 'A customer'; };
  const items = [];
  reps.forEach(r => {
    const sig = `${r.status}|${r.date}|${r.timeSlot || ''}`;
    if (!(r.id in seen)) {
      if (r.status !== 'done' && r.status !== 'cancelled') items.push({ text: `New booking from ${nameOf(r.userId)} on ${r.date || '—'}.` });
    } else if (seen[r.id] !== sig) {
      items.push({ text: `${nameOf(r.userId)}'s repair changed — now “${r.status}”.` });
    }
  });
  STAFF_NOTIF = items;
  const firstRun = !localStorage.getItem(staffNotifKey());
  if (firstRun) { seedStaffNotif(reps); STAFF_NOTIF = []; }
  paintStaffNotif();
}
function paintStaffNotif() {
  const list = $('#notifList'), dot = $('#notifDot');
  if (!list) return;
  if (!STAFF_NOTIF.length) { list.innerHTML = `<p class="notif-empty">You're all caught up.</p>`; if (dot) dot.classList.add('hidden'); return; }
  list.innerHTML = STAFF_NOTIF.map(i => `<button type="button" class="notif-item">🔔 ${esc(i.text)}</button>`).join('');
  if (dot) { dot.textContent = STAFF_NOTIF.length > 9 ? '9+' : String(STAFF_NOTIF.length); dot.classList.remove('hidden'); }
}
function seedStaffNotif(reps) {
  const snap = {}; reps.forEach(r => { snap[r.id] = `${r.status}|${r.date}|${r.timeSlot || ''}`; });
  try { localStorage.setItem(staffNotifKey(), JSON.stringify(snap)); } catch { }
}
async function markStaffNotifSeen() {
  let reps = [], users = {};
  try { reps = await API.getRepairs(); } catch { }
  try { (await API.getUsers()).forEach(u => users[u.id] = u); } catch { }
  const inScope = r => isAdmin() || ((r.branch || (users[r.userId] || {}).branch) === myBranch());
  seedStaffNotif(reps.filter(inScope));
  STAFF_NOTIF = []; const dot = $('#notifDot'); if (dot) dot.classList.add('hidden');
}
// two-pane inbox: thread list on the left, the open conversation on the right
let INBOX_THREADS = [], INBOX_BRANCH = null;
async function renderInbox() {
  const host = $('#inboxList'); if (!host) return;
  if (!isAdmin()) INBOX_BRANCH = myBranch();
  else if (INBOX_BRANCH == null) INBOX_BRANCH = 'all';
  let msgs = [], users = [];
  try { msgs = await API.getAllMessages(); }
  catch { host.innerHTML = '<p class="section-lead">Messaging isn\'t set up yet — run <code>messages.sql</code> in Supabase.</p>'; return; }
  try { users = await API.getUsers(); } catch { }
  const userById = {}; users.forEach(u => userById[u.id] = u);
  const threads = {};
  msgs.forEach(m => (threads[m.userId] ??= []).push(m));
  INBOX_THREADS = Object.entries(threads).map(([uid, list]) => {
    const last = list[list.length - 1], u = userById[uid];
    return {
      uid, u,
      branch: u ? u.branch : null,
      noBranch: !(u && u.branch),                       // legacy/unknown customer with no branch saved
      memberId: u ? u.memberId : null,                  // shown per thread so different customers are unmistakable
      name: u ? (u.name || u.username) : '(unknown user)',
      last, unread: list.filter(m => m.sender === 'customer' && !m.read).length
    };
  })
    // one thread per customer. Staff see their own branch's customers — plus any branch-less/unknown
    // thread as a safety net so a message is never silently hidden. Admin sees all (or a picked branch).
    .filter(t => isAdmin() ? (INBOX_BRANCH === 'all' || t.branch === INBOX_BRANCH) : (t.branch === myBranch() || t.noBranch))
    .sort((a, b) => (b.last.createdAt || '').localeCompare(a.last.createdAt || ''));

  const branchBar = isAdmin()
    ? `<div class="branch-bar"><label>Branch <select id="inboxBranchSel">${branchOptionsHtml(INBOX_BRANCH === 'all' ? '' : INBOX_BRANCH, { all: true, allLabel: 'All branches' })}</select></label><span class="ro-tag ok">✏️ Admin — all branches</span></div>`
    : '';
  host.innerHTML = branchBar + `<div class="inbox-wrap${INBOX_OPEN ? ' has-open' : ''}" id="inboxWrap">
      <div class="inbox-threads" id="inboxThreads"></div>
      <div class="inbox-conv" id="inboxConv"></div>
    </div>`;
  const bs = $('#inboxBranchSel');
  if (bs) bs.addEventListener('change', e => { INBOX_BRANCH = e.target.value || 'all'; INBOX_OPEN = null; renderInbox(); });
  paintInboxThreads();
  await paintConversation();
}
function paintInboxThreads() {
  const host = $('#inboxThreads'); if (!host) return;
  if (!INBOX_THREADS.length) { host.innerHTML = '<p class="inbox-empty">No messages yet. Customers can reach you from their member menu → 💬 Messages.</p>'; return; }
  host.innerHTML = INBOX_THREADS.map(r => `
    <button class="thread${r.unread ? ' has-unread' : ''}${r.uid === INBOX_OPEN ? ' is-active' : ''}" data-user="${esc(r.uid)}">
      <span class="thread-av">${esc((r.name || '?').trim().charAt(0).toUpperCase())}</span>
      <span class="thread-main">
        <span class="thread-top"><strong>${esc(r.name)}${r.memberId ? ` <span class="thread-id">${esc(r.memberId)}</span>` : ''}${isAdmin() && r.branch ? ` <span class="branch-tag" translate="no">📍 ${esc(branchShort(r.branch))}</span>` : ''}${r.noBranch ? ` <span class="branch-tag warn">⚠ no branch</span>` : ''}</strong><span class="thread-time">${esc(shortTime(r.last.createdAt))}</span></span>
        <span class="thread-prev">${r.last.sender === 'staff' ? 'You: ' : ''}${esc(r.last.body)}</span>
      </span>
      ${r.unread ? `<span class="thread-badge">${r.unread}</span>` : ''}
    </button>`).join('');
  $$('#inboxThreads .thread').forEach(b => b.addEventListener('click', async () => {
    INBOX_OPEN = b.dataset.user;
    const wrap = $('#inboxWrap'); if (wrap) wrap.classList.add('has-open');
    $$('#inboxThreads .thread').forEach(x => x.classList.toggle('is-active', x === b));
    await paintConversation();
  }));
}
async function paintConversation() {
  const host = $('#inboxConv'); if (!host) return;
  if (!INBOX_OPEN) {
    clearInterval(INBOX_POLL); INBOX_POLL = null;
    host.innerHTML = '<div class="conv-empty"><span class="conv-empty-ic">💬</span>Select a conversation to reply.</div>';
    return;
  }
  const userId = INBOX_OPEN;
  let msgs = [], u = null;
  try { msgs = await API.getMessages(userId); } catch { }
  try { u = (await API.getUsers()).find(x => x.id === userId); } catch { }
  const name = u ? (u.name || u.username) : '(customer)';
  const readOnly = false;   // #10: admin can reply too (full access), not just monitor
  host.innerHTML = `
    <div class="conv">
      <div class="conv-head">
        <button class="btn btn-ghost btn-sm conv-back" id="convBack" title="Back to inbox">←</button>
        <strong class="conv-name">${esc(name)}${readOnly && u && u.branch ? ` <span class="branch-tag" translate="no">📍 ${esc(branchShort(u.branch))}</span>` : ''}</strong>
        ${u && u.phone ? `<a class="btn btn-ghost btn-sm" href="tel:${esc(u.phone)}">📞 Call</a>` : ''}
      </div>
      <div class="chat-list" id="convList"></div>
      ${readOnly
      ? `<div class="conv-ro b-meta">👁 Monitoring only — replies are handled by the branch staff.</div>`
      : `<form class="chat-form" id="convForm">
        <input id="convInput" autocomplete="off" aria-label="Reply message" placeholder="Reply to ${esc(name)}…" required />
        <button class="btn btn-primary" type="submit">Send</button>
      </form>`}
    </div>`;
  renderChat($('#convList'), msgs, 'staff');
  const cl = $('#convList'); cl.scrollTop = cl.scrollHeight;
  // Only branch staff clear the unread flag (admin monitoring must not mark it seen).
  if (!readOnly) { try { await API.markMessagesRead(userId, 'customer'); updateInboxBadgeCount(); markThreadReadLocal(userId); } catch { } }
  $('#convBack').addEventListener('click', () => {
    INBOX_OPEN = null; clearInterval(INBOX_POLL); INBOX_POLL = null;
    const wrap = $('#inboxWrap'); if (wrap) wrap.classList.remove('has-open');
    paintInboxThreads(); paintConversation();
  });
  if (!readOnly) $('#convForm').addEventListener('submit', async e => {
    e.preventDefault();
    const inp = $('#convInput'), body = inp.value.trim();
    if (!body) return;
    inp.value = '';
    try { await API.sendMessage(userId, 'staff', body); await refreshConversation(userId); }
    catch (ex) { alert('Send failed: ' + ex.message); }
  });
  clearInterval(INBOX_POLL);
  INBOX_POLL = setInterval(() => {
    if ($('#convList') && INBOX_OPEN === userId) refreshConversation(userId);
    else { clearInterval(INBOX_POLL); INBOX_POLL = null; }
  }, 4000);
}
// keep the left list in sync after a thread is opened (clear its unread pip)
function markThreadReadLocal(userId) {
  const t = INBOX_THREADS.find(x => x.uid === userId);
  if (t && t.unread) { t.unread = 0; paintInboxThreads(); }
}
async function refreshConversation(userId) {
  const cl = $('#convList'); if (!cl) return;
  let msgs = []; try { msgs = await API.getMessages(userId); } catch { return; }
  renderChat(cl, msgs, 'staff');
  cl.scrollTop = cl.scrollHeight;
  if (!isAdmin()) { try { await API.markMessagesRead(userId, 'customer'); updateInboxBadgeCount(); } catch { } }
}

/* ================= SITE SETTINGS ================= */
const SETTING_KEYS = ['email', 'facebook', 'youtube', 'tiktok', 'address', 'hours', 'maps'];
// per-branch phone numbers, stored as JSON in site_settings.branch_phones ({branchKey: phone})
const branchInfo = (key) => ((STORE.content && STORE.content.branches) || {})[key] || {};
const branchPhonesMap = () => { try { return JSON.parse(SETTINGS.branch_phones || '{}') || {}; } catch { return {}; } };
const branchPhoneOf = (key) => String(branchPhonesMap()[key] || branchInfo(key).phone || '').trim();
// per-branch map locations, stored as JSON in site_settings.branch_maps ({key: {address, maps}})
const branchMapsMap = () => { try { return JSON.parse(SETTINGS.branch_maps || '{}') || {}; } catch { return {}; } };
let SETTINGS = {};                                            // last-loaded site_settings (used by the dashboard)

// predefined contact categories (staff just click to add a line)
const CONTACT_CATS = [
  { key: 'store', label: 'Store / Sales' },
  { key: 'repairs', label: 'Repairs / Service' },
  { key: 'financing', label: 'Home Credit / Financing' },
  { key: 'general', label: 'General Inquiries' }
];
const CONTACT_CAT_LABEL = Object.fromEntries(CONTACT_CATS.map(c => [c.key, c.label]));
// contacts = [{key,label,numbers:[]}] stored as JSON in site_settings; fall back to legacy `phone`
function parseContacts(settings, branch) {
  let cats = [];
  try { if (settings && settings.contacts) cats = JSON.parse(settings.contacts); } catch { }
  cats = (Array.isArray(cats) ? cats : [])
    .map(c => ({
      key: (c && c.key) || null,
      label: (c && c.key && CONTACT_CAT_LABEL[c.key]) || (c && c.label) || 'Contact',
      numbers: ((c && c.numbers) || []).map(n => String(n).trim()).filter(Boolean)
    }))
    .filter(c => c.numbers.length);
  if (!cats.length) {
    const fb = ((settings && settings.phone) || (branch && branch.phone) || '').trim();
    if (fb) cats = [{ key: 'store', label: CONTACT_CAT_LABEL.store, numbers: [fb] }];
  }
  return cats;
}
const primaryPhone = () => branchPhoneOf(HOME_BRANCH_KEY) || (Object.values(branchPhonesMap())[0] || '');
// one phone input per branch (main branch flagged as the site default)
function renderBranchPhonesEditor() {
  const host = $('#branchPhonesEditor'); if (!host) return;
  const m = branchPhonesMap();
  host.innerHTML = BRANCHES.map(b => {
    const val = (m[b.key] != null && m[b.key] !== '') ? m[b.key] : (branchInfo(b.key).phone || '');
    return `<label class="bp-row">${esc(b.name)}${b.key === HOME_BRANCH_KEY ? ' <span class="cc-star" title="Site default number">★ default</span>' : ''}
      <input class="bp-input" name="branchPhone" data-key="${esc(b.key)}" value="${esc(val)}" placeholder="e.g. 0997-955-8909" /></label>`;
  }).join('');
}
function gatherBranchPhones() {
  const out = {};
  $$('#branchPhonesEditor .bp-input').forEach(i => { const v = i.value.trim(); if (v) out[i.dataset.key] = v; });
  return out;
}
// address + Google Maps link per branch (drives the Location page + Get directions button)
function renderBranchMapsEditor() {
  const host = $('#branchMapsEditor'); if (!host) return;
  const m = branchMapsMap();
  host.innerHTML = BRANCHES.map(b => {
    const saved = m[b.key] || {};
    const info = branchInfo(b.key);
    const addr = (saved.address != null && saved.address !== '') ? saved.address : (info.address || '');
    const maps = (saved.maps != null && saved.maps !== '') ? saved.maps : (info.maps || '');
    return `<div class="bm-branch" data-key="${esc(b.key)}">
      <div class="bm-name">${esc(b.name)}${b.key === HOME_BRANCH_KEY ? ' <span class="cc-star" title="Main branch">★ main</span>' : ''}</div>
      <label class="bp-row">Address <input class="bm-addr" name="branchAddr" value="${esc(addr)}" placeholder="e.g. 13th Martyrs, Brgy. San Agustin, Trece Martires, Cavite" /></label>
      <label class="bp-row">Google Maps link (Get directions) <input class="bm-maps" name="branchMaps" value="${esc(maps)}" placeholder="https://maps.google.com/?q=..." /></label>
    </div>`;
  }).join('');
}
function gatherBranchMaps() {
  const out = {};
  $$('#branchMapsEditor .bm-branch').forEach(box => {
    const address = (box.querySelector('.bm-addr').value || '').trim();
    const maps = (box.querySelector('.bm-maps').value || '').trim();
    if (address || maps) out[box.dataset.key] = { address, maps };
  });
  return out;
}
// #11: operating hours per branch (shown to customers on the Location page)
const branchHoursMap = () => { try { return JSON.parse(SETTINGS.branch_hours || '{}') || {}; } catch { return {}; } };
function renderBranchHoursEditor() {
  const host = $('#branchHoursEditor'); if (!host) return;
  const m = branchHoursMap();
  host.innerHTML = BRANCHES.map(b => {
    const val = (m[b.key] != null && m[b.key] !== '') ? m[b.key] : (branchInfo(b.key).hours || '');
    return `<label class="bp-row">${esc(b.name)}${b.key === HOME_BRANCH_KEY ? ' <span class="cc-star" title="Main branch">★ main</span>' : ''}
      <input class="bh-input" name="branchHours" data-key="${esc(b.key)}" value="${esc(val)}" placeholder="e.g. Open daily 8:30 AM – 5:30 PM" /></label>`;
  }).join('');
}
function gatherBranchHours() {
  const out = {};
  $$('#branchHoursEditor .bh-input').forEach(i => { const v = i.value.trim(); if (v) out[i.dataset.key] = v; });
  return out;
}
function ccNumRow(n) {
  return `<div class="cc-num-row"><input class="cc-num" name="contactNum" aria-label="Contact number" value="${esc(n || '')}" placeholder="e.g. 0997-955-8909" /><button type="button" class="cc-del-num" title="Remove number">×</button></div>`;
}
function ccCatBlock(key, numbers) {
  const label = CONTACT_CAT_LABEL[key] || 'Contact';
  const nums = (numbers && numbers.length) ? numbers : [''];
  return `<div class="contact-cat" data-key="${esc(key)}">
    <div class="cc-head">
      <strong class="cc-cat-name">${esc(label)}${key === 'store' ? ' <span class="cc-star" title="Shown on the homepage">★ homepage</span>' : ''}</strong>
      <button type="button" class="cc-del-cat" title="Remove line">× Remove</button>
    </div>
    <div class="cc-numbers">${nums.map(ccNumRow).join('')}</div>
    <button type="button" class="btn btn-ghost btn-sm cc-add-num">+ Add number</button>
  </div>`;
}
function ccAddChips(presentKeys) {
  const remaining = CONTACT_CATS.filter(c => !presentKeys.has(c.key));
  return `<div class="cc-add-cats" id="ccAddCats">${remaining.length ? '<span class="cc-add-hint">Add a line:</span>' : ''}${remaining.map(c => `<button type="button" class="chip cc-add-cat" data-key="${c.key}">+ ${esc(c.label)}</button>`).join('')}</div>`;
}
function repaintContactChips() {
  const el = $('#ccAddCats'); if (!el) return;
  const present = new Set($$('#ccBlocks .contact-cat').map(b => b.dataset.key));
  el.outerHTML = ccAddChips(present);
}
function renderContactsEditor(cats) {
  const host = $('#contactsEditor'); if (!host) return;
  const keyed = (cats || []).filter(c => c.key);
  const present = new Set(keyed.map(c => c.key));
  host.innerHTML = `<div id="ccBlocks">${keyed.map(c => ccCatBlock(c.key, c.numbers)).join('')}</div>${ccAddChips(present)}`;
}
function gatherContacts() {
  return $$('#contactsEditor .contact-cat').map(block => ({
    key: block.dataset.key, label: CONTACT_CAT_LABEL[block.dataset.key] || 'Contact',
    numbers: $$('.cc-num', block).map(i => i.value.trim()).filter(Boolean)
  })).filter(c => c.numbers.length);
}
// delegated add/remove for the contacts editor (attached once; survives re-render)
function wireContactsEditor() {
  const host = $('#contactsEditor'); if (!host) return;
  host.addEventListener('click', e => {
    const addCat = e.target.closest('.cc-add-cat');
    if (e.target.closest('.cc-del-cat')) { e.target.closest('.contact-cat').remove(); repaintContactChips(); }
    else if (e.target.closest('.cc-add-num')) e.target.closest('.contact-cat').querySelector('.cc-numbers').insertAdjacentHTML('beforeend', ccNumRow(''));
    else if (e.target.closest('.cc-del-num')) e.target.closest('.cc-num-row').remove();
    else if (addCat) { $('#ccBlocks').insertAdjacentHTML('beforeend', ccCatBlock(addCat.dataset.key, [''])); repaintContactChips(); }
  });
}

async function renderSettings() {
  let s = {};
  try { s = await API.getSettings(); } catch (e) { /* table not set up yet */ }
  SETTINGS = s || {};
  const d = homeBranchInfo();
  SETTING_KEYS.forEach(k => {
    const el = document.querySelector(`#settingsForm [name="${k}"]`);
    if (el) el.value = (s[k] != null && s[k] !== '') ? s[k] : (d[k] || '');
  });
  renderBranchPhonesEditor();
  renderBranchMapsEditor();
  renderBranchHoursEditor();
  // theme dropdown
  const sel = $('#themeSelect');
  if (sel && typeof THEME_ORDER !== 'undefined') {
    sel.innerHTML = THEME_ORDER.map(k => `<option value="${k}">${esc(THEMES[k].label)}</option>`).join('');
    sel.value = s.active_theme || 'default';
  }
}
function wireSettings() {
  $('#settingsForm').addEventListener('submit', async e => {
    e.preventDefault();
    const ok = $('#settingsOk'), err = $('#settingsErr');
    ok.classList.add('hidden'); err.classList.add('hidden');
    if (!(await confirmAction('Save these site settings? Changes go live for everyone.', { title: 'Save settings', confirmLabel: 'Save settings' }))) return;
    const f = new FormData(e.target);
    const patch = {}; SETTING_KEYS.forEach(k => patch[k] = (f.get(k) || '').trim());
    patch.branch_phones = JSON.stringify(gatherBranchPhones());
    patch.branch_maps = JSON.stringify(gatherBranchMaps());
    patch.branch_hours = JSON.stringify(gatherBranchHours());
    patch.active_theme = ($('#themeSelect') && $('#themeSelect').value) || 'default';
    try { await API.updateSettings(patch); SETTINGS = { ...SETTINGS, ...patch }; ok.classList.remove('hidden'); toast('Settings saved — live for everyone.'); }
    catch (ex) { err.textContent = ex.message + ' (Is the site_settings table set up?)'; err.classList.remove('hidden'); }
  });
}

function fillModelOptions() {
  const sel = $('#ownedSelect');
  sel.innerHTML += STORE.products.models.map(m => `<option value="${m.id}">${esc(m.name)}</option>`).join('');
}

/* ---- users (module scope for in-place refresh) ---- */
let CUSTOMERS = [], STAFFS = [], EBIKES_BY_USER = {}, CUST_QUERY = '', REPAIRS_BY_USER = {};
const unitName = (id) => { const m = STORE.modelById(id); return m ? m.name : id; };

// one owned unit — shows its colour + serial numbers, with an inline Edit form
// one-line sale summary (payment · price [+ discount vs SRP] · note) — staff/admin only
function unitSaleLine(e) {
  const price = (e.sale_price != null && e.sale_price !== '') ? Number(e.sale_price) : null;
  const listed = listedPrice(e.model_id);
  const bits = [
    e.payment_mode && ('💳 ' + e.payment_mode),
    price != null && ('💰 ' + peso(price) + (listed && listed !== price ? ` · SRP ${peso(listed)}` : ''))
  ].filter(Boolean).map(esc).join(' · ');
  const note = e.sale_note ? `<div class="unit-meta b-meta">📝 ${esc(e.sale_note)}</div>` : '';
  return (bits ? `<div class="unit-meta b-meta unit-sale">${bits}</div>` : '') + note;
}
function unitRow(e, canEdit = true) {
  const vname = e.color || (VARIANTS_BY_MODEL[e.model_id] || []).find(v => v.id === e.variant_id)?.name || '';
  const serials = [e.chassis_no && 'Chassis: ' + e.chassis_no, e.battery_no && 'Battery: ' + e.battery_no, e.motor_no && 'Motor: ' + e.motor_no]
    .filter(Boolean).map(esc).join(' · ') || 'No serial numbers on file';
  return `<div class="unit-row-full" data-id="${esc(e.id)}" data-model="${esc(e.model_id)}">
    <div class="unit-head">
      <span class="unit-name">${esc(unitName(e.model_id))}${vname ? ` · <span class="unit-color">${esc(vname)}</span>` : ''}</span>
      ${canEdit ? `<span class="unit-actions">
        <button type="button" class="btn btn-ghost btn-sm unit-edit-btn" data-id="${esc(e.id)}">Edit</button>
        <button class="unit-x del-ebike" data-id="${esc(e.id)}" title="Remove unit">&times;</button>
      </span>` : ''}
    </div>
    <div class="unit-meta b-meta">${serials}${!canEdit && e.acquired_at ? ` · Acquired ${esc(e.acquired_at)}` : ''}</div>
    ${unitSaleLine(e)}
    ${canEdit ? `<form class="form unit-edit-form hidden" data-id="${esc(e.id)}" data-model="${esc(e.model_id)}">
      <div class="grid2">
        <label>Colour <select name="variantId">${variantOptions(e.model_id, e.variant_id)}</select></label>
        <div class="cf-labeled">Colour label ${colorLabelField(e.color, colorHexOf(e.color), false, '— colour —')}</div>
      </div>
      <div class="grid3">
        <label>Chassis no. <input name="chassisNo" value="${esc(e.chassis_no || '')}" /></label>
        <label>Battery no. <input name="batteryNo" value="${esc(e.battery_no || '')}" /></label>
        <label>Motor no. <input name="motorNo" value="${esc(e.motor_no || '')}" /></label>
      </div>
      <label>Acquired <input name="acquiredAt" type="date" value="${esc(e.acquired_at || '')}" /></label>
      <label>Sale note (staff only) <input name="saleNote" value="${esc(e.sale_note || '')}" placeholder="e.g. discount, 6-month Home Credit" /></label>
      <div class="row-actions"><button class="btn btn-primary btn-sm" type="submit">Save unit</button></div>
    </form>` : ''}
  </div>`;
}

// #17: where + when this customer's last repair was done
function lastRepairLine(u) {
  const mine = (REPAIRS_BY_USER[u.id] || []).filter(r => r.status === 'done');
  if (!mine.length) return `<div class="b-meta" style="color:var(--muted)">🧾 No completed repairs yet.</div>`;
  const last = mine.slice().sort((a, b) => String(b.completedAt || b.date || '').localeCompare(String(a.completedAt || a.date || '')))[0];
  const when = last.completedAt ? new Date(last.completedAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : (last.date || '—');
  const br = last.branch || u.branch;
  return `<div class="b-meta">🧾 Last repair: <strong>${esc(when)}</strong>${br ? ' at ' + nt(branchName(br)) : ''}</div>`;
}

function custRow(u, canEdit = true) {
  const units = EBIKES_BY_USER[u.id] || [];
  const models = STORE.products.models;
  const options = models.map(m => `<option value="${m.id}">${esc(m.name)}</option>`).join('');
  const firstModel = models.length ? models[0].id : '';
  return `<details class="acc" data-user="${esc(u.id)}">
    <summary>
      <span class="acc-left"><span class="acc-title">${esc(u.name || u.username)}</span></span>
      <span class="acc-right"><span class="acc-hint">Tap to expand</span><span class="acc-chev">▾</span></span>
    </summary>
    <div class="acc-body">
      <div class="b-meta">@${esc(u.username)} · ${esc(u.phone || 'no phone')} · ${esc(u.email || 'no email')}</div>
      <div class="b-meta">${esc(u.address || '—')}</div>
      ${lastRepairLine(u)}
      <div class="units-block">
        <div class="b-meta" style="margin-bottom:.35rem"><strong>Units (${units.length})</strong></div>
        ${units.map(e => unitRow(e, canEdit)).join('') || '<div class="b-meta" style="color:var(--muted)">No units yet.</div>'}
        ${canEdit ? `<div class="add-unit" data-user="${esc(u.id)}">
          <div class="add-unit-grid">
            <select class="unit-model" name="unitModel" aria-label="Model to add">${options}</select>
            <select class="unit-variant" name="variantId" aria-label="Colour">${variantOptions(firstModel, null)}</select>
            ${colorLabelField('', '', false, '— colour —')}
            <input name="chassisNo" placeholder="Chassis no." />
            <input name="batteryNo" placeholder="Battery no." />
            <input name="motorNo" placeholder="Motor no." />
            <input name="acquiredAt" type="date" title="Date acquired" value="${todayISO()}" />
            <input name="saleNote" placeholder="Sale note (staff only)" />
          </div>
          <button class="btn btn-ghost btn-sm add-ebike" data-user="${esc(u.id)}">Add unit</button>
        </div>` : ''}
      </div>
      ${canEdit ? `<button class="btn btn-ghost btn-sm del-user" data-id="${esc(u.id)}" data-name="${esc(u.name || u.username)}" style="margin-top:.7rem">Delete user</button>` : '<div class="b-meta" style="color:var(--muted);margin-top:.5rem">👁 View only — this customer belongs to another branch.</div>'}
    </div>
  </details>`;
}

function staffRow(u) {
  const isMe = ME && u.id === ME.id;
  return `<div class="branch staff-row">
    <div class="staff-id">
      ${avatarImg(u, 'avatar-lg')}
      <div>
        <h3>${esc(u.name || u.username)} <span class="home-badge">${esc(u.memberId || 'STAFF')}</span></h3>
        <div class="b-meta">@${esc(u.username)} · ${esc(u.phone || 'no phone')} · ${esc(u.email || 'no email')}</div>
        <div class="b-meta">${esc(u.address || '—')}</div>
        ${isMe ? '<div class="b-meta" style="color:var(--muted)">— this is you —</div>' : ''}
      </div>
    </div>
    ${isMe ? '' : `<button class="btn btn-ghost btn-sm del-user" data-id="${esc(u.id)}" data-name="${esc(u.name || u.username)}">Delete</button>`}
  </div>`;
}

// staff can edit the branch they belong to; admins are read-only oversight everywhere
// #10: admin has full edit access across every branch; staff edit only their own.
const canEditBranch = (branch) => isAdmin() || branch === myBranch();

function renderCustList() {
  const q = CUST_QUERY.toLowerCase().trim();
  const canEdit = canEditBranch(USERS_BRANCH);
  let list = CUSTOMERS.filter(u => u.branch === USERS_BRANCH);
  if (q) list = list.filter(u => `${u.name} ${u.username} ${u.memberId} ${u.phone} ${u.email}`.toLowerCase().includes(q));
  const head = $('#custHead');
  if (head) head.innerHTML = `${nt(branchName(USERS_BRANCH))} — Customers (${list.length})${canEdit ? '' : ' · view only'}`;
  $('#custList').innerHTML = list.map(u => custRow(u, canEdit)).join('') || '<p class="empty-note">No customers in this branch.</p>';
}

let USERS_BRANCH = null;   // which branch's customers the Users view is showing
async function renderUsers() {
  const users = await API.getUsers();
  CUSTOMERS = users.filter(u => u.role === 'customer');
  STAFFS = users.filter(u => u.role === 'staff');
  EBIKES_BY_USER = {};
  try { (await API.getAllUserEbikes()).forEach(e => (EBIKES_BY_USER[e.user_id] ??= []).push(e)); } catch { }
  REPAIRS_BY_USER = {};
  try { (await API.getRepairs()).forEach(r => (REPAIRS_BY_USER[r.userId] ??= []).push(r)); } catch { }   // #17
  if (!USERS_BRANCH) USERS_BRANCH = myBranch() || BRANCHES[0].key;

  // branch picker — staff's own branch is preselected (and shown first via the ordering)
  $('#usersList').innerHTML =
    `<div class="branch-bar">
       <label>Branch <select id="usersBranchSel">${branchOptionsHtml(USERS_BRANCH)}</select></label>
       ${isAdmin() ? '<span class="ro-tag ok">✏️ Admin — full access</span>' : '<span class="b-meta">You can edit only your own branch.</span>'}
     </div>
     <h3 id="custHead" style="margin:1rem 0 .6rem"></h3>
     <input class="user-search" id="custSearch" type="search" autocomplete="off" aria-label="Search customers" placeholder="Search customers by name, username, ID, phone…" value="${esc(CUST_QUERY)}" />
     <div class="scroll-list" id="custList"></div>`;
  $('#usersBranchSel').addEventListener('change', e => { USERS_BRANCH = e.target.value; renderCustList(); });
  $('#custSearch').addEventListener('input', e => { CUST_QUERY = e.target.value; renderCustList(); });
  renderCustList();
}

async function refreshUnits(userId) {
  try { EBIKES_BY_USER[userId] = await API.getUserEbikes(userId); } catch { }
  renderCustList();
  const det = document.querySelector(`details[data-user="${userId}"]`);
  if (det) det.open = true;
}

/* ---- scheduled repairs (tabbed: active work vs completed history) ---- */
let REPAIRS = [], REP_USERS = {}, REP_TAB = 'scheduled', REP_QUERY = '', REP_BRANCH = null, REP_HIST_SORT = 'newest';
const REPAIR_TYPES = ['Battery', 'Brakes', 'Tire / Wheel', 'Motor', 'Electrical / Wiring', 'Controller', 'Tune-up / General', 'Other'];
const repNameOf = id => { const u = REP_USERS[id]; return u ? (u.name || u.username) : id; };
const today10 = () => new Date().toISOString().slice(0, 10);
const peso = n => '₱' + Number(n).toLocaleString('en-PH');

async function renderRepairs() {
  REPAIRS = await API.getRepairs();
  REP_USERS = {};
  (await API.getUsers()).forEach(u => REP_USERS[u.id] = u);
  // staff see only their branch; admin sees all (or a branch picked from the dashboard)
  if (!isAdmin()) REP_BRANCH = myBranch();
  else if (REP_BRANCH == null) REP_BRANCH = VIEW_BRANCH || 'all';
  paintRepairs();
  renderDashboard();
}

// repairs visible under the current branch scope
function repairsInScope() {
  if (isAdmin()) return REP_BRANCH === 'all' ? REPAIRS : REPAIRS.filter(r => branchOfUser(r.userId) === REP_BRANCH);
  return REPAIRS.filter(r => branchOfUser(r.userId) === myBranch());
}

function paintRepairs() {
  const inScope = repairsInScope();
  const scheduled = inScope.filter(r => r.status !== 'done' && r.status !== 'cancelled').length;
  const done = inScope.filter(r => r.status === 'done' || r.status === 'cancelled').length;
  const branchBar = isAdmin()
    ? `<div class="branch-bar"><label>Branch <select id="repBranchSel">${branchOptionsHtml(REP_BRANCH === 'all' ? '' : REP_BRANCH, { all: true, allLabel: 'All branches' })}</select></label><span class="ro-tag">👁 Admin — all branches</span></div>`
    : `<div class="branch-bar"><span class="b-meta">Showing <strong>${nt(branchName(myBranch()))}</strong> repairs.</span></div>`;
  $('#repairsList').innerHTML = branchBar + `
    <div class="rep-toolbar"><button type="button" class="btn btn-primary" id="repNewBtn">➕ New repair</button></div>
    <div class="seg" role="tablist">
      <button class="seg-btn ${REP_TAB === 'scheduled' ? 'is-active' : ''}" data-tab="scheduled" role="tab">Scheduled <span class="seg-count">${scheduled}</span></button>
      <button class="seg-btn ${REP_TAB === 'done' ? 'is-active' : ''}" data-tab="done" role="tab">History <span class="seg-count">${done}</span></button>
    </div>
    ${REP_TAB === 'done' ? `<div class="hist-controls">
      <input class="user-search" id="repSearch" type="search" autocomplete="off" aria-label="Search repair history" placeholder="Search history by customer, model, or service…" value="${esc(REP_QUERY)}" />
      <label class="hist-sort">Sort <select id="repHistSort">
        <option value="newest"${REP_HIST_SORT === 'newest' ? ' selected' : ''}>Completed: newest</option>
        <option value="oldest"${REP_HIST_SORT === 'oldest' ? ' selected' : ''}>Completed: oldest</option>
      </select></label>
    </div>` : ''}
    <div id="repRows"></div>`;
  const bs = $('#repBranchSel');
  if (bs) bs.addEventListener('change', e => { REP_BRANCH = e.target.value || 'all'; paintRepairs(); });
  const nb = $('#repNewBtn'); if (nb) nb.addEventListener('click', openNewRepair);
  $$('#repairsList .seg-btn').forEach(b => b.addEventListener('click', () => { REP_TAB = b.dataset.tab; paintRepairs(); }));
  const s = $('#repSearch');
  if (s) s.addEventListener('input', e => { REP_QUERY = e.target.value; paintRepairRows(); });
  const hsel = $('#repHistSort');
  if (hsel) hsel.addEventListener('change', e => { REP_HIST_SORT = e.target.value; paintRepairRows(); });
  paintRepairRows();
}

// customer contact for a repair — phone to call, address to actually find the place
function repContact(u) {
  if (!u) return '';
  const maps = a => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a)}`;
  return `${u.phone ? `<div class="b-meta"><a href="tel:${esc(u.phone)}">📞 ${esc(u.phone)}</a></div>` : ''}
    ${u.address ? `<div class="b-meta">📍 <a href="${esc(maps(u.address))}" target="_blank" rel="noopener">${esc(u.address)}</a></div>`
      : '<div class="b-meta b-meta-missing">📍 No address on file</div>'}`;
}

function repMeta(r) {
  return `${r.repairType ? `<div class="b-meta">🔧 ${esc(r.repairType)}</div>` : ''}
    ${r.cost != null && r.cost !== '' ? `<div class="b-meta">💵 ${peso(r.cost)}</div>` : ''}
    ${r.notes ? `<div class="b-meta">📝 ${esc(r.notes)}</div>` : ''}`;
}

// the specific owned unit this repair is for (first match on model), + its colour/serials
function repUnit(r) { return (EBIKES_BY_USER[r.userId] || []).find(e => e.model_id === r.modelId); }
function colourOf(e) { return e && (e.color || (VARIANTS_BY_MODEL[e.model_id] || []).find(v => v.id === e.variant_id)?.name) || ''; }
const colourInline = (e) => { const c = colourOf(e); return c ? ` · <span class="unit-color">${esc(c)}</span>` : ''; };
// one-line serials for a repair row (compact — no stacked rows)
function repSerialLine(r) {
  const e = repUnit(r);
  const bits = e ? [e.chassis_no && ('Chassis ' + e.chassis_no), e.battery_no && ('Battery ' + e.battery_no), e.motor_no && ('Motor ' + e.motor_no)].filter(Boolean) : [];
  return bits.length ? `<div class="b-meta">🔩 ${bits.map(esc).join(' · ')}</div>` : '';
}
// compact unit-detail table for the repair EDIT modal
function repUnitSerials(e) {
  const rows = e ? [['Colour', colourOf(e)], ['Chassis no.', e.chassis_no], ['Battery no.', e.battery_no], ['Motor no.', e.motor_no]].filter(([, v]) => v) : [];
  if (!rows.length) return '<div class="b-meta b-meta-missing">No unit details on file</div>';
  return `<table class="spec-table sm">${rows.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</table>`;
}

// a small "which branch" tag for the admin oversight view
function repBranchTag(r) {
  if (!isAdmin()) return '';
  const b = branchOfUser(r.userId);
  return b ? ` <span class="branch-tag" translate="no">📍 ${esc(branchShort(b))}</span>` : '';
}

function scheduledRow(r) {
  const canEdit = true;   // #10: admin can manage repairs too (full remote control)
  const m = STORE.modelById(r.modelId);
  const overdue = r.date && r.date < today10();
  const next = r.status === 'pending' ? 'in-progress' : 'done';
  const u = REP_USERS[r.userId];
  return `<div class="branch rep-card${overdue ? ' rep-overdue' : ''}">
    <div>
      <h3>${esc(repNameOf(r.userId))} — ${esc(m ? m.name : r.modelId)}${colourInline(repUnit(r))}${repBranchTag(r)}</h3>
      <div class="b-meta">📅 ${esc(r.date || '—')} · ⏰ ${esc(r.timeSlot || '—')} · <span class="rep-pill rep-${esc(r.status)}">${esc(r.status)}</span>${overdue ? ' <span class="rep-pill rep-overdue-pill">overdue</span>' : ''}</div>
      ${repSerialLine(r)}
      ${repMeta(r)}
      ${repContact(u)}
    </div>
    ${canEdit ? `<div class="b-actions">
      <button class="btn btn-ghost btn-sm rep-edit" data-id="${esc(r.id)}">Edit</button>
      <button class="btn btn-ghost btn-sm rep-msg" data-user="${esc(r.userId)}">💬 Message</button>
      <button class="btn btn-primary btn-sm rep-next" data-id="${esc(r.id)}" data-next="${next}">Mark ${next}</button>
      <button class="btn btn-ghost btn-sm rep-cancel" data-id="${esc(r.id)}">Cancel</button>
    </div>` : ''}
  </div>`;
}

function doneRow(r) {
  const canEdit = true;   // #10: admin can manage repairs too (full remote control)
  const cancelled = r.status === 'cancelled';
  const m = STORE.modelById(r.modelId);
  const u = REP_USERS[r.userId];
  const when = r.completedAt ? new Date(r.completedAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
  return `<div class="branch rep-card${cancelled ? ' rep-cancelled' : ''}">
    <div>
      <h3>${esc(repNameOf(r.userId))} — ${esc(m ? m.name : r.modelId)}${colourInline(repUnit(r))}${repBranchTag(r)}</h3>
      <div class="b-meta">${cancelled ? `✖ Cancelled · booked ${esc(r.date || '—')}` : `✅ Completed ${esc(when)} · booked ${esc(r.date || '—')}`}</div>
      ${repSerialLine(r)}
      ${repMeta(r)}
      ${repContact(u)}
    </div>
    ${canEdit ? `<div class="b-actions">
      <button class="btn btn-ghost btn-sm rep-edit" data-id="${esc(r.id)}">Edit</button>
      <button class="btn btn-ghost btn-sm rep-msg" data-user="${esc(r.userId)}">💬 Message</button>
      <button class="btn btn-ghost btn-sm rep-reopen" data-id="${esc(r.id)}">Re-open</button>
      <button class="btn btn-ghost btn-sm rep-del" data-id="${esc(r.id)}">Delete</button>
    </div>` : ''}
  </div>`;
}

function paintRepairRows() {
  const host = $('#repRows');
  if (!host) return;
  const scoped = repairsInScope();
  if (REP_TAB === 'scheduled') {
    const list = scoped.filter(r => r.status !== 'done' && r.status !== 'cancelled').sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    host.innerHTML = list.map(scheduledRow).join('') || '<p class="empty-note">No scheduled repairs right now. 🎉</p>';
  } else {
    const q = REP_QUERY.toLowerCase().trim();
    let list = scoped.filter(r => r.status === 'done' || r.status === 'cancelled');
    if (q) list = list.filter(r => {
      const m = STORE.modelById(r.modelId);
      return `${repNameOf(r.userId)} ${m ? m.name : r.modelId} ${r.repairType || ''}`.toLowerCase().includes(q);
    });
    const histKey = r => r.completedAt || r.date || '';
    list.sort((a, b) => REP_HIST_SORT === 'oldest'
      ? histKey(a).localeCompare(histKey(b))
      : histKey(b).localeCompare(histKey(a)));
    const total = list.reduce((s, r) => s + (Number(r.cost) || 0), 0);
    host.innerHTML =
      (list.length ? `<p class="section-lead">${list.length} repair(s)${total ? ` · logged charges: <strong>${peso(total)}</strong>` : ''}</p>` : '') +
      (list.map(doneRow).join('') || '<p class="empty-note">No completed repairs yet.</p>');
  }
  wireRepairRows();
}

function wireRepairRows() {
  const byId = id => REPAIRS.find(r => r.id === id);
  $$('#repRows .rep-next').forEach(b => b.addEventListener('click', async () => {
    if (!(await confirmAction(`Mark this repair as “${b.dataset.next}”?`, { title: 'Update status', confirmLabel: `Mark ${b.dataset.next}` }))) return;
    b.disabled = true;
    try { await API.updateRepairStatus(b.dataset.id, b.dataset.next); await renderRepairs(); }
    catch (e) { alert('Failed: ' + e.message); b.disabled = false; }
  }));
  $$('#repRows .rep-reopen').forEach(b => b.addEventListener('click', async () => {
    if (!(await confirmAction('Re-open this repair? It moves back to Scheduled.', { title: 'Re-open repair', confirmLabel: 'Re-open' }))) return;
    b.disabled = true;
    try { await API.updateRepairStatus(b.dataset.id, 'pending'); await renderRepairs(); }
    catch (e) { alert('Failed: ' + e.message); b.disabled = false; }
  }));
  // Cancel = keep the record (status 'cancelled') so it still counts in reports.
  $$('#repRows .rep-cancel').forEach(b => b.addEventListener('click', async () => {
    if (!(await confirmAction('Cancel this repair? It stays in the history as cancelled.', { title: 'Cancel repair', confirmLabel: 'Cancel repair', danger: true }))) return;
    b.disabled = true;
    try { await API.updateRepairStatus(b.dataset.id, 'cancelled'); await renderRepairs(); }
    catch (e) { alert('Failed: ' + e.message); b.disabled = false; }
  }));
  $$('#repRows .rep-del').forEach(b => b.addEventListener('click', async () => {
    if (!(await confirmAction('Delete this repair record? This cannot be undone.', { title: 'Delete repair', confirmLabel: 'Delete', danger: true }))) return;
    b.disabled = true;
    try { await API.deleteRepair(b.dataset.id); await renderRepairs(); }
    catch (e) { alert('Delete failed: ' + e.message); b.disabled = false; }
  }));
  $$('#repRows .rep-edit').forEach(b => b.addEventListener('click', () => { const r = byId(b.dataset.id); if (r) openRepairEditor(r); }));
  $$('#repRows .rep-msg').forEach(b => b.addEventListener('click', () => { INBOX_OPEN = b.dataset.user; showView('inbox'); }));
}

/* ---------- #12: staff/admin create a repair on behalf of a customer ---------- */
function openNewRepair() {
  // customers in scope (staff: own branch; admin: whichever branch is selected, or all)
  const inScope = (c) => isAdmin() ? (REP_BRANCH === 'all' || !REP_BRANCH || c.branch === REP_BRANCH) : (c.branch === myBranch());
  const custs = CUSTOMERS.filter(inScope).sort((a, b) => (a.name || a.username || '').localeCompare(b.name || b.username || ''));
  const custOpts = custs.map(c => `<option value="${esc(c.id)}">${esc(c.name || c.username)}${c.branch ? ' — ' + esc(branchShort(c.branch)) : ''}</option>`).join('');
  $('#panelBody').innerHTML = `
    <h3 class="panel-title">➕ New repair</h3>
    <p class="panel-sub">Book a repair for a customer. Only e-bikes they own can be selected.</p>
    <form class="form" id="newRepForm">
      <label>Customer <select name="userId" id="nrCustomer" required><option value="" disabled selected>— choose a customer —</option>${custOpts}</select></label>
      <label>E-bike <select name="modelId" id="nrModel" required disabled><option value="">— pick a customer first —</option></select></label>
      <label>Service type <select name="repairType"><option value="">— not set —</option>${REPAIR_TYPES.map(t => `<option>${esc(t)}</option>`).join('')}</select></label>
      <label>Date <input name="date" id="nrDate" type="date" required min="${today10()}" /></label>
      <label>Time slot <select name="timeSlot" id="nrSlot" required disabled><option value="">— pick a date —</option></select></label>
      <p class="slot-hint" id="nrSlotHint"></p>
      <label>Notes <textarea name="notes" rows="3"></textarea></label>
      <p class="form-error hidden" id="nrErr"></p>
      <button class="btn btn-primary full" type="submit">Create repair</button>
    </form>`;
  $('#panelModal').classList.remove('hidden'); document.body.style.overflow = 'hidden';
  const REP_SLOTS = ['08:00–10:00', '10:00–12:00', '13:00–15:00', '15:00–17:00'];
  const custSel = $('#nrCustomer'), modelSel = $('#nrModel'), dateEl = $('#nrDate'), slotSel = $('#nrSlot'), slotHint = $('#nrSlotHint');
  custSel.addEventListener('change', () => {
    const units = EBIKES_BY_USER[custSel.value] || [];
    const seen = new Set();
    const opts = units.filter(e => !seen.has(e.model_id) && seen.add(e.model_id)).map(e => {
      const m = STORE.modelById(e.model_id); return `<option value="${esc(e.model_id)}">${esc(m ? m.name : e.model_id)}</option>`;
    }).join('');
    modelSel.innerHTML = opts || '<option value="">— this customer has no e-bike on file —</option>';
    modelSel.disabled = !opts;
  });
  const paintNrSlots = async () => {
    const date = dateEl.value;
    slotSel.disabled = true;
    if (!date) { slotSel.innerHTML = '<option value="">— pick a date —</option>'; slotHint.textContent = ''; return; }
    slotHint.textContent = 'Checking availability…';
    let taken = [];
    try { taken = (await API.getBookedSlots(date)).map(b => b.slot); } catch { }
    const free = REP_SLOTS.filter(s => !taken.includes(s));
    slotSel.innerHTML = REP_SLOTS.map(s => `<option value="${esc(s)}"${taken.includes(s) ? ' disabled' : ''}>${esc(s)}${taken.includes(s) ? ' — TAKEN' : ''}</option>`).join('');
    slotSel.value = free[0] || ''; slotSel.disabled = !free.length;
    slotHint.textContent = free.length ? `${free.length} of ${REP_SLOTS.length} slots open.` : 'All slots are booked on this date.';
  };
  dateEl.addEventListener('change', paintNrSlots);
  $('#newRepForm').addEventListener('submit', async e => {
    e.preventDefault();
    const err = $('#nrErr'); err.classList.add('hidden');
    const f = new FormData(e.target);
    const userId = f.get('userId'), modelId = f.get('modelId'), date = f.get('date'), slot = f.get('timeSlot');
    if (!userId || !modelId) { err.textContent = 'Please choose a customer and one of their e-bikes.'; err.classList.remove('hidden'); return; }
    if (!date || !slot) { err.textContent = 'Please pick a date and an open time slot.'; err.classList.remove('hidden'); return; }
    if (!(await confirmAction(`Create this repair for ${repNameOf(userId)}?`, { title: 'Create repair', confirmLabel: 'Create repair' }))) return;
    const cust = REP_USERS[userId];
    try {
      await API.createRepair({ userId, modelId, date, timeSlot: slot, repairType: f.get('repairType') || null, notes: f.get('notes') || '', branch: cust ? cust.branch : null });
      $('#panelModal').classList.add('hidden'); document.body.style.overflow = '';
      toast('Repair created.');
      await renderRepairs();
    } catch (ex) { err.textContent = ex.message; err.classList.remove('hidden'); }
  });
}

function openRepairEditor(r) {
  const m = STORE.modelById(r.modelId);
  const u = REP_USERS[r.userId];
  $('#panelBody').innerHTML = `
    <h3 class="panel-title">Edit repair</h3>
    <p class="panel-sub">${esc(repNameOf(r.userId))} · ${esc(m ? m.name : r.modelId)}</p>
    <div class="rep-contact">${repContact(u)}</div>
    <div class="rep-unit"><div class="rep-unit-head">Unit details</div>${repUnitSerials(repUnit(r))}</div>
    <form class="form" id="repEditForm">
      <label>Service type
        <select name="repairType">
          <option value="">— not set —</option>
          ${REPAIR_TYPES.map(t => `<option ${r.repairType === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}
        </select>
      </label>
      <label>Date <input name="date" type="date" value="${esc(r.date || '')}" min="${today10()}" /></label>
      <label>Time slot <input name="timeSlot" value="${esc(r.timeSlot || '')}" placeholder="e.g. 10:00–12:00" /></label>
      <label>Charge (₱) <input name="cost" type="number" min="0" step="1" value="${r.cost != null ? esc(r.cost) : ''}" /></label>
      <label>Notes <textarea name="notes" rows="3">${esc(r.notes || '')}</textarea></label>
      <p class="form-error hidden" id="repEditErr"></p>
      <button class="btn btn-primary" type="submit">Save changes</button>
    </form>`;
  $('#panelModal').classList.remove('hidden'); document.body.style.overflow = 'hidden';
  $('#repEditForm').addEventListener('submit', async e => {
    e.preventDefault();
    const f = new FormData(e.target), err = $('#repEditErr');
    err.classList.add('hidden');
    if (!(await confirmAction('Save changes to this repair?', { title: 'Save repair', confirmLabel: 'Save changes' }))) return;
    const num = v => { v = (v || '').toString().trim(); return v === '' ? null : Number(v); };
    try {
      await API.updateRepair(r.id, {
        repairType: f.get('repairType') || null, date: f.get('date') || null,
        timeSlot: f.get('timeSlot') || null, cost: num(f.get('cost')), notes: f.get('notes') || ''
      });
      $('#panelModal').classList.add('hidden'); document.body.style.overflow = '';
      await renderRepairs();
    } catch (ex) { err.textContent = ex.message + ' (Is the repairs-upgrade SQL run?)'; err.classList.remove('hidden'); }
  });
}

function wireCreate() {
  const owned = $('#ownedSelect'), details = $('#createUnitDetails'), vsel = $('#createVariant');
  const roleSel = $('#createForm [name="role"]'), branchSel = $('#createBranch');
  const createColorSlot = $('#createColorField'); if (createColorSlot) createColorSlot.innerHTML = colorLabelField('', '', false, '— colour —');

  // Admins can create customers, staff and other admins; staff can only create customers.
  roleSel.innerHTML = isAdmin()
    ? `<option value="customer">Customer</option><option value="staff">Staff</option><option value="admin">Admin</option>`
    : `<option value="customer">Customer</option>`;
  $('#createRoleWrap').classList.toggle('hidden', !isAdmin());
  if (isAdmin()) { $('#createTitle').textContent = 'Create User / Staff / Admin'; $('#createLead').textContent = 'Create a customer, a branch staff member, or another admin.'; }

  // Branch: staff locked to their own; admins pick (hidden when creating another admin).
  const syncBranchField = () => {
    const role = roleSel.value;
    if (role === 'admin') { $('#createBranchWrap').classList.add('hidden'); return; }
    $('#createBranchWrap').classList.remove('hidden');
    if (!branchSel.dataset.filled) {
      branchSel.innerHTML = isAdmin()
        ? `<option value="" selected disabled>— choose branch —</option>` + branchOptionsHtml('')
        : branchOptionsHtml(myBranch());
      branchSel.dataset.filled = '1';
    }
    if (!isAdmin()) { branchSel.value = myBranch(); branchSel.disabled = true; }
  };

  // show the unit-detail fields (colour + serial numbers) once a model is chosen
  const syncDetails = () => {
    const has = !!(owned.value && roleSel.value === 'customer');
    details.classList.toggle('hidden', !has);
    if (has) {
      fillVariantSelect(vsel, owned.value, null);
      const acq = details.querySelector('[name="acquiredAt"]'); if (acq && !acq.value) acq.value = todayISO();
    }
  };
  owned.addEventListener('change', syncDetails);
  roleSel.addEventListener('change', () => { syncDetails(); syncBranchField(); });
  vsel.addEventListener('change', () => autoColour(details, vsel));
  syncBranchField();

  $('#createForm').addEventListener('submit', async e => {
    e.preventDefault();
    const err = $('#createErr'), ok = $('#createOk');
    err.classList.add('hidden'); ok.classList.add('hidden');
    const f = new FormData(e.target);
    const role = f.get('role');
    const isCust = role === 'customer';
    const branch = role === 'admin' ? null : (!isAdmin() ? myBranch() : (f.get('branch') || ''));
    if (role !== 'admin' && !branch) { err.textContent = 'Please choose a branch.'; err.classList.remove('hidden'); return; }
    if (!(await confirmAction(`Create this ${role} account?`, { title: 'Create account', confirmLabel: 'Create account' }))) return;
    const modelId = isCust ? (f.get('ownedModelId') || null) : null;
    try {
      const u = await API.createUser({
        role, branch, name: f.get('name'), username: f.get('username'), password: f.get('password'),
        phone: f.get('phone'), email: f.get('email'), address: f.get('address'), ownedModelId: modelId
      });
      // record the purchased unit (multi-unit support) with its colour + serials; decrements branch stock
      if (isCust && modelId) {
        try {
          await API.addUserEbike(u.id, modelId, {
            variantId: f.get('variantId') || null, color: cfColorValue(details), branch,
            chassisNo: (f.get('chassisNo') || '').trim(), batteryNo: (f.get('batteryNo') || '').trim(),
            motorNo: (f.get('motorNo') || '').trim(), acquiredAt: (f.get('acquiredAt') || '').trim() || todayISO(),
            saleNote: (f.get('saleNote') || '').trim()
          });
          await loadVariants(); await loadStockMeta();
        } catch { }
      }
      ok.textContent = `Account created for ${u.name || u.username} (@${u.username}).`;
      ok.classList.remove('hidden');
      e.target.reset(); details.classList.add('hidden');
      if (createColorSlot) createColorSlot.innerHTML = colorLabelField('', '', false, '— colour —');
      toast(`Account created for ${u.name || u.username}.`);
      await renderUsers();
    } catch (ex) { err.textContent = ex.message; err.classList.remove('hidden'); }
  });
}

/* ================= STORE PHOTOS (upload · crop · delete) ================= */
let STORE_PHOTO_COUNT = 0;

async function defaultStorePhotos() {
  try { const j = await fetch('data/store-photos.json').then(r => r.json()); return j.photos || []; }
  catch { return []; }
}

async function renderStorePhotos() {
  const host = $('#photoList');
  let uploaded = [];
  try { uploaded = await API.getStorePhotos(); } catch (e) { /* bucket/table not set up yet */ }
  STORE_PHOTO_COUNT = uploaded.length;

  if (uploaded.length) {
    // every photo lives in Supabase → all deletable + reorderable
    host.innerHTML = uploaded.map((p, i) => `
      <div class="photo-item" data-id="${esc(p.id)}">
        <img src="${esc(p.url)}" alt="store photo" />
        <span class="photo-num">${i + 1}</span>
        <div class="photo-move">
          <button class="mv" data-dir="up" ${i === 0 ? 'disabled' : ''} title="Move earlier">↑</button>
          <button class="mv" data-dir="down" ${i === uploaded.length - 1 ? 'disabled' : ''} title="Move later">↓</button>
        </div>
        <button class="del" title="Delete" data-path="${esc(p.path || '')}">&times;</button>
      </div>`).join('');
    const ids = uploaded.map(p => p.id);
    $$('#photoList .del').forEach(b => b.addEventListener('click', async () => {
      if (!(await confirmAction('Delete this photo?', { title: 'Delete photo', confirmLabel: 'Delete', danger: true }))) return;
      b.disabled = true;
      const id = b.closest('.photo-item').dataset.id;
      try { await API.deleteStorePhoto(id, b.dataset.path); await renderStorePhotos(); }
      catch (e) { alert('Delete failed: ' + e.message); b.disabled = false; }
    }));
    $$('#photoList .mv').forEach(b => b.addEventListener('click', async () => {
      const id = b.closest('.photo-item').dataset.id;
      const idx = ids.indexOf(id), j = idx + (b.dataset.dir === 'up' ? -1 : 1);
      if (j < 0 || j >= ids.length) return;
      [ids[idx], ids[j]] = [ids[j], ids[idx]];
      host.style.opacity = '.5';
      try { await API.reorderStorePhotos(ids); await renderStorePhotos(); }
      finally { host.style.opacity = ''; }
    }));
  } else {
    // fallback: bundled defaults (shown only if nothing in the cloud yet)
    const defaults = await defaultStorePhotos();
    host.innerHTML = defaults.map(url => `
      <div class="photo-item"><img src="${esc(url)}" alt="store photo" /><span class="tagdefault">built-in</span></div>`).join('')
      || '<p class="empty-note">No photos yet. Upload one above.</p>';
  }
}

/* ---- upload + crop ---- */
const Crop = { img: null, CW: 360, CH: 270, scale: 1, base: 1, px: 0, py: 0, ratio: '4:3', ratios: ['1:1', '4:3', '3:4'] };
// crop-box display dimensions per ratio (longest side ≈ 360px; output is scaled up in saveCrop)
const CROP_DIMS = { '1:1': [360, 360], '4:3': [360, 270], '3:4': [270, 360] };
const RATIO_LABEL = { '1:1': 'a square (1:1)', '4:3': '4:3 (landscape)', '3:4': '3:4 (portrait)' };

function wireStorePhotos() {
  const input = $('#photoInput'), err = $('#photoErr');
  input.addEventListener('change', () => {
    err.classList.add('hidden');
    const file = input.files && input.files[0];
    input.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { err.textContent = 'Please choose an image file.'; err.classList.remove('hidden'); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); openCropper(img, async blob => { await API.addStorePhoto(blob); await renderStorePhotos(); }); };
    img.onerror = () => { err.textContent = 'Could not read that image.'; err.classList.remove('hidden'); };
    img.src = url;
  });

  // modal close
  $$('#cropModal [data-close], #cropModal').forEach(el => el.addEventListener('click', e => {
    // e.target.closest handles Google Translate wrapping the ✕ text in a <font> tag
    if (e.target === el || e.target.closest('[data-close]')) closeCrop();
  }));
  $('#cropZoom').addEventListener('input', e => setZoom(parseFloat(e.target.value)));
  $('#cropSave').addEventListener('click', saveCrop);
  $('#cropReset').addEventListener('click', () => { if (!Crop.img) return; $('#cropZoom').value = '1'; setZoom(1, true); });
  $$('#cropRatios .crop-ratio').forEach(b => b.addEventListener('click', () => { if (Crop.img) setRatio(b.dataset.ratio); }));
  wireCropDrag();
}

// opts.ratio: '1:1' | '4:3' | '3:4' (default '4:3'). opts.ratios: which choices to offer.
// opts.lock (or legacy opts.shape==='square'): single fixed ratio, hides the chooser.
function openCropper(img, onSave, opts = {}) {
  Crop.img = img;
  Crop.onSave = onSave || null;
  const square = opts.shape === 'square';
  const lock = opts.lock || square;
  Crop.ratios = lock ? [opts.ratio || (square ? '1:1' : '4:3')] : (opts.ratios || ['1:1', '4:3', '3:4']);
  const start = opts.ratio || (square ? '1:1' : '4:3');
  paintCropRatios(lock);
  setRatio(Crop.ratios.includes(start) ? start : Crop.ratios[0], true);
  $('#cropErr').classList.add('hidden');
  $('#cropModal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
// render the ratio chooser buttons (hidden when the crop shape is locked, e.g. avatars)
function paintCropRatios(lock) {
  const host = $('#cropRatios'); if (!host) return;
  host.classList.toggle('hidden', !!lock || Crop.ratios.length < 2);
  $$('#cropRatios .crop-ratio').forEach(b => { b.hidden = !Crop.ratios.includes(b.dataset.ratio); });
}
// switch the crop box to a ratio: resize canvas, refit the image, reset zoom, redraw
function setRatio(r, recenter) {
  if (!CROP_DIMS[r]) r = '4:3';
  Crop.ratio = r;
  [Crop.CW, Crop.CH] = CROP_DIMS[r];
  const cc = $('#cropCanvas'); cc.width = Crop.CW; cc.height = Crop.CH;
  Crop.base = Math.max(Crop.CW / Crop.img.naturalWidth, Crop.CH / Crop.img.naturalHeight);
  $('#cropZoom').value = '1';
  setZoom(1, true);
  const note = $('#cropModal .modal-note');
  if (note) note.textContent = `Drag to reposition · use the slider to zoom (zoom out to fit the whole photo). It will be cropped to ${RATIO_LABEL[r] || r}.`;
  $$('#cropRatios .crop-ratio').forEach(b => b.classList.toggle('is-active', b.dataset.ratio === r));
}
function closeCrop() { $('#cropModal').classList.add('hidden'); document.body.style.overflow = ''; Crop.img = null; }

function eff() { return Crop.base * Crop.scale; }
// Free positioning: the photo can be dragged/zoomed anywhere (white fills any gap). No clamping —
// the initial view is centred by setZoom(1,true) and the Reset button restores it.
function clamp() { }
function setZoom(z, recenter) {
  const old = eff();
  const cx = recenter ? Crop.img.naturalWidth / 2 : (Crop.CW / 2 - Crop.px) / old;
  const cy = recenter ? Crop.img.naturalHeight / 2 : (Crop.CH / 2 - Crop.py) / old;
  Crop.scale = z;
  Crop.px = Crop.CW / 2 - cx * eff();
  Crop.py = Crop.CH / 2 - cy * eff();
  clamp(); drawCrop();
}
function drawCrop() {
  const c = $('#cropCanvas'), ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);   // preview the white padding saveCrop outputs
  const dW = Crop.img.naturalWidth * eff(), dH = Crop.img.naturalHeight * eff();
  ctx.drawImage(Crop.img, Crop.px, Crop.py, dW, dH);
}
function wireCropDrag() {
  const c = $('#cropCanvas');
  let drag = false, lx = 0, ly = 0;
  const toCanvas = (clientX, clientY) => { const r = c.getBoundingClientRect(); const s = Crop.CW / r.width; return [(clientX - r.left) * s, (clientY - r.top) * s]; };
  const start = (x, y) => { drag = true;[lx, ly] = toCanvas(x, y); };
  const move = (x, y) => { if (!drag) return; const [cx, cy] = toCanvas(x, y); Crop.px += cx - lx; Crop.py += cy - ly; lx = cx; ly = cy; clamp(); drawCrop(); };
  const end = () => drag = false;
  c.addEventListener('mousedown', e => start(e.clientX, e.clientY));
  window.addEventListener('mousemove', e => move(e.clientX, e.clientY));
  window.addEventListener('mouseup', end);
  c.addEventListener('touchstart', e => { start(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
  c.addEventListener('touchmove', e => { move(e.touches[0].clientX, e.touches[0].clientY); e.preventDefault(); }, { passive: false });
  c.addEventListener('touchend', end);
}

async function saveCrop() {
  if (!Crop.img) return;
  const btn = $('#cropSave'), err = $('#cropErr');
  err.classList.add('hidden');
  // render output at 1200px wide, matching the current crop's aspect ratio
  const OW = 1200, OH = Math.round(OW * Crop.CH / Crop.CW), ratio = OW / Crop.CW;
  const out = document.createElement('canvas'); out.width = OW; out.height = OH;
  const ctx = out.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, OW, OH);
  const dW = Crop.img.naturalWidth * eff() * ratio, dH = Crop.img.naturalHeight * eff() * ratio;
  ctx.drawImage(Crop.img, Crop.px * ratio, Crop.py * ratio, dW, dH);
  const blob = await new Promise(res => out.toBlob(res, 'image/jpeg', 0.85));
  if (!blob) { err.textContent = 'Could not process image.'; err.classList.remove('hidden'); return; }
  btn.disabled = true; btn.textContent = 'Uploading…';
  try {
    if (Crop.onSave) await Crop.onSave(blob);
    closeCrop();
  } catch (e) {
    err.textContent = e.message + ' (Is the Supabase store-photos bucket + SQL set up?)';
    err.classList.remove('hidden');
  } finally { btn.disabled = false; btn.textContent = 'Save photo'; }
}

/* ================= STAFF MENU (hamburger: profile · logout) ================= */
function wireStaffMenu(me) {
  $('#staffMenuName').textContent = `Hi, ${me.name || me.username}`;
  const ham = $('#staffHamburger'), dd = $('#staffDropdown');
  ham.addEventListener('click', e => { e.stopPropagation(); dd.classList.toggle('hidden'); ham.setAttribute('aria-expanded', String(!dd.classList.contains('hidden'))); });
  document.addEventListener('click', e => { if (!e.target.closest('#staffMenu')) dd.classList.add('hidden'); });
  $('#staffProfileBtn').addEventListener('click', () => { dd.classList.add('hidden'); openStaffProfile(me); });
  $$('#panelModal [data-close], #panelModal').forEach(el => el.addEventListener('click', ev => {
    // e.target.closest handles Google Translate wrapping the ✕ text in a <font> tag
    if (ev.target === el || ev.target.closest('[data-close]')) { $('#panelModal').classList.add('hidden'); document.body.style.overflow = ''; }
  }));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { $('#panelModal').classList.add('hidden'); document.body.style.overflow = ''; } });
}

function openStaffProfile(me) {
  $('#panelBody').innerHTML = `
    <h3 class="panel-title">Profile</h3>
    <p class="panel-sub">Member ID: <strong>${esc(me.memberId || '—')}</strong> · @${esc(me.username)}</p>
    <div class="avatar-edit">
      ${avatarImg(me, 'avatar-xl')}
      <div class="avatar-edit-actions">
        <button type="button" class="btn btn-ghost btn-sm" id="stAvatarBtn">${me.avatarUrl ? 'Change photo' : 'Add photo'}</button>
        ${me.avatarUrl ? '<button type="button" class="btn btn-ghost btn-sm" id="stAvatarRemove">Remove</button>' : ''}
        <p class="form-error hidden" id="stAvatarErr"></p>
      </div>
    </div>
    <form class="form" id="stProfileForm">
      <label>Full name <input name="name" autocomplete="name" value="${esc(me.name)}" /></label>
      <label>Email <input name="email" type="email" autocomplete="email" value="${esc(me.email)}" /></label>
      <label>Phone <input name="phone" autocomplete="tel" value="${esc(me.phone)}" /></label>
      <label>Address <input name="address" autocomplete="street-address" value="${esc(me.address)}" /></label>
      <p class="form-ok hidden" id="stProfOk">Saved.</p>
      <button class="btn btn-primary" type="submit">Save changes</button>
    </form>
    <hr style="margin:1.4rem 0;border:0;border-top:1px solid var(--line)">
    <h4 style="margin-bottom:.6rem">Change password</h4>
    <form class="form" id="stPwForm">
      <label>Current password <input name="current" type="password" autocomplete="current-password" required /></label>
      <label>New password <input name="next" type="password" autocomplete="new-password" required minlength="4" /></label>
      <p class="form-error hidden" id="stPwErr"></p>
      <p class="form-ok hidden" id="stPwOk">Password updated.</p>
      <button class="btn btn-login" type="submit">Update password</button>
    </form>`;
  $('#panelModal').classList.remove('hidden'); document.body.style.overflow = 'hidden';

  // avatar: upload+crop (square) or remove
  const avErr = $('#stAvatarErr');
  const saveAvatar = async (avatarUrl) => {
    avErr.classList.add('hidden');
    const u = await API.updateUser(me.id, { avatarUrl });
    Object.assign(me, u);
    openStaffProfile(me);          // re-render with the new photo
    paintStaffAvatars(me);
    await renderUsers();
  };
  $('#stAvatarBtn').addEventListener('click', () => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = () => {
      const file = inp.files && inp.files[0];
      if (!file || !file.type.startsWith('image/')) return;
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        openCropper(img, async blob => {
          try { await saveAvatar(await API.uploadAvatar(blob)); }
          catch (e) { avErr.textContent = e.message; avErr.classList.remove('hidden'); throw e; }
        }, { shape: 'square' });
      };
      img.src = url;
    };
    inp.click();
  });
  const rm = $('#stAvatarRemove');
  if (rm) rm.addEventListener('click', async () => {
    try { await saveAvatar(null); } catch (e) { avErr.textContent = e.message; avErr.classList.remove('hidden'); }
  });

  $('#stProfileForm').addEventListener('submit', async e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const u = await API.updateUser(me.id, { name: f.get('name'), email: f.get('email'), phone: f.get('phone'), address: f.get('address') });
    Object.assign(me, u);
    $('#stProfOk').classList.remove('hidden');
    $('#staffName').textContent = `Signed in as ${u.name || u.username}`;
    $('#staffMenuName').textContent = `Hi, ${u.name || u.username}`;
    $('#drawerName').textContent = u.name || u.username;
    paintStaffAvatars(me);
    await renderUsers();
  });
  $('#stPwForm').addEventListener('submit', async e => {
    e.preventDefault();
    const f = new FormData(e.target); const err = $('#stPwErr'), ok = $('#stPwOk');
    err.classList.add('hidden'); ok.classList.add('hidden');
    try { await API.changePassword(me.id, f.get('current'), f.get('next')); ok.classList.remove('hidden'); e.target.reset(); }
    catch (ex) { err.textContent = ex.message; err.classList.remove('hidden'); }
  });
}
