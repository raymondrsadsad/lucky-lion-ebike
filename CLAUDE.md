# Lucky Lion eBike — System Notes (read this first)

> Purpose: this file is the single source of truth for how the project works, so a fresh
> session can skip re-exploring the codebase. **Keep it updated on every change.**
> Last updated: 2026-09-16.

## What it is
Static marketing + member site for **Lucky Lion eBike (Trece Martires, Cavite)**. Capstone
school project. **Vanilla JS, plain CSS, no build step** — just `<script>` tags. Backend is
**Supabase** (Postgres + Storage) accessed via REST from `js/api.js`. Live host is **Netlify**
(deployed by drag-dropping a zip — see Deploy flow).

## Run locally
```
cd "lucky lion'"
python3 server.py 8000     # no-cache dev server (already may be running on :8000)
```
Open http://localhost:8000/ (public) and http://localhost:8000/staff.html (staff/admin).
Demo logins: customer `user`/`user123`, staff `staff`/`staff123` (Trece), **admin `admin`/`admin123`** (seeded by `multibranch.sql`).
Note: local pages still talk to the **live Supabase** backend, so cloud features need their
tables to exist (see Pending).

## Deploy flow (IMPORTANT — do all steps)
There is **no git, no Netlify CLI, no site link**. Deploy = manual zip upload.
1. Edit files in the **project root** (the real source).
2. **Sync** the changed files into `deploy/` (an exact mirror; it omits `supabase/`, docs, zip).
3. **Bump the cache-bust** `?v=YYYYMMDDx` on changed assets in `index.html` + `staff.html`
   (currently `v=20260704b`). HTML files themselves aren't cache-busted → hard-refresh after deploy.
4. **Rebuild the artifact:** `cd deploy && zip -r -X ../lucky-lion-site.zip . -x '*.DS_Store'`
   (zip root must contain index.html directly, i.e. zip from *inside* deploy/).
5. User drags `lucky-lion-site.zip` onto **app.netlify.com → their site → Deploys**.
6. Supabase schema changes are **run by the user** in Supabase → SQL Editor (never automatic).

## File map
- `index.html` — public single page + login + customer member panels. Loads config,themes,store,api,app.
- `staff.html` — staff portal (**side drawer + one section at a time**). Loads config,themes,poster,store,api,staff.
- `css/styles.css` — the only stylesheet. CSS vars at top (`--red #e11b22`, `--ink`, `--line`, `--muted`, `--r*`, `--ease`, `--shadow*`).
- `js/config.js` — `SUPABASE` = { url, anonKey }.
- `js/store.js` — `STORE`: loads `data/*.json`; `STORE.products.models`, `STORE.products.categories`, `STORE.content`, `STORE.modelById`, `STORE.peso`.
- `js/api.js` — **the data layer.** All Supabase REST. snake_case DB ↔ camelCase JS mappers.
- `js/app.js` — public/customer rendering, login, store, model modal, schedule-repair panel, hero gallery, themes.
- `js/staff.js` — staff portal: users, repairs, create-user, models manager, poster, store photos, settings, profile.
- `js/themes.js` — `THEMES` (per key: label, emoji, ribbon gradient, page, poster gradient), `THEME_ORDER`, `THEME_FRAME`.
- `js/poster.js` — `Poster.render(canvas, opts)` draws the sale poster (see below).
- `data/products.json` — 22 base models (id,name,wheels,motorW,battery,brakes,srp,images[]). `categories`, `_payment`, `_delivery`.
- `data/content.json` — trece branch info, about, why, tips, road rules.
- `supabase/*.sql` — schema the user runs manually.
- `deploy/` — mirror for zipping. `lucky-lion-site.zip` — the deploy artifact.
- `presentation/` — stakeholder deck (see below). Not part of the site; never synced to `deploy/`.

## Multi-branch + roles (READ THIS)
There are **3 roles**: `customer`, `staff`, `admin`, and **9 branches** (keys/codes/labels are the single source of truth in **`js/branches.js`** → `BRANCHES`, `BRANCH_BY_KEY`, `branchName/branchShort/branchCode/branchOptionsHtml`, `HOME_BRANCH_KEY='main'`). Loaded **before `api.js`** on both pages. Branches: `main` (Buhay na Tubig, Imus — the public "THIS BRANCH" home highlight), `imus`, `trece`, `tanza`, `naic`, `tejero`, `gma`, `silang`, `sanroque`. Full contact details live in `data/content.json` → `branches.<key>` + `mainBranch:"main"` (the old `trece`/`otherBranches` shape is gone). In `app.js`, `C.home` is repointed to the main branch object.
- **`users.branch`** — staff + customers belong to one branch; admins are global (`branch` NULL). Member IDs are **per-branch, per-role**: customer `TRECE-C-0001`, staff `TRECE-S-01`, admin `ADMIN-01` (built in `API.createUser` from `branchCode`).
- **Scoping is UI-level only** (open anon key/RLS): staff simply don't SEE other branches in the portal; not hardened isolation. Admins have **read-only oversight** of everything and are the **only** editors of Models / Store Photos / Site Settings and the only ones who create staff/admins.
- **Editing matrix:** Admin — edits Models/Store Photos/Site Settings, creates staff+admin+customer, **read-only** on Users/Repairs/Inbox/Registry/Inventory/Pre-loved; Staff — edits their own branch's Customers/Repairs/Inbox/Inventory/Pre-loved (other branches view-only), creates customers only, **no** Models/Store Photos/Site Settings drawer links. Registry = everyone sees all. Poster = both.
- **Per-branch brand-new stock:** `variant_stock(variant_id, branch, stock)` (new table). Public store shows the **company-wide total** (`app.js` sums rows); staff Inventory edits their branch's row (`adjustVariantStock`/`setVariantStock`/`decrementVariantStock`); assigning a unit decrements the **customer's branch** stock. Old `model_variants.stock` is a legacy fallback only.
- **Per-branch pre-loved:** `model_meta.branch`. Public Pre-loved listing (`#preloved`) has a **branch filter** (`PRELOVED_BRANCH`) + a 📍 branch chip per unit. Staff manage/edit only their branch's pre-loved (units + pre-loved inventory); admin views all with a branch picker.

