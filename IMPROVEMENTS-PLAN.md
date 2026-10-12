# Lucky Lion — Improvements Plan (v2)

Context: the Lucky Lion **main branch boss** likes the site and invited the team to head office.
Goal: make many improvements, built **easy → hard** so we ship as much as possible per session
and can resume next day. Deploy after each phase so progress is always live.

Key architecture note: several requests are "staff can change X" (models, prices, sales,
social links, theme, photo order). Those values must move from static files into **Supabase**
so edits are saved and shared to everyone. We already have this pattern (users, repairs,
store_photos). We'll add a few small tables and staff editors.

---

## PHASE 1 — Quick wins (easy) ✅ do first
1. **User menu: rename "Guides" → "Manuals"** (label only).
2. **Floating Messenger button** (bottom-right, all pages) → opens **Lucky Lion Trece FB Messenger**
   (`m.me/<page>`). *(Need to confirm the page's m.me link.)*
3. **Staff hamburger menu** (☰ top-right) → **Profile** (edit info + change password) + **Log out**
   — same style as the customer menu.
4. **Collapsible users list** on staff — each user (or the Customers/Staff groups) collapses so a
   long list doesn't eat the screen. Click to expand.
5. **Photo sequence** — in staff Store Photos, show a **number** on each photo and let staff
   **reorder** them (up/down arrows, or drag). Saves to `store_photos.sort`; the hero slideshow
   respects the order.

## PHASE 2 — Editable site settings (medium) — *answers your "suggest how to do it"*
6. **Site Settings in the cloud.** Add a `site_settings` table in Supabase (simple key→value:
   phone, email, facebook, youtube, viber, address, maps, hours, active_theme…). Add a staff
   **"Site Settings"** editor (a form). The public site reads settings from this table
   (falling back to `content.json` if empty). → Staff can change the **top phone number**, the
   **contact-us socials** (FB/YouTube/Viber/email), etc., and it updates for everyone instantly.
   *This is the clean, capstone-friendly way to make "staff can edit the links" work.*

## PHASE 3 — Editable models: badges, sale, price (medium→hard)
Move per-model editable bits to a Supabase `model_meta` table (id, on_sale, sale_price_cash,
sale_price_cc, sale_price_hc, is_new_arrival, hidden, price_override, sort). Base specs stay in
`products.json`; staff overrides layer on top. Staff **Models manager** lets them:
7. **Badges:** mark a model **"New Arrival"** or **"On Sale"** → badge shows on the store card
   (placeholder styling for now).
8. **Sale:** toggle On Sale + enter **sale price** (Cash / Credit Card / Home Credit); store card &
   detail show original struck-through + sale price.
9. **Edit price / remove model:** change SRP, or hide/remove a model from the store.
10. **Add new model** with full specs (name, wheels, motor W, battery, brakes, price, photos).
    → lets staff "fill up" the catalog.

## PHASE 4 — User content (medium)
11. **Manuals** — keep as the section (renamed); real PDFs/text later when the company provides.
12. **Maintenance → "General Maintenance"** — real, e-bike-agnostic content, categorized
    (my proposed categories): **Battery & Charging · Brakes & Tires · Motor & Controller ·
    Cleaning & Storage · Safety Checks · Troubleshooting**. A few clear how-to items each.

## PHASE 5 — Seasonal Themes (hard)
13. **Theme switcher (staff-controlled, site-wide).** Staff picks the active theme; it changes the
    **site background** + adds a **festive accent to the logo** (e.g., Christmas = Santa hat overlay
    on the Lucky Lion logo). Stored in `site_settings.active_theme`.
    Themes: **Default, New Year, Valentine's, Easter, Summer, Mother's Day, Father's Day,
    Back-to-School, Independence Day, Halloween, Christmas, Year-End Clearance.**
    - Background per theme: tasteful CSS gradient + optional subtle pattern/image (I'll pick
      suitable, license-safe visuals; can be multiple options per theme).
    - Logo accent: small transparent PNG overlays (santa hat, hearts, etc.) positioned on the logo.
      *(I'll create simple ones; confirm that's OK vs. sourcing.)*

## PHASE 6 — Poster maker ⭐ (hard, most important to you)
14. **Poster maker (staff tool).** Pick **a unit** + **a theme** → generate a shareable/printable
    **poster**:
    - Themed **background** (from the selected theme's backgrounds).
    - **Original price** shown + staff-entered **Sale price** for **Cash / Credit Card / Home Credit**.
    - **Major specs listed on the side(s)** (motor W, battery, brakes, wheels).
    - Lucky Lion **logo** (themed).
    - Output: render to an image (**download PNG**) to post/print.
    - **Brochure (many units): deferred** — plan later once poster works.

---

## My suggestions / decisions (confirm or override)
- **Social/link editing (Phase 2):** use the `site_settings` table + staff editor (above). Cleanest,
  no code edits needed to change a number/link.
- **Theme backgrounds:** I'll use polished gradients (+ optional imagery) so it works offline and
  loads fast; multiple background choices per sale where useful.
- **Logo festive accents:** I'll create lightweight overlay graphics (e.g., santa hat) unless you'd
  rather supply them.
- **Poster output:** downloadable **PNG** (print/share on Facebook). OK?
- **Sale prices:** three inputs per unit — **Cash, Credit Card, Home Credit**. Correct?

## Open questions
1. **Messenger link** — confirm the Trece page's `m.me` handle (or paste the FB page link and I'll derive it).
2. **Scope** — build for Trece now but keep it multi-branch-ready? (Recommended.)
3. **Manuals content** — placeholders until the company gives real manuals? (Assumed yes.)
4. Anything in the draft I mis-ordered or you want pulled earlier (e.g., poster before themes)?

## Build order recap (ship after each)
Phase 1 → 2 → 3 → 4 → 5 → 6. Deploy to Netlify after each phase so it's always presentable.
