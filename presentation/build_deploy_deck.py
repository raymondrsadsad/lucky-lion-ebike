#!/usr/bin/env python3
"""Assemble Lucky-Lion-Deployment.pptx — the "how to go live & what it costs"
deck for the main office.

  python3 presentation/build_deploy_deck.py

Standalone (does NOT touch the main Lucky-Lion-Presentation.pptx). Reuses the
same brand style as build_deck.py. Prices are live estimates as of Sept 2026
(1 USD ≈ ₱62.4) and are rounded for readability — the deck says so.
"""
import os
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
LOGO = os.path.join(ROOT, "assets", "logo.jpg")
OUTFILE = os.path.join(HERE, "Lucky-Lion-Deployment.pptx")

RED = RGBColor(0xE1, 0x1B, 0x22)
INK = RGBColor(0x14, 0x14, 0x14)
MUTED = RGBColor(0x6B, 0x70, 0x7B)
LINE = RGBColor(0xE3, 0xE6, 0xEA)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
BG = RGBColor(0xFA, 0xFA, 0xFB)
DIMWHITE = RGBColor(0xC9, 0xCC, 0xD2)
GREEN = RGBColor(0x1B, 0x8A, 0x4A)
PANEL = RGBColor(0xF1, 0xF3, 0xF6)

W, H = Inches(13.333), Inches(7.5)

prs = Presentation()
prs.slide_width, prs.slide_height = W, H
BLANK = prs.slide_layouts[6]


# ------------------------------------------------------------------ helpers
def add_slide(bg=BG):
    s = prs.slides.add_slide(BLANK)
    r = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, W, H)
    r.fill.solid()
    r.fill.fore_color.rgb = bg
    r.line.fill.background()
    r.shadow.inherit = False
    return s


def textbox(s, x, y, w, h, text, size=18, bold=False, color=INK,
            align=PP_ALIGN.LEFT, space_after=6, line=1.25):
    tb = s.shapes.add_textbox(x, y, w, h)
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    lines = text if isinstance(text, list) else [text]
    for i, ln in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.text = ln
        p.alignment = align
        p.space_after = Pt(space_after)
        p.line_spacing = line
        f = p.font
        f.size, f.bold, f.color.rgb, f.name = Pt(size), bold, color, "Calibri"
    return tb


def bullets(s, x, y, w, items, size=15, color=INK, gap=11):
    tb = s.shapes.add_textbox(x, y, w, Inches(4.5))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    hang = Inches(0.23)
    for i, it in enumerate(items):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.text = "•  " + it
        p.space_after = Pt(gap)
        p.line_spacing = 1.22
        p.font.size, p.font.color.rgb, p.font.name = Pt(size), color, "Calibri"
        pPr = p._p.get_or_add_pPr()
        pPr.set("marL", str(int(hang)))
        pPr.set("indent", str(int(-hang)))
    return tb


def notes(s, text):
    s.notes_slide.notes_text_frame.text = text


def accent(s, x, y, w=Inches(1.05), h=Inches(0.07)):
    r = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, y, w, h)
    r.fill.solid()
    r.fill.fore_color.rgb = RED
    r.line.fill.background()
    r.shadow.inherit = False
    return r


def badge(s, x, y, text, w=Inches(1.5), h=Inches(0.36), fill=RED, fg=WHITE, size=12):
    r = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, w, h)
    r.fill.solid()
    r.fill.fore_color.rgb = fill
    r.line.fill.background()
    r.shadow.inherit = False
    tf = r.text_frame
    tf.margin_left = tf.margin_right = 0
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.text = text
    p.alignment = PP_ALIGN.CENTER
    p.font.size, p.font.bold, p.font.color.rgb = Pt(size), True, fg
    p.font.name = "Calibri"
    return r


def footer(s, n):
    textbox(s, Inches(11.6), Inches(6.98), Inches(1.25), Inches(0.3),
            f"{n}", size=11, color=MUTED, align=PP_ALIGN.RIGHT)
    textbox(s, Inches(0.62), Inches(6.98), Inches(8), Inches(0.3),
            "Lucky Lion eBike — Going Live", size=11, color=MUTED)


