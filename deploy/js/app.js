/* app.js — renders the public page from real data and wires up login + member area. */

// small inline-SVG placeholder for models we don't have photos of yet (uses the logo colors)
function modelPlaceholder() {
  return `<svg class="ph-mark" viewBox="0 0 120 90" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="30" cy="70" r="12" stroke="#e11b22" stroke-width="5"/>
    <circle cx="90" cy="70" r="12" stroke="#e11b22" stroke-width="5"/>
    <path d="M30 70 L52 40 H78 L90 70" stroke="#fff" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M52 40 L60 22 H80" stroke="#fff" stroke-width="5" stroke-linecap="round"/>
  </svg>`;
}

const ICONS = {
  facebook: '<svg viewBox="0 0 24 24"><path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.6.8-1.6 1.6V12h2.7l-.4 2.9h-2.3v7A10 10 0 0 0 22 12Z"/></svg>',
  youtube: '<svg viewBox="0 0 24 24"><path d="M23 7.5a3 3 0 0 0-2.1-2.1C19 4.8 12 4.8 12 4.8s-7 0-8.9.6A3 3 0 0 0 1 7.5 31 31 0 0 0 .5 12 31 31 0 0 0 1 16.5a3 3 0 0 0 2.1 2.1c1.9.6 8.9.6 8.9.6s7 0 8.9-.6a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.5 31 31 0 0 0-.5-4.5ZM9.8 15.3V8.7l5.7 3.3-5.7 3.3Z"/></svg>',
  viber: '<svg viewBox="0 0 24 24"><path d="M17 2H7a5 5 0 0 0-5 5v6a5 5 0 0 0 4 4.9V22l3.3-2.2H17a5 5 0 0 0 5-5V7a5 5 0 0 0-5-5Zm-4.7 4.2c2.2 0 4 1.7 4.1 3.9 0 .3-.4.3-.4 0-.1-1.9-1.6-3.4-3.7-3.5-.3 0-.3-.4 0-.4Zm-.2 1.4c1.4 0 2.5 1 2.6 2.4 0 .3-.4.3-.4 0-.1-1.1-1-1.9-2.2-2-.3 0-.3-.4 0-.4Zm4.6 6.6c-.3.6-1 1.2-1.6 1.3-.5.1-1 .3-3.4-.9-2.8-1.4-4.5-4.4-4.6-4.6-.1-.2-1-1.5-1-2.8 0-1.3.7-1.9 1-2.1.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.7 1.8c.1.2.1.4 0 .5l-.4.5c-.2.2-.3.3-.1.6.2.3.7 1.2 1.6 1.9 1.1.9 1.9 1.2 2.2 1.4.3.1.4.1.6-.1l.6-.7c.2-.3.4-.2.6-.1l1.6.8c.3.1.4.2.5.3.1.3.1.6-.2 1.1Z"/></svg>',
  phone: '<svg viewBox="0 0 24 24"><path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.4 0 .7-.2 1l-2.2 2.2Z"/></svg>',
  tiktok: '<svg viewBox="0 0 24 24"><path d="M16.6 5.8a4.8 4.8 0 0 1-1.1-2.8h-2.9v11.5c0 1.4-1.1 2.5-2.5 2.5a2.5 2.5 0 0 1 0-5c.26 0 .5.04.74.11V9.14a5.4 5.4 0 0 0-.74-.05 5.4 5.4 0 1 0 5.4 5.4V8.9a7.6 7.6 0 0 0 4.3 1.33V7.35a4.8 4.8 0 0 1-3.2-1.55Z"/></svg>'
};

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// nt(): escape + wrap a proper noun (branch / model / brand name) so Google Translate won't mangle it
const nt = (s) => `<span translate="no">${esc(s)}</span>`;

/* ---------- #1: red asterisk on required fields ---------- */
// Insert a red * right after the label text for any label wrapping a required control.
// Idempotent + driven by a MutationObserver so dynamically-rendered forms get marked too.
function markRequired(root = document) {
  root.querySelectorAll('label').forEach(label => {
    const ctrl = label.querySelector(':scope > input[required], :scope > select[required], :scope > textarea[required]');
    if (!ctrl) return;
    if (label.querySelector(':scope > .req-line')) return;          // already marked
    const first = label.firstChild;                                  // the leading label text node
    if (!first || first.nodeType !== 3 || !first.textContent.trim()) return;
    // wrap "label text" + "*" in ONE inline span so they share a line (labels are flex-column)
    const line = document.createElement('span');
    line.className = 'req-line';
    label.insertBefore(line, first);
    line.appendChild(first);
    const star = document.createElement('span');
    star.className = 'req'; star.textContent = ' *';
    star.setAttribute('aria-hidden', 'true'); star.title = 'required';
    line.appendChild(star);
  });
}
let _reqObsTimer = null;
function startRequiredObserver() {
  markRequired();
  const obs = new MutationObserver(() => {
    clearTimeout(_reqObsTimer);
    _reqObsTimer = setTimeout(() => markRequired(), 80);
  });
  obs.observe(document.body, { childList: true, subtree: true });
}

/* ---------- #7: styled confirmation dialog (replaces native confirm) ---------- */
// Resolves true on Confirm, false on Cancel / backdrop. Use before data-changing actions.
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
    const done = (val) => {
      host.classList.add('hidden'); document.body.style.overflow = '';
      yes.onclick = no.onclick = host.onclick = null;
      resolve(val);
    };
    yes.onclick = () => done(true);
    no.onclick = () => done(false);
    host.onclick = (e) => { if (e.target === host) done(false); };
  });
}

let C = {};        // content.json cache
let MODELS = [];   // effective models (base products.json + staff model_meta)
let MY_EBIKES = []; // the signed-in customer's owned units (full rows, incl. serials)
let JUST_ONBOARDED = false; // true right after a forced temp-password change → prompt profile completion

// compact, present-only detail bits for one owned unit
function unitBits(e) {
  if (!e) return [];
  return [e.color && ('🎨 ' + e.color), e.chassis_no && ('Chassis ' + e.chassis_no),
  e.battery_no && ('Battery ' + e.battery_no), e.motor_no && ('Motor ' + e.motor_no)].filter(Boolean);
}
const ebikeForModel = (modelId) => MY_EBIKES.find(e => e.model_id === modelId);

// merge a base model with its staff meta row (snake_case from Supabase)
function applyMeta(base, x) {
  return {
    ...base,
    name: (x && x.name != null && x.name !== '') ? x.name : base.name,
    wheels: (x && x.wheels != null && x.wheels !== '') ? x.wheels : base.wheels,
    motorW: (x && x.motor_w != null && x.motor_w !== '') ? Number(x.motor_w) : base.motorW,
    battery: (x && x.battery != null && x.battery !== '') ? x.battery : base.battery,
    brakes: (x && x.brakes != null && x.brakes !== '') ? x.brakes : base.brakes,
    srp: (x && x.srp != null && x.srp !== '') ? Number(x.srp) : base.srp,
    onSale: !!(x && x.on_sale),
    saleCash: x && x.sale_cash != null ? Number(x.sale_cash) : null,
    saleCc: x && x.sale_cc != null ? Number(x.sale_cc) : null,
    saleHc: x && x.sale_hc != null ? Number(x.sale_hc) : null,
    isNew: !!(x && x.is_new),
    sold: !!(x && x.sold),
    color: (x && x.color) || '',
    branch: (x && x.branch) || '',
    sort: x && x.sort != null ? x.sort : 0
  };
}
function customBase(x) {
  return { id: x.id, name: x.name || 'New Model', wheels: x.wheels || '4-wheels', motorW: x.motor_w || 0, battery: x.battery || '', brakes: x.brakes || '', srp: x.srp || 0, images: [] };
}
function computeModels(meta) {
  const base = STORE.products.models;
  const out = [];
  base.forEach(m => { const x = meta[m.id]; if (x && (x.hidden || x.sold)) return; out.push(applyMeta(m, x)); });
  Object.values(meta).forEach(x => { if (x.is_custom && !base.find(b => b.id === x.id) && !x.hidden && !x.sold) out.push(applyMeta(customBase(x), x)); });
  return out;
}
const modelById2 = (id) => MODELS.find(m => m.id === id) || STORE.modelById(id);

document.addEventListener('DOMContentLoaded', init);

async function init() {
  await API.init();
  await STORE.load();
  C = STORE.content;
  // The home / "THIS BRANCH" highlight is the main branch (Buhay na Tubig, Imus).
  const brandInfo = C.home || {};                 // content.json "home" (brand/tagline) — capture before repointing
  C.branches = C.branches || {};
  C.home = C.branches[C.mainBranch || HOME_BRANCH_KEY] || {};
  if (!C.home.tagline) C.home.tagline = brandInfo.tagline || 'Quality Ride. Trusted Performance.';

  // apply staff-editable site settings over the defaults (Phase 2)
  let settings = {};
  try { settings = await API.getSettings(); } catch { }
  ['phone', 'email', 'facebook', 'youtube', 'tiktok', 'address', 'hours', 'maps'].forEach(k => {
    if (settings[k] != null && settings[k] !== '') C.home[k] = settings[k];
  });
  // per-branch phone numbers (admin-editable in Site Settings) override content.json; each branch's
  // number shows on the Location page, and the main branch's is the site's default.
  try {
    const bp = JSON.parse(settings.branch_phones || '{}') || {};
    Object.keys(bp).forEach(k => { if (C.branches[k] && String(bp[k] || '').trim()) C.branches[k].phone = String(bp[k]).trim(); });
  } catch { }
  // per-branch address + Google Maps link (admin-editable) override content.json
  try {
    const bm = JSON.parse(settings.branch_maps || '{}') || {};
    Object.keys(bm).forEach(k => {
      if (!C.branches[k] || !bm[k]) return;
      if (String(bm[k].address || '').trim()) C.branches[k].address = String(bm[k].address).trim();
      if (String(bm[k].maps || '').trim()) C.branches[k].maps = String(bm[k].maps).trim();
    });
  } catch { }
  // #11: per-branch operating hours (admin-editable in Site Settings) override content.json;
  // shown on the Location page per branch.
  try {
    const bh = JSON.parse(settings.branch_hours || '{}') || {};
    Object.keys(bh).forEach(k => { if (C.branches[k] && String(bh[k] || '').trim()) C.branches[k].hours = String(bh[k]).trim(); });
  } catch { }
  C.home.contacts = parseContacts(settings, C.home);
  const firstNum = primaryNumber();                    // main branch number = the site default
  if (firstNum) C.home.phone = firstNum;
  const urlTheme = new URLSearchParams(location.search).get('theme');
  applyTheme(urlTheme || settings.active_theme || 'default');

  // load staff model edits (badges/sale/price/custom); fall back to base list
  let meta = {};
  try { meta = await API.getModelMeta(); } catch { }
  MODELS = computeModels(meta);

  // attach staff-uploaded photos + colour variants.
  // General photos (variant_id null) form the default gallery; each variant keeps its own set.
  try {
    let photos = [], variants = [];
    try { photos = await API.getAllModelPhotos(); } catch { }
    try { variants = await API.getAllModelVariants(); } catch { }
    const photosByModel = {}, variantsByModel = {};
    photos.forEach(p => (photosByModel[p.model_id] ??= []).push(p));
    variants.forEach(v => (variantsByModel[v.model_id] ??= []).push(v));
    MODELS.forEach(m => {
      const ps = photosByModel[m.id] || [];
      const general = ps.filter(p => !p.variant_id).map(p => p.url);
      if (general.length) m.images = general;   // uploaded main photo(s) REPLACE the bundled default (bundled only shows when nothing's uploaded)
      m.variants = (variantsByModel[m.id] || []).map(v => ({
        id: v.id, name: v.name, colorHex: v.color_hex,
        images: ps.filter(p => p.variant_id === v.id).map(p => p.url)
      }));
    });
  } catch { }

  renderHeaderInfo();
  renderStoreGallery();
  renderStore();
  wireProducts();
  wireProductRoute();
  renderWhy();
  renderAbout();
  wireAbout();
  renderLocation();
  wireLocation();
  renderSocials();
  renderMessengerFab();
  wireModals();
  wireLogin();
  wireSignup();
  wireAccount();
  wireNav();
  await refreshAuthUI();
  setupAnimations();
  startRequiredObserver();   // #1: red * on required fields (incl. dynamically-rendered forms)
}

