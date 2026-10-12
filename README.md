# Lucky Lion eBike — Trece Branch Website

A single-page website for **Lucky Lion eBike (Trece Martires, Cavite)** with a member area.
Public visitors can browse without logging in; members (customers/staff) log in for extra tools.

Built as a **capstone school project**. Data is real (from the official Lucky Lion brochure and
public branch listings); anything not published online is flagged as TODO in `data/`.

## Tech (confirmed setup)
- **Vanilla JS**, no build step — just `<script>` tags.
- **Plain CSS** — one stylesheet themed to the real Lucky Lion logo colors.
- **localStorage, backend-ready** — all data goes through one `async` module (`js/api.js`);
  a real backend can be added later by rewriting only that file (see `PLAN.md` → Migration).

## How to run
Serve over HTTP (not `file://`) so the JSON data loads:

```
cd "lucky lion'"
python3 -m http.server 8000
```

Then open **http://localhost:8000**.

## Demo accounts (auto-seeded on first load)
| Role     | Username | Password   | Lands on |
|----------|----------|------------|----------|
| Customer | `user`   | `user123`  | main page + ☰ member menu |
| Staff    | `staff`  | `staff123` | `staff.html` |

Reset demo data: clear the site's localStorage (DevTools → Application → Local Storage) and reload.

## Structure
```
index.html          Public single page + login + customer member area
staff.html          Staff portal (users, scheduled repairs, create user)
css/styles.css      Theme (Lucky Lion red/black/white + blue)
js/store.js         Loads data/*.json (cached)
js/api.js           Data layer — localStorage now, async (backend-ready)
js/app.js           Public page rendering + login + member panels
js/staff.js         Staff portal logic
data/products.json  22 real models (specs + SRP), grouped by wheels
data/content.json   Trece + branches, About, Why Choose Us, Tips, LTO road rules
assets/logo.jpg     Real Lucky Lion logo
brochure-agila-v2.pdf   Source brochure (reference)
PLAN.md             Full project plan + decisions
```

## Features
**Public:** hero (logo + tagline) · Store (4/3/2-wheel models → specs modal, no cart) ·
Why Choose Us · About · Location (Trece highlighted + other branches) · Contact (phone, FB,
YouTube, Viber) · Get directions · business hours.

**Customer (after login):** ☰ menu → Profile (+ change password) · Guides* · Maintenance* ·
Tips (4 categories) · Road Rules (LTO classification) · Schedule Repair · Log out.

**Staff:** list customers + their e-bikes · scheduled repairs (advance status) · create user.

\* Guides & Maintenance are placeholders until real content is provided.

## To confirm with the owner (not fabricated)
- Trece **email** (none published online), founding year, confirm Viber on 0997-955-8909.
- **Clear per-model photos** (brochure images are low-res).
- Real **Guides / Maintenance** content.
- Verify branch addresses/phones.

## Quick launch (for presenting)
Double-click **`start.command`** — it starts the local server and opens the site in your browser.
To stop, close the Terminal window it opened.
