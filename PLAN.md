# Lucky Lion eBike — Website Plan

Fresh, standalone project for the **Lucky Lion eBike** brand (not related to any other brand).
Reference look/feel: **https://supremoebikes.company.site** (single-page storefront).

**Real data only** — product catalog comes from the official Lucky Lion brochure
(`data/products.json`, 22 models with real specs + SRP). Do NOT invent specs, prices,
branches, or contact details; anything unknown is left as a TODO to confirm with the owner.

Two layers:
1. **Public single page** — anyone can open and browse, no login.
2. **Members (login required)** — one shared login; after signing in the site shows a
   **different page depending on role** (customer vs staff).

---

## 1. Core rules

- **No login required** to view the public site.
- **One page** (single-page); top-left nav links **scroll** to sections (anchors).
- Product cards are **display only** — **no Buy / Add to Cart / Bag**.
- **One login** for everyone. Role decides what you see after logging in:
  - **Customer** → back to the main page, with a hamburger (☰) menu of member tools.
  - **Staff** → a staff page (users, scheduled repairs, create users).
- Customer accounts are **created by staff** when a customer buys; customer can
  **change their password** later in Profile.

---

## 2. Public page layout

### Center (hero)
- **Lucky Lion** brand (logo/name) + tagline/phrase. *(logo + exact tagline TODO)*

### Top-left nav (scroll links)
| Link | Scrolls to |
|------|-----------|
| **Store** | Grid of all e-bike **models** (clickable) |
| **About** | About Lucky Lion |
| **Location** | Branch locations (home branch first + highlighted, others below) |
| **Contact Us** | Contact no. · email · Facebook · YouTube · Viber |

**Store behavior:** models are grouped by **wheels** — **4 Wheels**, **3 Wheels**, **2 Wheels**.
Click a model → shows **pictures**, **description**, **specifications** (motor watts, battery,
brakes, SRP). No buy/cart/bag.

Wheel grouping (from brochure):
- **4 Wheels:** Agila V2, K4004 V4, Lucky Lion E-Car, Golf V+ V4/V5/V6, Honor V1, Honor V3, KT31S
- **3 Wheels:** God Plus R3 V2, God Super V2/V3/V4/V5/V6/V7, Big Cargo, Sheep Plus V8, Lucky Bee
- **2 Wheels:** Eagle, Turtle, Deer

### Top-right
- **Contact no.**
- **Get directions** (Google Maps)
- **Business hours**
- **Facebook**, **YouTube**, **Viber** logos (clickable)
- **Login** button

### Public section order (single page, top → bottom)
1. **Hero** — centered brand + tagline
2. **Store** — models grouped by wheels (4 / 3 / 2), clickable → detail
3. **Why Choose Us** — Lucky Lion selling points (`content.json`): Quality Ride/Trusted
   Performance · Free Delivery · Lifetime Service · Flexible Payment · Branches Near You
4. **About** — About Lucky Lion
5. **Location** — Trece first + highlighted, other branches below
6. **Contact Us** — no. · email · FB · YouTube · Viber
7. **Footer** — contact + socials

> **Reference (verified from supremoebikes.company.site):** logo left, **center** nav
> (Store/About/Location/Contact Us), right side phone + Get directions + Business hours +
> social icons; hero logo+tagline+locations; product grid with Buy Now + cart + account;
> order Products → Why Choose Us → About → Location → Hours/Payment.
> **Our deliberate differences:** nav is **top-left** (per spec); **no Buy/cart/account**
> (display-only); models **grouped by wheels** instead of filter/sort; plus **Login** and
> **Viber**, which the reference lacks.

---

## 3. Roles after login (shared login, different pages)

### Customer (member) — main page + hamburger ☰ dropdown
- **Profile** (edit info + **change password**)
- **Guides** (product manuals) — *placeholder content for now*
- **Maintenance** — *placeholder content for now*
- **Tips** — real content, in **4 categories** (see below)
- **Road rules** — real content from **LTO** e-bike classification (see below)
- **Schedule repair**
- **Log out**

**Tips** (from `data/content.json`) — 4 categories, several tips each:
1. **Battery Care & Range Maximization** (The Tech)
2. **Riding Technique & Safety** (The Ride)
3. **Maintenance & Mechanicals** (The Hardware)
4. **Purchasing & Legalities** (The Rules)

**Road rules** — LTO Light Electric Vehicle classification (PMS, L1a, L1b, L2a, L2b, L3,
L4/L5, L6/L7) with each class's helmet / license / registration / allowed-roads. Includes a
status note: as of late 2024 LTO **suspended** e-bike registration/license/helmet enforcement
pending EVIDA-aligned rules.

### Staff — staff page
- **Users** — list customers (and their e-bike/account info)
- **Scheduled repairs** — repair bookings from customers
- **Create user** — make a new customer account (for buyers)
- **Log out**

---

## 4. Product catalog (REAL — from brochure)

Stored in `data/products.json` — 22 models, e.g.:
- Lucky Agila V2 · 1500W · 60V/45AH · Front & Rear Disc · ₱141,600
- Lucky Lion E-Car · 2000W · 60V/65AH · Rear Disc · ₱212,400
- Honor V3 · 2500W · 60V/45AH · Front & Rear Disc · ₱159,300
- Lucky Deer · 500W · 48V/20AH · All Drum · ₱29,500
- …(full list in the JSON)