def card(s, x, y, w, h, fill=WHITE, border=LINE):
    r = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, w, h)
    r.adjustments[0] = 0.045
    r.fill.solid()
    r.fill.fore_color.rgb = fill
    if border is None:
        r.line.fill.background()
    else:
        r.line.color.rgb = border
        r.line.width = Pt(1)
    r.shadow.inherit = False
    return r


def price_card(s, x, y, w, emoji, title, price, sub, points):
    """A tall product-cost card: icon, name, big peso price, a few notes."""
    h = Inches(4.5)
    card(s, x, y, w, h)
    pad = Inches(0.28)
    textbox(s, x + pad, y + Inches(0.24), w - pad, Inches(0.6), emoji, size=30)
    textbox(s, x + pad, y + Inches(0.92), w - pad*2, Inches(0.5), title,
            size=17, bold=True)
    textbox(s, x + pad, y + Inches(1.42), w - pad*2, Inches(0.7), price,
            size=23, bold=True, color=RED, line=1.0)
    textbox(s, x + pad, y + Inches(2.12), w - pad*2, Inches(0.6), sub,
            size=12, color=MUTED, line=1.25)
    bullets(s, x + pad, y + Inches(2.78), w - pad*1.6, points, size=11.5, gap=7)


def cost_table(s, x, y, rows, col_w, header_fill=INK, row_h=Inches(0.62)):
    """Draw a peso cost table as shaded cells (crisper than pptx tables)."""
    n_cols = len(rows[0])
    total_w = sum(col_w)
    cy = y
    for ri, row in enumerate(rows):
        cx = x
        is_head = ri == 0
        for ci, val in enumerate(row):
            cell = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, cx, cy, col_w[ci], row_h)
            cell.line.color.rgb = WHITE
            cell.line.width = Pt(1.5)
            cell.shadow.inherit = False
            cell.fill.solid()
            if is_head:
                cell.fill.fore_color.rgb = header_fill
            else:
                cell.fill.fore_color.rgb = WHITE if ri % 2 else PANEL
            tf = cell.text_frame
            tf.margin_left = Inches(0.1)
            tf.margin_right = Inches(0.06)
            tf.margin_top = tf.margin_bottom = 0
            tf.vertical_anchor = MSO_ANCHOR.MIDDLE
            p = tf.paragraphs[0]
            p.alignment = PP_ALIGN.LEFT if ci == 0 else PP_ALIGN.CENTER
            # value may be (text, bold, color)
            if isinstance(val, tuple):
                txt, bold, color = val
            else:
                txt, bold, color = val, is_head, (WHITE if is_head else INK)
            p.text = txt
            p.font.size = Pt(12 if is_head else 12)
            p.font.bold = bold
            p.font.color.rgb = color
            p.font.name = "Calibri"
            cx += col_w[ci]
        cy += row_h
    return cy


# ------------------------------------------------------------- slide recipes
def title_slide():
    s = add_slide(INK)
    # logo on a white rounded card so the opaque JPG sits cleanly on dark
    lc = card(s, Inches(1.1), Inches(1.15), Inches(1.7), Inches(1.7),
              fill=WHITE, border=None)
    if os.path.exists(LOGO):
        s.shapes.add_picture(LOGO, Inches(1.28), Inches(1.33),
                             height=Inches(1.34))
    band = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, Inches(3.5), W, Inches(0.1))
    band.fill.solid()
    band.fill.fore_color.rgb = RED
    band.line.fill.background()
    band.shadow.inherit = False

    textbox(s, Inches(1.1), Inches(3.05), Inches(11), Inches(0.5),
            "TAKING THE WEBSITE LIVE  ·  FOR THE MAIN OFFICE",
            size=14, bold=True, color=RED)
    textbox(s, Inches(1.1), Inches(3.8), Inches(11.4), Inches(1.6),
            "Putting Lucky Lion Online\nWhat It Takes & What It Costs",
            size=40, bold=True, color=WHITE, line=1.12)
    textbox(s, Inches(1.1), Inches(5.5), Inches(10.8), Inches(1.0),
            "The three things a live website needs — a web address, a database, "
            "and hosting — and the real monthly cost in pesos as the shop grows.",
            size=16, color=DIMWHITE, line=1.35)
    notes(s, "Frame it plainly: the system already works. To put it on the "
             "internet at our own address we pay for three things. Most of it can "
             "start free; the only real recurring cost is the database once we go "
             "always-on.")


