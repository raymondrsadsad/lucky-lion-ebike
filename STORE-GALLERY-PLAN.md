# Store Gallery (Hero Slideshow) — Feature Plan

Add store photos to the hero: **2 stacked polaroid photos on each side** of the centered
logo/brand (4 visible slots), **cross-fading through a pool** of photos that **staff upload**.
Photos live in **Supabase Storage** so they're shared to every visitor and changeable by staff.

## 1. Layout
```
 [photo]                         [photo]
              🦁  LUCKY LION
 [photo]      Quality Ride.      [photo]
              [ Browse Models ]
```
- **Desktop:** 3 columns — left = 2 stacked polaroids, center = logo/brand/tagline/CTA, right = 2 stacked polaroids.
- **Tablet:** 1 polaroid each side (or center stays, photos shrink).
- **Phone:** logo/brand on top, then **ONE big rotating polaroid** below (single-photo slideshow with dots) — chosen over the 2×2 grid.
- **Polaroid style:** white border, soft shadow, slight tilt for character.
- **Empty state:** if no photos uploaded yet → hide the side slots, logo stays centered (no broken frames).

## 2. Slideshow behavior
- 4 visible slots pull from a **pool** of all uploaded store photos.
- Each slot **cross-fades** to the next photo on a timer (~4–5s), **staggered** so they don't all flip at once.
- Fewer than 4 photos → show what exists; 0 photos → hide gallery.
- Respects `prefers-reduced-motion` (no auto-fade if user disabled motion).

## 3. Data & storage (Supabase)
- **Storage bucket:** `store-photos` (Public read).
- **Table `store_photos`:** `id`, `path` (object path in bucket), `url` (public URL), `caption` (optional), `sort` (int), `created_at`.
- **Policies:** public read; insert/delete allowed via anon key (staff-only enforced in the UI) — same prototype approach as `users`/`repairs`.

## 4. Staff management (staff portal)
- New **"Store Photos"** section in `staff.html`:
  - **Upload photo** → file picker → **crop tool** (staff crops/positions the image to the
    gallery aspect ratio, e.g. 4:3, before saving) → auto-resize → uploads to Storage → inserts `store_photos` row.
  - **List** current photos as thumbnails with a **Delete** button (removes row + storage object).
  - (Optional later: drag to reorder, add caption.)
- Basic client-side guard: image files only, ~5 MB max (compress/resize if needed).

## 5. Code changes
- **`js/api.js`** (new async methods, backend-ready pattern):
  - `getStorePhotos()` — GET `store_photos` ordered by `sort`/`created_at`.
  - `addStorePhoto(file)` — upload to Storage (`/storage/v1/object/store-photos/<name>`), then insert row; returns record.
  - `deleteStorePhoto(id, path)` — delete storage object + row.
- **`index.html`** — add hero side-column markup (`#heroLeft`, `#heroRight`) + mobile container.
- **`js/app.js`** — fetch photos, fill 4 slots, run the staggered cross-fade slideshow.
- **`js/staff.js` / `staff.html`** — the Store Photos manager (upload/list/delete).
- **`css/styles.css`** — polaroid frames, hero 3-column layout, fade animation, responsive rules.

## 6. Owner setup (one-time, in Supabase — I'll give exact steps)
1. **Storage → New bucket** → name `store-photos` → **Public** → create.
2. Run a short SQL snippet (I'll provide, like `schema.sql`) to create the `store_photos`
   table + read/write policies + storage policies.

## 7. Build order
1. Supabase: create bucket + run `store-gallery.sql`.
2. `api.js`: store-photo upload/list/delete (Storage REST).
3. Staff portal: Store Photos manager — test upload/delete.
4. Hero gallery UI + slideshow + responsive CSS.
5. End-to-end test (staff uploads → shows on main page on another device) → rebuild `deploy` zip → redeploy to Netlify.

## 8. Open questions
- **Captions** under photos — include, or photos only? (default: photos only)
- **Mobile** — 2×2 grid below the logo, or a single rotating photo? (default: 2×2)
- **File size/compression** — auto-resize big phone photos in the browser before upload? (recommended, keeps storage small + fast)

---
*Plan for review — nothing built yet. Confirm and I'll start with the Supabase bucket + SQL.*