## Data layer & Supabase tables (all RLS = open, anon key; prototype)
`js/api.js` methods, by table:
- **users** — login, currentUser, getUsers, createUser (auto member_id per **branch+role**, roles customer/staff/admin), updateUser (incl. `branch`), deleteUser, changePassword. Rows carry `role` + `branch`.
- **variant_stock** (new, `multibranch.sql`) — per-branch brand-new stock: getAllVariantStock, getBranchStock, setVariantStock, adjustVariantStock, decrementVariantStock(id,branch). **`avatar_url`** (added by `staff-avatars.sql`) is a staff-only profile photo; `API.uploadAvatar(blob)` uploads to the shared `store-photos` bucket (`avatar-*.jpg`) and returns the URL, saved via `updateUser({avatarUrl})`. Customers leave it null.
- **user_ebikes** — a customer can own several units: get/add/remove/**updateUserEbike**. Columns added by `ebike-details.sql`: **variant_id, color, chassis_no, battery_no, motor_no** (the chosen colour + physical serial numbers). `addUserEbike(userId, modelId, {variantId,color,chassisNo,batteryNo,motorNo})` also **decrements that variant's stock**.
- **model_variants** (added by `variants.sql`) — a model's colour options + per-colour stock: id, model_id, name, color_hex, **stock**, sort. `API`: getAllModelVariants, getModelVariants, addVariant, updateVariant, deleteVariant (also deletes that colour's photos), **adjustStock(id,delta)** / **decrementStock(id)**. `variants.sql` seeds **2 placeholder colours (Red/Black, stock 0) per base model**. `model_photos` gained a nullable **variant_id** (NULL = general photo shown for every colour; set = that colour's photo).
- **repairs** — getRepairs, getRepairsByUser, createRepair, updateRepairStatus (stamps `completed_at`), updateRepair, deleteRepair. Fields: user_id, model_id, date, time_slot, status(pending/in-progress/done), notes, **repair_type, cost, completed_at** (added by `repairs-upgrade.sql`).
- **model_meta** — staff overrides on models: get/upsert/delete. Fields: on_sale, sale_cash/cc/hc, is_new, srp, hidden, is_custom, name/wheels/motor_w/battery/brakes/srp (for customs), sort.
- **site_settings** — key/value: phone,email,facebook,youtube,viber,address,hours,maps,active_theme.
- **store_photos** — hero slideshow photos (Supabase Storage bucket `store-photos`): get/add(crop→upload)/reorder/delete.
- **model_photos** — multiple photos per model (added by `model-photos.sql`; **reuses the `store-photos` bucket**, object names `model-*.jpg`): getAllModelPhotos, getModelPhotos, addModelPhoto, reorderModelPhotos, deleteModelPhoto.

## Key subsystems
- **Store nav dropdown:** the header **Store** nav item (`#storeNavItem`, `.nav-item.has-sub`) has a submenu (`#storeSubmenu`) built by `buildStoreSubmenu()` from the store groups `renderStore()` actually rendered (each `.wheel-group` gets an id `grp-*`). Desktop shows it on hover; **mobile** shows the same links **indented** inside the burger drawer (CSS makes `.nav-sub` static under 900px). Clicking a category smooth-scrolls to that group (`scroll-margin-top` clears the sticky header) and closes the mobile drawer.
- **Branches (public Location):** `data/content.json` → `branches.<key>` + `mainBranch`. Per owner there are **9 total**: main (Buhay na Tubig, Imus), Imus, Trece, Tanza, Naic, Tejero, GMA, **Silang, San Roque**. Imus/Tanza/Trece/Main have FB pages; Naic/Tejero/GMA/Silang/San Roque are municipality-level pending exact address/phone from the owner. **`renderLocation()` (`app.js`) now shows the MAIN branch first, then a "Show all branches ▾" toggle (`#branchMoreBtn`/`#branchMore`) that reveals the other 8.** Every branch card has **[📞 Call][Get directions]** actions — the Call button (`.b-call`) dials that branch's own `phone`, falling back to `primaryNumber()` (the company store line) when the branch has none. `mapsFor` builds a Google-Maps link per branch.
- **Colour variants + stock (Phase 1):** models have colour variants (`model_variants`), each with its own stock and its own photos (`model_photos.variant_id`). **Public model modal** (`openModel` in `app.js`) shows colour **swatches**; picking a colour swaps the gallery to that colour's photos (falls back to the model's general photos) and shows **"N left" / Out of stock**. `app.js` init loads variants into each `MODELS[i].variants = [{id,name,colorHex,stock,images[]}]`; the gallery was refactored into `galleryHtml()` + `wireGallery()` so it can be re-mounted per colour. **Staff → Models** each model row has a **🎨 Colours & stock** panel (`variantsBlock`/`variantEditor`, `wireModelVariants`): add/rename/recolour/delete colours, edit stock, and manage **per-colour photos** (shared `#modelPhotoInput` cropper via `MP_TARGET` + `MP_VARIANT`); the general **📷 Photos** panel now shows only NULL-variant photos. "Add a new model" seeds 2 placeholder colours. `VARIANTS_BY_MODEL` (global, filled by `loadVariants()`) backs the staff dropdowns; `variantOptions()`/`fillVariantSelect()` build the colour `<select>`s.
- **Inventory (staff, split brand-new vs pre-loved):** two drawer items (Store group) — **Inventory** (`#inventory`, brand-new) and **Pre-loved Inventory** (`#plinventory`). `renderInventory()` renders **both** via `renderInventoryKind('new'|'preloved')`. **Brand-new** = colour/stock grid (variants, excludes pre-loved), Add-stock qty (`adjustStock`, `wireInventory(root)`), `#navInvCount` = out-of-stock. **Pre-loved** = **1-of-1 units** (NOT variants): a **segmented All / Available / Sold filter** (`.inv-seg`, `PL_INV_TAB`) with counts; `invPrelovedCard` shows each unit's colour + chassis/battery/motor + an **In stock / SOLD** toggle (`wirePrelovedInventory` → `upsertModelMeta({sold})`); `#navPrelovedInvCount` = available count. Each per own search (`INV_STATE`).
- **Pre-loved = 1-of-1 physical units:** `model_meta` gained `color, chassis_no, battery_no, motor_no, sold` (`preloved-details.sql`, folded into `RUN-ALL`). The Add-pre-loved form and the Pre-loved Units editor (`modelRow` — for pre-loved rows the Colours & stock panel is hidden and serial/colour fields appear in Specs; `wireModelForms` persists them) capture these. **Sold** pre-loved units are excluded from the public store (`computeModels` skips `sold`) and show a SOLD badge in the manager. Public model modal shows Condition (pre-loved) + Colour rows; `applyMeta` carries `color`/`sold`.
- **Unit details (staff):** Create-User form and the Users-list **add-unit** row now capture **colour + chassis/battery/motor no.**; each owned unit renders via `unitRow()` with an inline **Edit** form (`updateUserEbike`). Helpers: `readUnitDetail()`, `autoColour()`. Assigning a unit with a colour decrements stock and refreshes Inventory. On **Scheduled Repairs**, the colour is appended **inline** to each row's title (`repUnit()`/`colourInline()`, no extra rows) and the full **chassis/battery/motor** show in the **Edit-repair modal** (`repUnitSerials()` → `.rep-unit`) to keep list rows compact.
- **E-Bike Registry (staff → #registry):** a searchable/sortable table of **every owned unit across all customers** (`renderRegistry` loads + caches into `REG_ROWS`, `paintRegistry` filters/sorts without refetch so the search box keeps focus). Columns: owner (+ member id, tap-to-call), model, wheels, colour, chassis/battery/motor no., **acquired date**. Search matches chassis first (plus owner/model/serials/colour); wheel chips + sort (acquired newest/oldest, owner, wheels). Backed by `getAllUserEbikes` + `getUsers` + `getModelMeta`. `user_ebikes.acquired_at` (added by `unit-acquired.sql`, backfilled from `created_at`) is set on add (defaults to today) and editable in the unit forms; drawer item under **Customers**.
- **Customer unit details (public):** new member-menu item **"My E-Bikes"** (`data-panel="ebikes"` → `panelEbikes()` in `app.js`) lists each owned unit with colour + serial numbers. The **Schedule Repair** bookings list (`renderMyReps`) also shows each unit's colour/serials. Backed by `MY_EBIKES` (full `user_ebikes` rows) + `unitBits()`/`ebikeForModel()`.
- **Messaging / Inbox (Phase 3):** `messages` table (added by `messages.sql`; one thread per customer, `sender` customer|staff, `read` = seen by the other side). `API`: `getMessages`/`getAllMessages`/`sendMessage`/`markMessagesRead(userId, senderToMark)`. **Customer** (`app.js`): member menu → **💬 Messages** (`panelMessages`/`wireMessages`/`refreshMessages`, 4s poll while open); unread dot on the burger + dropdown (`updateMemberBadge`, `#memberMsgBadge`/`#memberMsgBadge2`, 20s poll via `refreshAuthUI`); a **Message the branch** CTA on the Schedule-Repair panel. **Staff** (`staff.js`): drawer **💬 Inbox** (`#inbox`) is a **two-pane** view (`.inbox-wrap`) — thread list left (`paintInboxThreads`), open conversation right (`paintConversation`/`refreshConversation`), `INBOX_OPEN` state + active highlight, 4s poll; on mobile it collapses to one pane with a back button (`.has-open` class). A **💬 Message** button on every scheduled/completed repair row jumps to that customer's thread; the customer's booking rows (`renderMyReps`) each have a **Message the branch** button too; drawer badge `#navInboxCount` (`updateInboxBadgeCount`, 20s poll) shows total unread customer messages. Shared chat bubble renderer `renderChat(host, msgs, mySide)` (defined in both files). Messaging degrades gracefully if `messages.sql` isn't run.
- **Toasts:** `toast(msg, kind)` in **both** `staff.js` and `app.js` — a bottom-center snackbar (`.toast-host`/`.toast`, shared CSS) for louder success/error feedback. Public toasts fire on signup, profile save, password change, and repair booking.
- **Self-signup (Phase 4):** public **Create account** button (`#signupBtn`, next to Login) + `#signupModal` → `wireSignup()` in `app.js` calls `API.createUser({role:'customer',…})` then `API.login()` to sign them straight in, then `toast()`. Login/Signup modals cross-link (`#toSignupLink`/`#toLoginLink`). `refreshAuthUI` toggles `#signupBtn` with `#loginBtn`. (No schema change — reuses `users`.)
- **Store hero click-to-advance (Phase 4):** in `renderStoreGallery`, tapping any hero photo advances it to the next store photo (desktop polaroids advance per-slot; mobile photo calls `showMobile`).
- **Pre-loved units (Phase 2):** `model_meta.is_preloved` (added by `preloved.sql`) marks a second-hand unit (stored as a custom `model_meta` row, `is_custom` + `is_preloved`). Pre-loved units keep their real wheels but are **excluded from On Sale / New / 4·3·2 groups** and shown only in their own group. **Public store** (`renderStore`/`prelovedGroupHtml` in `app.js`): a **♻️ Pre-loved Units** group shows the first `PRELOVED_PREVIEW` (4, prioritised by `prelovedFeatured`: **On Sale → New Arrivals → rest**) + a **See all →** button → in-page listing at hash **`#preloved`** (`#prelovedView` section, toggled by `syncPrelovedRoute` adding `body.preloved-open`, which CSS uses to hide every other `main > section`). The listing (`renderPrelovedView`/`wirePreloved`) has **wheel chips + price sort** (`PRELOVED_WHEEL`/`PRELOVED_SORT`) and reuses `modelCard`/`openModel`. `badgesHtml` gained a `badge-preloved`.
- **Models vs Pre-loved managers (staff):** the model editor is now a **parameterized two-manager system** — `MANAGERS = { models:{host:'#modelsList',preloved:false}, preloved:{host:'#prelovedList',preloved:true} }`. `renderModels()` loads once then renders **both**; `groupModelRows(rows, wantPreloved)` splits by `is_preloved`; `paintModelGroup(key)` + the wire fns (`wireModelForms/Photos/Reorder/Variants(root)`) are all **host-scoped**. Brand-new models live under **Models** (drawer `#models`); second-hand units under a separate **Pre-loved Units** view (`#preloved`, `#prelovedList`, `wireAddPreloved` → `#addPrelovedForm`). Pre-loved adds set `is_preloved:true`, skip the 2 placeholder colours (one-off units — add photos/colour by opening the row). The Pre-loved Units manager shows an **Available / Sold / All** filter (`prelovedAvailSeg`, `PRELOVED_AVAIL`, defaults to Available) so sold units are tucked away but reachable. **There is no longer an `is_preloved` checkbox in the Models editor** — a unit is pre-loved by being created in the Pre-loved view. (Fixed a latent bug: `wireModelReorder` used a non-existent `.model-group`; now scopes to `.wheel-body`.)

- **Staff shell (drawer + view router):** the old horizontal `.staff-nav` strip is gone. The header has a burger (`#drawerBtn`) that opens a left **side drawer** (`#staffDrawer` + `#drawerScrim`) with links grouped by category — Overview (Dashboard) / Customers (Users & E-Bikes, Create User, Scheduled Repairs + open-count badge `#navRepairCount`) / Store (Models, Store Photos) / Marketing (Poster Maker) / System (Site Settings, My Profile, Sign out). Every `<section>` in `main` carries `.view`; only the one with `.is-active` is displayed (`showView(view)` in `staff.js`, `VIEWS` array, hash-synced via `history.replaceState` + `hashchange`, default `#dashboard`). Everything is still rendered once at init — the router only shows/hides. A **← Back to Dashboard** button (`.view-back`) sits at the top-left of every non-dashboard section (full-width on phones) and calls `showView('dashboard')`. There is deliberately **no** back button in the header bar. The header's right-hand button is now the staff **avatar** (`paintStaffAvatars(me)` keeps header + drawer photos in sync); the old profile/logout dropdown still works.
- **Dashboard (`#dashboard`):** `renderDashboard()` in `staff.js` builds, top to bottom: a dark **hero** (avatar, greeting by time of day, long date, active-theme + phone chips from `SETTINGS`), an **alert bar** shown only when something is overdue/booked today, four **tiles** (open repairs / overdue / booked today / completed, each with a sub-line; overdue turns red), then a 2-column grid — left `.dash-main` has **Next repairs** (5 soonest; per row: initial avatar, customer, model · service, friendly date via `niceDate()` incl. Today/Tomorrow, time slot, status pill, tap-to-call) and **Recently completed** (last 3 + logged total); right `.dash-side` has a 6-button **Quick actions** grid and a **Store & people** mini-list. Everything with `[data-go]` calls `showView()` (the tap-to-call `<a>` is excluded). Data comes from globals other renderers fill: `REPAIRS`/`REP_USERS`, `CUSTOMERS`/`STAFFS`/`EBIKES_BY_USER`, `MODEL_STATS` (`renderModels`), `STORE_PHOTO_COUNT` (`renderStorePhotos`), `SETTINGS` (`renderSettings`). `renderRepairs()` re-renders the dashboard so tiles/badge stay fresh.
- **Models (effective list):** `app.js` merges base `products.json` with `model_meta` via `applyMeta`/`computeModels` → `MODELS`. Custom models come from meta rows with `is_custom`. Hidden models excluded. Uploaded `model_photos` are prepended to each model's `images[]` (first image = main card photo). `applyMeta` now also lets `model_meta` **override base specs** (name, wheels, motor_w, battery, brakes, srp) — so editing a base model's specs in staff goes live.
- **Model photo manager (staff):** in `staff.js`, `renderModels()` loads `MODEL_PHOTOS` (grouped by model_id) and now **splits the models list by wheel type into a 3-way picker** — `.wheel-picker` tabs (4 Wheels / 3 Wheels / 2 Wheels, each with its model count) built by `paintModelGroup()`; only the selected category's rows render below (`MODEL_GROUPS` + `MODEL_TAB`, no collapsing). `renderModels()` fetches + groups, `paintModelGroup()` paints and re-wires forms/photos/reorder on every tab switch with **↑/↓ reorder within a group** (`wireModelReorder` persists `model_meta.sort` for the whole group; `app.js` sorts each store group by `sort`). Each row's form has editable **Specs** (name/type/motor/battery/brakes) + badges/pricing; `effSpecs(r)` computes the effective (edited-or-base) values. `modelPhotosBlock(id)` renders uploaded tiles (sortable/deletable) **followed by the bundled `products.json` image as a read-only "built-in" tile**, so the count reflects it (Photos(1) not (0)). Also the "Add a new model" form stages photos in `NEW_MODEL_PHOTOS` and uploads them on submit. `makeSortable(grid,onReorder)` = pointer-based **drag-to-reorder** (mouse+touch; tiles need `data-sort-id`; grid items need `touch-action:none`). ↑↓ buttons remain as fallback. Shared hidden `#modelPhotoInput` + `MP_TARGET` (a model id, or `'__new__'` to stage) feeds the crop tool.
- **Crop tool:** `openCropper(img, onSave, opts)` + `saveCrop()` in `staff.js` — drag the photo to reposition + zoom slider, then crop. **Ratio chooser (1:1 / 4:3 / 3:4)** via `#cropRatios` buttons (`paintCropRatios`/`setRatio`; `CROP_DIMS` maps each ratio → crop-box px, longest side ≈360). Default **4:3**; `setRatio(r)` resizes `#cropCanvas`, refits (`Crop.base`) + recenters + redraws. **Zoom slider goes below 1 (`min=0.25`) so you can zoom OUT to fit the whole photo**; drag is **free** on both axes (`clamp()` is a no-op — the photo can sit anywhere, white fills gaps), `drawCrop()`/`saveCrop` fill the padding white, and a **Reset** button (`#cropReset`) restores zoom=1 + centred. `saveCrop` outputs 1200px-wide JPEG at the current ratio (portrait 3:4 → 1200×1600). `opts.ratio` sets the start ratio, `opts.ratios` limits the choices, `opts.lock` (or legacy `opts.shape:'square'`) pins one ratio and **hides** the chooser — used by **staff avatars** (locked 1:1). Store photos + model **main photo** + model **colour photos** open with all 3 choices. `onSave(blob)`. (The **poster** photo is separate — a transparent PNG placed with free drag + size-slider + wheel-zoom on the poster canvas, not this cropper.)
- **Staff avatars:** `avatarImg(u, cls)` renders a photo or an initial-letter circle. Shown in the staff users list (`staffRow`) and editable in the profile modal (`openStaffProfile` → square cropper → `uploadAvatar` → `updateUser`). CSS: `.avatar`/`.avatar-ph`/`.avatar-lg`/`.avatar-xl`.
- **Customer model viewer:** `openModel(id)` in `app.js` — gallery with main image, **‹ › prev/next**, `1 / N` counter, and a scrollable thumbnail strip (all share one index).
- **Slot availability (customer booking):** one booking per time slot per day. `API.getBookedSlots(date)` (in `api.js`) returns the day's non-`done` repairs; `paintSlots(date)` in `app.js` rebuilds the `#repSlot` dropdown so taken slots render as `10:00–12:00 — TAKEN` and `disabled`, auto-selects the first free slot, and shows `#repSlotHint` ("2 of 4 slots open…" / red "All slots are booked on this date"). The select stays disabled until a date is picked, and `wireSchedule` re-checks availability right before `createRepair` in case someone booked meanwhile. Slot list lives in `REPAIR_SLOTS` (`app.js`). Staff editing a repair in the portal is **not** restricted by this.
- **Schedule Repair (customer):** `panelSchedule(user)` in `app.js` now lists **only the e-bikes the customer owns** (`getUserEbikes`, deduped; falls back to `ownedModelId`). If they own none, the booking form is replaced with a "contact the branch" note (`wireSchedule` guards the missing form).
- **Scheduled Repairs (staff):** `renderRepairs()` in `staff.js` — a **Scheduled / Completed history** segmented toggle with counts, overdue-red highlighting, tap-to-call, edit modal (type/cost/date/notes) that shows the customer's contact block, cancel/reopen/delete, history search + logged-charges total.
- **Staff → public site preview:** `index.html` normally bounces a signed-in staff account to `staff.html` (`refreshAuthUI` in `app.js`). `index.html?preview=1` sets `STAFF_PREVIEW` and skips that redirect, hides the login/member menu, and appends a fixed bottom `.preview-bar` ("Staff preview — this is what customers see" + Back to staff portal). Reached from the drawer's System group (`#drawerViewSite`) and the dashboard Quick actions tile — both `target="_blank"` so the portal stays open.
- **Customer contact on repairs:** `repContact(u)` in `staff.js` renders the customer's phone (tap-to-call) and **address as a Google Maps link** (`maps.google.com/?api=1&query=…`), or an italic "No address on file" when the account has none. Used on scheduled rows, completed-history rows, and in the repair edit modal (`.rep-contact`).
- **Multiple contact numbers (predefined categories + routing):** stored as JSON in `site_settings.contacts` = `[{key,label,numbers:[]}]`. **No SQL** (key/value `site_settings`). Categories are **predefined** — `CONTACT_CATS`/`CONTACT_CAT_LABEL` (both files): `store` (Store / Sales — **the homepage number**), `repairs`, `financing`, `general`. `parseContacts(settings, branch)` (in `app.js` + `staff.js`) parses + **falls back to legacy `phone`** when empty. The homepage/primary number = the **store** line's first number (`primaryNumber()`/`primaryPhone()`), derived in memory (not duplicated). **Public** (`app.js`): one shared **`openContactPicker(preferKey)`** (`#contactModal`); `preferKey` narrows to that category when it has numbers (else shows all). Header "Call us" → `openContactPicker('store')`; booking `.book-call` → `openContactPicker('repairs')`; Contact Us shows **one card per category** (its numbers stacked inside via `.contact-vals`, never a repeated label). **Staff → Site Settings**: a **collapsible** `<details>` (`.contacts-details`) holding `#contactsEditor` — click a category chip (`.cc-add-cat`) to add that line, then its number(s); the **store** line shows a ★ homepage badge. Delegated add/remove (`wireContactsEditor`, `repaintContactChips`), saved by `gatherContacts()`. **Poster**: `#posterPhonePick` appends saved numbers to the free-text phone field (type or pick, multiple). `SETTING_KEYS` excludes `phone`.
- **Themes/settings:** `active_theme` (seasonal sale) drives the page look + the `#themeRibbon` sale banner (which sits **above** the sticky header so it's never clipped). Contact info flows from `site_settings` over `content.json` defaults.
- **Store hero gallery:** `renderStoreGallery()` in `app.js` cross-fades `store_photos` (falls back to `data/store-photos.json`).

## Poster Maker (staff → #poster) — REDESIGNED 2026-08-27 (template-overlay, WYSIWYG)
The dark seasonal-gradient poster was **replaced** with a branded **flyer-template** editor.
- **Architecture: template-as-background + overlay.** `js/poster.js` holds a `POSTER_TEMPLATES`
  registry — each entry = a background flyer image + a **coordinate map** (all coords in the
  image's native pixel space). One template today: **`flyer2026`** (`assets/poster-template.jpg`,
  **854×1280**, the "RIDE SMART. RIDE GREEN." Lucky Lion flyer; coords last recalibrated 2026-09-16
  for the current export — see that changelog entry). Adding a future template = drop
  an asset + add one config object (no code rewrite). To **nudge any value's position**, edit the
  number in that template's `zones`/`covers` — nothing else changes.
- **`Poster.render(canvas,{templateKey,values,photo})`** draws: flyer bg → the positioned photo →
  then covers baked-in placeholders (`covers`: MODEL NAME on black, ₱XX,XXX regular+sale on white,
  09XXXXXXXXX on black) and overlays the real values in the flyer's brand fonts (Poppins/Inter,
  faux-italic). `values` = `{name,battery,motorW,loadKg,brake,regPrice,salePrice,phone,colors[],features[8]}`.
  Empty fields are **not** covered (the baked placeholder shows through as a "not filled yet" cue).
  Helpers: `previewFast()` (bg+photo only, used during photo drag), `placeholder()` (draws the flyer
  as the empty state), `defaultPhotoState()`, `templates()`, `money()` (bare number → ₱x,xxx).
  `_ready[src]` = sync decoded-image cache for smooth dragging.
- **`initPoster()` (`js/staff.js`) — live WYSIWYG, no Generate button.** Every field edit re-renders
  (debounced 140ms); form never submits (guarded). Access fields via **`form.elements[name]`** (NOT
  `form.name` — that returns the form's attr). Fields: name/battery/motorW/**loadKg (NEW, poster-only,
  no schema)**/brake, regular+sale price, contact number (+ saved-number `#posterPhonePick`). Prefill
  from a chosen base model + `model_meta` (motorW gets a "W"; sale price only if `on_sale`).