def divider(n, kicker, title, sub):
    s = add_slide(INK)
    accent(s, Inches(1.1), Inches(2.55), w=Inches(1.4), h=Inches(0.09))
    textbox(s, Inches(1.1), Inches(2.0), Inches(10), Inches(0.4),
            kicker, size=14, bold=True, color=RED)
    textbox(s, Inches(1.1), Inches(2.95), Inches(11), Inches(1.0),
            title, size=38, bold=True, color=WHITE)
    textbox(s, Inches(1.1), Inches(4.15), Inches(10.5), Inches(0.8),
            sub, size=17, color=DIMWHITE, line=1.35)
    footer(s, n)
    return s


def head(s, title, sub):
    accent(s, Inches(0.62), Inches(0.6))
    textbox(s, Inches(0.62), Inches(0.8), Inches(12), Inches(0.7),
            title, size=27, bold=True)
    if sub:
        textbox(s, Inches(0.62), Inches(1.42), Inches(12), Inches(0.5),
                sub, size=14, color=MUTED)


# ------------------------------------------------------------------- build
def build():
    n = [0]
    def num():
        n[0] += 1
        return n[0]

    # 1 — title
    title_slide()

    # 2 — the three pieces
    s = add_slide()
    head(s, "What a live website needs", "Three separate things — each is rented, not bought once.")
    cw = Inches(3.9)
    gap = Inches(0.18)
    x0 = Inches(0.62)
    pieces = [
        ("🌐", "1 · Domain", "The address customers type",
         ["e.g. luckyliontrece.com", "Rented per YEAR", "Like the shop's signboard + address"]),
        ("🗄️", "2 · Database", "Where the data lives",
         ["Customers, repairs, stock, messages", "We use Supabase", "Like the filing cabinet / records"]),
        ("🖥️", "3 · Hosting", "Serves the web pages",
         ["Shows the site to visitors", "We use Netlify", "Like renting the shop space"]),
    ]
    for i, (emoji, t, price, pts) in enumerate(pieces):
        x = x0 + i * (cw + gap)
        card(s, x, Inches(2.0), cw, Inches(4.2))
        textbox(s, x + Inches(0.28), Inches(2.24), cw, Inches(0.7), emoji, size=34)
        textbox(s, x + Inches(0.28), Inches(3.0), cw - Inches(0.4), Inches(0.5), t, size=19, bold=True, color=RED)
        textbox(s, x + Inches(0.28), Inches(3.5), cw - Inches(0.5), Inches(0.5), price, size=13, color=MUTED)
        bullets(s, x + Inches(0.28), Inches(4.05), cw - Inches(0.5), pts, size=12.5, gap=9)
    footer(s, num())
    notes(s, "Key idea for the office: these are three recurring rentals, not a "
             "one-time purchase. The good news is two of them have a free tier.")

    # 3 — divider: costs
    divider(num(), "PART 1", "What it costs — in pesos",
            "Real prices as of September 2026 (1 US$ ≈ ₱62). Prices change; figures are rounded.")

    # 4 — three price cards
    s = add_slide()
    head(s, "Price of each piece", "Two of the three can start completely free.")
    cw = Inches(3.9); gap = Inches(0.18); x0 = Inches(0.62)
    price_card(s, x0, Inches(2.02), cw, "🌐", "Domain (.com)",
               "≈ ₱900 – ₱1,100 / year",
               "≈ ₱75–90 per month. Same price at any size.",
               ["First year often on promo (~₱400)", "Renews every year after",
                ".com.ph option costs more (~₱1,500+/yr)"])
    price_card(s, x0 + (cw + gap), Inches(2.02), cw, "🗄️", "Database (Supabase)",
               "Free  →  ₱1,560 / month",
               "Free tier works to start; Pro for a real live site.",
               ["Free: sleeps if idle a week, no backups",
                "Pro (~US$25): always on + daily backups",
                "Heavy use adds ₱2,200–12,500/mo"])
    price_card(s, x0 + 2*(cw + gap), Inches(2.02), cw, "🖥️", "Hosting (Netlify)",
               "Free  →  ₱1,250 / month",
               "Free tier is enough for a small local shop.",
               ["Free: ~15 GB traffic / month",
                "Pro (~US$20) only if traffic grows",
                "No cost until you outgrow free"])
    footer(s, num())
    notes(s, "Walk left to right. Stress: the domain is the only thing we MUST "
             "pay for from day one, and it's under ₱100/month.")

    # 5 — THE key slide: cost by scale
    s = add_slide()
    head(s, "Cost by scale", "What you pay grows with the number of customers / traffic — not before.")
    B = True; N = False
    rows = [
        ["Scale (customers / traffic)", "Domain", "Database", "Hosting", "≈ / month", "≈ / year"],
        ["Starter · 1–100  (launch / demo)", "₱85", ("Free", N, GREEN), ("Free", N, GREEN),
            ("~₱85", B, INK), ("~₱1,000", B, INK)],
        ["Growing · 100–1,000", "₱85", "₱1,560", ("Free", N, GREEN),
            ("~₱1,645", B, INK), ("~₱19,700", B, INK)],
        ["Established · 1,000–5,000", "₱85", "₱1,560–2,200", "₱0–1,250",
            ("~₱1,650–3,450", B, INK), ("~₱20k–41k", B, INK)],
        ["Large · 5,000+ / heavy", "₱85", "₱2,200–12,500", "₱1,250+",
            ("~₱3,500–13,800", B, INK), ("~₱42k–166k", B, INK)],
    ]
    col_w = [Inches(3.85), Inches(1.25), Inches(2.05), Inches(1.5), Inches(2.15), Inches(1.85)]
    endy = cost_table(s, Inches(0.62), Inches(2.02), rows, col_w, row_h=Inches(0.7))
    textbox(s, Inches(0.62), endy + Inches(0.12), Inches(12), Inches(0.7),
            "Free Supabase pauses when idle and has no backups — perfect for the demo and a soft launch, "
            "but move to Pro (~₱1,560/mo) once the site is a real always-on service.",
            size=12, color=MUTED, line=1.3)
    footer(s, num())
    notes(s, "This is the slide that answers their real question. Point: we can "
             "launch for about ₱1,000 a year (domain only). The database "
             "subscription (~₱1,560/mo) only becomes worth it once we're truly "
             "live and want no downtime + backups. Costs scale with customers.")

    # 6 — recommendation
    s = add_slide()
    head(s, "Recommendation for Lucky Lion", "Start almost free, pay for the database once it's truly live.")
    # two panels
    card(s, Inches(0.62), Inches(2.05), Inches(5.9), Inches(4.0))
    textbox(s, Inches(0.92), Inches(2.28), Inches(5.3), Inches(0.5), "① To launch now", size=18, bold=True, color=RED)
    textbox(s, Inches(0.92), Inches(2.82), Inches(5.3), Inches(0.5), "≈ ₱1,000 / year", size=22, bold=True)
    bullets(s, Inches(0.92), Inches(3.5), Inches(5.3),
            ["Buy the domain (luckyliontrece.com)",
             "Supabase Free + Netlify Free",
             "Good for the first customers & the demo",
             "Note: free database sleeps when idle"], size=13.5, gap=10)
    card(s, Inches(6.83), Inches(2.05), Inches(5.9), Inches(4.0), fill=INK, border=None)
    textbox(s, Inches(7.13), Inches(2.28), Inches(5.3), Inches(0.5), "② When truly live", size=18, bold=True, color=RED)
    textbox(s, Inches(7.13), Inches(2.82), Inches(5.3), Inches(0.5), "≈ ₱1,650 / month", size=22, bold=True, color=WHITE)
    bullets(s, Inches(7.13), Inches(3.5), Inches(5.3),
            ["Upgrade the database to Supabase Pro",
             "Always on — never sleeps",
             "Automatic daily backups",
             "Hosting stays free until traffic grows"], size=13.5, gap=10, color=DIMWHITE)
    footer(s, num())
    notes(s, "The one-sentence takeaway: launch for ~₱1,000/year, then budget "
             "about ₱1,650/month once it's a real always-on service.")

    # 7 — divider: how we deploy
    divider(num(), "PART 2", "How we put it online",
            "The steps to publish an update, and what's one-time vs ongoing.")

    # 8 — deploy steps
    s = add_slide()
    head(s, "Publishing the website", "How a new version goes live — no coding needed at this step.")
    steps = [
        ("1", "Build the update", "The site files are prepared and packed into one ZIP."),
        ("2", "Upload to Netlify", "Drag the ZIP onto the Netlify dashboard → it goes live in seconds."),
        ("3", "Run database updates", "Any new database changes are pasted once into Supabase's SQL editor."),
        ("4", "Point the domain", "One-time: connect luckyliontrece.com to Netlify (then it just works)."),
    ]
    y = 2.05
    for num_s, t, d in steps:
        badge(s, Inches(0.62), Inches(y + 0.06), num_s, w=Inches(0.55), h=Inches(0.55), size=18)
        card(s, Inches(1.4), Inches(y), Inches(11.3), Inches(0.92))
        textbox(s, Inches(1.66), Inches(y + 0.12), Inches(11), Inches(0.4), t, size=16, bold=True)
        textbox(s, Inches(1.66), Inches(y + 0.5), Inches(10.8), Inches(0.4), d, size=12.5, color=MUTED)
        y += 1.12
    footer(s, num())
    notes(s, "Reassure them: publishing is drag-and-drop. The database step is "
             "occasional and only when a feature adds new fields.")

    # 9 — one-time vs ongoing
    s = add_slide()
    head(s, "One-time vs ongoing costs", "So the office knows exactly what recurs.")
    card(s, Inches(0.62), Inches(2.05), Inches(5.9), Inches(4.0))
    textbox(s, Inches(0.92), Inches(2.28), Inches(5.3), Inches(0.5), "One-time setup", size=18, bold=True, color=RED)
    bullets(s, Inches(0.92), Inches(2.95), Inches(5.3),
            ["Register the domain",
             "Create the Supabase database project",
             "Run the setup SQL once",
             "Connect the domain to the hosting",
             "≈ a few hundred pesos + an afternoon"], size=13.5, gap=11)
    card(s, Inches(6.83), Inches(2.05), Inches(5.9), Inches(4.0))
    textbox(s, Inches(7.13), Inches(2.28), Inches(5.3), Inches(0.5), "Ongoing (recurring)", size=18, bold=True, color=RED)
    bullets(s, Inches(7.13), Inches(2.95), Inches(5.3),
            ["Domain renewal — once a year (~₱1,000)",
             "Database — monthly, only on Pro (~₱1,560)",
             "Hosting — free unless traffic is heavy",
             "No per-customer or per-sale fees",
             "Cancel/downgrade anytime"], size=13.5, gap=11)
    footer(s, num())

    # 10 — close
    s = add_slide(INK)
    accent(s, Inches(1.1), Inches(2.2), w=Inches(1.4), h=Inches(0.09))
    textbox(s, Inches(1.1), Inches(2.5), Inches(11), Inches(1.2),
            "Start free. Scale as customers grow.", size=34, bold=True, color=WHITE, line=1.1)
    textbox(s, Inches(1.1), Inches(3.9), Inches(11), Inches(1.6),
            ["Launch for about ₱1,000 in the first year (domain only).",
             "Budget roughly ₱1,650 / month once it's a real always-on service.",
             "Everything else grows only when the number of customers does."],
            size=17, color=DIMWHITE, line=1.5)
    textbox(s, Inches(1.1), Inches(6.2), Inches(11), Inches(0.5),
            "Prices: Sept 2026 estimates · 1 US$ ≈ ₱62 · subject to change",
            size=12, color=MUTED)
    notes(s, "Close on the two numbers: ₱1,000 to start, ~₱1,650/month when "
             "fully live. Invite questions.")

    prs.save(OUTFILE)
    print("wrote", OUTFILE, "—", len(prs.slides._sldIdLst), "slides")


if __name__ == "__main__":
    build()
