#!/usr/bin/env python3
"""Drive the live local site and capture every screenshot the deck needs.

Run the dev server first:  python3 server.py 8000
Then:                      python3 presentation/capture.py

Screenshots land in presentation/screenshots/. Safe to re-run (files overwrite).
NOTE: the booking step writes a real repair row to the live Supabase project.
"""
import os
import sys
import datetime
from playwright.sync_api import sync_playwright

BASE = "http://localhost:8000"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "screenshots")
DESKTOP = {"width": 1440, "height": 900}
MOBILE = {"width": 390, "height": 844}

CUST = ("user", "user123")
STAFF = ("staff", "staff123")

os.makedirs(OUT, exist_ok=True)
log = []


def shot(page, name, full=False):
    path = os.path.join(OUT, name + ".png")
    page.screenshot(path=path, full_page=full)
    log.append(name)
    print("  ✓", name)


def settle(page, ms=1400):
    """Let fetches, image loads and CSS transitions finish."""
    page.wait_for_timeout(ms)


def kill_motion(page):
    """Freeze the hero cross-fade so shots are deterministic."""
    page.add_style_tag(content="*,*::before,*::after{animation:none!important;"
                               "transition:none!important}")


def login(page, creds):
    page.click("#loginBtn")
    settle(page, 500)
    page.fill("#loginUser", creds[0])
    page.fill("#loginPass", creds[1])
    page.click("#loginForm button[type=submit]")
    settle(page, 2200)


def open_dropdown(page, btn="#hamburgerBtn", menu="#memberDropdown"):
    """Toggle the member menu open only if it is currently closed."""
    if page.eval_on_selector(menu, "el => el.classList.contains('hidden')"):
        page.click(btn)
        settle(page, 500)


def close_dropdown(page, btn="#hamburgerBtn", menu="#memberDropdown"):
    if not page.eval_on_selector(menu, "el => el.classList.contains('hidden')"):
        page.click(btn)
        settle(page, 400)


def open_panel(page, kind):
    open_dropdown(page)
    page.click(f"#memberDropdown button[data-panel={kind}]")
    settle(page, 1800)


def close_modal(page):
    page.keyboard.press("Escape")
    settle(page, 500)
    # fall back to the explicit close button if Escape isn't wired
    for sel in ("#panelModal .modal-close", "#modelModal .modal-close"):
        try:
            el = page.query_selector(sel)
            if el and el.is_visible():
                el.click()
                settle(page, 500)
        except Exception:
            pass


def section(page, anchor, name, wait=1400):
    page.evaluate(
        "id => document.querySelector(id)"
        ".scrollIntoView({block:'start',behavior:'instant'})", anchor)
    settle(page, wait)
    shot(page, name)


# ----------------------------------------------------------------- public site
def capture_public(ctx):
    page = ctx.new_page()
    page.goto(BASE, wait_until="networkidle")
    settle(page, 2500)
    kill_motion(page)

    shot(page, "01-home-hero")
    section(page, "#store", "02-store-catalog", 1800)

    # open the first model card to show the gallery + specs viewer
    card = page.query_selector(".model-card, [data-model-id], .card")
    if card:
        card.click()
        settle(page, 2000)
        shot(page, "03-model-viewer")
        close_modal(page)
    else:
        print("  ! no model card found — skipped 03-model-viewer")

    section(page, "#why", "04-why-choose-us")
    section(page, "#about", "05-about-us-award", 1800)
    section(page, "#location", "06-location")
    section(page, "#contact", "07-contact")

    page.evaluate("window.scrollTo(0,0)")
    settle(page, 600)
    page.click("#loginBtn")
    settle(page, 800)
    shot(page, "08-login-modal")
    page.keyboard.press("Escape")
    page.close()