Payment (from brochure): **Cash · Home Credit · Credit Card**.
**Free delivery for Cavite & selected areas.** Prices subject to change without notice.

> **Product photos**: brochure images are low-res thumbnails. Need clearer per-model photos
> (from owner / official FB) before final build. *(TODO)*

---

## 5. Tech approach

### Confirmed setup decisions (owner-approved)
- **Backend:** localStorage now, **backend-ready** — one async data module (`js/api.js`);
  swap its internals for `fetch('/api/...')` later without touching page code.
- **JavaScript:** **Vanilla JS, no build step** — `store.js` (data loader), `api.js` (data
  layer), `app.js` (public + member), `staff.js` (staff page); plain `<script>` tags.
- **CSS:** **Plain, single stylesheet** (`css/styles.css`), themed to the real Lucky Lion
  logo colors (red #e11b22 · black #141414 · blue #2e6be6 accent).
- **Hosting:** TBD — decide later. **This is a capstone school project and must be hosted
  eventually**, so keep the backend-ready path so a real backend/DB can be added for the
  defense (see Migration below).

### Migration path (for capstone defense, later)
1. Stand up a backend (owner to choose stack when ready) exposing `/api/*` endpoints.
2. Rewrite only the insides of `js/api.js` to call `fetch()` — UI stays the same.
3. Move data model (users, repairs) from localStorage keys to real DB tables (already shaped
   for this — see §6).
4. Deploy static front-end + backend to chosen host.


- **Static site**: HTML + CSS + JavaScript. Single `index.html` for the public page +
  member overlay; a separate staff view/page.
- **Smooth-scroll** anchored nav, sticky header.
- **Auth + data via localStorage** for now, funneled through **one data module** so a real
  backend can be swapped in later without touching the UI. Every data call is `async`.
- **Products** read from `data/products.json` (easy to edit).
- **Hosting**: Netlify / Vercel / GitHub Pages.

---

## 6. Data model (localStorage now → DB tables later)

- **users**: id, role (`customer`|`staff`), username, password*, name, email, phone, address, ownedModelId
- **repairs**: id, userId, modelId, date, timeSlot, status, notes
- **products**: static, from `data/products.json`
- **content**: guides / maintenance / tips / road rules (static)

\* localStorage passwords are not secure — prototype only; real auth at backend phase.

---

## 7. Build phases

1. **Skeleton** — single-page layout: sticky header (top-left nav · centered brand · top-right info + login), smooth scroll.
2. **Public sections** — Store (model grid + detail from products.json, no cart), About, Location, Contact.
3. **Auth** — shared login; role-based routing (customer → main+☰, staff → staff page); logout.
4. **Customer members** — hamburger dropdown: Profile (+change password), Guides, Maintenance, Tips, Road rules, Schedule repair.
5. **Staff page** — users list, scheduled repairs, create user.
6. **Content + assets** — model photos, About text, branches, contact/socials, business hours, guides/maintenance/tips/road-rules content.
7. **Polish** — responsive/mobile, styling to match reference, test logged-out / customer / staff.

---

## 8. Confirmed / gathered data (in `data/`)
- **Products** (`products.json`): 22 models, specs + SRP, grouped by wheels — from official brochure.
- **Payment**: Cash (w/ discount), Home Credit, Credit Card. **Free delivery** Cavite & selected areas. Lifetime service.
- **Trece branch** (`content.json`): 13th Martyrs (Josefino Bldg), Brgy. San Agustin, Trece
  Martires City, Cavite (near Waltermart, beside THM Motorcycle) · **0997-955-8909
  (Jared Lina)** · daily 8:30 AM–5:30 PM · FB page · **YouTube** (official channel) ·
  **Viber** (same mobile) · **Maps** search link. *(from public listings — verify)*
- **Other branches** (`content.json`): Imus main (Buhay na Tubig), Imus Robinsons, Dasmariñas,
  Silang, Tanza, San Pedro, Cabuyao, Calamba, Punta. *(addresses/phones partial — confirm)*
- **About** (`content.json`): compiled from public info (Imus main branch, Cavite/Laguna
  branches, lifetime service, payment, free delivery).
- **Why Choose Us** (`content.json`): 5 real selling points.
- **Tips** (`content.json`): 4 categories, several practical tips each.
- **Road rules** (`content.json`): full LTO LEV classification + suspension status note.
- **Tagline**: "Quality Ride. Trusted Performance." *(from brochure badge)*

## 9. Still needed / to confirm (do NOT fabricate)
1. **Logo** file + brand colors.
2. **Trece email** — none published anywhere online (left blank; add if owner has one).
3. **Confirm** Viber is enabled on 0997-955-8909; verify exact address/hours & founding year.
4. **Branch list**: verify/complete addresses & phones; confirm which branches to show.
5. **Clear product photos** per model (brochure images are low-res thumbnails).
6. **Guides / Maintenance** real content (placeholders used until provided).
7. **Seed accounts** to start (one staff login + a sample customer)?
8. **English only, or English + Tagalog?**

---

*Draft plan based on your spec + the official brochure. Adjust anything before we build.*