- **Colours (1–5, max 5):** `#posterColors` dynamic rows, each a text input with a `<datalist id="cssColorNames">`
  (type "red" → red) + a live `.pc-swatch` preview; hex allowed; validity via `cssOk()` (probe an
  `Option().style.color`). Prefilled from the model's variants (`VARIANTS_BY_MODEL`, `color_hex`/`name`)
  else defaults `['black','gray','red','white','navy']`. `drawColors` clears the frame interior then
  draws N boxes.
- **8 features:** `f1..f8` inputs (2-col grid); `drawFeatures` maps reading-order (i%2 col, i/2 row) to
  the flyer's 2×4 checklist.
- **Photo tool (transparent PNG):** upload via hidden `#posterPhotoInput`+FileReader → `Image`; **drag
  directly on the canvas to move** (pointer events, mouse+touch; `canvas` gets `touch-action:none`) +
  **size slider `#posterPhotoSize`** and **mouse-wheel** to scale (relative to fit). State `{img,cx,cy,scale,fit}`.
  **No background removal** — staff upload a background-free PNG (UI hint says so). Download exports the
  canvas to PNG (`#posterDownload`).
- **Coords are hand-calibrated estimates** against the flyer — expect minor position nudges after the
  owner eyeballs a real render; all adjustable in `POSTER_TEMPLATES.flyer2026`.

## Deploy status (as of 2026-07-04)
**Code done; zip rebuilt. PENDING user action: run 1 new SQL + re-upload zip.**
- **NEW pending SQL:** `supabase/staff-avatars.sql` — adds `avatar_url` to `users` (staff profile pictures). Run once in Supabase → SQL Editor. Reuses the existing `store-photos` bucket, so no new bucket/policy. Everything else (specs edit, model reorder, built-in photo, owned-only repairs) needs **no schema change** — `model_meta` already has name/wheels/motor_w/battery/brakes/sort.
- Previously applied SQL: `repairs-upgrade.sql`, `model-photos.sql`, `pending-setup.sql`, schema/store-gallery — all live.
- Cache-bust bumped to `v=20260723k`; `deploy/` re-synced; `lucky-lion-site.zip` rebuilt. **User must drag the zip to Netlify.**
- Next change: bump cache-bust, re-sync `deploy/`, rebuild zip, re-upload; run any new SQL in Supabase manually.

## Presentation deck (`presentation/`)
For showing the system to the Lucky Lion main office. **Regenerate, don't hand-edit** —
the .pptx is a build artifact.
- `capture.py` — drives the real local site with Playwright and writes the screenshots to
  `presentation/screenshots/`. Needs `python3 server.py 8000` running first. Desktop shots
  are 1440×900 @2x, phone shots 390×844 @3x. Accepts stage args to re-run part of it:
  `python3 presentation/capture.py staff sync` (stages: public, customer, confirm, staff,
  sync, mobile). **The `customer` stage creates a real repair row in live Supabase** — skip
  it on re-runs unless you want another booking.
- **Staff stage drives the hash router, not scrolling.** Since the staff UI restructure the
  portal shows one `.view` at a time, so the old `scrollIntoView` on `#repairs`/`#users`
  anchors silently captured hidden views. `go_view(page, view)` sets `location.hash` (which
  fires `hashchange` → `showView`) then scrolls to top. Adds `17a-staff-dashboard` and
  `17b-staff-drawer` (drawer opened over the dashboard via `#drawerBtn`).
- **`sync` stage** captures the customer↔staff pairs: `30-home-themed` (public homepage via
  the **`?theme=christmas` URL param** — `app.js` honours it, so the look changes
  client-side only and the live `active_theme` in Supabase is **never** touched) and
  `31-staff-settings-theme` (the `#themeSelect` dropdown set to the season but **never
  submitted**, so no DB write). It runs in its **own fresh browser context**: the session
  lives in `localStorage`, so a staff login leaking in from the `staff` stage makes the
  public homepage bounce to `staff.html` and the shot comes out wrong.
- `build_deck.py` — assembles `Lucky-Lion-Presentation.pptx` (36 slides, 16:9) with
  python-pptx. Slide recipes: `title_slide` / `divider` / `feature` (copy left, shot right) /
  `pair` (two labelled panels + red arrow disc — the customer↔staff sync slides) / `flow`
  (numbered steps; currently unused). Speaker notes on the key slides.
- Deck order: Part 1 Public → Part 2 Member area → Part 3 Staff Portal (leads with the
  **Dashboard** and the **drawer**, then users/create/repairs/history/models/poster/photos/
  settings) → **Part 4 "One Database, Two Sides"** (book a repair → staff portal; flip the
  theme → public site; edit a model → catalog) → mobile → status → close.
- For `pair()` slides give both sides an **uncropped ~1.6-aspect shot** so the two panels
  come out the same height; a hard vertical crop on one side makes the pair look lopsided.
- Deps: `pip3 install python-pptx playwright && python3 -m playwright install chromium`.
- Gotchas encoded in `capture.py`: `staff.html` has **no login form** — it redirects
  non-staff to index.html, so sign in on the public page first; the member dropdown is a
  toggle, so use `open_dropdown`/`close_dropdown` rather than clicking blind.
- `build_deck.py` measures picture sizes after insertion (rather than assuming aspect
  ratios) to fit the poster, phone row, and flow images. `crop(name, top, bottom)` writes a
  cropped copy of a screenshot to focus a slide.
- **Verify visually — a geometry check is not enough.** No PowerPoint/Keynote on this Mac,
  but ONLYOFFICE ships a converter that renders the deck:
  ```
  S=<scratch>; cd /Applications/ONLYOFFICE.app/Contents/Resources/converter
  ./x2t $S/conv.xml          # pptx → pdf; m_nFormatTo=513
  ```
  `conv.xml` must point `m_sFontDir` at
  `~/Library/Application Support/asc.onlyoffice.ONLYOFFICE/data/fonts` and
  `m_sAllFontsPath` at the **`AllFonts.js` that already exists inside that folder** (the app
  builds the cache on first launch). Pointing `m_sAllFontsPath` at a path that doesn't exist
  yet — e.g. one in the scratch dir — makes x2t fail with
  "TypeError: undefined is not an object (evaluating 'd.length')". Then split with pypdf and render each page via
  `qlmanage -t -s 1500 -o pages split/*.pdf` (qlmanage only ever renders page 1 of a
  multi-page PDF, hence the split). Text overlaps only ever showed up this way.

## In-progress: big feature build (phased; ONE final deploy)
User can deploy Netlify only a few times but can run SQL freely → **build/verify each phase locally against live Supabase, batch into a single final `deploy/` sync + zip + upload.** Phases: **1 variants+stock+inventory+unit details (CODE DONE)**, **2 pre-loved + registry (CODE DONE)**, **3 messaging/inbox (CODE DONE)**, **4 self-signup + public toasts + store-photo click-advance (CODE DONE)**. Also done ad-hoc: store nav dropdown, 7 branches, animated SALE/NEW badges, pre-loved featured ordering, per-booking message/call buttons, removed Manuals. **ALL PHASES + MULTI-BRANCH/ADMIN CODE-COMPLETE + DEPLOY ARTIFACT BUILT (2026-08-05).** Cache-bust bumped to **`v=20260806a`** (adds `js/branches.js`), `deploy/` synced (mirror verified), `lucky-lion-site.zip` rebuilt (index.html at root). **PENDING USER ACTION:** (1) run `supabase/RUN-ALL-new-features.sql` in Supabase (now includes `multibranch.sql` → seeds `admin`/`admin123`, and `unit-sale.sql` fields), (2) drag `lucky-lion-site.zip` onto Netlify. Optional: `test-data-seed.sql` for demo data, `test-data-cleanup.sql` to remove it before going fully live.
- **Test data:** `supabase/test-data-seed.sql` seeds every feature (3 customers, owned units w/ serials, repairs in all states, message threads, on-sale/new flags + stock on existing models, a custom new model, 3 pre-loved units incl. one sold) — all stamped `test-`; existing models keep their data (only flags/stock toggled). `supabase/test-data-cleanup.sql` removes it all. Run seed AFTER RUN-ALL. Logins: `maria`/`maria123` (customer), `rico`/`rico123` (staff).
- **Pending SQL:** run **`supabase/RUN-ALL-new-features.sql`** — a single combined file with all of it (variants+stock, pre-loved + its 1-of-1 unit columns `color/chassis_no/battery_no/motor_no/sold`, unit details+acquired date, messages). Re-running is safe (idempotent), so if you ran an earlier version just run it again for the new pre-loved columns. Individual files (`variants.sql`, `ebike-details.sql`, `preloved.sql`, `preloved-details.sql`, `unit-acquired.sql`, `messages.sql`) remain for reference. NOTE: adding a customer unit now always sends the new `user_ebikes` columns (incl. `acquired_at`), so `ebike-details.sql` **and** `unit-acquired.sql` must be run or unit-add fails.

## Recent changes log
- 2026-10-12 (v2.0.1): **Live-review follow-ups (7 items).** After browser-reviewing v2.0.0: (1) **notif
  panel text was invisible** — the bell dropdown is a child of the dark header (white text), so
  `.notif-head`/`.notif-item` inherited white on white; added explicit `color:var(--ink)`. (2) **Admin
  now edits everything** — `canEditBranch` returns true for admin (full access across branches in the
  Users list); the Users "Admin — view only" chip → "✏️ Admin — full access" (`.ro-tag.ok` green). (3)
  **Admin can reply in the Inbox** — `paintConversation` `readOnly` is now always false (was `isAdmin()`);
  the inbox "Admin — monitor only" chip → "✏️ Admin — all branches". (4) **Customer ID hidden in the
  staff Users list** — removed the `home-badge` member-id from `custRow` (still shown in registry/inbox
  for disambiguation). (5) **Removed the coloured LEFT accent border** on the admin dashboard KPI tiles
  (`.atile`: dropped `border-left-width:4px` + the per-tone `border-left-color`; kept the icon-disc
  tints). (6) **Customer profile avatar menu (right header)** — new `#memberAvatarMenu` (member-only) with
  a photo/initial avatar → dropdown **My Profile / Log out** (mirrors the staff avatar menu); Log out
  moved out of the left drawer into this menu. `updateMemberAvatar()` renders it; reuses `avatar_url`
  (already on `users`, verified live) + `API.uploadAvatar`. (7) **First-login onboarding** — after the
  forced temp-password change, `refreshAuthUI` sets `JUST_ONBOARDED`, routes to `#account` and opens the
  Profile panel, which shows a 👋 welcome banner and now has a **profile-photo uploader** + required
  name/phone/address. New CSS: `.avatar>img`, `.prof-photo(-hint)`, `.ro-tag.ok`. **Verified in-browser**:
  notif readable, tiles have no left border, avatar menu (My Profile/Log out), profile photo upload
  round-trips to live Supabase (uploaded+saved+reset), onboarding banner shows. **No new SQL** (reuses
  `avatar_url`). Cache-bust `20261012a`→**`20261012c`** (styles.css+app.js+api.js index;
  styles.css+staff.js+api.js staff). `deploy/` synced + zip rebuilt. Git tag **v2.0.1**.
