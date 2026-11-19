import sys, os
from playwright.sync_api import sync_playwright
BASE=sys.argv[1]; OUT=sys.argv[2]; AFTER=(len(sys.argv)>3 and sys.argv[3]=='after')
os.makedirs(OUT, exist_ok=True)
def grab(page, name, sel=None):
    path=os.path.join(OUT, name+'.png')
    try:
        if sel:
            el=page.locator(sel).first
            el.scroll_into_view_if_needed(timeout=2500)
            page.wait_for_timeout(250)
            el.screenshot(path=path, timeout=5000)
        else:
            page.screenshot(path=path)
    except Exception as e:
        try: page.screenshot(path=path)
        except Exception as e2: print("  FAIL",name,e2); return
    print("  shot",name)
def close_modal(page):
    page.evaluate("document.querySelector('#panelModal:not(.hidden) [data-close], .modal-backdrop:not(.hidden) .modal-close')?.click()"); page.wait_for_timeout(400)
def login(page,u,p):
    page.goto(BASE+"/index.html",wait_until="networkidle"); page.wait_for_timeout(900)
    page.evaluate("document.querySelector('#loginBtn')?.click()"); page.wait_for_timeout(500)
    page.fill("#loginUser",u); page.fill("#loginPass",p)
    page.click("#loginForm button[type=submit]"); page.wait_for_timeout(3200)
def panel(page,name):
    page.evaluate("document.querySelector('[data-panel=\\'"+name+"\\']')?.click()"); page.wait_for_timeout(1400)

with sync_playwright() as p:
    b=p.chromium.launch()
    # ---------- PUBLIC ----------
    ctx=b.new_context(viewport={"width":1280,"height":900}); pg=ctx.new_page()
    pg.goto(BASE+"/index.html",wait_until="networkidle"); pg.wait_for_timeout(900)
    pg.evaluate("document.querySelector('#signupBtn')?.click()"); pg.wait_for_timeout(700)
    grab(pg,"01_signup","#signupModal .modal")
    pg.evaluate("document.querySelector('#signupModal .modal-close')?.click()"); pg.wait_for_timeout(300)
    pg.evaluate("location.hash='#products'"); pg.wait_for_timeout(1400); pg.evaluate("window.scrollTo(0,0)")
    grab(pg,"06_products")
    ctx.close()
    # ---------- CUSTOMER ----------
    ctx=b.new_context(viewport={"width":1280,"height":900}); pg=ctx.new_page(); login(pg,"user","user123")
    panel(pg,"maintenance"); grab(pg,"03_maintenance","#panelModal .modal"); close_modal(pg)
    panel(pg,"schedule");    grab(pg,"04_schedule","#panelModal .modal"); close_modal(pg)
    panel(pg,"bookings" if AFTER else "schedule"); grab(pg,"05_bookings","#panelModal .modal"); close_modal(pg)
    if AFTER:
        panel(pg,"reviews"); grab(pg,"07_reviews","#panelModal .modal"); close_modal(pg)
    pg.evaluate("location.hash='#products'"); pg.wait_for_timeout(1300)
    pg.evaluate("document.querySelector('#productsView .model-card, #productsGrid .model-card')?.click()"); pg.wait_for_timeout(1500); pg.evaluate("window.scrollTo(0,0)")
    grab(pg,"08_product","#productDetail")
    ctx.close()
    # ---------- ADMIN ----------
    ctx=b.new_context(viewport={"width":1280,"height":920}); pg=ctx.new_page(); login(pg,"admin","admin123")
    if "staff.html" in pg.url:
        for v,tag in [("repairs","09_repairs"),("users","10_users"),("analytics","11_analytics")]:
            pg.evaluate("location.hash='#"+v+"'"); pg.wait_for_timeout(1800); pg.evaluate("window.scrollTo(0,0)"); pg.wait_for_timeout(300)
            grab(pg,tag)
    else:
        print("  ADMIN login did not reach staff.html:",pg.url)
    ctx.close(); b.close()
print("DONE",("after" if AFTER else "before"))
