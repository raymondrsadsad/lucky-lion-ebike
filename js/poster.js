/* poster.js — draws a shareable sale poster by overlaying editable values onto a
   branded flyer template (offline, downloadable PNG).

   Extensible: every template is one entry in POSTER_TEMPLATES = a background image +
   a coordinate map (all coords are in the template image's NATIVE pixel space). Adding
   a future template = drop an asset in /assets and add one config object here. */
const Poster = (() => {
  const _imgCache = {};   // src -> Promise (dedupes loads)
  const _ready = {};      // src -> decoded Image (sync access for fast drag preview)
  const loadImg = (src) => _imgCache[src] || (_imgCache[src] = new Promise(res => {
    const i = new Image(); i.onload = () => { _ready[src] = i; res(i); }; i.onerror = () => res(null); i.src = src;
  }));
  const peso = n => '₱' + Number(n || 0).toLocaleString('en-PH');
  // format a price field: a bare number → ₱45,000 ; anything else (already has ₱/commas) → as typed
  const money = v => {
    const s = String(v == null ? '' : v).trim();
    if (s === '') return '';
    const n = Number(s.replace(/[₱,\s]/g, ''));
    return (/^[\d,₱.\s]+$/.test(s) && !isNaN(n) && n > 0) ? peso(n) : s;
  };
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  // shrink font size until `text` fits within maxW (down to minPx); sets ctx.font, returns px
  function fitFont(ctx, text, style, family, startPx, minPx, maxW) {
    let s = startPx;
    while (s > minPx) { ctx.font = `${style} ${s}px ${family}`; if (ctx.measureText(text).width <= maxW) break; s -= 1; }
    ctx.font = `${style} ${s}px ${family}`; return s;
  }

  /* ============ TEMPLATE REGISTRY ============
     Coords are in the template image's native pixels (this flyer: 854×1280).
     Tweak any number here to nudge a value's position — nothing else needs to change. */
  const HEAD = 'Poppins, sans-serif', BODY = 'Inter, sans-serif';
  const POSTER_TEMPLATES = {
    flyer2026: {
      key: 'flyer2026', label: 'Lucky Lion Flyer (Ride Smart)',
      src: 'assets/poster-template.jpg?v=20260916b', w: 854, h: 1280,

      // MODEL NAME — angled red/black ribbon top-right. Cover it with a matching black trapezoid
      // (+ a red left accent to keep the brand look), then draw the real name centered.
      name: { x: 650, y: 258, size: 30, min: 15, max: 225, style: '800 italic', family: HEAD, color: '#ffffff', align: 'center',
        coverPoly: [[514, 222], [749, 222], [818, 274], [514, 274]], coverPolyFill: '#0b0b0b',
        accentPoly: [[519, 225], [600, 225], [613, 271], [519, 271]], accentPolyFill: '#e11b22' },

      // spec values — LEFT-aligned on the line BELOW each baked "LABEL:" (label left-x = 591),
      // all at one UNIFORM size (drawSpecs shrinks them together to the smallest fit).
      specs: {
        style: '700 italic', family: HEAD, size: 24, min: 11, color: '#141414', align: 'left',
        rows: {
          battery:  { x: 591, y: 342, max: 210 },
          motorW:   { x: 591, y: 424, max: 210 },
          loadKg:   { x: 591, y: 507, max: 210 },
          brake:    { x: 591, y: 593, max: 210 },
          maxSpeed: { x: 591, y: 677, max: 210 },
        }
      },

      // SALE PRICE panel (single price now) — cover the baked ₱XX,XXX, draw the value.
      salePrice: { x: 515, y: 812, size: 52, min: 24, max: 274, style: '900 italic', family: HEAD, color: '#e11b22', align: 'left',
        // main cover (middle band) + a small patch over the baked ₱XX,XXX comma's descender tail
        covers: [{ x: 505, y: 764, w: 284, h: 54, fill: '#fafafa' }, { x: 642, y: 814, w: 20, h: 16, fill: '#fafafa' }] },

      // CALL OR TEXT NOW! — cover the baked number (on black), draw the real number
      phone: { x: 160, y: 1063, size: 36, min: 18, max: 272, style: '900 italic', family: HEAD, color: '#ffffff', align: 'left',
        cover: { x: 156, y: 1032, w: 305, h: 40, fill: '#0d0d0d' } },

      // AVAILABLE COLORS — clear the frame interior, draw 1..max swatches (62px boxes, step 85, y=728)
      colors: { x: 85, y: 755, box: 59, gap: 19, radius: 6, max: 5, border: '#161616', borderW: 3,
        frameClear: { x: 60, y: 752, w: 404, h: 66, fill: '#fafafa' } },

      // FEATURES — 2 columns × 3 rows of dotted lines (checkmarks are baked in)
      features: { rows: 3, y0: 902, rowGap: 37, colX: [116, 474], colMax: [295, 320],
        style: '600', family: BODY, size: 20, min: 12, color: '#232323', align: 'left' },

      // e-bike photo drop zone (the big empty area on the left)
      photo: { x: 28, y: 298, w: 462, h: 388 },
    }
  };

  const templates = () => Object.values(POSTER_TEMPLATES).map(t => ({ key: t.key, label: t.label }));
  const get = k => POSTER_TEMPLATES[k] || POSTER_TEMPLATES.flyer2026;

  // default photo placement: fit-contain inside the template's photo zone, centred
  function defaultPhotoState(templateKey, img) {
    const T = get(templateKey), z = T.photo;
    const fit = img ? Math.min(z.w / img.width, z.h / img.height) : 1;
    return { cx: z.x + z.w / 2, cy: z.y + z.h / 2, scale: fit, fit };
  }

  function paintCover(ctx, c) { if (!c) return; ctx.fillStyle = c.fill; ctx.fillRect(c.x, c.y, c.w, c.h); }
  // fill an arbitrary polygon (pts = [[x,y],…]) — used to cover the angled MODEL NAME ribbon
  function paintPoly(ctx, pts, fill) {
    if (!pts || !pts.length) return;
    ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath(); ctx.fill();
  }

  function drawValue(ctx, z, text) {
    text = String(text == null ? '' : text).trim();
    if (!text) return;
    (z.covers || (z.cover ? [z.cover] : [])).forEach(c => paintCover(ctx, c));
    if (z.coverPoly) paintPoly(ctx, z.coverPoly, z.coverPolyFill || '#0b0b0b');
    if (z.accentPoly) paintPoly(ctx, z.accentPoly, z.accentPolyFill || '#e11b22');
    ctx.textAlign = z.align || 'left';
    ctx.fillStyle = z.color;
    const px = fitFont(ctx, text, z.style, z.family, z.size, z.min, z.max);
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(text, z.x, z.y);
    if (z.strike) {
      const w = Math.min(ctx.measureText(text).width, z.max);
      const x0 = z.align === 'center' ? z.x - w / 2 : z.x;
      ctx.strokeStyle = '#e11b22'; ctx.lineWidth = Math.max(3, px * 0.09);
      ctx.beginPath(); ctx.moveTo(x0, z.y - px * 0.32); ctx.lineTo(x0 + w, z.y - px * 0.32); ctx.stroke();
    }
  }

  // Spec values at ONE UNIFORM size: shrink each to fit its own box, then draw EVERY value at the
  // smallest of those sizes — so "1500W" and "60V/45AH Lead Acid" always render the same size.
  function drawSpecs(ctx, T, v) {
    const s = T.specs;
    const present = Object.entries(s.rows)
      .map(([k, p]) => ({ p, t: String(v[k] == null ? '' : v[k]).trim() }))
      .filter(o => o.t);
    if (!present.length) return;
    const fitSize = (t, max) => {
      let sz = s.size; ctx.font = `${s.style} ${sz}px ${s.family}`;
      while (sz > s.min && ctx.measureText(t).width > max) { sz--; ctx.font = `${s.style} ${sz}px ${s.family}`; }
      return sz;
    };
    const uni = Math.min(...present.map(o => fitSize(o.t, o.p.max)));
    ctx.textAlign = s.align; ctx.fillStyle = s.color; ctx.textBaseline = 'alphabetic';
    ctx.font = `${s.style} ${uni}px ${s.family}`;
    present.forEach(o => ctx.fillText(o.t, o.p.x, o.p.y));
  }

  function drawColors(ctx, T, list) {
    const z = T.colors; if (!z) return;
    paintCover(ctx, z.frameClear);
    const arr = (list || []).filter(v => v && String(v).trim() !== '').slice(0, z.max);
    arr.forEach((col, i) => {
      const x = z.x + i * (z.box + z.gap);
      rr(ctx, x, z.y, z.box, z.box, z.radius);
      ctx.fillStyle = col; ctx.fill();
      ctx.lineWidth = z.borderW; ctx.strokeStyle = z.border; ctx.stroke();
    });
  }

  function drawFeatures(ctx, T, feats) {
    const z = T.features; if (!z) return;
    ctx.textAlign = z.align; ctx.textBaseline = 'alphabetic';
    (feats || []).forEach((txt, i) => {
      txt = String(txt == null ? '' : txt).trim(); if (!txt) return;
      const col = i % 2, row = (i - col) / 2;   // reading order: f1=top-left, f2=top-right, f3=row2-left…
      if (row >= z.rows) return;
      const x = z.colX[col], y = z.y0 + row * z.rowGap;
      ctx.fillStyle = z.color;
      fitFont(ctx, txt, z.style, z.family, z.size, z.min, z.colMax[col]);
      ctx.fillText(txt, x, y);
    });
  }

  function drawPhoto(ctx, img, st) {
    if (!img || !st) return;
    const dw = img.width * st.scale, dh = img.height * st.scale;
    ctx.drawImage(img, st.cx - dw / 2, st.cy - dh / 2, dw, dh);
  }

  // Full render: background → photo → covers+values. o = { templateKey, values, photo:{img,cx,cy,scale} }
  async function render(canvas, o) {
    if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch { } }
    const T = get(o.templateKey);
    canvas.width = T.w; canvas.height = T.h;
    const ctx = canvas.getContext('2d');
    const bg = await loadImg(T.src);
    if (bg) ctx.drawImage(bg, 0, 0, T.w, T.h);
    else { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, T.w, T.h); }
    if (o.photo && o.photo.img) drawPhoto(ctx, o.photo.img, o.photo);
    const v = o.values || {};
    drawValue(ctx, T.name, v.name);
    drawSpecs(ctx, T, v);
    drawValue(ctx, T.salePrice, money(v.salePrice));
    drawValue(ctx, T.phone, v.phone);
    drawColors(ctx, T, v.colors);
    drawFeatures(ctx, T, v.features);
  }

  // Fast preview during photo drag: background + photo only (skips text for smoothness).
  // Falls back to a full render if the background isn't decoded yet.
  function previewFast(canvas, o) {
    const T = get(o.templateKey);
    const bg = _ready[T.src];
    const ctx = canvas.getContext('2d');
    canvas.width = T.w; canvas.height = T.h;
    if (bg) ctx.drawImage(bg, 0, 0, T.w, T.h);
    else { ctx.fillStyle = '#f4f5f7'; ctx.fillRect(0, 0, T.w, T.h); }
    if (o.photo && o.photo.img) drawPhoto(ctx, o.photo.img, o.photo);
  }

  // Empty-state before anything is loaded.
  async function placeholder(canvas, templateKey) {
    const T = get(templateKey);
    canvas.width = T.w; canvas.height = T.h;
    const ctx = canvas.getContext('2d');
    const bg = await loadImg(T.src);
    if (bg) ctx.drawImage(bg, 0, 0, T.w, T.h);
    else { ctx.fillStyle = '#f4f5f7'; ctx.fillRect(0, 0, T.w, T.h); }
  }

  return { render, previewFast, placeholder, templates, get, defaultPhotoState, loadImg };
})();