/* ---------------- header scroll shadow ---------------- */
function wireNav() {
  // subtle shadow on header once scrolled (nav itself now lives in the left drawer, wired in wireLogin)
  const header = $('#siteHeader');
  const onScroll = () => header.style.boxShadow = window.scrollY > 8 ? '0 6px 24px rgba(0,0,0,.25)' : 'none';
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
}

function setupAnimations() {
  if (!('IntersectionObserver' in window)) return; // graceful fallback: everything visible
  document.body.classList.add('reveal-on');
  const targets = $$('.section-title, .section-lead, .model-card, .why-card, .branch, .contact-card, .about-body');
  targets.forEach(el => el.classList.add('reveal')); // mark all first
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  targets.forEach(el => {
    // stagger items that sit in the same grid/container
    const sibs = [...(el.parentElement?.children || [])].filter(c => c.classList.contains('reveal'));
    el.style.transitionDelay = Math.min(Math.max(sibs.indexOf(el), 0), 6) * 55 + 'ms';
    io.observe(el);
  });
}

/* ---------------- store gallery (hero slideshow) ---------------- */
async function loadStorePhotos() {
  // prefer cloud (staff-managed) photos; fall back to bundled defaults if none/unreachable
  try {
    const rows = await API.getStorePhotos();
    if (rows && rows.length) return rows.map(p => p.url);
  } catch { }
  try {
    const j = await fetch('data/store-photos.json').then(r => r.json());
    return j.photos || [];
  } catch { return []; }
}

async function renderStoreGallery() {
  const photos = await loadStorePhotos();
  const left = $('#heroLeft'), right = $('#heroRight'), mobile = $('#heroMobile');
  if (!photos.length) { [left, right, mobile].forEach(e => e && (e.style.display = 'none')); return; }

  const polaroid = (tilt) => {
    const d = document.createElement('div');
    d.className = 'polaroid';
    d.style.setProperty('--tilt', tilt + 'deg');
    d.innerHTML = `<div class="frame"><img alt="Lucky Lion store" /></div>`;
    return d;
  };
  const tilts = [-3, 2, 3, -2];
  const slots = [];
  // desktop: 2 left, 2 right
  [[left, 0], [left, 1], [right, 2], [right, 3]].forEach(([host, i]) => {
    const p = polaroid(tilts[i]); host.appendChild(p);
    slots.push(p.querySelector('img'));
  });
  // mobile: single photo with ‹ › slide controls
  const mp = polaroid(-1.5);
  const wrap = document.createElement('div');
  wrap.className = 'hero-mobile-wrap';
  const prev = document.createElement('button');
  prev.className = 'hero-nav prev'; prev.type = 'button'; prev.setAttribute('aria-label', 'Previous photo'); prev.textContent = '‹';
  const next = document.createElement('button');
  next.className = 'hero-nav next'; next.type = 'button'; next.setAttribute('aria-label', 'Next photo'); next.textContent = '›';
  wrap.append(prev, mp, next);
  mobile.appendChild(wrap);
  const mImg = mp.querySelector('img');
  const dots = document.createElement('div');
  dots.className = 'hero-dots';
  dots.innerHTML = photos.slice(0, Math.min(photos.length, 8)).map((_, i) => `<i class="${i === 0 ? 'on' : ''}"></i>`).join('');
  mobile.appendChild(dots);

  // seed initial images (distinct where possible)
  const state = slots.map((img, i) => {
    const idx = i % photos.length; img.src = photos[idx]; return idx;
  });
  let mIdx = 0; mImg.src = photos[0];

  const swap = (img, url) => { img.classList.add('fading'); setTimeout(() => { img.src = url; img.onload = () => img.classList.remove('fading'); }, 420); };

  // mobile prev/next controls
  const updateDots = () => [...dots.children].forEach((d, i) => d.classList.toggle('on', i === mIdx % dots.children.length));
  const showMobile = (i) => { mIdx = (i + photos.length) % photos.length; swap(mImg, photos[mIdx]); updateDots(); };
  prev.addEventListener('click', () => showMobile(mIdx - 1));
  next.addEventListener('click', () => showMobile(mIdx + 1));

  // tap any hero photo to advance it to the next one
  if (photos.length > 1) {
    slots.forEach((img, i) => {
      const cell = img.closest('.polaroid') || img;
      cell.style.cursor = 'pointer';
      cell.title = 'Click for the next photo';
      cell.addEventListener('click', () => { state[i] = (state[i] + 1) % photos.length; swap(img, photos[state[i]]); });
    });
    mp.style.cursor = 'pointer';
    mImg.addEventListener('click', () => showMobile(mIdx + 1));
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || photos.length <= slots.length) {
    // still rotate mobile even with few photos, but skip desktop churn if not enough
  }

  // desktop: fade one random slot to a fresh photo every ~2.6s
  if (photos.length > 1) {
    setInterval(() => {
      const s = Math.floor(Math.random() * slots.length);
      let next; let guard = 0;
      do { next = Math.floor(Math.random() * photos.length); guard++; }
      while (state.includes(next) && guard < 12);
      state[s] = next; swap(slots[s], photos[next]);
    }, 2600);

    // mobile: advance sequentially every ~4s
    setInterval(() => showMobile(mIdx + 1), 4000);
  }
}

/* ---------------- seasonal theme ---------------- */
function motifSvg(emojis, opacity, size) {
  size = size || 150;
  const cells = [[18, 52], [92, 40], [52, 116], [126, 128], [14, 132]];
  const txt = emojis.map((e, i) => { const [x, y] = cells[i % cells.length]; return `<text x='${x}' y='${y}' font-size='30'>${e}</text>`; }).join('');
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'><g opacity='${opacity}'>${txt}</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
function bowSvg(c1, c2) {
  return `<svg viewBox="0 0 64 42" xmlns="http://www.w3.org/2000/svg">
    <path d="M32 22 C22 6 2 8 6 22 C2 34 24 32 32 22 Z" fill="${c1}"/>
    <path d="M32 22 C42 6 62 8 58 22 C62 34 40 32 32 22 Z" fill="${c1}"/>
    <path d="M29 24 L18 42 L31 33 Z" fill="${c1}"/>
    <path d="M35 24 L46 42 L33 33 Z" fill="${c1}"/>
    <ellipse cx="32" cy="22" rx="6.5" ry="7" fill="${c2}"/>
  </svg>`;
}
function silhouetteSvg(key) {
  const white = 'rgba(255,255,255,.9)';
  if (key === 'summer') {
    return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='240' height='96'><g fill='${white}'><rect x='44' y='48' width='6' height='48'/><path d='M47 48 Q22 42 10 52 Q32 44 47 54 Q26 36 16 30 Q40 42 47 52 Q45 34 54 28 Q49 46 49 54Z'/><rect x='168' y='42' width='7' height='54'/><path d='M171 42 Q142 35 128 47 Q152 38 171 50 Q146 30 135 24 Q162 38 171 48 Q168 30 178 24 Q172 44 173 50Z'/></g></svg>`)}")`;
  }
  // default: pine tree line (winter / festive), bases anchored to the bottom
  return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='240' height='96'><g fill='${white}'><polygon points='26,96 6,96 16,50'/><polygon points='36,96 16,96 26,58'/><polygon points='80,96 50,96 65,34'/><polygon points='122,96 96,96 109,56'/><polygon points='172,96 134,96 153,28'/><polygon points='220,96 188,96 204,50'/></g></svg>`)}")`;
}
function setSilhouette() {
  // silhouettes removed per request
  const hero = $('#hero'); if (!hero) return;
  const el = hero.querySelector('.hero-silhouette'); if (el) el.remove();
}
function applyTheme(key) {
  if (typeof THEMES === 'undefined') return;
  const t = THEMES[key] || THEMES.default;
  const motifs = (typeof THEME_MOTIFS !== 'undefined' && THEME_MOTIFS[key]) || [];
  const fc = (typeof THEME_FRAME !== 'undefined' && THEME_FRAME[key]) || ['#e11b22', '#ffffff'];
  const decor = $('#themeDecor'), ribbon = $('#themeRibbon'), hero = $('#hero');
  document.querySelectorAll('.theme-topper').forEach(e => e.remove());
  const addTopper = (wrap) => { if (!wrap) return; const s = document.createElement('span'); s.className = 'theme-topper'; s.innerHTML = bowSvg(fc[0], fc[1]); wrap.appendChild(s); };
  if (key && key !== 'default') {
    document.body.dataset.theme = key;
    if (decor) decor.style.background = motifs.length ? `${motifSvg(motifs, 0.07, 155)} repeat, ${t.page}` : (t.page || '');
    if (hero) hero.style.setProperty('--hero-motif', motifs.length ? motifSvg(motifs, 0.13, 135) : 'none');
    if (ribbon) { ribbon.style.background = t.ribbon; ribbon.textContent = `${t.emoji} ${t.label} — now on!`; ribbon.classList.remove('hidden'); }
    addTopper(document.querySelector('.brand .logo-wrap'));
    addTopper(document.querySelector('.hero-logo-wrap'));
    heroParticles((typeof THEME_FALL !== 'undefined' && THEME_FALL[key]) || '');
    setSilhouette(key);
  } else {
    delete document.body.dataset.theme;
    if (decor) decor.style.background = '';
    if (hero) hero.style.removeProperty('--hero-motif');
    if (ribbon) ribbon.classList.add('hidden');
    heroParticles('');
    setSilhouette('');
  }
}
function heroParticles(emoji) {
  const hero = $('#hero'); if (!hero) return;
  const old = hero.querySelector('.hero-fall'); if (old) old.remove();
  if (!emoji) return;
  const layer = document.createElement('div'); layer.className = 'hero-fall'; layer.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 20; i++) {
    const s = document.createElement('span');
    s.textContent = emoji;
    s.style.left = Math.random() * 100 + '%';
    s.style.fontSize = (10 + Math.random() * 16) + 'px';
    s.style.opacity = (0.35 + Math.random() * 0.5).toFixed(2);
    s.style.animationDuration = (6 + Math.random() * 8) + 's';
    s.style.animationDelay = (-Math.random() * 12) + 's';
    layer.appendChild(s);
  }
  hero.insertBefore(layer, hero.firstChild);
}