# --------------------------------------------------- customer + booking flow
def capture_customer(ctx):
    page = ctx.new_page()
    page.goto(BASE, wait_until="networkidle")
    settle(page, 2500)
    kill_motion(page)

    login(page, CUST)
    open_dropdown(page)
    shot(page, "09-member-menu")
    close_dropdown(page)

    for kind, name in [("profile", "10-customer-profile"),
                       ("guides", "11-manuals"),
                       ("maintenance", "12-maintenance"),
                       ("tips", "13-tips"),
                       ("roadrules", "14-road-rules")]:
        open_panel(page, kind)
        shot(page, name)
        close_modal(page)

    # ---- the booking story -------------------------------------------------
    open_panel(page, "schedule")

    if not page.query_selector("#repForm"):
        print("  ! demo customer owns no e-bike — booking form absent.")
        shot(page, "15-schedule-no-unit")
        page.close()
        return None

    when = (datetime.date.today() + datetime.timedelta(days=3)).isoformat()
    page.select_option("#repForm select[name=modelId]", index=0)
    page.fill("#repForm input[name=date]", when)
    page.select_option("#repForm select[name=timeSlot]", index=1)
    page.fill("#repForm textarea[name=notes]",
              "Brake pads worn out and the rear light is not turning on. "
              "Please check the battery charge level too.")
    settle(page, 600)
    shot(page, "15-schedule-repair-form")

    model_label = page.eval_on_selector(
        "#repForm select[name=modelId]",
        "s => s.options[s.selectedIndex].textContent.trim()")

    page.click("#repForm button[type=submit]")
    settle(page, 3000)
    shot(page, "16-booking-confirmed")

    page.close()
    print(f"  → booked: {model_label} on {when}")
    return {"model": model_label, "date": when}


def capture_confirmation(ctx):
    """Re-shoot the confirmation view scrolled to 'Your bookings' so the new
    request is visible. Creates nothing — safe to re-run."""
    page = ctx.new_page()
    page.goto(BASE, wait_until="networkidle")
    settle(page, 2500)
    kill_motion(page)
    login(page, CUST)
    open_panel(page, "schedule")
    page.evaluate("document.querySelector('#myReps')"
                  ".scrollIntoView({block:'center',behavior:'instant'})")
    settle(page, 800)
    shot(page, "16b-my-bookings")
    page.close()


# ---------------------------------------------------------------- staff portal
def go_view(page, view, wait=1600):
    """Switch the staff hash-router to a view and scroll it to the top.

    The staff portal shows one <section class="view"> at a time (staff.js
    showView), driven by the URL hash — so we navigate by hash, not by
    scrolling to an anchor like the old horizontal-nav layout needed.
    """
    page.evaluate("v => { location.hash = '#' + v; }", view)
    settle(page, wait)
    page.evaluate("window.scrollTo(0,0)")
    settle(page, 350)


def capture_staff(ctx):
    # staff.html has no login form of its own — it bounces anyone who isn't
    # staff back to index.html, so sign in on the public page first.
    page = ctx.new_page()
    page.goto(BASE, wait_until="networkidle")
    settle(page, 2500)
    login(page, STAFF)

    page.goto(BASE + "/staff.html", wait_until="networkidle")
    settle(page, 3000)
    if "staff.html" not in page.url:
        raise RuntimeError("staff login failed — redirected to " + page.url)
    kill_motion(page)

    # --- new shell: Dashboard landing view + the side drawer ----------------
    go_view(page, "dashboard", 2200)
    shot(page, "17a-staff-dashboard")

    # open the grouped side drawer over the dashboard
    page.click("#drawerBtn")
    settle(page, 700)
    shot(page, "17b-staff-drawer")
    page.click("#drawerClose")
    settle(page, 500)

    # --- scheduled repairs + completed history ------------------------------
    go_view(page, "repairs", 2200)
    shot(page, "17-staff-repairs-scheduled")
    done = page.query_selector("#repairsList [data-tab=done]")
    if done:
        done.click()
        settle(page, 1800)
        shot(page, "18-staff-repairs-history")
        sched = page.query_selector("#repairsList [data-tab=scheduled]")
        if sched:
            sched.click()
            settle(page, 1200)

    go_view(page, "users", 2200)
    shot(page, "19-staff-users")
    go_view(page, "create", 1600)
    shot(page, "20-staff-create-user")
    go_view(page, "models", 2500)
    shot(page, "21-staff-models")

    # poster: prefilled form, then the generated poster
    go_view(page, "poster", 1800)
    shot(page, "22-poster-form")
    try:
        page.click("#poster form button[type=submit]")
        settle(page, 2500)
        page.evaluate("window.scrollTo(0,0)")
        settle(page, 400)
        shot(page, "23-poster-generated")
        # also grab the poster canvas on its own, at full resolution —
        # the page shot crops it, and the finished artwork is the payoff
        el = page.query_selector("#posterCanvas")
        if el:
            el.screenshot(path=os.path.join(OUT, "23b-poster-artwork.png"))
            log.append("23b-poster-artwork")
            print("  ✓ 23b-poster-artwork")
    except Exception as e:
        print("  ! poster generate failed:", e)

    go_view(page, "photos", 2000)
    shot(page, "24-staff-store-photos")
    go_view(page, "settings", 1500)
    shot(page, "25-staff-settings")
    page.close()