- 2026-10-12: **Capstone panel revisions (18 items) + GitHub versioning.** Applied the panel's
  revisions without removing features. **NEW SQL (pending user run): `supabase/panel-revisions.sql`**
  — adds `users.must_change_password` (bool) + `repairs.branch` (text); idempotent, backfills
  repair branch from the owning customer. **All new writes RETRY without the new columns if the SQL
  isn't run yet** (`api.js` createUser/createRepair/changePassword), so nothing breaks pre-migration
  (the features are simply inert until the columns exist — verified both columns are currently absent
  on live Supabase). Changes by number:
  - **#1 Required-field red `*`** — `markRequired()` + a `MutationObserver` in BOTH `app.js`/`staff.js`
    wraps each required label's text + a `.req` star in a `.req-line` span (labels are flex-column, so
    the wrapper keeps "Label *" on one line). Observer-driven → covers dynamically-rendered forms.
  - **#3 All nav in a LEFT sidebar (public)** — `index.html` header replaced with a left hamburger
    (`#navDrawerBtn`) + `#publicDrawer`/`#publicScrim` reusing the staff `.drawer` CSS. Holds Browse +
    (guest) Login/Create account + (member) all account items. `body.logged-in` toggles guest/member
    via CSS (`.guest-only`/`.member-only`). Old top-nav + guest/member dropdowns removed; `wireLogin`
    rewritten (`openPublicDrawer`/`closePublicDrawer`), `wireNav` reduced to the scroll-shadow.
  - **#4** save/update buttons → `btn-primary full` (e.g. profile "Update password"). **#6** customer
    messaging label standardized to "Messages" (staff surface stays "Inbox").
  - **#7 Confirm dialog** — shared `confirmAction()` styled modal in both files; replaces the 9 native
    `confirm()` calls and gates create/update/save/delete/cancel/book/signup (NOT login/search/filter).
  - **#8 Temp-password forced change** — `createUser` stamps `must_change_password` (staff/admin-made
    accounts; self-signup passes `mustChange:false`); `changePassword`/`setNewPassword` clear it;
    `API.resetPassword`. Blocking "set a new password" screen: customer via `forcePasswordChange`
    (`refreshAuthUI`), staff/admin via `forceStaffPasswordChange` (staff `init`, reloads after).
  - **#9** member/customer ID removed from the account hero + profile sub (kept in the staff portal).
  - **#10** admin can now manage repairs (`canEdit=true` on repair rows + create-on-behalf); admin
    login routes to `staff.html`. **#11** per-branch operating hours: `#branchHoursEditor` in Site
    Settings → `site_settings.branch_hours` JSON (no SQL); `app.js` overrides `C.branches[k].hours`
    (Location page already prints it).
  - **#12** staff/admin **➕ New repair** (`openNewRepair`) — pick customer → their e-bike → date
    (min today) → slot (availability-checked) → type/notes; sets `repairs.branch`.
  - **#13 Booking calendar** — `panelSchedule` now renders a month calendar (`renderBookingCalendar`):
    past days greyed/disabled, fully-booked days red "Full"/disabled, free days selectable → slot
    dropdown. `API.getBookedSlotsRange` (one query/month); cancelled repairs now free their slot.
  - **#14** past dates unselectable (calendar + `min=today` on staff repair-edit/new-repair).
  - **#15** upcoming-repair reminder banner (`upcomingReminderHtml`) on the account dashboard +
    schedule panel. **#16** notification bell (`#notifBell`) on both headers — localStorage snapshot
    diff of repairs → new/changed items (customer: own; staff/admin: branch). **#17** last repair
    (date + branch) on the customer dashboard + each customer in the staff Users list.
  - **#18/#19** `content.json` maintenance split into `basic`/`detailed` arrays + a `source` citation;
    `panelMaintenance()` renders 📋 Basic / 🔧 Detailed + "provided by the Lucky Lion main shop".
    (Verified no "Maintence" misspelling exists — heading was already "General Maintenance".)
  - **Verified in-browser** (extension online): no console errors on public/staff/admin; left drawer,
    required asterisks (observer), confirm dialog, booking calendar + slot loading + booking confirm,
    maintenance sections, customer dashboard (no ID, last-repair), bell, branch-hours editor, and the
    column-missing write retry (created+deleted a live repair). Cache-bust bumped
    `20260929a`→**`20261012a`** (styles.css both; app.js+api.js index; staff.js+api.js staff).
    `deploy/` synced (mirror verified) + `lucky-lion-site.zip` rebuilt (index.html at root). JS
    parse-checked; CSS braces balanced. **Versioning:** project put under git (tag `v1.0.0` = pre-
    revision baseline, `v2.0.0` = these revisions) to push to `git@github.com:raymondrsadsad/lucky-lion-ebike.git`
    (mirrors the wtrlab-epub-extension setup); local backup zip in the parent folder. **PENDING USER
    ACTION:** (1) create the empty private GitHub repo so the tags can push; (2) run
    `supabase/panel-revisions.sql`; (3) drag `lucky-lion-site.zip` to Netlify.
- 2026-09-29 (a): **Panelist UI fix batch (6 mobile-focused fixes, no SQL).** From live-demo
  feedback: (1) **Customer Messages composer overflow** — the Send button was pushed off the
  right edge on mobile (flexbox `min-width:auto`). Fixed in `css/styles.css` `.chat-form`: added
  `min-width:0` to `.chat-form input` + `.chat-form .btn{flex-shrink:0}`. (2) **Customer account
  dashboard** (`renderAccountDashboard`, `js/app.js`): removed the hero **Log out** button
  (`#acctLogout`) + its handler — it duplicated the burger-menu logout (`#logoutBtn`, untouched).
  (3) **E-Bike Registry** (`renderRegistry`, `js/staff.js`): wrapped the **Branch** + **Sort**
  `.reg-sort` labels in a new `.reg-filters` flex row so they share one line on mobile (new CSS
  `.reg-filters`). (4) **Staff/Admin side drawer** (`staff.html` + `js/staff.js`): removed the
  duplicate **My Profile** (`#drawerProfile`) + **Sign out** (`#drawerLogout`) tiles from the
  SYSTEM group and their two click handlers (kept `#drawerViewSite`) — both remain available via
  the header avatar dropdown (`#staffProfileBtn`/`#logoutBtn`). (5) **Admin Per-branch summary**
  (`renderAdminDashboard`) + Analytics **Per-branch breakdown** (`renderAnalytics`): the wide
  `.admin-table` was cut off on mobile; added `data-label` attrs to each `<td>` and a
  `@media (max-width:640px)` block that hides `thead` and stacks each `<tr>` into a card
  (label:value rows via `td::before{content:attr(data-label)}`). Desktop table + row tap-routing
  (`wireBranchTableNav`) unchanged. **No SQL.** Cache-bust `20260917i`→**`20260929a`** (styles.css
  both pages; app.js index; staff.js staff). `deploy/` synced (mirror verified) +
  `lucky-lion-site.zip` rebuilt; JS parse-checked (jsc), CSS braces balanced (1046/1046). Not
  browser-verified (extension offline). **PENDING:** drag the zip to Netlify.
- 2026-09-17 (i2): **Uploaded Main photo now REPLACES the built-in model image (was showing both).**
  Public product pages showed the staff-uploaded main photo AND the bundled `products.json` image side
  by side ("2/2"). `js/app.js:128` concatenated uploaded "general" (variant_id-null) photos onto the
  bundled `m.images`; changed to **`m.images = general`** so an upload replaces the default. Runs in the
  `MODELS.forEach` init loop, so it applies to every model (current + future uploads). Models with no
  upload keep their bundled image; colour-variant photos + `imgsFor()` fallback unchanged; staff "Main
  photo" panel still shows the built-in as a read-only fallback tile. **No SQL.** Cache-bust
  `js/app.js` `20260917g`→**`20260917i`** (index only). `deploy/` synced (mirror verified) +
  `lucky-lion-site.zip` rebuilt; app.js parse-checked. Not browser-verified (extension offline).
  **PENDING:** drag the zip to Netlify.
- 2026-09-17 (i): **Every model is now deletable in Staff → Models (base + custom).** Admin wanted to
  delete existing models and couldn't find how — custom models had "Delete model" but the 22 built-in
  (`products.json`) models only had a buried "Hide from store" toggle. Now every model row shows a red
  **Delete** action: **custom** → permanent (`API.deleteModelMeta`, unchanged, now with a name in the
  confirm); **base** → soft-delete via the existing `model_meta.hidden` flag (`.remove-model` →
  `upsertModelMeta({hidden:true})`), which already removes it from the public store. Deleted base models
  drop out of the manager's wheel-tab list (`groupModelRows` now filters `hidden`) and collect in a new
  collapsible **"🗑 Deleted models (N)"** section (`.deleted-models`, rendered in `paintModelGroup`; rows
  stashed as `mgr.deleted` in `renderModels`) with a **Restore** button (`.restore-model` →
  `{hidden:false}`). Base models can't be truly purged at runtime (they ship in `products.json`), so
  soft-delete + restore is the correct model; a permanent removal would be a separate `products.json`
  edit. The old `.hide-model` handler was replaced by `.remove-model`/`.restore-model`. **No SQL**
  (reuses `model_meta.hidden`). New CSS: `.btn.btn-ghost.danger`, `.deleted-models`/`.dm-*`. Cache-bust
  `20260917h`→**`20260917i`** (staff.js + styles.css; styles.css both pages). `deploy/` synced (mirror
  verified) + `lucky-lion-site.zip` rebuilt; staff.js parse-checked, CSS braces balanced (1032/1032).
  Not browser-verified (extension offline). **PENDING:** drag the zip to Netlify.
- 2026-09-17 (h): **Staff Dashboard mobile horizontal-overflow fixed properly (CSS only).** The (f)
  fix clamped `html{overflow-x:hidden}`, which removed the right-side white gap but revealed the real
  bug — the Dashboard's two-column block was genuinely wider than the phone, so the cards / action
  buttons / OVERDUE pills / right column of Quick actions were **clipped** on Android. Cause: the
  `.dash-cols` grid items `.dash-main`/`.dash-side` had default `min-width:auto` and the mobile track
  was `grid-template-columns:1fr` (=`minmax(auto,1fr)`) — both keep a content-based minimum, so a wide
  descendant pushed the block past the viewport instead of letting inner text ellipsize/wrap. Also
  found + removed a **stray `}`** at `css/styles.css:964` (file was 1021 `{` / 1022 `}`; balance now
  1021/1021). Fixes (all `css/styles.css`): `min-width:0` on `.dash-main,.dash-side` + `.dash-card` +
  `.rep-line`; mobile `.dash-cols` `1fr`→`minmax(0,1fr)`; `.dc-head` gets `flex-wrap:wrap;min-width:0`
  (long title + button wrap); `.qa-grid` tracks `repeat(N,1fr)`→`repeat(N,minmax(0,1fr))` (base + the
  ≤560px override). Kept the `html{overflow-x:hidden}` clamp as a harmless safety net. **No SQL.**
  Cache-bust `20260917g`→**`20260917h`** (styles.css both pages). `deploy/` synced (mirror verified) +
  `lucky-lion-site.zip` rebuilt; braces re-verified balanced. Not browser-verified (extension offline).
  **PENDING:** drag the zip to Netlify (folds into the same still-pending upload).
- 2026-09-17 (g): **Browser Back button now navigates within the staff portal (was jumping to the
  public page).** The staff view router (`showView`, `js/staff.js`) synced the hash with
  `history.replaceState`, so moving between views (dashboard→registry→…) never added a history entry —
  the browser **Back**/mobile back-gesture skipped the whole portal and landed on (or flashed through)
  the public `index.html` still sitting behind it in history, even while logged in. Fixes: (a) `showView`
  now uses **`history.pushState`** (line ~234) so Back steps through the views (the existing `hashchange`
  listener renders the target with `push=false`); (b) the two index→staff bounces now use
  **`window.location.replace('staff.html')`** instead of `.href=` (`app.js` login handler ~850 +
  `refreshAuthUI` ~958) so the public page isn't left behind the portal; (c) the staff.html auth guard
  (`js/staff.js` ~119) uses **`location.replace('index.html')`** so Back after logout can't strand you
  on the empty portal shell. **No SQL.** Cache-bust `20260917f`→**`20260917g`** (all assets both pages).
  `deploy/` synced (mirror verified) + `lucky-lion-site.zip` rebuilt. Not browser-verified (extension
  offline); JS parse-checked via jsc. **PENDING:** drag the zip to Netlify. *(Folds in with the (f)
  batch below — same undeployed zip.)*
- 2026-09-17 (f): **Mobile/staff fix batch (4 items) — root cause of two was Google Translate.** A
  user testing the live site through Google Translate on mobile hit: (1) **right-side white space** on
  staff pages — horizontal overflow; only `body` had `overflow-x:hidden`, so added the same to `html`
  (root scroller on mobile), `css/styles.css` line ~34. (2) **Crop-photo modal ✕ did nothing** — GTranslate
  wraps the `×` in a `<font>`, so the staff close handlers' strict `e.target === el` failed. Fixed both
  fragile handlers in `js/staff.js` (`#cropModal` ~2470, `#panelModal` ~2582) to also match
  `e.target.closest('[data-close]')` — the translate-proof pattern `app.js` already uses. (3) **Branch
  names mangled** ("Living Water"=Buhay na Tubig, "Branch Pass"=Trece, "Tanzania"=Tanza, "They"=Silang)
  — Google auto-translating Filipino proper nouns; **kept translate available, protected the names**:
  `branchOptionsHtml` (`js/branches.js`) now stamps `translate="no" class="notranslate"` on each branch
  `<option>` (fixes every branch dropdown on both pages); added `translate="no"` to the brand wordmark +
  footer + hero title in `index.html`/`staff.html`; new `nt(s)=<span translate="no">esc(s)</span>` helper
  in `app.js`+`staff.js` wraps branch/model names in the highest-visibility dynamic spots (registry
  Owner/Branch/Model cells, dashboard/customers/repairs branch headers, inbox branch tags, public
  Location cards, model cards, product-detail title, member-panel branch chip, booking model `<option>`).
  (4) **Removed the redundant "Wheels" option** from the E-Bike Registry **Sort** dropdown (wheel
  filtering is already the chip buttons) — deleted the option + its sort branch in `js/staff.js`. Note:
  the registry **Branch** filter already offers "All branches" (default) — the user's "add All" ask is
  satisfied once this deploy ships (live site was the older, pre-deploy build). **No SQL.** Cache-bust
  `20260917e`→**`20260917f`** (styles.css both pages; app.js+branches.js index; staff.js+branches.js
  staff). `deploy/` synced (mirror verified) + `lucky-lion-site.zip` rebuilt. Not browser-verified
  (extension offline); all JS parse-checked via jsc. **PENDING:** drag the zip to Netlify.