/* ---------------- contact numbers (predefined categories, each with 1+ numbers) ---------------- */
// Predefined category keys → labels. The 'store' line is the one shown on the homepage.
const CONTACT_CAT_LABEL = { store: 'Store / Sales', repairs: 'Repairs / Service', financing: 'Home Credit / Financing', general: 'General Inquiries' };
// Parse the staff-saved `contacts` JSON; fall back to the legacy single `phone`.
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
const telHref = (n) => `tel:${String(n).replace(/[^0-9+]/g, '')}`;
function allContactNumbers() {
  return (C.home.contacts || []).flatMap(c => c.numbers.map(number => ({ label: c.label, number })));
}
// The homepage/header number: the Store line's first number, else the first of anything.
function primaryNumber() {
  const cats = C.home.contacts || [];
  const store = cats.find(c => c.key === 'store' && c.numbers.length);
  return (store ? store.numbers[0] : (cats[0] && cats[0].numbers[0])) || '';
}
// One shared "choose a number" picker. preferKey narrows to that category (e.g. repairs) when it exists.
function openContactPicker(preferKey) {
  let cats = C.home.contacts || [];
  if (preferKey) { const pref = cats.find(c => c.key === preferKey && c.numbers.length); if (pref) cats = [pref]; }
  const total = cats.reduce((n, c) => n + c.numbers.length, 0);
  if (total <= 1) { const n = (cats[0] && cats[0].numbers[0]) || primaryNumber(); if (n) window.location.href = telHref(n); return; }
  const host = $('#contactPickList');
  host.innerHTML = cats.map(c => `
    <div class="pick-cat">
      <div class="pick-cat-label">${esc(c.label || 'Contact')}</div>
      ${c.numbers.map(n => `<a class="pick-num" href="${esc(telHref(n))}">${ICONS.phone}<span class="pick-no">${esc(n)}</span><span class="pick-go">Call →</span></a>`).join('')}
    </div>`).join('');
  showModal('#contactModal');
}

/* ---------------- header contact + socials ---------------- */
function renderHeaderInfo() {
  $('#heroTagline').textContent = C.home?.tagline || 'Quality Ride. Trusted Performance.';
}

function socialLinks() {
  const t = C.home;
  const out = [];
  if (t.facebook) out.push(['facebook', t.facebook]);
  if (t.youtube) out.push(['youtube', t.youtube]);
  if (t.tiktok) out.push(['tiktok', t.tiktok]);
  return out;
}
function renderSocials() {
  const html = socialLinks().map(([k, url]) =>
    `<a href="${esc(url)}" target="_blank" rel="noopener" aria-label="${k}">${ICONS[k]}</a>`).join('');
  $('#hdrSocials').innerHTML = html;
  $('#footerSocials').innerHTML = html;
}