# ------------------------------------------------ customer <-> staff sync shots
def capture_sync(browser):
    """Screenshots for the 'One Database, Two Sides' section.

    - A seasonal customer homepage, applied via the ?theme= URL param so the
      look changes client-side only — the live active_theme in Supabase is
      NOT touched.
    - The staff Site Settings view with the theme dropdown set to the same
      season, WITHOUT submitting, so again nothing is written to the DB.

    Runs in its OWN fresh context: the session is kept in localStorage, so a
    staff login leaking in from an earlier stage would bounce the public
    homepage to staff.html. A clean context guarantees the themed shot is the
    logged-out customer view.
    """
    THEME = "christmas"
    ctx = browser.new_context(viewport=DESKTOP, device_scale_factor=2)

    # customer side: themed homepage (ribbon + seasonal look), logged out
    page = ctx.new_page()
    page.goto(f"{BASE}/?theme={THEME}", wait_until="networkidle")
    settle(page, 2600)
    kill_motion(page)
    page.evaluate("window.scrollTo(0,0)")
    settle(page, 400)
    shot(page, "30-home-themed")
    page.close()

    # staff side: the theme picker in Site Settings, set but not saved
    page = ctx.new_page()
    page.goto(BASE, wait_until="networkidle")
    settle(page, 2500)
    login(page, STAFF)
    page.goto(BASE + "/staff.html", wait_until="networkidle")
    settle(page, 3000)
    if "staff.html" not in page.url:
        raise RuntimeError("staff login failed — redirected to " + page.url)
    kill_motion(page)
    go_view(page, "settings", 1600)
    try:
        # select the season in the dropdown for the shot; do NOT submit
        page.select_option("#themeSelect", THEME)
        settle(page, 500)
    except Exception as e:
        print("  ! theme select failed:", e)
    shot(page, "31-staff-settings-theme")
    page.close()
    ctx.close()


# --------------------------------------------------------------------- mobile
def capture_mobile(browser):
    ctx = browser.new_context(viewport=MOBILE, device_scale_factor=3,
                              is_mobile=True, has_touch=True)
    page = ctx.new_page()
    page.goto(BASE, wait_until="networkidle")
    settle(page, 2500)
    kill_motion(page)
    shot(page, "26-mobile-home")
    section(page, "#store", "27-mobile-store", 1800)

    login(page, CUST)
    open_dropdown(page)
    shot(page, "28-mobile-member-menu")
    close_dropdown(page)
    open_panel(page, "schedule")
    shot(page, "29-mobile-schedule")
    ctx.close()


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport=DESKTOP, device_scale_factor=2)

        # Optional stage filter, e.g. `capture.py staff mobile` — lets a
        # re-run skip the booking step so it doesn't create a duplicate row.
        want = set(sys.argv[1:]) or {"public", "customer", "confirm",
                                     "staff", "sync", "mobile"}
        booking = None

        if "public" in want:
            print("Public site…")
            capture_public(ctx)
        if "customer" in want:
            print("Customer + booking…")
            booking = capture_customer(ctx)
        if "confirm" in want:
            print("Booking confirmation…")
            capture_confirmation(ctx)
        if "staff" in want:
            print("Staff portal…")
            capture_staff(ctx)
        ctx.close()

        if "sync" in want:
            print("Customer↔staff sync shots…")
            capture_sync(browser)

        if "mobile" in want:
            print("Mobile…")
            capture_mobile(browser)
        browser.close()

    print(f"\n{len(log)} screenshots → {OUT}")
    if booking:
        print(f"Demo booking kept live: {booking['model']} · {booking['date']}")


if __name__ == "__main__":
    sys.exit(main())
