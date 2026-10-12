# Lucky Lion eBike — Prototypes

A running log of each prototype version and what it covers.

| Version | Status | Summary |
|---|---|---|
| [Prototype 1](#prototype-1) | ✅ Done | First working build — home page, login, user & staff privileges |
| [Prototype 2](#prototype-2) | 🚧 In progress | Cloud backend (Supabase), manual, maintenance content, editable models + sale prices, store photo slideshow, seasonal themes, poster maker, upgraded repairs |

---

## Prototype 1

First prototype.

### Home page

**Header** — each item scrolls down to its section:
1. **Store** — about the models (clickable, shows details)
2. **About** — about us
3. **Location** — branches
4. **Contact Us** — phone number and social media
5. **Clickable social media accounts**
6. **Login function**

### Privileges
1. User
2. Staff

### User
1. **Profile** — change information and password
2. **Guides** — *(becomes the manual in Prototype 2)*
3. **Maintenance** — no content yet *(added in Prototype 2 — general maintenance)*
4. **Tips** — general tips
5. **Road Rules** — regarding LTO
6. **Schedule Repair**

### Staff
1. **User list**
2. **Schedule Repairs**
3. **Create User**
4. **Store Photos** — displayed on the home page *(this is a Prototype 2 item; not finished yet, to be updated later)*

---

## Prototype 2

🚧 **In progress — not finished yet. To be updated later.**

Everything that changed since Prototype 1.

### Backend (new)
- **Cloud backend** — moved from static/local data to **Supabase** (Postgres + Storage). Users, repairs, models, settings, and photos are now saved online and shared across everyone.
- Live site hosted on **Netlify**.

### Home page
- **Store photo slideshow** — the hero on the home page now cross-fades through staff-uploaded store photos.
- **Seasonal themes / sale banner** — the whole page can switch to a seasonal look (e.g. Christmas) with a sale ribbon at the top, controlled by staff.
- **Model details upgraded** — each model can now have **multiple photos** with a gallery (prev/next arrows, a `1 / N` counter, and a thumbnail strip). Models can show **NEW** and **SALE** badges and sale prices.

### User
- **Guides → Manual** — the Guides section becomes a full manual.
- **Maintenance** — added general maintenance content (was empty in Prototype 1).

### Staff (new tools)
- **Models manager** — mark models as New Arrival / On Sale, set sale prices (Cash / Credit Card / Home Credit), change the SRP, hide a model from the store, or add a brand-new custom model.
- **Model photos** — upload and manage multiple photos per model, with **drag-to-reorder** (works on mouse and touch) plus a built-in crop tool.
- **Poster Maker** — generate a downloadable sale poster (PNG) for any model: pick a theme, and every field (name, specs, prices, contact info) is pre-filled but editable. Contact details auto-fill from Site Settings.
- **Store Photos** — upload/crop/reorder the photos shown in the home-page slideshow.
- **Site Settings** — edit contact info (phone, email, address, hours), social links, and the active seasonal theme.

### Scheduled Repairs (upgraded)
- **Scheduled / Completed** history toggle with counts.
- Overdue repairs highlighted in red, tap-to-call, and an edit modal (repair type, cost, date, notes).
- Cancel / reopen / delete, plus history search and a total of logged charges.

### Backend status
- ✅ **Live** — Supabase SQL applied and site deployed to Netlify.

_(More details to be added as Prototype 2 develops.)_