- 2026-09-17 (c): **Staff-portal DevTools "Issues" cleared (a11y/best-practice) — zero behavior
  change.** (1) **Error "Interactive element inside `<summary>`"** (×20): the model-row ↑/↓ reorder
  `.model-mv` were `<button>`s nested in `<summary>`; converted to `<span class="mv model-mv">` (no
  role/tabindex → not flagged), disabled state via an **`.is-disabled` class** instead of the
  `disabled` attr (`wireModelReorder` + template updated; CSS `.model-move .mv` gets
  `display:inline-flex` + `.is-disabled{pointer-events:none}`). Same look, same click handler, same
  first/last disabling; only loses keyboard-tab on those two arrows. (2) **"form field should have
  id or name"**: added inert `name`s (read by className, never FormData) — `.cf-select`
  (`colorChoice`), poster `.pc-select`/`.pc-input` (`posterColor`/`posterColorText`), settings
  `.bp-input`/`.bm-addr`/`.bm-maps` (`branchPhone`/`branchAddr`/`branchMaps`, non-colliding with
  `SETTING_KEYS`), add-unit `.unit-model` (`unitModel`), dead-code `.cc-num` (`contactNum`).
  (3) **"no label"**: `aria-label` on `.cf-select`/`.pc-select`/`.pc-input`/`.cc-num`. (4) **"no
  autocomplete"**: added `autocomplete` to create-user + profile fields, the 3 search boxes
  (`off`), the profile/change-password fields, and the Site-Settings business inputs (`off`). All
  additive attributes; no JS read-path touched. `staff.js` parse-checked; no unnamed controls remain.
  **No SQL.** Cache-bust **staff.js `20260917b`→`20260917c`, styles.css `20260916a`→`20260917c`**
  (both pages). `deploy/` synced + zip rebuilt. **PENDING:** drag the zip to Netlify.
  - **(d) follow-up:** cleared the last residual warnings — `autocomplete="off"` on the add-model +
    poster `name`/`phone` fields (the 3 "no autocomplete"); `aria-label` on the 3 hidden file inputs
    (`#modelPhotoInput`/`#posterPhotoInput`/`#photoInput`), the 3 `.user-search` boxes, and
    `#convInput` (the "no label" candidates). Cache-bust **staff.js `20260917c`→`20260917d`**.
  - **(e) final "no label" fix:** the culprit was the **"Colour label" `<label>`** wrapping the
    compound colour widget in the Create-user (`#createColorField`) and edit-unit forms — since the
    inner `.cf-select` self-labels via `aria-label`, the `<label>` element labeled nothing. Changed
    both wrappers `<label>Colour label …</label>` → `<div class="cf-labeled">Colour label …</div>`
    (new `.form .cf-labeled` CSS mirrors `.form label`, so it looks identical). Cache-bust **staff.js
    `20260917d`→`20260917e`, styles.css `20260917c`→`20260917e`** (both pages). Staff DevTools Issues
    now 0 errors / 0 warnings.