/* ---------------- floating Messenger button (per-branch picker) ---------------- */
// Best Messenger link for a branch: explicit `messenger`, else derived from its Facebook URL.
function messengerUrl(b) {
  if (!b) return '';
  if (b.messenger) return b.messenger;
  const fb = b.facebook || '';
  if (!fb) return '';
  // facebook.com/people/Name/<id>/  or  facebook.com/p/Name-<id>/  → m.me/<id>
  let m = fb.match(/facebook\.com\/(?:people|p)\/[^/?#]*?(\d{6,})/i);
  if (m) return `https://m.me/${m[1]}`;
  // facebook.com/<vanity>/  → m.me/<vanity>
  m = fb.match(/facebook\.com\/([^/?#]+)/i);
  if (m && m[1] && !['people', 'p', 'pages', 'profile.php'].includes(m[1].toLowerCase())) return `https://m.me/${m[1]}`;
  return fb;   // last resort: open the Facebook page itself
}
function renderMessengerFab() {
  const list = $('#fabMsgList'); if (!list) return;
  const homeKey = C.mainBranch || HOME_BRANCH_KEY;
  const branches = C.branches || {};
  const mainMsg = messengerUrl(branches[homeKey]) || messengerUrl(C.home) || '';
  list.innerHTML = BRANCHES.map(x => {
    const b = branches[x.key] || {};
    const url = messengerUrl(b) || mainMsg || (b.facebook || '');
    if (!url) return '';
    return `<a class="fab-msg-item" href="${esc(url)}" target="_blank" rel="noopener" role="menuitem">
      <span class="fab-msg-name">${esc(x.name)}${x.key === homeKey ? ' <span class="fab-msg-tag">Main</span>' : ''}</span>
      <span class="fab-msg-go" aria-hidden="true">›</span></a>`;
  }).join('');

  const wrap = $('#fabMsgWrap'), btn = $('#fabMessenger'), menu = $('#fabMsgMenu');
  if (!wrap || !btn || !menu) return;
  const close = () => { menu.classList.add('hidden'); btn.setAttribute('aria-expanded', 'false'); };
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = menu.classList.toggle('hidden');   // toggle returns true when 'hidden' was ADDED
    btn.setAttribute('aria-expanded', String(open ? false : true));
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('#fabMsgWrap')) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}

/* ---------------- store ---------------- */
function priceHtml(m) {
  // Cards stay clean (no price); the price is shown on each unit's dedicated page (#product/<id>).
  return '';
}
function badgesHtml(m) {
  return `${m.onSale ? '<span class="badge badge-sale"><span class="badge-ic">🔥</span>SALE</span>' : ''}${m.isNew ? '<span class="badge badge-new"><span class="badge-ic">✨</span>NEW</span>' : ''}`;
}
function modelCard(m) {
  const label = STORE.products.categories[m.wheels] || '';
  return `<button class="model-card" data-model="${m.id}">
    <div class="model-thumb">
      <span class="ph-tag">${esc(label)}</span>
      <span class="card-badges">${badgesHtml(m)}</span>
      ${m.images && m.images.length
      ? `<img class="model-photo" src="${esc(m.images[0])}" alt="${esc(m.name)}" loading="lazy" onerror="this.remove()" />${modelPlaceholder()}`
      : modelPlaceholder()}
    </div>
    <div class="model-body">
      <div class="model-name">${nt(m.name)}</div>
      ${priceHtml(m)}
    </div>
  </button>`;
}
// pick a representative product for a category tile: On Sale → New → lowest sort
function featuredForCategory(key) {
  const list = MODELS.filter(m => m.wheels === key);
  const rank = m => (m.onSale ? 0 : (m.isNew ? 1 : 2));
  return list.slice().sort((a, b) => rank(a) - rank(b) || (a.sort || 0) - (b.sort || 0))[0] || null;
}
// one category tile for the homepage showcase
function categoryTile(key, featured) {
  const label = STORE.products.categories[key] || key;
  const count = MODELS.filter(m => m.wheels === key).length;
  const img = featured && featured.images && featured.images.length
    ? `<img class="ct-photo" src="${esc(featured.images[0])}" alt="${esc(label)}" loading="lazy" onerror="this.remove()" />${modelPlaceholder()}`
    : modelPlaceholder();
  return `<button class="cat-tile${key === '4-wheels' ? ' feature' : ''}" data-cat="${esc(key)}">
      <div class="ct-thumb">${img}</div>
      <div class="ct-body">
        <div class="ct-name">${esc(label)}</div>
        <div class="ct-count">${count} model${count === 1 ? '' : 's'}</div>
      </div>
    </button>`;
}
function renderStore() {
  const host = $('#storeGroups');
  // homepage shows only 3 category tiles: 3 Wheels (left) · 4 Wheels (center) · 2 Wheels (right)
  const order = ['3-wheels', '4-wheels', '2-wheels'];
  const tiles = order.map(k => categoryTile(k, featuredForCategory(k))).join('');
  host.innerHTML = `
    <div class="cat-tiles">${tiles}</div>
    <div class="store-more">
      <button class="btn btn-primary see-more-products" type="button">See more Lucky Lion products →</button>
    </div>`;
  // a tile opens the Products page focused on that category
  $$('.cat-tile', host).forEach(b => b.addEventListener('click', () => { PRODUCTS_CAT = b.dataset.cat; location.hash = '#products'; }));
  const seeMore = $('.see-more-products', host);
  if (seeMore) seeMore.addEventListener('click', () => { PRODUCTS_CAT = 'all'; location.hash = '#products'; });

  // Store nav dropdown: All + one link per category, each opening the Products page
  buildStoreSubmenu([{ cat: 'all', label: 'All products' }].concat(
    Object.entries(STORE.products.categories).map(([cat, label]) => ({ cat, label: esc(label) }))));
}

/* ---------------- about (opens as its own full "page" at #about) ---------------- */
function wireAbout() {
  const back = $('#aboutBack');
  if (back) back.addEventListener('click', () => { location.hash = '#store'; });
  window.addEventListener('hashchange', syncAboutRoute);
  syncAboutRoute();
}
function syncAboutRoute() {
  const open = location.hash === '#about';
  document.body.classList.toggle('about-open', open);
  if (open) window.scrollTo({ top: 0, behavior: 'auto' });
}

// fill the Store nav dropdown (desktop hover / mobile indented); each link opens the Products page
function buildStoreSubmenu(cats) {
  const sub = $('#storeSubmenu');
  if (!sub) return;
  sub.innerHTML = cats.map(g => `<a class="nav-sublink" href="#products" data-cat="${esc(g.cat)}">${g.label}</a>`).join('');
  $$('.nav-sublink', sub).forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    PRODUCTS_CAT = a.dataset.cat || 'all';
    if (location.hash === '#products') renderProducts(); else location.hash = '#products';
    const nav = $('#primaryNav'), toggle = $('#navToggle');
    if (nav) nav.classList.remove('open');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }));
}

/* ---------------- full Products listing (in-page "page" at #products, NWOW-style) ---------------- */
let PRODUCTS_CAT = 'all';
function renderProducts() {
  const grid = $('#productsGrid'); if (!grid) return;
  const cats = STORE.products.categories;
  const bySort = (a, b) => (a.sort || 0) - (b.sort || 0);
  const inCat = (key) => MODELS.filter(m => m.wheels === key).sort(bySort);

  // tab bar (All + each wheel category)
  const tabs = $('#productsTabs');
  if (tabs) {
    const chips = [['all', 'All']].concat(Object.entries(cats));
    tabs.innerHTML = chips.map(([k, l]) =>
      `<button type="button" class="chip${k === PRODUCTS_CAT ? ' is-active' : ''}" data-cat="${esc(k)}">${esc(l)}</button>`).join('');
    $$('.chip', tabs).forEach(b => b.addEventListener('click', () => { PRODUCTS_CAT = b.dataset.cat; renderProducts(); }));
  }

  let html = '';
  if (PRODUCTS_CAT === 'all') {
    Object.entries(cats).forEach(([key, label]) => {
      const rows = inCat(key);
      if (!rows.length) return;
      html += `<div class="products-cat">
        <h3 class="products-cat-title">${esc(label)} <span class="pill">${rows.length} model${rows.length === 1 ? '' : 's'}</span></h3>
        <div class="model-grid">${rows.map(modelCard).join('')}</div>
      </div>`;
    });
  } else {
    const rows = inCat(PRODUCTS_CAT);
    html = rows.length
      ? `<div class="model-grid">${rows.map(modelCard).join('')}</div>`
      : `<p class="section-lead">No units in this category yet.</p>`;
  }
  grid.innerHTML = html || `<p class="section-lead">Products coming soon — please contact the branch.</p>`;
  $$('.model-card', grid).forEach(b => b.addEventListener('click', () => openModel(b.dataset.model)));
}
function wireProducts() {
  const back = $('#productsBack');
  if (back) back.addEventListener('click', () => { location.hash = '#store'; });
  window.addEventListener('hashchange', syncProductsRoute);
  syncProductsRoute();
}
function syncProductsRoute() {
  const open = location.hash === '#products';
  document.body.classList.toggle('products-open', open);
  if (open) { renderProducts(); window.scrollTo({ top: 0, behavior: 'auto' }); }
}

// build the gallery markup for a given image list (re-run when a colour is picked)
function galleryHtml(imgs, name) {
  if (!imgs.length) return `<div class="md-thumb">${modelPlaceholder()}</div>`;
  const multi = imgs.length > 1;
  return `<div class="gallery">
         <div class="gallery-main">
           <img id="galMain" src="${esc(imgs[0])}" alt="${esc(name)}" />
           ${multi ? `<button class="gal-nav prev" id="galPrev" type="button" aria-label="Previous photo">‹</button>
           <button class="gal-nav next" id="galNext" type="button" aria-label="Next photo">›</button>
           <span class="gal-count" id="galCount">1 / ${imgs.length}</span>` : ''}
         </div>
         ${multi ? `<div class="gallery-thumbs">
           ${imgs.map((src, i) => `<button class="gthumb${i === 0 ? ' active' : ''}" data-i="${i}" data-src="${esc(src)}">
             <img src="${esc(src)}" alt="${esc(name)} photo ${i + 1}" loading="lazy" /></button>`).join('')}
         </div>` : ''}
       </div>`;
}
// wire prev/next + thumbnails for the currently-mounted gallery (all share one index)
function wireGallery(imgs) {
  const main = $('#galMain');
  if (!main || imgs.length <= 1) return;
  const thumbs = $$('#productDetailBody .gthumb');
  let idx = 0;
  const show = (i) => {
    idx = (i + imgs.length) % imgs.length;
    main.src = imgs[idx];
    thumbs.forEach(x => x.classList.toggle('active', +x.dataset.i === idx));
    const c = $('#galCount'); if (c) c.textContent = `${idx + 1} / ${imgs.length}`;
    if (thumbs[idx]) thumbs[idx].scrollIntoView({ block: 'nearest', inline: 'center' });
  };
  $('#galPrev').addEventListener('click', () => show(idx - 1));
  $('#galNext').addEventListener('click', () => show(idx + 1));
  thumbs.forEach(t => t.addEventListener('click', () => show(+t.dataset.i)));
}

// tapping a product card opens its own dedicated page (#product/<id>)
function openModel(id) { location.hash = '#product/' + encodeURIComponent(id); }

// the per-unit detail page — full specs + price
function renderProductDetail(id) {
  const host = $('#productDetailBody'); if (!host) return;
  const m = modelById2(id);
  if (!m) { host.innerHTML = `<p class="section-lead">Sorry, that product could not be found.</p>`; return; }
  const label = STORE.products.categories[m.wheels] || '';
  const peso = STORE.peso;
  // price block — sale price (if on sale) shown with the SRP struck through, else the SRP
  const priceBlock = (m.onSale && m.saleCash != null)
    ? `<div class="pd-price"><span class="pd-now">${peso(m.saleCash)}</span> <span class="pd-was">${peso(m.srp)}</span></div>`
    : `<div class="pd-price"><span class="pd-now">${peso(m.srp)}</span></div>`;

  // colour variants: default to the first colour
  const variants = m.variants || [];
  const hasVariants = variants.length > 0;
  let sel = hasVariants ? variants[0] : null;
  const imgsFor = (v) => (v && v.images && v.images.length) ? v.images : ((m.images && m.images.length) ? m.images : []);
  const picker = hasVariants ? `
    <div class="variant-picker">
      <div class="variant-label">Colour: <strong id="vColorName">${esc(sel.name)}</strong></div>
      <div class="swatches">
        ${variants.map(v => `<button type="button" class="swatch${v.id === sel.id ? ' active' : ''}" data-vid="${esc(v.id)}" style="--sw:${esc(v.colorHex || '#888')}" title="${esc(v.name)}" aria-label="${esc(v.name)}"><span class="dot"></span></button>`).join('')}
      </div>
    </div>` : '';

  host.innerHTML = `
    <div class="md-hero">
      <div id="galleryWrap">${galleryHtml(imgsFor(sel), m.name)}</div>
      <div>
        <span class="md-badge">${esc(label)}</span> ${badgesHtml(m)}
        <h3 class="md-title">${nt(m.name)}</h3>
        ${priceBlock}
        ${picker}
        <p>${esc(m.name)} — a ${m.motorW}W ${esc(label).toLowerCase()} electric vehicle from Lucky Lion,
           built for reliable everyday travel around Cavite.</p>
      </div>
    </div>
    <table class="spec-table">
      <tr><th>Type</th><td>${esc(label)}</td></tr>
      ${m.color ? `<tr><th>Colour</th><td>${esc(m.color)}</td></tr>` : ''}
      <tr><th>Motor Power</th><td>${m.motorW} Watts</td></tr>
      <tr><th>Battery</th><td>${esc(m.battery)}</td></tr>
      <tr><th>Brakes</th><td>${esc(m.brakes)}</td></tr>
      <tr><th>Price (SRP)</th><td><strong>${peso(m.srp)}</strong></td></tr>
    </table>
    <p class="md-note">Payment: ${esc(STORE.products._payment.join(', '))}. ${esc(STORE.products._delivery)}. Prices subject to change without prior notice.${m._note ? ' — ' + esc(m._note) : ''}</p>`;

  wireGallery(imgsFor(sel));

  // picking a colour swaps the gallery to that colour's photos
  if (hasVariants) {
    $$('#productDetailBody .swatch').forEach(b => b.addEventListener('click', () => {
      const v = variants.find(x => x.id === b.dataset.vid); if (!v) return;
      sel = v;
      $$('#productDetailBody .swatch').forEach(x => x.classList.toggle('active', x === b));
      $('#vColorName').textContent = v.name;
      const imgs = imgsFor(v);
      $('#galleryWrap').innerHTML = galleryHtml(imgs, m.name);
      wireGallery(imgs);
    }));
  }
}
// route: #product/<id> shows the dedicated per-unit page
function wireProductRoute() {
  const back = $('#productDetailBack');
  if (back) back.addEventListener('click', () => { location.hash = '#products'; });
  window.addEventListener('hashchange', syncProductRoute);
  syncProductRoute();
}
function syncProductRoute() {
  const open = location.hash.startsWith('#product/');
  document.body.classList.toggle('product-open', open);
  if (open) { renderProductDetail(decodeURIComponent(location.hash.slice('#product/'.length))); window.scrollTo({ top: 0, behavior: 'auto' }); }
}

/* ---------------- why choose us ---------------- */
function renderWhy() {
  const w = C.whyChooseUs;
  const icons = ['🏆', '🚚', '🛠️', '💳', '📍'];
  $('#whyHeading').textContent = w.heading;
  $('#whyGrid').innerHTML = w.points.map((p, i) => `
    <div class="why-card">
      <div class="ic">${icons[i % icons.length]}</div>
      <h3 class="why-full">${esc(p.title)}</h3>
      <div class="why-short">${esc(p.short || p.title)}</div>
      <p class="why-text">${esc(p.text)}</p>
    </div>`).join('');
}

/* ---------------- about ---------------- */
function renderAbout() {
  $('#aboutHeading').textContent = C.about.heading;
  $('#aboutBody').textContent = C.about.body;
}

/* ---------------- location ---------------- */
function renderLocation() {
  const homeKey = C.mainBranch || HOME_BRANCH_KEY;
  const t = C.branches[homeKey] || C.home;
  const mapsFor = (b) => b.maps || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Lucky Lion Ebike ' + (b.name || ''))}`;
  // dial this branch's own number; fall back to the company's primary line so the button always works
  const callFor = (b) => (b.phone && b.phone.trim()) ? b.phone.trim() : primaryNumber();
  const metaLine = (b) => {
    const bits = [b.phone && ('📞 ' + esc(b.phone) + (b.contactPerson ? ' (' + esc(b.contactPerson) + ')' : '')), b.hours && ('🕗 ' + esc(b.hours))].filter(Boolean);
    return bits.join(' · ');
  };
  // [Call] sits to the LEFT of [Get directions]
  const actions = (b, primary) => {
    const num = callFor(b);
    const call = num ? `<a class="btn btn-ghost b-call" href="${esc(telHref(num))}">${ICONS.phone}<span>Call</span></a>` : '';
    return `<div class="b-actions">${call}<a class="btn ${primary ? 'btn-primary' : 'btn-ghost'}" href="${esc(mapsFor(b))}" target="_blank" rel="noopener">Get directions</a></div>`;
  };
  // main branch shows first
  let html = `
    <div class="branch home">
      <div>
        <h3>${esc(t.name)} <span class="home-badge">THIS BRANCH</span></h3>
        <div class="b-meta">${esc(t.address)}</div>
        ${metaLine(t) ? `<div class="b-meta">${metaLine(t)}</div>` : ''}
      </div>
      ${actions(t, true)}
    </div>`;
  // Location is its own page, so every other branch is listed directly (no "show more")
  html += BRANCHES.filter(x => x.key !== homeKey).map(x => {
    const b = (C.branches && C.branches[x.key]) || { name: x.name };
    return `
    <div class="branch">
      <div>
        <h3>${nt(b.name || x.name)}</h3>
        <div class="b-meta">${esc(b.address || 'Cavite / Laguna')}</div>
        ${metaLine(b) ? `<div class="b-meta">${metaLine(b)}</div>` : ''}
      </div>
      ${actions(b, false)}
    </div>`;
  }).join('');
  $('#locationList').innerHTML = html;
}
// Location opens as its own full "page" (like #products/#about) when the hash is #location
function wireLocation() {
  const back = $('#locationBack');
  if (back) back.addEventListener('click', () => { location.hash = '#top'; });
  window.addEventListener('hashchange', syncLocationRoute);
  syncLocationRoute();
}
function syncLocationRoute() {
  const open = location.hash === '#location';
  document.body.classList.toggle('location-open', open);
  if (open) window.scrollTo({ top: 0, behavior: 'auto' });
}

/* ---------------- contact ---------------- */
function renderContact() {
  const t = C.home;
  // one card per CATEGORY (its numbers stacked inside), so a category never repeats
  const card = (ic, lbl, links) => `
    <div class="contact-card">
      <div class="ic">${ic}</div>
      <div class="lbl">${lbl}</div>
      <div class="contact-vals">${links.map(([val, href]) => `<a class="val" href="${esc(href)}" target="_blank" rel="noopener">${val}</a>`).join('')}</div>
    </div>`;
  const cards = [];
  (C.home.contacts || []).forEach(c => cards.push(card('📞', esc(c.label || 'Contact'), c.numbers.map(n => [esc(n), telHref(n)]))));
  if (t.email) cards.push(card('✉️', 'Email', [[esc(t.email), `mailto:${t.email}`]]));
  if (t.facebook) cards.push(card('📘', 'Facebook', [[esc(branchShort(C.mainBranch || HOME_BRANCH_KEY) === 'Main' ? 'Lucky Lion Main' : t.name || 'Lucky Lion'), t.facebook]]));
  if (t.youtube) cards.push(card('▶️', 'YouTube', [['Lucky Lion eBikes', t.youtube]]));
  if (t.viber) cards.push(card('💬', 'Viber', [[esc(t.viber), `viber://chat?number=${t.viber.replace(/[^0-9+]/g, '')}`]]));
  $('#contactGrid').innerHTML = cards.join('');
}

/* ---------------- toast (louder notifications) ---------------- */
let _toastHost = null;
function toast(msg, kind = 'ok') {
  if (!_toastHost) { _toastHost = document.createElement('div'); _toastHost.className = 'toast-host'; document.body.appendChild(_toastHost); }
  const t = document.createElement('div');
  t.className = `toast toast-${kind}`;
  t.innerHTML = `<span class="toast-ic">${kind === 'err' ? '⚠️' : '✅'}</span><span>${esc(msg)}</span>`;
  _toastHost.appendChild(t);
  requestAnimationFrame(() => t.classList.add('in'));
  setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 300); }, 3400);
}

