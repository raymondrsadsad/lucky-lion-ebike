#!/usr/bin/env python3
"""
Build Lucky-Lion-Changes-BeforeAfter.pdf — one page per visible change:
a red number + bold title, a gray BEFORE screenshot, a green AFTER screenshot.

Screenshots are produced by presentation/capture_changes.py against two local
dev servers (a pristine "before" checkout and this worktree "after"). This script
only assembles the PDF from the already-captured PNGs in SHOTS_DIR/{before,after}.

Usage:  python3 presentation/build_changes_doc.py  [shots_dir]  [out.pdf]
"""
import os, sys
from PIL import Image, ImageDraw, ImageFont

SHOTS = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "screenshots", "changes")
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "Lucky-Lion-Changes-BeforeAfter.pdf")

PAGE_W, PAGE_H = 1240, 1754
MARGIN = 60
COL_W = PAGE_W - 2 * MARGIN
RED = (225, 27, 34)
GRAY = (107, 114, 128)
GREEN = (22, 163, 74)
INK = (17, 24, 39)
LINE = (220, 223, 230)

def font(sz, bold=False):
    cands = ([
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ] if bold else [
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ])
    for c in cands:
        try: return ImageFont.truetype(c, sz)
        except Exception: pass
    return ImageFont.load_default()

F_TITLE = font(32, True)
F_NUM = font(38, True)
F_LBL = font(22, True)
F_PH = font(26, True)

# (number, title, basename, before_exists)
PAGES = [
    (1, "Create-account form — First / Last name, +63 phone, required fields", "01_signup", True),
    (2, "Products page — search bar added", "06_products", True),
    (3, "General Maintenance — search bar added", "03_maintenance", True),
    (4, "Schedule Repair — booking form only; blue action buttons", "04_schedule", True),
    (5, "Your Bookings — now its own customer menu panel", "05_bookings", True),
    (6, "My Reviews — new customer menu panel", "07_reviews", False),
    (7, "Product detail — 'Inquire now' contact button", "08_product", True),
    (8, "Scheduled Repairs — count badges removed, total below toggle, History shows all", "09_repairs", True),
    (9, "Users — staff accounts now listed; options menu to reset password / delete", "10_users", True),
    (10, "Analytics — % performance trend, custom date range, export", "11_analytics", True),
]

def wrap(draw, text, fnt, maxw):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if draw.textlength(t, font=fnt) <= maxw: cur = t
        else: lines.append(cur); cur = w
    if cur: lines.append(cur)
    return lines

def fit(img, maxw, maxh):
    w, h = img.size
    s = min(maxw / w, maxh / h)
    return img.resize((max(1, int(w * s)), max(1, int(h * s))), Image.LANCZOS)

def labeled_block(page, draw, y, label, color, img_path, exists):
    # pill label
    pw = draw.textlength(label, font=F_LBL) + 36
    draw.rounded_rectangle([MARGIN, y, MARGIN + pw, y + 40], 10, fill=color)
    draw.text((MARGIN + 18, y + 8), label, font=F_LBL, fill=(255, 255, 255))
    y += 54
    MAXH = 600
    if exists and os.path.exists(img_path):
        im = Image.open(img_path).convert("RGB")
        im = fit(im, COL_W, MAXH)
        x = MARGIN + (COL_W - im.size[0]) // 2
        page.paste(im, (x, y))
        draw.rectangle([x, y, x + im.size[0], y + im.size[1]], outline=LINE, width=1)
        return y + im.size[1] + 28
    else:
        draw.rounded_rectangle([MARGIN, y, MARGIN + COL_W, y + 220], 14,
                               fill=(244, 245, 248), outline=LINE, width=1)
        msg = "Did not exist before — new feature"
        tw = draw.textlength(msg, font=F_PH)
        draw.text((MARGIN + (COL_W - tw) / 2, y + 95), msg, font=F_PH, fill=GRAY)
        return y + 220 + 28

def build_page(num, title, base, before_exists):
    page = Image.new("RGB", (PAGE_W, PAGE_H), (255, 255, 255))
    d = ImageDraw.Draw(page)
    # header: red number badge + wrapped title
    d.ellipse([MARGIN, MARGIN, MARGIN + 72, MARGIN + 72], fill=RED)
    ns = str(num)
    nw = d.textlength(ns, font=F_NUM)
    d.text((MARGIN + 36 - nw / 2, MARGIN + 13), ns, font=F_NUM, fill=(255, 255, 255))
    tx = MARGIN + 96
    lines = wrap(d, title, F_TITLE, PAGE_W - tx - MARGIN)
    ty = MARGIN + (72 - len(lines) * 38) // 2
    for ln in lines:
        d.text((tx, ty), ln, font=F_TITLE, fill=INK); ty += 38
    y = MARGIN + 72 + 34
    d.line([MARGIN, y, PAGE_W - MARGIN, y], fill=LINE, width=2); y += 26
    y = labeled_block(page, d, y, "BEFORE", GRAY,
                      os.path.join(SHOTS, "before", base + ".png"), before_exists)
    y = labeled_block(page, d, y, "AFTER", GREEN,
                      os.path.join(SHOTS, "after", base + ".png"), True)
    return page

pages = [build_page(*p) for p in PAGES]
pages[0].save(OUT, save_all=True, append_images=pages[1:], resolution=150.0)
print("wrote", OUT, "pages:", len(pages))