- 2026-09-17 (b): **Crop tool — free drag + Reset button.** `clamp()` is now a no-op, so the photo can
  be dragged/zoomed **anywhere** (both axes, even partly off-frame; white fills any gap). The initial
  view is still centred by `setZoom(1,true)`, and a new **`#cropReset`** button ("↺ Reset position &
  zoom", staff.html, wired in `wireStorePhotos`) restores zoom=1 + centred. **No SQL.** Cache-bust
  **staff.js `20260917a`→`20260917b`**; `deploy/` synced + zip rebuilt. **PENDING:** drag the zip to
  Netlify.
- 2026-09-17 (a): **Crop tool can zoom OUT to fit the whole photo.** The cropper was cover-fit only
  (slider `min="1"`), so parts of an e-bike outside the frame couldn't be pulled in. Now: `#cropZoom`
  `min` 1→**0.25** (staff.html); `clamp()` centres the image on any axis where it's smaller than the
  frame (instead of pinning top-left); `drawCrop()` fills the canvas white first so the preview shows
  the same white padding `saveCrop` already outputs (so zoomed-out = whole e-bike on a clean white
  background, nothing cut off). Note text updated. `saveCrop` unchanged. **No SQL.** Cache-bust
  **staff.js `20260916a`→`20260917a`**; `deploy/` synced + zip rebuilt. **PENDING:** drag the zip to
  Netlify.
- 2026-09-16 (g): **Poster contact-number overlap fix.** The drawn phone number started at x132
  (over the phone icon) at size 40 (too tall, reaching into the red "CALL OR TEXT NOW!"), and the
  cover top (y1027) clipped that red text. Matched it to the baked number (x160–431, y1037–1063):
  `phone.x` 132→**160**, `size` 40→**36**, `max` 330→**272**, and `cover`→`{156,1032,305,40}` (top
  below the red text at y1028, left clear of the icon; box black is #0d0d0d so the cover blends).
  Verified via PIL crop (`/tmp/phone_fixed.png`). **No SQL.** Cache-bust **poster.js
  `20260916f`→`20260916g`**; `deploy/` synced + zip rebuilt. **PENDING:** drag the zip to Netlify.
- 2026-09-16 (f): **Poster sale-price stray-comma fix.** The baked `₱XX,XXX` placeholder's comma
  descends to ~y826 (x646–655), below the main cover's bottom (y818), so its tail showed as a second
  faint comma under the real price. Added a small second cover patch over it: `salePrice.covers` =
  `[{505,764,284,54}, {642,814,20,16}]` (both `#fafafa`), painted before the value so only the drawn
  comma remains. Verified via PIL crop (`/tmp/comma_fixed.png`). **No SQL.** Cache-bust **poster.js
  `20260916e`→`20260916f`**; `deploy/` synced + zip rebuilt. **PENDING:** drag the zip to Netlify.
- 2026-09-16 (e): **Poster sale-price cover right-edge fix.** The sale box is a chamfered octagon
  whose right frame inner edge is at x≈790, but the cover's right edge was at x801 → white overhung
  the border down the whole right side. Shrank `salePrice.cover` width 296→**284** (right edge →789,
  inside the frame; the baked ₱XX,XXX only reaches x789) and capped `salePrice.max` 290→**274** so a
  long drawn price can't overflow either. Verified with a PIL crop (`/tmp/sale_fixed.png`/`sfr.png`).
  **No SQL.** Cache-bust **poster.js `20260916d`→`20260916e`**; `deploy/` synced + zip rebuilt.
  **PENDING:** drag the zip to Netlify.
- 2026-09-16 (d): **Poster refinements — specs below label, name fit, sale cover, features.** From a
  real render: (1) **Spec value now drawn on its OWN line BELOW the baked label** (was cramped after
  the colon) — `specs.rows` all move to `x:591` (label left-x), `y` = each label baseline + 30
  (342/424/507/593/677), `max:210`; with the wider box the uniform size lands ~18px, bigger + all
  equal. (2) **Name fits the banner** — `name.x` 666→650, `max` 260→225 so long names clear the
  ribbon's slanted right edge. (3) **Sale cover no longer exceeds the frame** — shrunk into the
  box's straight middle band (`{505,764,296,54}`) so it can't overrun the angled/notched corners.
  (4) **Features** — `colX` `[100,478]`→`[116,474]` (left text no longer touches the check),
  `y0/rowGap` 898/36→902/37 and `colMax`→`[295,320]` so text sits on the dotted lines. Config-only
  in `POSTER_TEMPLATES.flyer2026`; pre-validated with a PIL mock (`/tmp/validate.png`). **No SQL.**
  Cache-bust **poster.js `20260916c`→`20260916d`** (staff.html; asset unchanged). `deploy/` synced +
  `lucky-lion-site.zip` rebuilt. Not browser-verified (extension offline); parse-checked. **PENDING:**
  drag the zip to Netlify.
- 2026-09-16 (c): **Poster polish — uniform spec text, clean covers, angled name banner.** After a
  real render exposed three issues in `POSTER_TEMPLATES.flyer2026`/`js/poster.js`: (1) **Spec values
  now all the same size** — `drawSpecs` was picking the *min of values ≥ uniformFloor*, so short
  values like "1500W" stayed large while long ones shrank; rewritten to draw **every** present spec
  at one size = the smallest fit across all of them (dropped `uniformFloor`). (2) **Sale-price "extra
  box line" fixed** — the box interior is `#fafafa` (250-gray), not white, so the `#ffffff` cover
  read as a bright inner rectangle; cover fill → `#fafafa` and bounds tightened to sit inside the
  black border (`{508,760,290,60}`); colours `frameClear` fill → `#fafafa` too. (3) **Name banner** —
  the flat black rectangle cover flattened the angled ribbon and left red slivers; replaced with a
  **black trapezoid `coverPoly`** matching the ribbon (verticals + slanted right edge) + a **red
  `accentPoly`** left slab (echoes the brand ribbon), then the name centered (x666 y258, size 30,
  max 260). New `paintPoly()` helper; `drawValue` now honors `coverPoly`/`accentPoly`. Verified with
  a baseline-anchored PIL mock (`/tmp/render_final2.png`) — specs uniform, no sale seam, clean
  angled banner. **No SQL.** Cache-bust **poster.js `20260916b`→`20260916c`** (staff.html; template
  asset unchanged so its `?v=20260916b` query stays). `deploy/` synced + `lucky-lion-site.zip`
  rebuilt. Not browser-verified (extension offline); poster.js parse-checked. **PENDING:** drag the
  zip to Netlify.
- 2026-09-16 (b): **Poster template swapped + recalibrated.** New "Ride Smart. Ride Green." flyer
  (`assets/poster-template.jpg`, still **854×1280**) — same design but the 5 spec boxes + the colours/
  sale-price row sit lower/more-spread than the previous export, so `POSTER_TEMPLATES.flyer2026` in
  `js/poster.js` was re-measured with PIL and updated: spec value baselines battery/motor/load/brake/
  maxSpeed → **310/392/475/561/645** (x unchanged); **salePrice** → x515 y812, cover `{505,758,300,66}`;
  **colors** → x85 y755 box59 gap19, frameClear `{60,752,404,66}`; **features** → y0 898 rowGap 36. Name
  banner + phone + photo zone unchanged. The template `src` gained a `?v=20260916b` query so browsers
  refetch the new image (the filename is unchanged). Verified with a baseline-anchored PIL mock render
  (`/tmp/render_final.png`) — all fields land on their labels. **No SQL.** Cache-bust: **poster.js
  `20260914c`→`20260916b`** (staff.html) + image `?v` query. `deploy/` synced (poster.js, staff.html,
  the new asset) + `lucky-lion-site.zip` rebuilt. Not browser-verified (extension offline); poster.js
  parse-checked. **PENDING:** drag the zip to Netlify.
- 2026-09-16 (a): **Crop tool gets a ratio chooser (1:1 / 4:3 / 3:4).** The shared cropper
  (`openCropper`/`saveCrop` in `js/staff.js`) — used by **Store Photos**, the model **Main photo**,
  and model **colour photos** — now shows three shape buttons (`#cropRatios` in `staff.html`:
  Square 1:1 · Landscape 4:3 · Portrait 3:4). New `CROP_DIMS`/`RATIO_LABEL` maps + `paintCropRatios()`
  + `setRatio(r)` (resizes `#cropCanvas`, refits/recenters the image, resets zoom, redraws, highlights
  the active button); `openCropper` gained `opts.ratio`/`opts.ratios`/`opts.lock` (legacy
  `opts.shape:'square'` still works and now maps to a locked 1:1 — **staff avatars** stay square with
  the chooser hidden). Default stays **4:3**. `saveCrop` was already ratio-agnostic (1200px-wide out),
  so no change there beyond the dynamic `Crop.CW/CH`. The **poster** photo is intentionally left as-is
  (free-drag transparent-PNG placement, not the ratio cropper). Existing drag-to-reposition + zoom
  slider unchanged. CSS: `.crop-ratios`/`.crop-ratio` + `.cropper` now centers the canvas and caps its
  height (so portrait crops fit). **No SQL.** Cache-bust `20260915a`→**`20260916a`** (styles.css both
  pages; staff.js). `deploy/` synced + `lucky-lion-site.zip` rebuilt. Not browser-verified (extension
  offline); staff.js parse-checked. **PENDING:** drag the zip to Netlify.
- 2026-09-15 (a): **Fixed colour palette (dropdown) replaces free-text colour entry.** Colours
  are now chosen from ONE fixed A→Z list (Black, Blue, Brown, Gray, Green, Maroon, Orange, Pink,
  Red, Silver, Violet, White, Yellow), each capitalized, with an **"Other…"** escape for a custom
  name/hex. Single source of truth = **`EBIKE_COLORS` (name+hex) near the top of `js/staff.js`**
  (owner can tweak any swatch hex there) + helpers `colorHexOf`/`colorNameOfHex`/`isFixedColor`/
  `colorOptionsHtml`/`colorLabelField`/`cfColorValue`/`setColorField`/`wireColorFields` (a single
  delegated `change`/`input` handler, wired once in `init`, that toggles the "Other…" inputs and
  repaints the `.cf-swatch`). Converted **three** staff spots: (1) **Poster Maker** colour rows
  (`paintColors`) → per-row `<select class="pc-select">` (options carry the palette **hex**) + an
  "Other…" `.pc-input`; `colors[]` now holds hexes (`poster.js drawColors` unchanged — `fillStyle`
  takes a hex/CSS string); prefill-from-model pushes each variant's `color_hex`. (2) **Models →
  Colours & stock** `variantEditor`/`variantsBlock` → `colorLabelField(name,hex,true)` (select +
  swatch + "Other…" name+`<input type=color>`); `wireModelVariants` derives `{name,colorHex}` from
  the field (fixed pick → palette hex; Other → custom) and still calls `API.addVariant`/
  `updateVariant` — **DB shape unchanged** (`model_variants.name`+`color_hex`); new-model seed uses
  `colorHexOf('Red'/'Black')`. (3) **Per-unit colour label** (Create User `#createColorField`,
  add-unit row, edit-unit form) → `colorLabelField(color,hex,false,'— colour —')` (name-only, no
  hex); `autoColour` now calls `setColorField` from the chosen variant; `readUnitDetail`/create
  submit read the colour via `cfColorValue`. Existing rows whose stored name/hex aren't in the 13
  open pre-selected on "Other…". Public swatches (`app.js`) are untouched — they render the stored
  `color_hex`, so they follow automatically. **No SQL.** New CSS `.pc-select`/`.cf-row`/`.cf-select`/
  `.cf-name`/`.cf-hex`/`.cf-other` in `styles.css`. Cache-bust `20260914f`→**`20260915a`** (styles.css
  both pages; staff.js). `deploy/` synced + `lucky-lion-site.zip` rebuilt. Not browser-verified
  (extension offline); staff.js JS parse-checked + colour-helper logic unit-tested via jsc.
  **PENDING:** drag the zip to Netlify.
- 2026-09-14 (seed+deck): **Pre-deploy demo reset + rich test seed (LIVE) and a desktop+mobile
  showcase deck.** (1) **Live Supabase reset via REST** (`scratchpad/seed.py`; recorded as
  `supabase/demo-reset.sql` + `supabase/demo-reset-cleanup.sql`): cleared all users/repairs/
  user_ebikes/messages, recreated the 3 demo logins with the **same credentials** (`admin/admin123`
  ADMIN-01, `staff/staff123` trece TRECE-S-01, `user/user123` trece TRECE-C-0001) + **5 dummy
  customers** across branches (maria/rico/ana/ben/cora, each `name`+`123`), then seeded **7 e-bikes**
  (registry/fleet w/ long serials + payment/sale price), **8 repairs** across every state (pending
  today/tomorrow, in-progress, 2 done w/ cost+completed_at, cancelled, overdue), and **7 messages**
  (4 unread → inbox badges). Kept models/variants/photos/store_photos/site_settings. Verified logins
  + populated staff dashboard/registry/analytics. (2) **`presentation/build_showcase.py`** (new,
  standalone; reuses Playwright + python-pptx) captures a **desktop + mobile** shot of **19 parts**
  of the CURRENT redesigned UI and builds **one slide per part** (desktop card left, phone-framed
  mobile right) → **`presentation/Lucky-Lion-Showcase.pptx`** (now 20 parts incl. the homepage
  "Shop by wheel type" category tiles = 21 slides incl. title); shots in
  `presentation/screenshots/showcase/`. Rendered/verified via the x2t→pdf→qlmanage workflow. **No
  site code change** (site still `v=20260914f`); no cache-bust/deploy needed for this entry.
- 2026-09-14 (f): **Icon-tile menus now apply on DESKTOP too (all widths).** Extended the `e` tile
  grids to desktop per owner. CSS-only: (1) the tile-grid block (`.menu-sec-h`/`.menu-grid`/`.mtile`/
  `.mtile-wide` + `#staffDrawer .drawer-nav`/`.drawer-group`/`.drawer-link` grid) was **un-gated**
  from `@media (max-width:900px)` to base scope — its selectors already out-specify the old list
  styles, so tiles win at every width. (2) `.dropdown-nav` `display:none`→`block` so the **Browse**
  tiles show in the desktop dropdown too (owner wanted full consistency, even though the header nav
  duplicates them). (3) New `@media (min-width:901px)` widens `#guestDropdown`/`#memberDropdown` to
  300px with `max-height:calc(100vh-70px); overflow:hidden auto` so a tall Browse+account grid scrolls
  inside the anchored box. The mobile full-height right-edge slide-in (first ≤900px block +
  `drawerInRight`) stays mobile-only; staff drawer (310px) needed no size change. No markup/JS/SQL
  change. Cache-bust `20260914e`→**`f`** (styles.css both pages). `deploy/` synced + zip rebuilt.
  **PENDING:** drag to Netlify.
- 2026-09-14 (e): **Mobile burger menus → grouped icon-tile grids (mobile only, all 3 menus).**
  The public guest dropdown, public member dropdown, and the staff/admin portal side-drawer now
  render as an app-like ~3-across grid of icon tiles under `@media (max-width:900px)` — grouped
  under small section headers (Browse / My account · Overview/Customers/… for staff). Desktop is
  unchanged (still vertical lists). **Public** (`index.html`): `#guestDropdown`/`#memberDropdown`
  restructured into `.menu-sec` (header `.menu-sec-h` + `.menu-grid`) with a `.mi` icon span per
  item; every JS hook preserved (`.drawer-navlink`, `button[data-panel]`, `#memberDashBtn`,
  `#logoutBtn`, `#loginBtn`, `#signupBtn`, `#memberMsgBadge2`) so **no JS change**. Log out is a
  full-width `.mtile-wide` row. **Staff** (`css/styles.css` ONLY, no `staff.html` edit): the
  existing `#staffDrawer .drawer-nav` (already `.drawer-group` headers + `.drawer-link` with `.di`
  icons) becomes `display:grid` with `.drawer-group{grid-column:1/-1}` so each category header spans
  the row and its links flow as tiles; badges (`#navRepairCount`/`#navInboxCount`) + the ↗ ext move
  to the tile's top-right corner; `is-active` = red border+soft bg. New CSS: `.menu-sec-h`/`.mi`
  (base desktop) + a mobile block for `.menu-grid`/`.mtile`/`.mtile-wide` and the staff-drawer grid.
  Cache-bust `20260914d`→**`e`** (styles.css both pages). `deploy/` synced + zip rebuilt.
  **PENDING:** drag to Netlify.
- 2026-09-14 (d): **Fixed the invisible mobile account drawer.** The right-edge slide-in menu
  (guest/member dropdown at ≤900px) was collapsing to ~0 height and showing nothing. Cause:
  `.site-header` had `backdrop-filter` (glass look), which makes it the **containing block** for
  its `position:fixed` descendants — so the drawer's `top:var(--header-h); bottom:0` resolved
  against the ~60px header box, not the viewport. Fix (CSS only): moved the header's tint + blur
  onto a **`.site-header::before`** pseudo (`position:absolute; inset:0; z-index:-1`), leaving
  `.site-header` with no filter → it stops trapping the fixed drawer, so the existing mobile rule
  now fills the viewport height flush to the right edge. Header glass look unchanged (both pages).
  No DOM/JS change. Cache-bust `20260914c`→**`d`** (styles.css both pages). `deploy/` synced + zip
  rebuilt. **PENDING:** drag to Netlify.
- 2026-09-14 (c): **Poster Maker → new template + mobile right-edge menu.** (1) Poster template replaced with the new 854×1280 "Ride Smart" flyer (`assets/poster-template.jpg`); `POSTER_TEMPLATES.flyer2026` fully recalibrated to it — **single Sale Price** (removed regPrice), **5 specs incl. new Max Speed** (values drawn to the RIGHT of each label), **6 features** (2×3, was 8), 5 colours, phone. `poster.js` render drops the regPrice draw; staff form (staff.html + initPoster) drops Regular price, adds Max speed, single Sale price, 6 feature inputs; prefill fills Sale price from sale/SRP. Verified via PIL overlay. (2) **Mobile account menu = right-edge slide-in drawer** — ≤900px `#guestDropdown`/`#memberDropdown` become a fixed full-height panel from the right (`drawerInRight` animation) instead of a small box under the burger. Cache-bust → **20260914c** (styles.css both, poster.js+staff.js staff; poster.js had been stale at 20260827a).
- 2026-09-14 (dash): **Customer dashboard at #account.** New in-page route `#accountView` (`body.account-open`); `renderAccountDashboard(user)` shows a hero (Hi + member ID + branch), stat tiles (My e-bikes / Scheduled / Completed / Unread — from getUserEbikes+getRepairsByUser+getMessages), and a Quick-actions grid that opens the existing member panels via `openPanel`. `wireAccount`/`syncAccountRoute` added; `wireAccount()` called in init. Customers are redirected to `#account` after login (wireLogin) and signup (wireSignup); a **🏠 My Dashboard** item added atop the member dropdown. Reuses `.qa`/`.dash-card`; new `.acct-*` CSS. Cache-bust → **20260914a** (styles.css both, app.js index).
- 2026-09-14 (v): **Mobile header = one burger on the right.** Previously mobile showed TWO hamburgers
  (left `.nav-toggle` for nav + right account burger). Now ≤900px hides `.nav-toggle` and `.nav-left`, and
  the nav links (Products/About/Location) render inside the account dropdown via a new `.dropdown-nav`
  block (`.drawer-navlink` anchors) added to both `#guestDropdown` and `#memberDropdown`. One right burger
  opens nav + account; a `.drawer-navlink` click closes the dropdown (wired in `wireLogin`, app.js). Desktop
  unchanged. Cache-bust → **`v`** (styles.css both, app.js index). Also (2026-09-14): searched + added real
  branch contact numbers (8/9; GMA has none published) and set Tejero = GenTri PK2 branch (0927-066-7173).
- 2026-09-14: **Real Facebook pages for all 9 branches** (from a web search) in `data/content.json →
  branches` — naic=luckylionsupplier, tejero=San-Francisco-Gen-Tri (100091403936637, closest match),
  gma=luckylionwarehouse (+ full Yellowbell Subdivision address), silang=luckylionsilang2023,
  sanroque=San-Roque-Naic (100092685738521, +phone 0927-653-5214 +email). The messenger FAB auto-derives
  m.me links from these (messengerUrl). Data-only (content.json) — re-synced to deploy + zip; no cache-bust.
- 2026-09-14 (t): **Settings → "🗺️ Branch map locations" editor.** A second collapsible in Site Settings
  (parallel to Branch contact numbers): per branch, an **Address** + a **Google Maps link** (Get directions),
  saved as JSON in **`site_settings.branch_maps`** (`{key:{address,maps}}`, key/value, no SQL). staff.js:
  `branchMapsMap`, `renderBranchMapsEditor`/`gatherBranchMaps` (`#branchMapsEditor`), wired in
  `renderSettings`/`wireSettings`. Public `app.js` init parses `branch_maps` and overrides
  `C.branches[key].address` + `.maps`, so the **Location** page shows the admin-set address and the Get
  directions button uses the admin-set map link (falls back to a name search when blank). CSS `.bm-branch`/
  `.bm-name`. Cache-bust → **`t`**. `deploy/` synced + zip rebuilt. **PENDING:** Netlify upload.
- 2026-09-13 (s): **Site Settings → per-branch contact numbers; Viber→TikTok; misc text.** Site Settings'
  category-based "Contact numbers" editor is replaced by a **per-branch phone editor** (`#branchPhonesEditor`,
  one input per branch, main flagged ★ default) saved as JSON in **`site_settings.branch_phones`** (key/value,
  no SQL). Public `app.js` init parses `branch_phones` and overrides `C.branches[key].phone`, so each branch's
  number shows on the **Location** page and the main branch's is the site default (`primaryNumber`). staff.js
  helpers `branchInfo/branchPhonesMap/branchPhoneOf`; `renderBranchPhonesEditor`/`gatherBranchPhones` replace
  `renderContactsEditor`/`gatherContacts` (old `contacts`/`CONTACT_CATS` code left defined but unused); poster
  phone picker + `primaryPhone` now read branch phones. **Viber field removed** from settings + the public
  settings-pull; **TikTok URL field added** (drives the header TikTok icon). Products catalog category headers
  now read "N models" (was a bare number). Also removed viber from `SETTING_KEYS`. Cache-bust → **`s`**
  (styles.css+app.js index, styles.css+staff.js staff). `deploy/` synced + zip rebuilt. **PENDING:** Netlify upload.
- 2026-09-13 (n): **Staff dashboard gets a 5th "💬 Inbox" tile with an unread badge.** `renderDashboard`
  (staff view) now renders an Inbox tile after Completed (`.tile-inbox`, `data-go="inbox"`) showing the
  unread-message count; a red corner badge (`.tile-note`) + `.has-unread` styling appear when unread > 0.
  Backed by a new global `INBOX_UNREAD` (set by `updateInboxBadgeCount`, which also drives the drawer
  `#navInboxCount`); `paintDashInbox()` keeps the tile fresh on the 20s poll without re-rendering. Also
  fixed a latent cache-bust: `staff.js` had been stuck at `?v=…g` for several content changes — bumped to
  **`n`** (styles.css both pages + staff.js). `deploy/` synced + zip rebuilt. **PENDING:** drag to Netlify.
- 2026-09-13 (m): **Tile grid, long serials, and a LIVE DATA WIPE.** (1) `.tile-row` (shared by the staff
  dashboard's 4 tiles and Analytics' 5 tiles) → `repeat(auto-fit, minmax(150px,1fr))` (dropped the ≤900px
  `repeat(2)` override) so any tile count fills the row with no trailing gap; `.admin-tiles` stays
  `repeat(4)`. (2) **Long chassis/motor/battery numbers (~20–50 chars):** the `user_ebikes.*_no` columns
  are already `text` (no length limit — **no schema change**); only added CSS so the registry's serial
  cells wrap — `.reg-table td[data-label$="no."]{white-space:normal;word-break:break-word;max-width:220px}`
  (other spots already wrap). (3) **Cleared live Supabase data for a fresh demo (2026-09-13, via REST):**
  deleted ALL `repairs`, ALL `user_ebikes` (registry), ALL `messages`, and all `users` except the 3 demo
  logins (`user`/`staff`/`admin`). **Kept:** `model_meta`(14), `model_photos`(6), `model_variants`(46),
  `store_photos`(14), `site_settings`, poster maker. Recorded as `supabase/clear-live-data.sql` (idempotent,
  re-runnable). Cache-bust `20260913l`→**`m`** (CSS only); `deploy/` synced + zip rebuilt. **PENDING:** drag
  the zip to Netlify.
- 2026-09-13 (k): **Sales removed from admin; Inventory feature removed; general Photos → single "Main
  photo".** (A) **Admin dashboard** (`renderAdminDashboard`) is now a **repairs/messages summary** —
  tiles Repairs today / Pending / Completed / Unread; per-branch table = Customers · Open · Done ·
  Cancelled · Unread (no Sales/Sold/Stock columns). (B) **Analytics** (`renderAnalytics`) is the detailed
  drill-down, **repairs-focused**: tiles Completed/Pending/Overdue/Cancelled/Unread, chart **"Repairs
  completed by branch"**, leaderboards Most completed/pending/unread, per-branch breakdown (Open/Done/
  Cancelled/Overdue/Unread); Today/7/30/All toggle kept. All sales/revenue/units-sold gone from both.
  (C) **Inventory REMOVED** — deleted the `#inventory` drawer link + view, `renderInventory`/
  `renderInventoryKind`/`invModelCard`/`wireInventory`/`INV_STATE`/`stockFor`/`branchStock`/`totalStock`/
  `branchOutOfStockCount`/`STOCK_ROWS`; `loadStockMeta` now loads only `META_ALL`; `VIEWS` and `navBranch`
  lost `inventory`. **Stock dropped from the colour editor** (`variantEditor`/`variantsBlock`/`addVariant`
  seeds) and from the **public** page (`app.js` no longer loads `variant_stock`; `renderProductDetail`
  has no "N left"/"Out of stock", defaults to the first colour). A colour is now name + swatch + photos.
  The `variant_stock`/`model_variants.stock` columns remain in the DB, unused (no SQL). (D) **Models
  photos:** the general "📷 Photos" panel is now **"📷 Main photo"** — a single image (the default shown
  before a colour is picked); `modelPhotosBlock` caps to one (delete to replace), shows the bundled image
  as fallback, no reorder; the add-new-model staging (`NEW_MODEL_PHOTOS`) is capped to one too.
  **Per-colour photos are unchanged** and still swap the gallery on swatch click. Cache-bust
  `20260913j`→**`k`**; `deploy/` synced + zip rebuilt; not browser-verified (extension offline), JS
  parse-checked. **PENDING:** drag the zip to Netlify.
- 2026-09-13 (j): **Per-unit detail PAGE (with price) replaces the model modal; Price List removed;
  Location is its own page; hero "Browse Models" gone.** The model modal (`#modelModal`) is gone —
  `openModel(id)` now just navigates to **`#product/<id>`**, a dedicated `#productDetail` page
  (`renderProductDetail()`/`wireProductRoute()`/`syncProductRoute()` toggling `body.product-open`;
  route matches `location.hash.startsWith('#product/')`, so it never collides with `#products`). The
  detail page **shows the price** (`.pd-price`: sale price with SRP struck when on sale, else SRP) plus
  a Price(SRP) spec row — cards themselves still show no price (`priceHtml` → ''). **Price List removed**
  from the public site (nav link + `#prices` page + `renderPriceList`/`wirePrices`/`syncPricesRoute`
  gone). **Location** (`#location`) is now its own page too (`wireLocation`/`syncLocationRoute`,
  `body.location-open`) listing the main branch + ALL others directly (the "Show all branches" toggle is
  gone). Hero **"Browse Models"** button removed. Cache-bust → **`20260913j`** (styles.css both; app.js
  index). `deploy/` synced + zip rebuilt. Not browser-verified (extension offline); JS parse-checked.
  **PENDING:** drag the zip to Netlify.
- 2026-09-13 (g): **Products redesign + PRE-LOVED FULLY REMOVED.** Two things:
  **(A) Homepage "Products" = 3 category tiles + a real catalog page.** The homepage `#store` section no
  longer lists every group; `renderStore()` (`app.js`) now renders **3 category tiles** into
  `#storeGroups` — **3 Wheels (left) · 4 Wheels (center, `.cat-tile.feature`) · 2 Wheels (right)** —
  each with a representative product photo (`featuredForCategory()`) + model count, plus a **"See more
  Lucky Lion products →"** button. Tiles/button/`Products ▾` submenu all open a new **full catalog page
  at `#products`** (`#productsView` section in index.html; `renderProducts()`/`wireProducts()`/
  `syncProductsRoute()` toggling `body.products-open`, same in-page-page pattern as `#prices`/`#about`).
  The catalog is NWOW-style: category tab bar (`#productsTabs`, reuses `.chip`) + grid of `modelCard`s
  grouped by wheel type; a card opens the model modal. `buildStoreSubmenu()` was repointed from
  scroll-to-`#grp-*` to open `#products` by category (`data-cat`). Back-button labels fixed: prices/about
  → "Back to home" (`#store`); products → "Back to home". New CSS: `.cat-tiles`/`.cat-tile(.feature)`,
  `.products-tabs`/`.products-cat`, `#products` route. `.model-body` centered; `.model-meta` (watts·
  battery) already dropped from cards (specs remain in the modal `spec-table`).
  **(B) Pre-loved + Pre-loved Inventory REMOVED everywhere** (owner: won't be used). The older
  "Pre-loved" / "Pre-loved 1-of-1 units" / "Per-branch pre-loved" / "Models vs Pre-loved managers" /
  "Pre-loved Inventory" subsystem docs below are **superseded/void.** Public: deleted the `#preloved`
  page + `renderPrelovedView`/`wirePreloved`/`syncPrelovedRoute`/`prelovedGroupHtml`/`prelovedBranchChip`,
  the PRE-LOVED badge, and the modal Condition/Available-at rows; `applyMeta` dropped `isPreloved`. Staff:
  removed the **Pre-loved Units** manager (`MANAGERS` is now just `{models}`; `groupModelRows(rows)` no
  longer takes `wantPreloved`; `wireAddPreloved`/`#addPrelovedForm` gone) and the **Pre-loved Inventory**
  view (`renderInventory` = brand-new only; dropped `INV_STATE.preloved`, `PL_INV_TAB`, `invPrelovedCard`,
  `wirePrelovedInventory`, `branchPrelovedAvail`, `#plinventory`, `navPrelovedInvCount`); removed the
  **Pre-loved** column from the admin dashboard + Analytics per-branch tables and the `plinventory` route
  in `navBranch`; dropped `preloved`/`plinventory` from `VIEWS` and both drawer links. `model_meta`'s
  pre-loved columns (`is_preloved`/`sold`/`color`/`chassis_no`/…) are left in the DB, just unused. **Brand-new
  Inventory/stock is untouched.** **No SQL.** Cache-bust `20260913f` → **`20260913g`** (styles.css both;
  app.js index; staff.js staff). `deploy/` synced + zip rebuilt. Not browser-verified (extension offline);
  all JS parse-checked. **PENDING:** drag `lucky-lion-site.zip` to Netlify.
- 2026-09-13 (b): **Header/label + card polish.** (1) Nav links now **`space-evenly`** across the
  header (`.nav-left`) instead of clamped center. (2) Visible **"Store" → "Products"**: the nav link
  (`#storeNavItem`), the `#store` section `<h2>`, and the three `.view-back` buttons ("← Back to
  products"). **Internal ids/hashes stay `#store`/`storeGroups`/`buildStoreSubmenu`** — only the words
  changed. (3) **Product cards show only photo + centered name**: dropped the `${motorW}W · ${battery}`
  `.model-meta` line from `modelCard()` (`app.js`) and set `.model-body{text-align:center}`; full specs
  still show in the model modal (`openModel` `spec-table`). Pre-loved 📍 branch chip kept (centers with
  the body). (4) **Contact Us removed**: deleted the `#contact` `<section>` from `index.html` and the
  `renderContact()` call in `init()` (function left defined, unused); the contact-number picker modal
  `#contactModal`/`openContactPicker` stays (used by booking + Location Call buttons). **No SQL.**
  Cache-bust `20260913a` → **`20260913b`** (styles.css both pages; app.js index). `deploy/` re-synced +
  zip rebuilt. Not browser-verified (extension offline); JS parse-checked. **PENDING:** drag the zip to
  Netlify.
- 2026-09-13: **2 new branches + header cleanup + per-branch messenger/location + registry trim.**
  (1) **Branches 7 → 9**: added **Silang** (`silang`/`SILANG`) and **San Roque** (`sanroque`/`SANROQUE`)
  to `js/branches.js` and `data/content.json` (municipality-level placeholders like naic/tejero/gma —
  real address/phone pending from owner). Everything branch-derived (member IDs, dropdowns, registry/
  preloved filters, admin tables) picks them up automatically.
  (2) **Header slimmed + centered**: removed the whole `.hdr-info` block (Call us / Get directions /
  Business hours) and the **Contact Us** nav link from `index.html`; nav is now **Store · Price List ·
  About · Location**, centered via `.nav-left{flex:1;justify-content:center}`. `renderHeaderInfo()` now
  only sets the hero tagline. **Viber removed** from the header/footer social icons; **TikTok added**
  (`ICONS.tiktok`, `socialLinks()` pushes `tiktok`, pulled from `site_settings.tiktok` or
  `content.json` main-branch `tiktok` default = a TikTok search URL — swap for the real @handle when
  known). The `#contact` section + its Viber card remain in the DOM, just unlinked. Dead `.hdr-info`/
  `.hdr-mini`/`.hdr-phone` CSS left in place (harmless).
  (3) **About is now its own "page"** (like Price List): `#about{display:none}` by default,
  `body.about-open` shows only it; new `#aboutBack` button + `wireAbout()`/`syncAboutRoute()` in
  `app.js` toggle on hash `#about`.
  (4) **Messenger FAB → branch picker**: the floating button (`#fabMessenger`, now a `<button>` inside
  `.fab-msg-wrap`) opens an **upward** menu (`#fabMsgMenu`/`#fabMsgList`) listing **all 9 branches**;
  each row opens that branch's Messenger. `renderMessengerFab()` builds the list; `messengerUrl(b)`
  returns `b.messenger` else derives `m.me/<id-or-vanity>` from `b.facebook`, else the branch's FB page;
  branches with no FB fall back to the **main** branch's Messenger.
  (5) **E-Bike Registry table trimmed** (`staff.js` `renderRegistry`/`paintRegistry`): **removed the
  Payment and Sale-price columns** (and the now-orphaned Payment filter + Sale-price sort options);
  serial columns **reordered to Chassis → Motor → Battery**. Sale/payment data still lives in the DB
  and in the Users/Analytics views — only the registry table changed.
  **No SQL.** Cache-bust bumped `v=20260911a`/`v=20260827a` → **`v=20260913a`** (styles.css both pages;
  branches.js both; app.js index; staff.js staff). `deploy/` re-synced + `lucky-lion-site.zip` rebuilt.
  **Not browser-verified** (Chrome extension offline); all JS parse-checked (JSC/`new Function`) + JSON
  validated. **PENDING USER ACTION:** drag `lucky-lion-site.zip` to Netlify (folds into the existing
  pending deploy).
- 2026-09-11: **Prices hidden on the public store + new Price List section.** Per owner: remove all
  price figures from the public store cards **and** the model modal (for everyone), and give visitors
  a separate place to look prices up. `app.js`: `priceHtml()` now returns `''` (kills every
  `.model-price` on cards); in `openModel()` the sale box (`saleRows`), the `.md-price` line, and the
  SRP spec row are gone (and the "Prices subject to change" clause dropped from `md-note`). SALE/NEW
  badges stay (no figure). New **Price List** nav link (`#primaryNav` → `#prices`, works in the mobile
  burger via existing `wireNav`). The Price List opens as **its own full "page"** (not a homepage
  section) using the same pattern as the pre-loved listing: `#prices` section carries a `.view-back`
  button, is hidden by default (`#prices{display:none}`), and `wirePrices()`/`syncPricesRoute()` toggle
  `body.prices-open` on hash `#prices` (CSS then shows `#prices` and hides every other `main > section`).
  Content = new **`renderPriceList()`** (grouped by wheel category, **original SRP only** via
  `STORE.peso`, from effective `MODELS`), called in `init()` after `renderStore()`; `.price-cat`/
  `.price-table` CSS added. Staff/admin portal (`staff.js`) untouched — they still see/edit all prices.
  Also: the header **Login + Create account buttons are now tucked behind a burger** — a new
  `.guest-menu` (`#guestMenu` → `#guestMenuBtn` hamburger + `#guestDropdown`) mirrors the member
  menu; `#loginBtn`/`#signupBtn` keep their ids (so `wireLogin`/`wireSignup` are unchanged) but lost
  their `.btn` classes to render as dropdown rows. `refreshAuthUI` now toggles `#guestMenu` (not the
  two buttons) vs `#memberMenu`; `wireLogin` wires the guest dropdown open/close. `.guest-menu`
  shares `.member-menu`'s `position:relative`. Also: **removed the redundant header "Call us" button**
  (`#hdrCall` / `.hdr-call` — the round call icon that showed on mobile ≤900px in place of `.hdr-info`)
  since the Contact Us nav + section already cover it; deleted its HTML, its `renderHeaderInfo` wiring,
  and its CSS. Also earlier same day: **all pre-loved units removed
  from live Supabase** (deleted the lone `model_meta` row `is_preloved=true` via REST). No SQL. Cache-bust bumped **`v=20260827a` →
  `v=20260911a`** (app.js in index.html; **styles.css in both index.html + staff.html**); `deploy/`
  synced + `lucky-lion-site.zip` rebuilt. Not browser-verified (Chrome extension offline; app.js jsc
  parse-checked). **PENDING USER ACTION:** drag `lucky-lion-site.zip` to Netlify (folds into the
  existing pending deploy).
- 2026-09-10: **Demo-day assets (no site code touched).** Added (1) `supabase/demo-data.sql` +
  `supabase/demo-data-cleanup.sql` — rich, **all-7-branch** demo data (1 customer + 1 staff per
  branch = 14 accounts + the RUN-ALL-seeded admin; owned units w/ serials + `sale_price` in ₱,
  repairs in every state incl. `cancelled`, message threads, on-sale/new flags, a custom new
  model, pre-loved units across branches, and **per-branch `variant_stock`**). Every row is
  `demo-`-prefixed; cleanup also deletes the exact `variant_stock (variant_id,branch)` rows it
  inserted (the older `test-data-cleanup.sql` missed that table). Run AFTER
  `RUN-ALL-new-features.sql`; does NOT touch `site_settings`. Logins = username+`123`
  (maria/rico/pedro/juan/ana/lito/carlo/bea/rosa/nico/dennis/grace/mila/paolo), admin/admin123.
  (2) `presentation/build_logins_doc.py` → `presentation/Lucky-Lion-Logins.docx` (python-docx) —
  the credentials sheet (Branch·Role·Name·Member ID·Username·Password + how-to-log-in); MUST stay
  in sync with `demo-data.sql`. (3) `presentation/build_deploy_deck.py` →
  `presentation/Lucky-Lion-Deployment.pptx` (10-slide "how to go live & what it costs" deck,
  reuses build_deck.py's brand style; standalone — does not touch the main deck). Costs shown
  **by scale of usage** in ₱ (Sept-2026 live prices, 1 US$≈₱62): domain ~₱900–1,100/yr, Supabase
  Free→Pro ~₱1,560/mo, Netlify Free→Pro ~₱1,250/mo. Verified via the x2t→pdf→qlmanage render
  workflow. No cache-bust/deploy/zip needed (SQL + presentation only).
- 2026-08-27: **Poster Maker fully redesigned** onto the branded Lucky Lion flyer template (see the rewritten *Poster Maker* section above). Old dark seasonal-gradient poster replaced by a **template-overlay, live-WYSIWYG editor**: `POSTER_TEMPLATES` registry in `js/poster.js` (one entry `flyer2026` → new asset `assets/poster-template.jpg`, 1024×1535), rewritten `Poster.render`/`previewFast`/`placeholder`, rewritten `#poster` form (staff.html) + `initPoster()` (staff.js). New: editable model name/battery/motor/**load capacity**/brake/regular+sale price/contact; **dynamic 1–5 colour swatches** (type a colour name w/ `<datalist>` autocomplete + live preview, prefilled from variants); **8 feature inputs**; **drag-to-position + slider/wheel-scale photo tool** (upload a transparent PNG, no auto bg-removal); Download PNG. No Generate button (renders live, debounced). CSS added for `.poster-colors/.pc-*`, photo controls, canvas grab cursors. **No SQL.** Cache-bust bumped **`v=20260826a` → `v=20260827a`**; `deploy/` synced (incl. the new asset) + zip rebuilt. **Coordinates CALIBRATED** from a real render (Image #8) + **pixel-measured** off `assets/poster-template.jpg` with PIL (colour boxes 65×66 @ x=73/171/269/367/465 y=893; reg-price number y834–863; sale y930–990; phone y1282–1318) — verified via PIL overlay renders (`/tmp/poster-check*.png`). Spec values switched to **bold-italic Poppins** to match the flyer theme (was plain). All zones live in `POSTER_TEMPLATES.flyer2026` for any future nudge. **Round-2 calibration gotchas (2026-08-27):** the MODEL NAME banner is an angled ribbon with a **red accent block left of x≈660** — the title cover must stay within x660–882 or it pokes out; the price panel bg is **#fafafa not #fff** (covers use #fafafa to blend) and its inner **right red border is x982** (sale cover stops at x981); feature checkmark rows are at y≈1077/1114/1150/1186 (**pitch ~36.5**, not 42). **Final layout (per owner ref):** model **name center-aligned** (x788) with **two covers** — a red patch (x644–684) over the accent the placeholder "M" overlaps + black (x680–892) over the rest; **spec values LEFT-aligned on the line BELOW each label** (x691, y≈423/521/617/717, max 285) at a **uniform size** via `drawSpecs()` (all shrink together to fit; `uniformFloor` lets one very long value shrink alone). **PENDING USER ACTION:** test locally, then the same still-pending Netlify upload + RUN-ALL SQL.
- 2026-08-26: **UI/UX fix batch (5 items).** (1) **Form overflow** — grid children (`.grid2`/`.grid3`) now `min-width:0` + full-width inputs so the signup Phone/Email row (and every staff grid form) no longer overflows narrow modals (`css/styles.css`). (2) **Show-password** — tick-able "Show password" checkbox on the **login + signup** forms (`#loginShowPass`/`#signupShowPass` in index.html; toggles wired in `wireLogin`/`wireSignup` in app.js; `.chk-show` CSS). (3) **Repair history sort** — staff → Scheduled Repairs → **History** tab gained a `Completed: newest/oldest` sort (`REP_HIST_SORT`, `#repHistSort`, `.hist-controls` row; sort applied in `paintRepairRows`). (4) **Filter pills fill the row evenly on mobile** — `.inv-seg` (pre-loved units/inventory segments) + `.reg-chips .chip` (registry wheel chips) become equal-width segments under `@media (max-width:640px)` instead of wrapping raggedly. (5) **Messaging hardened** (behavior already correct — one thread per customer, branch-scoped): branch-less/unknown-customer threads are now surfaced to staff (safety net, tagged `⚠ no branch`) instead of silently dropped; each thread row shows the customer's **member ID** so different customers are unmistakable (`renderInbox`/`paintInboxThreads`/`updateInboxBadgeCount`; `.thread-id`/`.branch-tag.warn` CSS). (6) **Messaging account-switch leak FIXED** (the real bug behind #5) — on the **same device**, logging out of customer A and into customer B showed A's message thread, because a customer→customer switch **never reloads the page** (only staff login redirects), so A's in-memory `MSG_POLL` and the leftover `#panelBody` survived. `refreshAuthUI` cleared `MEMBER_BADGE_POLL` but never `MSG_POLL`, and logout never closed the panel. Fix (`app.js`): new **`closeMemberPanel()`** (clears `MSG_POLL`, hides `#panelModal`, empties `#panelBody`) called in the logout handler; `refreshAuthUI` now also clears `MSG_POLL` on every auth change. Staff side was already safe (staff logout does `location.href='index.html'`, a full reload). **No SQL change.** Cache-bust bumped to **`v=20260826a`**; `deploy/` synced + `lucky-lion-site.zip` rebuilt. **PENDING USER ACTION:** drag the zip to Netlify (folds into the same still-pending deploy; the RUN-ALL SQL is still pending too but unaffected by these fixes).
- 2026-08-06: **Pre-deploy polish.** (1) Login demo hint now lists **admin `admin/admin123`** (index.html). (2) Portal reflects role in the **browser tab + wordmark**: `staff.js init` sets `document.title` + `.brand-text small` + `#staffMenuName` to **Admin** vs Staff (was always "Staff"). (3) ~~Removed SALE/NEW badges~~ **REVERTED at user request** — `badgesHtml` (app.js) restored to show 🔥 SALE / ✨ NEW / ♻️ PRE-LOVED as before. Cache-bust bumped to **`v=20260806a`**; `deploy/`+zip rebuilt — **ready for the user's first deploy**.
- 2026-08-06: **Per-branch tables now route per-column** (dashboard + Analytics). Each cell has `data-nav`; `wireBranchTableNav(scope)` + `navBranch(view, branch)` open the *respective* branch-scoped page instead of always Repairs: Branch/Customers → Users, Sales/Revenue/Fleet → Registry, Open/Done/Cancelled → Repairs, Out-of-stock → Inventory, Pre-loved → Pre-loved Inventory, Unread → Inbox. `navBranch` sets the right scope var (USERS_BRANCH/REG_BRANCH/REP_BRANCH/INV_STATE.*.branch/INBOX_BRANCH) then `showView`. Cells have title tooltips.
- 2026-08-06: Per-branch table tweaks — **removed the legend** below both grouped tables, made the group dividers **black** (`--grp-rule: #000` light / `#fff` dark), and **centered each category header** (🛒 Sales / 🛠️ Repairs / 📦 Stock). Preview updated.
- 2026-08-06: **Per-branch table kept (cards reverted) + boxed category groups.** Tried branch cards; user preferred the grouped **table**, so `renderAdminDashboard` uses the grouped table again (`row`/`rows`), now with clearer **group dividing lines**: each category (🛒 Sales / 🛠️ Repairs / 📦 Stock / 💬) is boxed via a `--grp-rule` border — vertical rule at each group start (`.grp-start`, header+body), a top+bottom rule on the group-header labels, and a right rule closing the last group. Cancelled stays muted grey, Done green, red = attention; legend kept. `.branch-cards`/`.brc*` CSS remains but is now unused. `rows` still compute `revenue`+`overdue` (harmless). `preview-admin.html` back to the table. Still `v=20260805b`, `deploy/`+zip synced.
- 2026-08-06: **Clearer per-branch tables** (admin dashboard + Analytics). Added **grouped headers** (🛒 Sales / 🛠️ Repairs / 📦 Stock / 💬) with vertical rules (`.admin-grouped`, `.grp`, `.grp-start`) so Open/Done/Cancelled read as *repairs*, per-column `title` tooltips, and a **legend** (`.admin-legend` dots). Done is green (`.ok-num`), **Cancelled is now muted grey not red** (`.muted-num`) so it stops looking like an error; out-of-stock/unread stay red (`is-warn`). `preview-admin.html` updated to match. CSS-only + markup; still `v=20260805b`, `deploy/`+zip re-synced.
- 2026-08-06: **Registry payment filter + price sort.** E-Bike Registry (`renderRegistry`/`paintRegistry`) gained a **Payment** filter dropdown (`REG_PAY`: All / Cash / Home Credit / Credit Card / Other) and two **Sale price** sort options (high→low, low→high; unpriced units sort last). Sits beside the existing wheel/branch/sort controls. (Payment sort deliberately NOT in the Users view — that's grouped per-customer and a customer can own units with different modes.)
- 2026-08-06: **Sale details per owned unit** (staff/admin). `user_ebikes` gained `payment_mode`, `sale_price`, `sale_note` (`unit-sale.sql`, folded into `RUN-ALL`). Captured in the **Create User** form, the **add-unit** row, and the **Edit unit** form (payment `<select>` = Cash/Home Credit/Credit Card/Other via `PAYMENT_MODES`/`paymentOptions`; price prefilled with the model's listed price via `listedPrice()`). Shown on each unit row (`unitSaleLine`) + as **Payment + Sale price columns in the E-Bike Registry**. **Note is staff/admin-only** — nothing new on the customer's public My-E-Bikes. **Analytics revenue now uses the actual `sale_price` when present** (`unitRevenue()` in `allOwnedUnits`; falls back to listed price), so a unit sold below SRP reflects the real figure in the dashboard ₱ + Analytics. `api.js` add/updateUserEbike carry the fields. No cache-bust change needed pre-deploy (still `v=20260805b`); `deploy/`+zip re-synced. Not browser-verified.
- 2026-08-05: **Admin dashboard visual polish** (`renderAdminDashboard`, admin-only). Output wrapped in `.admin-dash`; richer **hero** (xl avatar, red eyebrow/accent bar, branches/customers/fleet chips, Analytics CTA); KPI tiles restyled as **`.atile`** cards (tinted icon disc + colored left accent per tone: gold/blue/amber/green/red/ink) in a proper responsive **`.admin-tiles`** grid (fixes the old 5-tiles-in-a-4-col bug); per-branch table gets tabular-nums + a **⭐ leader row** highlight (top all-time seller). All CSS scoped under `.admin-dash` so the **staff** dashboard is untouched; uses existing tokens. `preview-admin.html` (project root, static mock, **not** in `deploy/`) lets you eyeball it at `localhost:8000/preview-admin.html` — throwaway, safe to delete. Still `v=20260805b`, not browser-verified.
- 2026-08-05: **Admin Analytics view** (admin-only). New drawer item **📈 Analytics** (`#analytics`, in `ADMIN_ONLY_VIEWS`) → `renderAnalytics()` in `staff.js`: a **time-range toggle** (Today/7/30 days/All), company KPI tiles (units sold, **sales revenue ₱**, repairs completed, cancelled), a **branch leaderboard** (top sales / most repairs done / largest fleet), a **revenue-per-branch horizontal bar chart** (single brand-red hue), a **Needs-attention** strip, and a wide per-branch breakdown table (tap a row → branch-scoped repairs). **Sales revenue = Σ listed price of units handed over** (`unitPriceOf`/`allOwnedUnits`); repairs are counted, never revenue. The **admin dashboard** now shows ₱ on the Sold-today tile, an attention alert, and an Analytics quick action. Chart styling per the dataviz skill (single-hue magnitude bars, labeled). No schema change; still `v=20260805b`, `deploy/`+zip re-synced. Not browser-verified (jsc parse-checked).
- 2026-08-05: **Multi-branch + Admin role.** Site now represents all **7 branches** (home highlight moved from Trece → **main / Buhay na Tubig, Imus**). New `js/branches.js` (canonical branch keys/codes/labels) loaded before `api.js`; `content.json` restructured to `branches{}` + `mainBranch`. New **admin** role (global, read-only oversight of all branches; only editor of Models/Store Photos/Site Settings; creates staff+admins). **staff** scoped to one `users.branch` (only see/edit their branch's customers/repairs/inbox/inventory/pre-loved; other branches view-only; Models/Photos/Settings hidden). Per-branch **member IDs** (`TRECE-C-0001`/`TRECE-S-01`/`ADMIN-01`). Per-branch brand-new stock via new **`variant_stock`** table (public store = combined total); per-branch pre-loved via `model_meta.branch` (public listing gets a **branch filter** + chips). Signup + customer profile get a **nearest-branch** dropdown. New admin **company dashboard** (`renderAdminDashboard`) with per-branch performance table. Added a **`cancelled`** repair status (Cancel keeps the record for stats). New SQL **`supabase/multibranch.sql`** (folded into `RUN-ALL`) seeds `admin`/`admin123`. Cache-bust **`v=20260805b`**; `deploy/` synced + zip rebuilt. **PENDING USER ACTION:** run `RUN-ALL-new-features.sql` (now incl. multibranch), then upload the zip. Scoping is UI-level only (prototype/open anon key). *(Not browser-verified — Chrome extension was offline; jsc parse-checked only.)*
- 2026-07-24: **Presentation reworked for the new staff UI (36 slides).** The staff
  screenshots were stale — `capture.py` scrolled to anchors, which stopped working when the
  staff portal became a one-view-at-a-time hash router, so the staff stage now navigates by
  hash (`go_view`). Added Dashboard + drawer shots and a new `sync` stage, and rebuilt the
  deck: Part 3 is now the redesigned Staff Portal (Dashboard first) and **Part 4 "One
  Database, Two Sides"** shows three customer↔staff pairings (booking, seasonal theme,
  model edit) via the new `pair()` recipe. **Site code untouched** — `presentation/` only,
  so no cache-bust bump, no `deploy/` sync, no zip rebuild, no SQL. Nothing was written to
  Supabase (theme shots use `?theme=` and an unsubmitted dropdown).
- 2026-07-23: **Staff UI restructured** — burger side drawer with grouped menu, one section visible at a time (hash router), and a new Dashboard landing view with stat tiles, next-repairs list and quick actions. No schema change. Cache-bust `v=20260723k` (incl. the ← Dashboard return button); `deploy/` synced and zip rebuilt (**user must re-upload to Netlify**).
- 2026-07-23: Added `presentation/` — automated screenshot capture + generated 34-slide
  PPTX for the main-office demo. Site code untouched. Demo booking (Lucky Agila V2,
  2026-07-26, 10:00–12:00) left live in `repairs` on purpose, as the deck's proof shot.
- 2026-07-04: About Us — added the **World Class Philippines award** (`assets/about/award-world-class.jpg`, optimized from the source PNG) as a `<figure class="award">` under `#aboutBody` in `index.html`, plus a one-line mention appended to `about.body` in `content.json`. Static HTML (not app.js-rendered). CSS: `.award`/`.award-badge`.
- 2026-07-04: Staff profile pictures (avatar_url on users, square cropper, shown in users list + editable in profile). Staff Models — grouped by wheel type + ↑/↓ reorder (persists model_meta.sort), specs (name/type/motor/battery/brakes) now editable on existing models, bundled products.json photo shown as read-only "built-in" tile in the photo manager. Customer Schedule Repair — model choice limited to the units the customer owns. New SQL: `staff-avatars.sql`.
- 2026-07-04: Poster Maker — fully editable form (every poster field is a pre-filled input), Contact block auto-fills from `site_settings`, empty-state placeholder on the canvas (no more black box), footer now shows branch name + address + phone·note with auto-fit sizing.
- 2026-07-04: Scheduled Repairs toggle + full upgrade (type/cost/completed_at, overdue, edit/cancel/reopen, history search+totals).
- 2026-07-04: Fixed mobile sale ribbon clipped by sticky header (moved `#themeRibbon` above `<header>` in `index.html`).
- 2026-07-04: Multiple photos per model — staff upload/manage (edit + add-new-model form), **drag-to-reorder** (pointer-based, mouse+touch) + ↑↓, customer gallery prev/next + counter + thumb strip.