/* ---------------- modals ---------------- */
function showModal(sel) { $(sel).classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
function hideModal(el) { el.classList.add('hidden'); document.body.style.overflow = ''; }
function wireModals() {
  $$('.modal-backdrop').forEach(bd => {
    bd.addEventListener('click', e => { if (e.target === bd || e.target.closest('[data-close]')) hideModal(bd); });
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') $$('.modal-backdrop:not(.hidden)').forEach(hideModal);
  });
}

/* ---------------- login + auth UI ---------------- */
function wireLogin() {
  $('#loginBtn').addEventListener('click', () => { closePublicDrawer(); showModal('#loginModal'); });
  $('#forgotLink').addEventListener('click', e => {
    e.preventDefault();
    alert('Please contact your nearest Lucky Lion branch to reset your password.');
  });
  const lsp = $('#loginShowPass');
  if (lsp) lsp.addEventListener('change', () => { $('#loginPass').type = lsp.checked ? 'text' : 'password'; });
  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const err = $('#loginError'); err.classList.add('hidden');
    try {
      const user = await API.login($('#loginUser').value, $('#loginPass').value, $('#loginRemember').checked);
      if (user.role === 'staff' || user.role === 'admin') { window.location.replace('staff.html'); return; }   // #10
      hideModal($('#loginModal'));
      $('#loginForm').reset();
      await refreshAuthUI();
      if (user.role === 'customer') location.hash = '#account';   // land on the customer dashboard
    } catch (ex) {
      err.textContent = ex.message; err.classList.remove('hidden');
    }
  });

  // #3: the single left navigation drawer (all nav + account items live inside)
  const openBtn = $('#navDrawerBtn');
  openBtn.addEventListener('click', openPublicDrawer);
  $('#publicScrim').addEventListener('click', closePublicDrawer);
  $('#publicDrawerClose').addEventListener('click', closePublicDrawer);

  // account actions inside the drawer
  $$('#publicDrawer button[data-panel]').forEach(b =>
    b.addEventListener('click', () => { closePublicDrawer(); openPanel(b.dataset.panel); }));
  const mdb = $('#memberDashBtn');
  if (mdb) mdb.addEventListener('click', () => { closePublicDrawer(); if (location.hash === '#account') syncAccountRoute(); else location.hash = '#account'; });
  $('#logoutBtn').addEventListener('click', async () => {
    closePublicDrawer(); closeMemberPanel(); await API.logout();
    document.body.classList.remove('account-open');           // leave the dashboard immediately
    if (location.hash === '#account') location.hash = '#store';
    await refreshAuthUI();
  });
  // nav links close the drawer after navigating; category links also set the Products filter
  $$('#publicDrawer .drawer-navlink').forEach(a => a.addEventListener('click', () => {
    if (a.dataset.cat) { PRODUCTS_CAT = a.dataset.cat; if (location.hash === '#products') renderProducts(); }
    closePublicDrawer();
  }));
  wireNotifications();   // #16: notification bell

  // right-side profile avatar menu (My Profile / Log out)
  const avatarBtn = $('#memberAvatarBtn'), avatarDrop = $('#memberAvatarDropdown');
  if (avatarBtn && avatarDrop) {
    avatarBtn.addEventListener('click', e => {
      e.stopPropagation();
      const show = avatarDrop.classList.toggle('hidden') === false;
      avatarBtn.setAttribute('aria-expanded', String(show));
    });
    document.addEventListener('click', e => { if (!e.target.closest('#memberAvatarMenu')) avatarDrop.classList.add('hidden'); });
    const apb = $('#avatarProfileBtn');
    if (apb) apb.addEventListener('click', () => { avatarDrop.classList.add('hidden'); openPanel('profile'); });
  }
}
// render the header avatar (photo or initial) + the dropdown name
function updateMemberAvatar(user) {
  const img = $('#memberAvatarImg'), nameEl = $('#memberAvatarName');
  if (nameEl) nameEl.textContent = user ? (user.name || user.username) : 'Member';
  if (!img) return;
  if (user && user.avatarUrl) {
    img.classList.remove('avatar-ph');
    img.innerHTML = `<img src="${esc(user.avatarUrl)}" alt="" />`;
  } else {
    img.classList.add('avatar-ph');
    img.textContent = ((user && (user.name || user.username) || 'U').trim()[0] || 'U').toUpperCase();
  }
}
function openPublicDrawer() {
  const d = $('#publicDrawer'), s = $('#publicScrim'), b = $('#navDrawerBtn');
  if (!d) return;
  d.classList.add('open'); if (s) s.classList.remove('hidden');
  d.setAttribute('aria-hidden', 'false'); if (b) b.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
}
function closePublicDrawer() {
  const d = $('#publicDrawer'), s = $('#publicScrim'), b = $('#navDrawerBtn');
  if (!d) return;
  d.classList.remove('open'); if (s) s.classList.add('hidden');
  d.setAttribute('aria-hidden', 'true'); if (b) b.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

function wireSignup() {
  const openSignup = () => { hideModal($('#loginModal')); $('#signupError').classList.add('hidden'); showModal('#signupModal'); };
  const openLogin = () => { hideModal($('#signupModal')); showModal('#loginModal'); };
  // populate the nearest-branch dropdown from the canonical branch list
  const branchSel = $('#signupBranch');
  if (branchSel) branchSel.innerHTML = `<option value="" selected disabled>— choose the branch nearest you —</option>` + branchOptionsHtml('');
  $('#signupBtn').addEventListener('click', () => { closePublicDrawer(); showModal('#signupModal'); });
  const toSignup = $('#toSignupLink'); if (toSignup) toSignup.addEventListener('click', e => { e.preventDefault(); openSignup(); });
  const toLogin = $('#toLoginLink'); if (toLogin) toLogin.addEventListener('click', e => { e.preventDefault(); openLogin(); });
  const ssp = $('#signupShowPass');
  if (ssp) ssp.addEventListener('change', () => { const p = $('#signupForm [name="password"]'); if (p) p.type = ssp.checked ? 'text' : 'password'; });
  $('#signupForm').addEventListener('submit', async e => {
    e.preventDefault();
    const err = $('#signupError'); err.classList.add('hidden');
    const f = new FormData(e.target);
    const username = (f.get('username') || '').trim(), password = f.get('password');
    const branch = f.get('branch') || '';
    if (!branch) { err.textContent = 'Please choose the branch nearest you.'; err.classList.remove('hidden'); return; }
    if (!(await confirmAction('Create your Lucky Lion account with these details?', { title: 'Create account', confirmLabel: 'Create account' }))) return;
    const btn = e.target.querySelector('button[type="submit"]'); btn.disabled = true;
    try {
      await API.createUser({
        role: 'customer', branch, name: (f.get('name') || '').trim(), username, password,
        phone: (f.get('phone') || '').trim(), email: (f.get('email') || '').trim(), address: (f.get('address') || '').trim(),
        mustChange: false   // #8: self-signup picks their own password → no forced change
      });
      await API.login(username, password, true);      // sign them straight in
      hideModal($('#signupModal'));
      e.target.reset();
      await refreshAuthUI();
      location.hash = '#account';   // new customer lands on their dashboard
      toast(`Welcome to Lucky Lion, ${f.get('name') || username}! 🎉`);
    } catch (ex) { err.textContent = ex.message; err.classList.remove('hidden'); }
    finally { btn.disabled = false; }
  });
}

// Staff normally get bounced to the portal; ?preview=1 lets them look at the public site.
const STAFF_PREVIEW = new URLSearchParams(location.search).has('preview');

function showPreviewBar(user) {
  if (document.getElementById('previewBar')) return;
  const bar = document.createElement('div');
  bar.id = 'previewBar';
  bar.className = 'preview-bar';
  bar.innerHTML = `<span>👁 Staff preview — this is what customers see</span>
    <a class="btn btn-primary btn-sm" href="staff.html">← Back to staff portal</a>`;
  document.body.appendChild(bar);
  document.body.classList.add('has-preview-bar');
}

async function refreshAuthUI() {
  const user = await API.currentUser();
  if (user && (user.role === 'staff' || user.role === 'admin')) {
    // replace() so the public page isn't left in history behind the portal — otherwise the
    // browser Back button from a staff view lands on (or flashes through) the public page.
    if (!STAFF_PREVIEW) { window.location.replace('staff.html'); return; }
    showPreviewBar(user);
    document.body.classList.remove('logged-in');
    return;
  }
  const loggedIn = !!user;
  // #3: one left drawer for everyone; body.logged-in toggles guest vs member items (CSS).
  document.body.classList.toggle('logged-in', loggedIn);
  $('#memberName').textContent = loggedIn ? `Hi, ${user.name || user.username}` : 'Lucky Lion';
  updateMemberAvatar(user);   // header profile photo + dropdown name

  // #8: a customer on a temporary password must set a new one, then complete their details.
  if (loggedIn && user.role === 'customer' && user.mustChangePassword) {
    await forcePasswordChange(user);
    JUST_ONBOARDED = true;                    // ask them to fill in their info + photo next
    location.hash = '#account';
    openPanel('profile');
  }

  // unread-message indicator + schedule notifications + light poll while a customer is signed in
  clearInterval(MEMBER_BADGE_POLL); MEMBER_BADGE_POLL = null;
  clearInterval(MSG_POLL); MSG_POLL = null;   // any prior account's message poll must not survive an auth change
  if (loggedIn && user.role === 'customer') {
    updateMemberBadge();
    refreshNotifications(user);
    MEMBER_BADGE_POLL = setInterval(() => { updateMemberBadge(); refreshNotifications(user); }, 20000);
  } else {
    ['#memberMsgBadge', '#memberMsgBadge2'].forEach(s => { const el = $(s); if (el) el.classList.add('hidden'); });
    const nd = $('#notifDot'); if (nd) nd.classList.add('hidden');
  }
}

/* ---------- #8: blocking "set a new password" screen (temporary password) ---------- */
let _forcePwHost = null;
function forcePasswordChange(user) {
  return new Promise(resolve => {
    if (!_forcePwHost) {
      _forcePwHost = document.createElement('div');
      _forcePwHost.className = 'modal-backdrop force-pw';   // no `hidden` toggle — stays until done
      _forcePwHost.innerHTML = `<div class="modal modal-sm" role="dialog" aria-modal="true">
        <h3 class="modal-title">🔒 Set a new password</h3>
        <p class="modal-note">Your account uses a temporary password. Please choose a new one to continue.</p>
        <form class="form" id="forcePwForm">
          <label>New password <input name="next" type="password" required minlength="4" autocomplete="new-password" /></label>
          <label>Confirm new password <input name="confirm" type="password" required minlength="4" autocomplete="new-password" /></label>
          <label class="checkbox chk-show"><input type="checkbox" id="forcePwShow" /> Show password</label>
          <p class="form-error hidden" id="forcePwErr"></p>
          <button class="btn btn-primary full" type="submit">Save new password</button>
        </form></div>`;
      document.body.appendChild(_forcePwHost);
    }
    const host = _forcePwHost;
    host.style.display = ''; document.body.style.overflow = 'hidden';   // '' → stylesheet's centered grid
    const form = host.querySelector('#forcePwForm'), err = host.querySelector('#forcePwErr');
    const show = host.querySelector('#forcePwShow');
    show.onchange = () => host.querySelectorAll('input[type="password"],input[name="next"],input[name="confirm"]').forEach(i => {
      if (i.name === 'next' || i.name === 'confirm') i.type = show.checked ? 'text' : 'password';
    });
    form.onsubmit = async (e) => {
      e.preventDefault(); err.classList.add('hidden');
      const f = new FormData(form);
      const next = f.get('next'), confirm = f.get('confirm');
      if (next !== confirm) { err.textContent = 'The passwords do not match.'; err.classList.remove('hidden'); return; }
      try {
        await API.setNewPassword(user.id, next);
        user.mustChangePassword = false;
        host.style.display = 'none'; document.body.style.overflow = '';
        form.reset();
        toast('Password updated — welcome!');
        resolve(true);
      } catch (ex) { err.textContent = ex.message; err.classList.remove('hidden'); }
    };
  });
}

/* ---------------- member panels ---------------- */
// Fully reset the member panel + its live message poll. Called on logout so ONE account's
// open panel / message thread can't leak into the NEXT account on the same device — a
// customer→customer switch never reloads the page, so stale in-memory state must be torn down.
function closeMemberPanel() {
  clearInterval(MSG_POLL); MSG_POLL = null;
  const modal = $('#panelModal'); if (modal) hideModal(modal);
  const body = $('#panelBody'); if (body) body.innerHTML = '';
}
/* ---------------- customer dashboard (#account) ---------------- */
function wireAccount() {
  const back = $('#accountBack');
  if (back) back.addEventListener('click', () => { location.hash = '#store'; });
  window.addEventListener('hashchange', syncAccountRoute);
  syncAccountRoute();
}
async function syncAccountRoute() {
  const open = location.hash === '#account';
  document.body.classList.toggle('account-open', open);
  if (open) { const user = await API.currentUser(); await renderAccountDashboard(user); window.scrollTo({ top: 0, behavior: 'auto' }); }
}
async function renderAccountDashboard(user) {
  const host = $('#accountBody'); if (!host) return;
  if (!user || user.role !== 'customer') {
    host.innerHTML = `<h2 class="section-title">My Account</h2><p class="section-lead">Please log in to view your dashboard.</p><div style="text-align:center"><button class="btn btn-primary" id="acctLoginBtn">Login</button></div>`;
    const lb = $('#acctLoginBtn'); if (lb) lb.addEventListener('click', () => { location.hash = '#store'; showModal('#loginModal'); });
    return;
  }
  let ebikes = [], reps = [], msgs = [];
  try { ebikes = await API.getUserEbikes(user.id); } catch { }
  try { reps = await API.getRepairsByUser(user.id); } catch { }
  try { msgs = await API.getMessages(user.id); } catch { }
  MY_EBIKES = ebikes;
  const scheduled = reps.filter(r => r.status !== 'done' && r.status !== 'cancelled');
  const done = reps.filter(r => r.status === 'done');
  const unread = msgs.filter(m => m.sender === 'staff' && !m.read).length;
  // #17: where + when the last repair was done
  const lastDone = done.slice().sort((a, b) => String(b.completedAt || b.date || '').localeCompare(String(a.completedAt || a.date || '')))[0];
  const lastRepairHtml = (() => {
    if (!lastDone) return '';
    const when = lastDone.completedAt ? new Date(lastDone.completedAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : niceDay(lastDone.date);
    const br = lastDone.branch || user.branch;
    return `<div class="acct-lastrepair">🧾 Last repair: <strong>${esc(when)}</strong>${br ? ' at 📍 ' + nt(branchName(br)) : ''}</div>`;
  })();
  const tile = (icon, num, label, panel, tone) => `<button class="acct-tile${tone ? ' ' + tone : ''}" data-panel="${panel}"><span class="at-ic">${icon}</span><span class="at-num">${num}</span><span class="at-label">${label}</span></button>`;
  const action = (icon, label, panel) => `<button class="qa" data-panel="${panel}"><span class="qa-icon">${icon}</span>${esc(label)}</button>`;
  host.innerHTML = `
    <div class="acct-hero">
      <div class="ah-txt">
        <span class="ah-eyebrow">My account</span>
        <strong>Hi, ${esc(user.name || user.username)}</strong>
        <span>${user.branch ? '📍 ' + nt(branchName(user.branch)) : ''}</span>
        ${lastRepairHtml}
      </div>
    </div>
    ${upcomingReminderHtml(reps)}
    <div class="acct-tiles">
      ${tile('🛵', ebikes.length, 'My e-bikes', 'ebikes')}
      ${tile('🛠️', scheduled.length, 'Scheduled repairs', 'schedule')}
      ${tile('✅', done.length, 'Completed repairs', 'schedule')}
      ${tile('💬', unread, 'Unread messages', 'messages', unread ? 'has-unread' : '')}
    </div>
    <div class="dash-card">
      <h3>Quick actions</h3>
      <div class="qa-grid">
        ${action('🛠️', 'Schedule a repair', 'schedule')}
        ${action('🛵', 'My E-Bikes', 'ebikes')}
        ${action('💬', 'Messages', 'messages')}
        ${action('🪪', 'Profile', 'profile')}
        ${action('🧰', 'Maintenance', 'maintenance')}
        ${action('💡', 'Tips', 'tips')}
        ${action('📋', 'Road Rules', 'roadrules')}
      </div>
    </div>`;
  $$('#accountBody [data-panel]').forEach(b => b.addEventListener('click', () => openPanel(b.dataset.panel)));
}

async function openPanel(kind) {
  const user = await API.currentUser();
  const body = $('#panelBody');
  if (kind === 'profile') body.innerHTML = await panelProfile(user);
  else if (kind === 'ebikes') body.innerHTML = await panelEbikes(user);
  else if (kind === 'messages') body.innerHTML = panelMessages(user);
  else if (kind === 'tips') body.innerHTML = panelTips();
  else if (kind === 'roadrules') body.innerHTML = panelRoadRules();
  else if (kind === 'schedule') body.innerHTML = await panelSchedule(user);
  else if (kind === 'maintenance') body.innerHTML = panelMaintenance();
  showModal('#panelModal');
  if (kind === 'profile') wireProfile(user);
  if (kind === 'schedule') wireSchedule(user);
  if (kind === 'messages') wireMessages(user);
}

/* ---------------- messaging (customer ↔ branch) ---------------- */
let MSG_POLL = null;
function panelMessages() {
  return `<h3 class="panel-title">💬 Messages</h3>
    <p class="panel-sub">Chat directly with the Lucky Lion branch. We'll reply as soon as we can.</p>
    <div class="chat">
      <div class="chat-list" id="msgList"><p class="panel-sub">Loading…</p></div>
      <form class="chat-form" id="msgForm">
        <input id="msgInput" autocomplete="off" placeholder="Type a message…" required />
        <button class="btn btn-primary" type="submit">Send</button>
      </form>
    </div>`;
}
function renderChat(host, msgs, mySide) {
  if (!host) return;
  if (!msgs.length) { host.innerHTML = `<p class="chat-empty">No messages yet. Say hello 👋</p>`; return; }
  host.innerHTML = msgs.map(m => {
    const mine = m.sender === mySide;
    const d = new Date(m.createdAt);
    const time = isNaN(d) ? '' : d.toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    return `<div class="bubble ${mine ? 'mine' : 'theirs'}"><div class="bubble-body">${esc(m.body)}</div><div class="bubble-time">${esc(time)}</div></div>`;
  }).join('');
}
async function refreshMessages(user, scroll) {
  const list = $('#msgList'); if (!list) return;
  let msgs;
  try { msgs = await API.getMessages(user.id); }
  catch { list.innerHTML = `<p class="chat-empty">Messaging isn't available right now.</p>`; return; }
  renderChat(list, msgs, 'customer');
  if (scroll) list.scrollTop = list.scrollHeight;
  try { await API.markMessagesRead(user.id, 'staff'); } catch { }
  updateMemberBadge();
}
async function wireMessages(user) {
  await refreshMessages(user, true);
  $('#msgForm').addEventListener('submit', async e => {
    e.preventDefault();
    const inp = $('#msgInput'), body = inp.value.trim();
    if (!body) return;
    inp.value = '';
    try { await API.sendMessage(user.id, 'customer', body); await refreshMessages(user, true); }
    catch (ex) { alert('Send failed: ' + ex.message + ' (Is the messages table set up?)'); }
  });
  clearInterval(MSG_POLL);
  MSG_POLL = setInterval(() => {
    const modal = $('#panelModal'), list = $('#msgList');
    if (!list || !modal || modal.classList.contains('hidden')) { clearInterval(MSG_POLL); MSG_POLL = null; return; }
    refreshMessages(user, false);
  }, 4000);
}
// unread indicator on the member menu (dot on the burger + count in the dropdown)
let MEMBER_BADGE_POLL = null;
async function updateMemberBadge() {
  const dot = $('#memberMsgBadge'), inline = $('#memberMsgBadge2');
  const user = await API.currentUser();
  let n = 0;
  if (user && user.role === 'customer') {
    try { n = (await API.getMessages(user.id)).filter(m => m.sender === 'staff' && !m.read).length; } catch { }
  }
  const txt = n > 9 ? '9+' : String(n);
  if (dot) { dot.textContent = txt; dot.classList.toggle('hidden', n === 0); }
  if (inline) { inline.textContent = txt; inline.classList.toggle('hidden', n === 0); }
}

/* ---------- #16: notification bell — new/changed repair schedules ---------- */
let NOTIF_ITEMS = [];
const notifKey = (uid) => `ll_notif_seen_${uid}`;
function wireNotifications() {
  const bell = $('#notifBell'), panel = $('#notifPanel');
  if (!bell || !panel) return;
  bell.addEventListener('click', e => {
    e.stopPropagation();
    const show = panel.classList.toggle('hidden') === false;
    bell.setAttribute('aria-expanded', String(show));
    if (show) markNotificationsSeen();
  });
  document.addEventListener('click', e => { if (!e.target.closest('.notif')) panel.classList.add('hidden'); });
  $('#notifList').addEventListener('click', e => {
    if (e.target.closest('.notif-item')) { panel.classList.add('hidden'); openPanel('schedule'); }
  });
}
// Diff the customer's current repairs against the last-seen snapshot in localStorage.
async function refreshNotifications(user) {
  if (!user || user.role !== 'customer') return;
  let reps = [];
  try { reps = await API.getRepairsByUser(user.id); } catch { return; }
  let seen = {};
  try { seen = JSON.parse(localStorage.getItem(notifKey(user.id)) || '{}') || {}; } catch { }
  const items = [];
  reps.forEach(r => {
    const sig = `${r.status}|${r.date}|${r.timeSlot || ''}`;
    const m = STORE.modelById(r.modelId);
    const name = m ? m.name : r.modelId;
    if (!(r.id in seen)) {
      if (r.status !== 'done' && r.status !== 'cancelled') items.push({ id: r.id, text: `Repair booked for ${name} on ${niceDay(r.date)}.` });
    } else if (seen[r.id] !== sig) {
      items.push({ id: r.id, text: `Your ${name} repair was updated — now “${r.status}”${r.date ? ', ' + niceDay(r.date) : ''}.` });
    }
  });
  NOTIF_ITEMS = items;
  // first run on a device (no snapshot yet) → seed silently, don't shout about every existing repair
  const firstRun = !localStorage.getItem(notifKey(user.id));
  if (firstRun) { seedNotifSnapshot(user, reps); NOTIF_ITEMS = []; }
  paintNotifications();
}
function paintNotifications() {
  const list = $('#notifList'), dot = $('#notifDot');
  if (!list) return;
  if (!NOTIF_ITEMS.length) {
    list.innerHTML = `<p class="notif-empty">You're all caught up.</p>`;
    if (dot) dot.classList.add('hidden');
    return;
  }
  list.innerHTML = NOTIF_ITEMS.map(i => `<button type="button" class="notif-item">🔔 ${esc(i.text)}</button>`).join('');
  if (dot) { dot.textContent = NOTIF_ITEMS.length > 9 ? '9+' : String(NOTIF_ITEMS.length); dot.classList.remove('hidden'); }
}
function seedNotifSnapshot(user, reps) {
  const snap = {};
  reps.forEach(r => { snap[r.id] = `${r.status}|${r.date}|${r.timeSlot || ''}`; });
  try { localStorage.setItem(notifKey(user.id), JSON.stringify(snap)); } catch { }
}
async function markNotificationsSeen() {
  const user = await API.currentUser();
  if (!user) return;
  let reps = [];
  try { reps = await API.getRepairsByUser(user.id); } catch { }
  seedNotifSnapshot(user, reps);
  NOTIF_ITEMS = [];
  const dot = $('#notifDot'); if (dot) dot.classList.add('hidden');
}

async function panelEbikes(user) {
  let list = [];
  try { list = await API.getUserEbikes(user.id); } catch { }
  if (!list.length && user.ownedModelId) list = [{ model_id: user.ownedModelId }];
  MY_EBIKES = list;
  if (!list.length) {
    return `<h3 class="panel-title">My E-Bikes</h3>
      <p class="panel-sub">Units linked to your account.</p>
      <div class="placeholder-box">No e-bike is linked to your account yet.
        <br><small>Please contact the Lucky Lion branch so they can add your unit.</small></div>`;
  }
  const cards = list.map(e => {
    const m = STORE.modelById(e.model_id);
    const rows = [['Colour', e.color], ['Chassis no.', e.chassis_no], ['Battery no.', e.battery_no], ['Motor no.', e.motor_no]]
      .filter(([, v]) => v);
    return `<div class="ebike-card">
      <h4>${esc(m ? m.name : e.model_id)}</h4>
      ${rows.length
        ? `<table class="spec-table">${rows.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</table>`
        : '<p class="panel-sub">No unit details on file yet — ask the branch to add your chassis, battery and motor numbers.</p>'}
    </div>`;
  }).join('');
  return `<h3 class="panel-title">My E-Bikes</h3>
    <p class="panel-sub">Your unit${list.length > 1 ? 's' : ''} and ${list.length > 1 ? 'their' : 'its'} details.</p>
    ${cards}`;
}

function panelPlaceholder(title, msg) {
  return `<h3 class="panel-title">${title}</h3>
    <p class="panel-sub">Member resource</p>
    <div class="placeholder-box">${esc(msg)}<br><small>Content coming soon.</small></div>`;
}

function panelMaintenance() {
  const mnt = C.maintenance;
  if (!mnt) return panelPlaceholder('Maintenance', 'General maintenance guides will be posted here.');
  const catBlock = (cat) => `
    <div class="tip-cat">
      <h4>${esc(cat.category)}</h4>
      <ul>${cat.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>
    </div>`;
  // #19: split into Basic (simple checks when there's a problem) + Detailed (thorough checks & steps).
  // Falls back to the legacy flat `categories` list if an older content.json is in use.
  const basic = mnt.basic || [];
  const detailed = mnt.detailed || [];
  const legacy = (!basic.length && !detailed.length) ? (mnt.categories || []) : [];
  const section = (icon, title, sub, cats) => cats.length ? `
    <div class="mnt-section">
      <h4 class="mnt-head">${icon} ${esc(title)}</h4>
      <p class="mnt-sub">${esc(sub)}</p>
      ${cats.map(catBlock).join('')}
    </div>` : '';
  return `<h3 class="panel-title">${esc(mnt.heading)}</h3>
    <p class="panel-sub">${esc(mnt.intro)}</p>
    ${section('📋', 'Basic Maintenance', 'Simple things to check when there’s a problem.', basic)}
    ${section('🔧', 'Detailed Maintenance', 'Thorough checks and the steps to take.', detailed)}
    ${legacy.map(catBlock).join('')}
    ${mnt.source ? `<p class="mnt-source">ℹ️ ${esc(mnt.source)}</p>` : ''}`;
}

function panelTips() {
  const tips = C.tips || [];
  return `<h3 class="panel-title">Tips</h3>
    <p class="panel-sub">Get the most out of your Lucky Lion e-bike.</p>
    ${tips.map(cat => `
      <div class="tip-cat">
        <h4>${esc(cat.category)}</h4>
        <ul>${cat.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>
      </div>`).join('')}`;
}

function panelRoadRules() {
  const r = C.roadRules;
  return `<h3 class="panel-title">Road Rules</h3>
    <p class="panel-sub">LTO classification for light electric vehicles.</p>
    <div class="banner">${esc(r.status)}</div>
    <table class="rules-table">
      <thead><tr><th>Class</th><th>Power / Speed</th><th>Helmet</th><th>License</th><th>Registration</th><th>Allowed roads</th></tr></thead>
      <tbody>${r.classes.map(c => `<tr>
        <td><strong>${esc(c.class)}</strong></td><td>${esc(c.power)}</td><td>${esc(c.helmet)}</td>
        <td>${esc(c.license)}</td><td>${esc(c.registration)}</td><td>${esc(c.roads)}</td></tr>`).join('')}</tbody>
    </table>`;
}

async function panelProfile(user) {
  let names = [];
  try { names = (await API.getUserEbikes(user.id)).map(e => (STORE.modelById(e.model_id) || {}).name || e.model_id); } catch { }
  if (!names.length && user.ownedModelId) { const m = STORE.modelById(user.ownedModelId); if (m) names = [m.name]; }
  const unitsText = names.length ? 'Your e-bike(s): <strong>' + esc(names.join(', ')) + '</strong>' : 'No e-bike linked yet.';
  const onboard = JUST_ONBOARDED; JUST_ONBOARDED = false;   // show the welcome prompt once
  const av = user.avatarUrl
    ? `<span class="avatar avatar-xl" id="profAvatar"><img src="${esc(user.avatarUrl)}" alt="" /></span>`
    : `<span class="avatar avatar-ph avatar-xl" id="profAvatar">${esc(((user.name || user.username || 'U').trim()[0] || 'U').toUpperCase())}</span>`;
  return `<h3 class="panel-title">My Profile</h3>
    <p class="panel-sub">${unitsText}</p>
    ${onboard ? `<div class="reminder-banner">👋 <strong>Welcome!</strong> Your password is set. Please complete your details below and add a profile photo.</div>` : ''}
    <div class="prof-photo">
      ${av}
      <div>
        <label class="btn btn-ghost btn-sm" for="profPhotoInput">📷 ${user.avatarUrl ? 'Change' : 'Add'} photo</label>
        <input type="file" id="profPhotoInput" accept="image/*" hidden aria-label="Upload profile photo" />
        <p class="prof-photo-hint">A clear photo helps the branch recognise you.</p>
      </div>
    </div>
    <form class="form" id="profileForm">
      <label>Full name <input name="name" value="${esc(user.name)}" required /></label>
      <label>Email <input name="email" type="email" value="${esc(user.email)}" /></label>
      <label>Phone <input name="phone" value="${esc(user.phone)}" required /></label>
      <label>Address <input name="address" value="${esc(user.address)}" required /></label>
      <label>Nearest branch <select name="branch" required>${branchOptionsHtml(user.branch)}</select></label>
      <p class="form-ok hidden" id="profOk">Saved.</p>
      <button class="btn btn-primary full" type="submit">Save changes</button>
    </form>
    <hr style="margin:1.4rem 0;border:0;border-top:1px solid var(--line)">
    <h4 style="margin-bottom:.6rem">Change password</h4>
    <form class="form" id="pwForm">
      <label>Current password <input name="current" type="password" required /></label>
      <label>New password <input name="next" type="password" required minlength="4" /></label>
      <p class="form-error hidden" id="pwErr"></p>
      <p class="form-ok hidden" id="pwOk">Password updated.</p>
      <button class="btn btn-primary full" type="submit">Update password</button>
    </form>`;
}
function wireProfile(user) {
  // profile photo upload → shared store-photos bucket, saved on the user
  const photoInput = $('#profPhotoInput');
  if (photoInput) photoInput.addEventListener('change', async () => {
    const file = photoInput.files && photoInput.files[0];
    if (!file) return;
    try {
      toast('Uploading photo…');
      const url = await API.uploadAvatar(file);
      await API.updateUser(user.id, { avatarUrl: url });
      user.avatarUrl = url;
      const av = $('#profAvatar'); if (av) { av.classList.remove('avatar-ph'); av.innerHTML = `<img src="${esc(url)}" alt="" />`; }
      updateMemberAvatar(user);   // refresh the header avatar immediately
      toast('Profile photo updated. 📷');
    } catch (ex) { toast('Photo upload failed: ' + ex.message, 'err'); }
    finally { photoInput.value = ''; }
  });
  $('#profileForm').addEventListener('submit', async e => {
    e.preventDefault();
    if (!(await confirmAction('Save these changes to your profile?', { title: 'Save profile', confirmLabel: 'Save changes' }))) return;
    const f = new FormData(e.target);
    await API.updateUser(user.id, { name: f.get('name'), email: f.get('email'), phone: f.get('phone'), address: f.get('address'), branch: f.get('branch') || user.branch });
    user.name = f.get('name');
    $('#profOk').classList.remove('hidden');
    $('#memberName').textContent = `Hi, ${f.get('name') || user.username}`;
    updateMemberAvatar(user);
    toast('Profile saved.');
  });
  $('#pwForm').addEventListener('submit', async e => {
    e.preventDefault();
    const f = new FormData(e.target); const err = $('#pwErr'), ok = $('#pwOk');
    err.classList.add('hidden'); ok.classList.add('hidden');
    if (!(await confirmAction('Update your account password?', { title: 'Change password', confirmLabel: 'Update password' }))) return;
    try {
      await API.changePassword(user.id, f.get('current'), f.get('next'));
      ok.classList.remove('hidden'); e.target.reset();
      toast('Password updated.');
    } catch (ex) { err.textContent = ex.message; err.classList.remove('hidden'); }
  });
}

async function panelSchedule(user) {
  const mine = await API.getRepairsByUser(user.id);
  const slots = REPAIR_SLOTS;

  // Only the units this customer actually owns can be booked for repair.
  try { MY_EBIKES = await API.getUserEbikes(user.id); } catch { MY_EBIKES = []; }
  let owned = MY_EBIKES.map(e => e.model_id);
  if (!owned.length && user.ownedModelId) { owned = [user.ownedModelId]; MY_EBIKES = [{ model_id: user.ownedModelId }]; }
  const myModels = [...new Set(owned)].map(id => modelById2(id)).filter(Boolean);

  const bookings = `<h4 style="margin:1.4rem 0 .6rem">Your bookings</h4>
    <div id="myReps">${renderMyReps(mine)}</div>`;

  if (!myModels.length) {
    return `<h3 class="panel-title">Schedule Repair</h3>
      <p class="panel-sub">Book a repair / home visit.</p>
      <div class="placeholder-box">No e-bike is linked to your account yet, so there's nothing to book a repair for.
        <br><small>Please contact the Lucky Lion branch so they can add your unit.</small></div>
      <div class="msg-cta">Have a question? <button type="button" class="link-btn" id="msgBranchBtn">💬 Message the branch →</button></div>
      ${bookings}`;
  }

  return `<h3 class="panel-title">Schedule Repair</h3>
    <p class="panel-sub">Book a repair / home visit. (Lunch break 12:00–13:00, closed Sundays vary by branch.)</p>
    ${upcomingReminderHtml(mine)}
    <div class="msg-cta">Booking a home visit or have a question? <button type="button" class="link-btn" id="msgBranchBtn">💬 Message the branch →</button></div>
    <form class="form" id="repForm">
      <label>E-bike model
        <select name="modelId" required>${myModels.map(m => `<option value="${m.id}" translate="no">${esc(m.name)}</option>`).join('')}</select>
      </label>
      <input type="hidden" name="date" id="repDate" required />
      <div class="cal-field">
        <span class="cal-label">Pick a date <span class="req" aria-hidden="true">*</span></span>
        <div class="cal" id="repCalendar"><p class="slot-hint">Loading calendar…</p></div>
        <p class="cal-legend"><span class="cal-key cal-key-free"></span>Open <span class="cal-key cal-key-full"></span>Fully booked <span class="cal-key cal-key-sel"></span>Selected</p>
      </div>
      <label>Time slot
        <select name="timeSlot" id="repSlot" required disabled>${slots.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('')}</select>
      </label>
      <p class="slot-hint" id="repSlotHint">Pick a date first — we'll show which slots are still open.</p>
      <label>Notes (what needs fixing?) <textarea name="notes" rows="3"></textarea></label>
      <p class="form-ok hidden" id="repOk">Repair booked! Staff will confirm.</p>
      <p class="form-error hidden" id="repErr"></p>
      <button class="btn btn-primary full" type="submit">Book repair</button>
    </form>
    ${bookings}`;
}

/* ---------- #15: reminder when a booking is coming up ---------- */
function upcomingReminderHtml(list) {
  const today = todayISOlocal();
  const upcoming = (list || [])
    .filter(r => r.status !== 'done' && r.status !== 'cancelled' && r.date && r.date >= today)
    .sort((a, b) => (a.date + (a.timeSlot || '')).localeCompare(b.date + (b.timeSlot || '')));
  if (!upcoming.length) return '';
  const r = upcoming[0];
  const m = STORE.modelById(r.modelId);
  return `<div class="reminder-banner">🔔 <strong>Reminder:</strong> your ${m ? nt(m.name) : esc(r.modelId)} repair is on
    <strong>${esc(niceDay(r.date))}</strong>${r.timeSlot ? ' · ' + esc(r.timeSlot) : ''}.</div>`;
}

/* ---------- #13: month calendar for booking (past greyed, full days blocked) ---------- */
const isoLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const todayISOlocal = () => isoLocal(new Date());
function niceDay(iso) {
  if (!iso) return '';
  const [y, mo, da] = iso.split('-').map(Number);
  const d = new Date(y, mo - 1, da);
  return d.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}
let BOOK_CAL_MONTH = null;   // first-of-month Date currently shown
async function renderBookingCalendar() {
  const host = $('#repCalendar'); if (!host) return;
  const month = BOOK_CAL_MONTH;
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const todayIso = todayISOlocal();
  const selected = ($('#repDate') || {}).value || '';
  host.innerHTML = `<p class="slot-hint">Checking availability…</p>`;
  // which days in this month are fully booked (all slots taken)?
  let bookedMap = {};
  try { bookedMap = await API.getBookedSlotsRange(isoLocal(first), isoLocal(last)); } catch { }
  const monthLabel = first.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
  const canGoBack = first > new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  let cells = '';
  // leading blanks (week starts Sunday)
  for (let i = 0; i < first.getDay(); i++) cells += `<span class="cal-day cal-blank"></span>`;
  for (let day = 1; day <= last.getDate(); day++) {
    const iso = isoLocal(new Date(month.getFullYear(), month.getMonth(), day));
    const taken = (bookedMap[iso] || []).filter((s, i, a) => a.indexOf(s) === i);
    const isPast = iso < todayIso;
    const isFull = REPAIR_SLOTS.every(s => taken.includes(s));
    const isSel = iso === selected;
    const cls = ['cal-day'];
    let attr = `data-date="${iso}"`;
    if (isPast) { cls.push('is-past'); attr = ''; }
    else if (isFull) { cls.push('is-full'); attr = ''; }
    else cls.push('is-open');
    if (isSel) cls.push('is-sel');
    cells += `<button type="button" class="${cls.join(' ')}" ${attr}${(isPast || isFull) ? ' disabled' : ''}>
      <span class="cal-num">${day}</span>${isFull && !isPast ? '<span class="cal-tag">Full</span>' : ''}</button>`;
  }
  host.innerHTML = `
    <div class="cal-head">
      <button type="button" class="cal-nav" id="calPrev" ${canGoBack ? '' : 'disabled'} aria-label="Previous month">‹</button>
      <span class="cal-month">${esc(monthLabel)}</span>
      <button type="button" class="cal-nav" id="calNext" aria-label="Next month">›</button>
    </div>
    <div class="cal-dow">${['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => `<span>${d}</span>`).join('')}</div>
    <div class="cal-grid">${cells}</div>`;
}
function renderMyReps(list) {
  if (!list.length) return `<p class="panel-sub">No bookings yet.</p>`;
  const hasNumbers = allContactNumbers().length > 0;
  return list.map(r => {
    const m = STORE.modelById(r.modelId);
    const bits = unitBits(ebikeForModel(r.modelId));
    return `<div class="branch"><div><h3>${esc(m ? m.name : r.modelId)}</h3>
      <div class="b-meta">${esc(r.date)} · ${esc(r.timeSlot)} · status: <strong>${esc(r.status)}</strong></div>
      ${bits.length ? `<div class="b-meta">${bits.map(esc).join(' · ')}</div>` : ''}
      ${r.notes ? `<div class="b-meta">${esc(r.notes)}</div>` : ''}
      <div class="book-actions">
        <button type="button" class="link-btn book-msg">💬 Message the branch</button>
        ${hasNumbers ? `<button type="button" class="link-btn book-call">📞 Call the branch</button>` : ''}
      </div></div></div>`;
  }).join('');
}
const REPAIR_SLOTS = ['08:00\u201310:00', '10:00\u201312:00', '13:00\u201315:00', '15:00\u201317:00'];

// One booking per time slot per day: already-booked slots are greyed out and marked "TAKEN".
async function paintSlots(date) {
  const sel = $('#repSlot'), hint = $('#repSlotHint');
  if (!sel) return;
  if (!date) {
    sel.disabled = true;
    sel.innerHTML = REPAIR_SLOTS.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('');
    hint.textContent = "Pick a date first — we'll show which slots are still open.";
    hint.classList.remove('is-full');
    return;
  }
  sel.disabled = true;
  hint.textContent = 'Checking availability…';
  let taken = [];
  try { taken = (await API.getBookedSlots(date)).map(b => b.slot); }
  catch { hint.textContent = "Couldn't check availability — please try again."; return; }

  const free = REPAIR_SLOTS.filter(s => !taken.includes(s));
  sel.innerHTML = REPAIR_SLOTS.map(s => {
    const isTaken = taken.includes(s);
    return `<option value="${esc(s)}"${isTaken ? ' disabled' : ''}>${esc(s)}${isTaken ? ' — TAKEN' : ''}</option>`;
  }).join('');
  sel.value = free[0] || '';
  sel.disabled = !free.length;
  hint.classList.toggle('is-full', !free.length);
  hint.textContent = free.length
    ? `${free.length} of ${REPAIR_SLOTS.length} slots open on this date. Taken slots can't be picked.`
    : 'All slots are booked on this date — please choose another day.';
}

function wireSchedule(user) {
  const mb = $('#msgBranchBtn');
  if (mb) mb.addEventListener('click', () => openPanel('messages'));
  // per-booking "message the branch" buttons (delegated — #myReps re-renders after booking)
  const myReps = $('#myReps');
  if (myReps) myReps.addEventListener('click', e => {
    if (e.target.closest('.book-msg')) openPanel('messages');
    else if (e.target.closest('.book-call')) openContactPicker('repairs');   // scheduled repair → repairs line
  });
  const form = $('#repForm');
  if (!form) return;                 // no owned e-bike → no booking form to wire

  // #13: month calendar. Clicking an open day sets the hidden #repDate + loads its slots.
  const cal = $('#repCalendar');
  BOOK_CAL_MONTH = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  renderBookingCalendar();
  if (cal) cal.addEventListener('click', e => {
    const prev = e.target.closest('#calPrev'), next = e.target.closest('#calNext'), day = e.target.closest('.cal-day[data-date]');
    if (prev) { BOOK_CAL_MONTH = new Date(BOOK_CAL_MONTH.getFullYear(), BOOK_CAL_MONTH.getMonth() - 1, 1); renderBookingCalendar(); }
    else if (next) { BOOK_CAL_MONTH = new Date(BOOK_CAL_MONTH.getFullYear(), BOOK_CAL_MONTH.getMonth() + 1, 1); renderBookingCalendar(); }
    else if (day) {
      const iso = day.dataset.date;
      const hidden = $('#repDate'); if (hidden) hidden.value = iso;
      cal.querySelectorAll('.cal-day').forEach(c => c.classList.remove('is-sel'));
      day.classList.add('is-sel');
      paintSlots(iso);
    }
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const date = f.get('date'), slot = f.get('timeSlot');
    const ok = $('#repOk'), err = $('#repErr');
    ok.classList.add('hidden'); err.classList.add('hidden');
    if (!date) { err.textContent = 'Please pick a date on the calendar.'; err.classList.remove('hidden'); return; }
    if (!slot) { err.textContent = 'Please pick an open time slot.'; err.classList.remove('hidden'); return; }
    if (!(await confirmAction(`Book a repair for ${niceDay(date)} (${slot})?`, { title: 'Book repair', confirmLabel: 'Book repair' }))) return;

    // re-check right before saving, in case someone booked the same slot meanwhile
    try {
      const taken = (await API.getBookedSlots(date)).map(b => b.slot);
      if (taken.includes(slot)) {
        err.textContent = 'Sorry — that slot was just taken. Please pick another one.';
        err.classList.remove('hidden');
        await paintSlots(date);
        return;
      }
    } catch { /* availability check failed — let the booking through */ }

    await API.createRepair({ userId: user.id, modelId: f.get('modelId'), date, timeSlot: slot, notes: f.get('notes'), branch: user.branch });
    ok.classList.remove('hidden');
    toast('Repair booked! Staff will confirm. 🛠️');
    e.target.reset();
    const hidden = $('#repDate'); if (hidden) hidden.value = '';
    await paintSlots('');
    await renderBookingCalendar();   // reflect the new booking (day may now be fuller/full)
    $('#myReps').innerHTML = renderMyReps(await API.getRepairsByUser(user.id));
  });
}
