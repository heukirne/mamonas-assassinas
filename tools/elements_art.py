"""Arte dos elementos do cenario (tiles, itens, inimigos simples e placa EXIT).

Gera assets/elements.png. Cada celula tem 96px e representa um tile de 32
unidades do jogo. Tudo e desenhado em 4x e reduzido com LANCZOS.
O layout precisa bater com ELEMENT_LAYOUT em game.js.
"""

import random
from math import cos, pi, sin

from PIL import Image, ImageDraw, ImageFilter

CELL = 96
SS = 4
C = CELL * SS  # tamanho da celula supersampled
U = C / 32  # pixels por unidade do jogo

COLS = 8
ROWS = 8
THEMES = ["desert", "lagoon", "forest", "castle"]

OUTLINE = (40, 26, 22, 255)

PAL = {
    "desert": {
        "ground": (201, 138, 69), "light": (228, 172, 102), "dark": (150, 96, 44),
        "top": (243, 207, 122), "top_light": (255, 240, 181), "top_dark": (214, 170, 88),
        "soft": (222, 170, 100), "soft_dark": (160, 108, 50),
        "spike": (236, 224, 196), "spike_dark": (170, 150, 118),
        "pebble": (170, 112, 60),
    },
    "lagoon": {
        "ground": (138, 106, 74), "light": (170, 134, 96), "dark": (96, 72, 48),
        "top": (92, 190, 78), "top_light": (160, 230, 120), "top_dark": (52, 140, 56),
        "soft": (184, 138, 92), "soft_dark": (120, 84, 50),
        "spike": (160, 110, 220), "spike_dark": (96, 60, 150),
        "pebble": (150, 150, 140),
    },
    "forest": {
        "ground": (91, 70, 48), "light": (118, 92, 64), "dark": (62, 46, 30),
        "top": (62, 150, 58), "top_light": (122, 200, 90), "top_dark": (34, 100, 40),
        "soft": (134, 100, 62), "soft_dark": (84, 60, 34),
        "spike": (112, 76, 44), "spike_dark": (64, 42, 22),
        "pebble": (120, 118, 108),
    },
    "castle": {
        "ground": (93, 98, 115), "light": (126, 132, 150), "dark": (60, 64, 80),
        "top": (140, 146, 164), "top_light": (178, 184, 200), "top_dark": (100, 106, 124),
        "soft": (130, 112, 96), "soft_dark": (84, 70, 58),
        "spike": (214, 218, 228), "spike_dark": (120, 126, 142),
        "pebble": (80, 84, 100),
    },
}


def q(v):
    return int(round(v * U))


def pts(points):
    return [(q(x), q(y)) for x, y in points]


def rgba(c, a=255):
    return (c[0], c[1], c[2], a)


def shade(c, f):
    if f >= 0:
        return tuple(int(v + (255 - v) * f) for v in c[:3])
    return tuple(int(v * (1 + f)) for v in c[:3])


def new_cell(w=1, h=1):
    return Image.new("RGBA", (C * w, C * h), (0, 0, 0, 0))


def finish(img, w=1, h=1):
    return img.resize((CELL * w, CELL * h), Image.LANCZOS)


def ell(d, cx, cy, rx, ry, **kw):
    d.ellipse((q(cx - rx), q(cy - ry), q(cx + rx), q(cy + ry)), **kw)


def vgrad(w, h, top, bottom):
    g = Image.linear_gradient("L").resize((w, h))
    return Image.composite(Image.new("RGBA", (w, h), rgba(bottom)), Image.new("RGBA", (w, h), rgba(top)), g)


def pebble(d, cx, cy, rx, ry, color):
    ell(d, cx, cy + 0.6, rx, ry, fill=rgba(shade(color, -0.45)))
    ell(d, cx, cy, rx, ry, fill=rgba(color))
    ell(d, cx - rx * 0.3, cy - ry * 0.35, rx * 0.45, ry * 0.35, fill=rgba(shade(color, 0.35)))


def noise(d, rnd, color, count, size, alpha, x0=0, y0=0, x1=32, y1=32):
    for _ in range(count):
        x = rnd.uniform(x0, x1)
        y = rnd.uniform(y0, y1)
        f = rnd.choice([-0.18, -0.1, 0.1, 0.16])
        d.rectangle((q(x), q(y), q(x + size), q(y + size)), fill=rgba(shade(color, f), alpha))


# ---------------------------------------------------------------------------
# Tiles de chao
# ---------------------------------------------------------------------------

def ground_inner(theme, variant):
    return finish(ground_inner_raw(theme, variant))


def ground_inner_raw(theme, variant):
    p = PAL[theme]
    img = new_cell()
    d = ImageDraw.Draw(img)
    rnd = random.Random(theme + str(variant))
    if theme == "castle":
        d.rectangle((0, 0, C, C), fill=rgba(p["dark"]))
        # duas fileiras de tijolos, a segunda deslocada: emenda sem costura
        rows = [(0, [(0, 32)]), (16, [(-16, 16), (16, 48)])]
        for y0, bricks in rows:
            for x0, x1 in bricks:
                tone = shade(p["ground"], rnd.uniform(-0.06, 0.06)) if y0 == 0 else p["ground"]
                bx0, by0, bx1, by1 = x0 + 0.8, y0 + 0.8, x1 - 0.8, y0 + 15.2
                d.rounded_rectangle((q(bx0), q(by0), q(bx1), q(by1)), radius=q(1.6), fill=rgba(tone))
                d.rounded_rectangle((q(bx0), q(by0), q(bx1), q(by0 + 2)), radius=q(1), fill=rgba(shade(tone, 0.22)))
                d.rounded_rectangle((q(bx0), q(by1 - 2), q(bx1), q(by1)), radius=q(1), fill=rgba(shade(tone, -0.2)))
                for _ in range(3):
                    x = rnd.uniform(max(bx0, 0) + 2, min(bx1, 32) - 3)
                    y = rnd.uniform(by0 + 3, by1 - 4)
                    d.line((q(x), q(y), q(x + rnd.uniform(1, 3)), q(y + rnd.uniform(-1, 1))), fill=rgba(shade(tone, -0.25)), width=q(0.5))
        return img

    d.rectangle((0, 0, C, C), fill=rgba(p["ground"]))
    noise(d, rnd, p["ground"], 90, 0.9, 150)
    if theme == "desert":
        # estratos de arenito com periodo 32 (sem costura)
        for base, amp, f in ((9, 1.2, -0.12), (21, 1.0, 0.1), (28, 0.8, -0.08)):
            line = [(x, base + sin((x / 32) * 2 * pi + base) * amp) for x in range(0, 33, 2)]
            d.line(pts(line), fill=rgba(shade(p["ground"], f)), width=q(1.4))
    else:
        for _ in range(4):
            x = rnd.uniform(3, 27)
            y = rnd.uniform(3, 27)
            ell(d, x, y, rnd.uniform(2.5, 4), rnd.uniform(1.5, 2.5), fill=rgba(shade(p["ground"], -0.14), 170))
        if theme == "forest":
            for _ in range(2):
                x = rnd.uniform(4, 26)
                y = rnd.uniform(6, 26)
                root = [(x, y), (x + 2, y + 1.5), (x + 4, y + 1), (x + 6, y + 2.5)]
                d.line(pts(root), fill=rgba((74, 52, 32)), width=q(0.8))
    for _ in range(2 + variant):
        pebble(d, rnd.uniform(4, 28), rnd.uniform(4, 28), rnd.uniform(1.2, 2.2), rnd.uniform(0.9, 1.5), p["pebble"])
    return img


def ground_top(theme, variant):
    p = PAL[theme]
    img = ground_inner_raw(theme, variant)
    d = ImageDraw.Draw(img)
    rnd = random.Random("top" + theme + str(variant))
    if theme == "castle":
        d.rectangle((0, 0, C, q(6)), fill=rgba(p["top"]))
        d.rectangle((0, 0, C, q(1.4)), fill=rgba(p["top_light"]))
        d.rectangle((0, q(5), C, q(6.6)), fill=rgba(p["top_dark"]))
        for x in (6, 19, 27):
            d.line((q(x), q(1.8), q(x + 2), q(4.5)), fill=rgba(p["top_dark"]), width=q(0.5))
        return finish(img)
    if theme == "desert":
        edge = [(x, 8 + sin((x / 32) * 4 * pi) * 1.2) for x in range(0, 33, 1)]
    else:
        edge = [(x, 7.5 + abs(sin((x / 32) * 8 * pi)) * 2.2) for x in range(0, 33, 1)]
    d.polygon(pts([(0, 0)] + edge + [(32, 0)]), fill=rgba(p["top"]))
    d.line(pts(edge), fill=rgba(p["top_dark"]), width=q(1.2))
    d.rectangle((0, 0, C, q(1.5)), fill=rgba(p["top_light"]))
    if theme == "desert":
        for _ in range(5):
            x = rnd.uniform(2, 26)
            y = rnd.uniform(2.5, 5.5)
            d.arc((q(x), q(y), q(x + 5), q(y + 2)), 200, 340, fill=rgba(p["top_light"]), width=q(0.6))
    else:
        for _ in range(8):
            x = rnd.uniform(1, 30)
            y = rnd.uniform(2, 6)
            d.line((q(x), q(y), q(x + 0.8), q(y + 1.5)), fill=rgba(p["top_light"]), width=q(0.6))
    return finish(img)


def fringe_above(theme, variant):
    """Decoracao que cresce no tile vazio acima do chao (grama, tufos)."""
    p = PAL[theme]
    img = new_cell()
    d = ImageDraw.Draw(img)
    rnd = random.Random("above" + theme + str(variant))
    if theme == "castle":
        return finish(img)
    if theme == "desert":
        for _ in range(2):
            x = rnd.uniform(3, 27)
            for k in range(4):
                a = -pi / 2 + (k - 1.5) * 0.35
                d.line((q(x), q(32), q(x + cos(a) * 4), q(32 + sin(a) * 4.5)), fill=rgba((170, 140, 70)), width=q(0.6))
        return finish(img)
    blade = p["top"]
    for i in range(14):
        x = i * 2.3 + rnd.uniform(-0.6, 0.6)
        h = rnd.uniform(2, 4.5 if theme == "lagoon" else 6)
        lean = rnd.uniform(-1.2, 1.2)
        col = shade(blade, rnd.uniform(-0.25, 0.2))
        d.polygon(pts([(x - 0.9, 32.2), (x + lean, 32 - h), (x + 0.9, 32.2)]), fill=rgba(col))
    if theme == "lagoon" and variant == 0:
        for fx, fc in ((8, (255, 230, 90)), (23, (255, 140, 180))):
            d.line((q(fx), q(32), q(fx), q(27.5)), fill=rgba(p["top_dark"]), width=q(0.5))
            for k in range(5):
                a = k / 5 * 2 * pi
                ell(d, fx + cos(a) * 1.1, 27 + sin(a) * 1.1, 0.9, 0.9, fill=rgba(fc))
            ell(d, fx, 27, 0.6, 0.6, fill=rgba((255, 250, 220)))
    if theme == "forest" and variant == 1:
        ell(d, 21, 30.5, 2.6, 1.4, fill=rgba((230, 220, 200)))
        d.rectangle((q(20.4), q(30.5), q(21.6), q(32)), fill=rgba((230, 220, 200)))
        d.chord((q(17.5), q(27), q(24.5), q(32)), 180, 360, fill=rgba((200, 50, 40)))
        for sx in (19.5, 22.5, 21):
            ell(d, sx, 28.8 if sx != 21 else 28, 0.5, 0.5, fill=rgba((255, 240, 230)))
    return finish(img)


def fringe_below(theme, variant):
    """Decoracao pendurada sob tetos (cipos, raizes)."""
    p = PAL[theme]
    img = new_cell()
    d = ImageDraw.Draw(img)
    rnd = random.Random("below" + theme + str(variant))
    if theme == "forest":
        for i in range(3):
            x = 4 + i * 11 + rnd.uniform(-2, 2)
            length = rnd.uniform(6, 13)
            vine = [(x + sin(t * 1.3) * 0.8, t) for t in [k * length / 8 for k in range(9)]]
            d.line(pts(vine), fill=rgba((46, 110, 44)), width=q(0.7))
            for k in range(1, 8, 2):
                vx, vy = vine[k]
                side = 1 if k % 4 == 1 else -1
                leaf = [(vx, vy), (vx + side * 2.2, vy - 0.6), (vx + side * 1.5, vy + 1.2)]
                d.polygon(pts(leaf), fill=rgba(shade(p["top"], rnd.uniform(-0.1, 0.15))))
        for i in range(10):
            x = i * 3.3 + rnd.uniform(0, 1)
            d.polygon(pts([(x, -0.2), (x + 1.6, -0.2), (x + 0.8, rnd.uniform(1.5, 3.5))]), fill=rgba(p["top_dark"]))
    elif theme in ("lagoon", "desert"):
        for i in range(2):
            x = rnd.uniform(4, 28)
            root = [(x, 0), (x + 0.8, 2), (x - 0.4, 4), (x + 0.5, 5.5)]
            d.line(pts(root), fill=rgba(shade(p["ground"], -0.35)), width=q(0.6))
    else:
        for i in range(3):
            x = rnd.uniform(3, 29)
            ell(d, x, 1.5, 0.7, 1.4, fill=rgba((90, 120, 110, 180)))
    return finish(img)


def soft_block(theme):
    p = PAL[theme]
    img = new_cell()
    d = ImageDraw.Draw(img)
    base = p["soft"]
    d.rounded_rectangle((q(0.3), q(0.3), q(31.7), q(31.7)), radius=q(3), fill=rgba(p["soft_dark"]))
    # pedacos separados por rachaduras: parece quebradico
    chunks = [
        [(1.5, 1.5), (13, 1.5), (11, 11), (1.5, 13)],
        [(14.5, 1.5), (30.5, 1.5), (30.5, 9), (20, 12.5), (12.5, 11)],
        [(1.5, 14.5), (11.5, 12.5), (17, 19), (13, 30.5), (1.5, 30.5)],
        [(13, 12.5), (21, 14), (19, 21), (17.5, 18.5)],
        [(22, 13.5), (30.5, 10.5), (30.5, 22), (21, 22.5)],
        [(18.5, 22), (30.5, 23.5), (30.5, 30.5), (14.5, 30.5)],
    ]
    rnd = random.Random("soft" + theme)
    for chunk in chunks:
        tone = shade(base, rnd.uniform(-0.08, 0.08))
        d.polygon(pts(chunk), fill=rgba(tone))
        xs = [c[0] for c in chunk]
        ys = [c[1] for c in chunk]
        cx = sum(xs) / len(xs)
        cy = sum(ys) / len(ys)
        hi = [(x + (cx - x) * 0.25, y + (cy - y) * 0.25) for x, y in chunk]
        d.line(pts(hi[:2]), fill=rgba(shade(tone, 0.3)), width=q(0.9))
        noise(d, rnd, tone, 10, 0.6, 140, min(xs) + 1, min(ys) + 1, max(xs) - 1, max(ys) - 1)
    d.rounded_rectangle((q(0.3), q(0.3), q(31.7), q(31.7)), radius=q(3), outline=rgba(shade(p["soft_dark"], -0.3)), width=q(0.8))
    return finish(img)


def spikes(theme):
    p = PAL[theme]
    img = new_cell()
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((q(0), q(27), q(32), q(32)), radius=q(1), fill=rgba(shade(p["spike_dark"], -0.3)))
    d.rectangle((q(0), q(27), q(32), q(28)), fill=rgba(p["spike_dark"]))
    for i in range(4):
        x = i * 8 + 4
        top = 9 if i % 2 == 0 else 12
        if theme == "forest":
            # espinhos de galho curvados
            d.polygon(pts([(x - 3.5, 28), (x + 0.8, top), (x + 3.5, 28)]), fill=rgba(p["spike"]))
            d.polygon(pts([(x + 0.8, top), (x + 3.5, 28), (x + 1, 28)]), fill=rgba(p["spike_dark"]))
            d.line(pts([(x + 0.8, top), (x + 0.2, top + 3)]), fill=rgba((200, 170, 120)), width=q(0.6))
        else:
            d.polygon(pts([(x - 3.6, 28), (x, top), (x + 3.6, 28)]), fill=rgba(p["spike"]))
            d.polygon(pts([(x, top), (x + 3.6, 28), (x, 28)]), fill=rgba(p["spike_dark"]))
            d.line(pts([(x - 0.6, top + 2.5), (x - 2.2, 26)]), fill=rgba(shade(p["spike"], 0.5)), width=q(0.6))
        d.polygon(pts([(x - 3.6, 28), (x, top), (x + 3.6, 28)]), outline=rgba(shade(p["spike_dark"], -0.4)))
    return finish(img)


# ---------------------------------------------------------------------------
# Objetos
# ---------------------------------------------------------------------------

def crate():
    img = new_cell()
    d = ImageDraw.Draw(img)
    wood = (176, 118, 60)
    dark = (96, 58, 26)
    d.rounded_rectangle((q(0.4), q(0.4), q(31.6), q(31.6)), radius=q(2), fill=rgba(dark))
    for i in range(3):
        y0 = 3 + i * 9
        tone = shade(wood, (-0.06, 0.04, -0.02)[i])
        d.rectangle((q(3), q(y0), q(29), q(y0 + 8)), fill=rgba(tone))
        d.line((q(3), q(y0 + 0.5), q(29), q(y0 + 0.5)), fill=rgba(shade(tone, 0.25)), width=q(0.6))
        for g in range(2):
            gy = y0 + 3 + g * 2.5
            d.line((q(5 + g * 6), q(gy), q(14 + g * 6), q(gy + 0.4)), fill=rgba(shade(tone, -0.18)), width=q(0.4))
    # moldura e diagonal
    for rect in ((0.4, 0.4, 3.5, 31.6), (28.5, 0.4, 31.6, 31.6)):
        d.rectangle(tuple(q(v) for v in rect), fill=rgba(shade(wood, -0.18)))
    d.polygon(pts([(3.5, 26), (7, 29), (28.5, 6), (25, 3)]), fill=rgba(shade(wood, 0.08)))
    d.line(pts([(4.5, 26.5), (26, 3.5)]), fill=rgba(shade(wood, 0.3)), width=q(0.6))
    for x, y in ((2, 2), (30, 2), (2, 30), (30, 30)):
        ell(d, x, y, 1.1, 1.1, fill=rgba((190, 190, 200)))
        ell(d, x - 0.3, y - 0.3, 0.4, 0.4, fill=rgba((250, 250, 255)))
    d.rounded_rectangle((q(0.4), q(0.4), q(31.6), q(31.6)), radius=q(2), outline=rgba(OUTLINE), width=q(0.8))
    return finish(img)


def barrier():
    """Feixe de galhos secos amarrados (o fogo do Tiny amarelo queima)."""
    img = new_cell()
    d = ImageDraw.Draw(img)
    rnd = random.Random(7)
    for i in range(6):
        x = 1 + i * 5.2
        tone = shade((150, 96, 48), rnd.uniform(-0.2, 0.15))
        lean = rnd.uniform(-0.8, 0.8)
        d.polygon(pts([(x, 32), (x + 4.4, 32), (x + 4.4 + lean, 0), (x + lean, 0)]), fill=rgba(tone))
        d.line(pts([(x + 1 + lean * 0.5, 1), (x + 1, 31)]), fill=rgba(shade(tone, 0.25)), width=q(0.6))
        for k in range(2):
            ky = rnd.uniform(4, 28)
            ell(d, x + 2.2, ky, 0.9, 0.6, fill=rgba(shade(tone, -0.35)))
        d.polygon(pts([(x, 32), (x + 4.4, 32), (x + 4.4 + lean, 0), (x + lean, 0)]), outline=rgba(shade(tone, -0.45)))
    for y in (8, 23):
        d.rectangle((q(0), q(y), q(32), q(y + 3)), fill=rgba((214, 180, 110)))
        for k in range(8):
            d.line((q(k * 4 + 1), q(y), q(k * 4 + 3), q(y + 3)), fill=rgba((160, 126, 64)), width=q(0.5))
        d.rectangle((q(0), q(y), q(32), q(y + 3)), outline=rgba((110, 80, 40)), width=q(0.4))
    return finish(img)


def hook():
    img = new_cell()
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((q(13), q(2), q(19), q(6)), radius=q(1), fill=rgba((80, 88, 104)))
    ell(d, 16, 4, 0.9, 0.9, fill=rgba((180, 186, 200)))
    d.rectangle((q(15.2), q(6), q(16.8), q(10)), fill=rgba((110, 118, 134)))
    ell(d, 16, 16, 6.6, 6.6, fill=rgba((60, 64, 78)))
    ell(d, 16, 16, 5.8, 5.8, fill=rgba((196, 202, 214)))
    ell(d, 16, 16, 3.4, 3.4, fill=(0, 0, 0, 0))
    d.arc((q(10.6), q(10.6), q(21.4), q(21.4)), 190, 280, fill=rgba((255, 255, 255)), width=q(1.1))
    d.arc((q(10.6), q(10.6), q(21.4), q(21.4)), 20, 110, fill=rgba((120, 126, 140)), width=q(1.1))
    ell(d, 16, 16, 3.4, 3.4, outline=rgba((60, 64, 78)), width=q(0.5))
    return finish(img)


def fruit():
    img = new_cell()
    d = ImageDraw.Draw(img)
    ell(d, 16, 18.5, 8.8, 8.3, fill=rgba((150, 56, 16)))
    ell(d, 16, 18, 8.2, 7.7, fill=rgba((244, 124, 36)))
    ell(d, 17.5, 20, 6, 5.5, fill=rgba((226, 100, 24)))
    ell(d, 13, 15, 3.4, 2.6, fill=rgba((255, 190, 120)))
    ell(d, 12.2, 14.2, 1.2, 0.9, fill=rgba((255, 245, 220)))
    rnd = random.Random(3)
    for _ in range(14):
        a = rnd.uniform(0, 2 * pi)
        r = rnd.uniform(2, 7)
        ell(d, 16 + cos(a) * r, 18 + sin(a) * r * 0.9, 0.25, 0.25, fill=rgba((200, 90, 20)))
    d.line(pts([(16, 11), (16.6, 7.5)]), fill=rgba((96, 60, 30)), width=q(1.2))
    leaf = [(16.6, 8.5), (20, 5.5), (24.5, 6.5), (21, 9.8)]
    d.polygon(pts(leaf), fill=rgba((70, 160, 60)), outline=rgba((34, 90, 34)))
    d.line(pts([(17, 8.5), (23, 6.8)]), fill=rgba((40, 110, 40)), width=q(0.4))
    return finish(img)


def clock():
    img = new_cell()
    d = ImageDraw.Draw(img)
    for sx in (-1, 1):
        ell(d, 16 + sx * 6.5, 7.5, 3.4, 3, fill=rgba((200, 40, 40)), outline=rgba(OUTLINE), width=q(0.6))
        ell(d, 16 + sx * 6.5 - 0.8, 6.7, 1, 0.8, fill=rgba((255, 170, 160)))
        d.line(pts([(16 + sx * 7, 25), (16 + sx * 9, 29)]), fill=rgba(OUTLINE), width=q(1.2))
    d.rectangle((q(15.2), q(5), q(16.8), q(8)), fill=rgba((120, 120, 130)))
    ell(d, 16, 17.5, 10, 10, fill=rgba(OUTLINE))
    ell(d, 16, 17.5, 9.2, 9.2, fill=rgba((214, 44, 44)))
    ell(d, 16, 17.5, 7.3, 7.3, fill=rgba((255, 252, 240)))
    for k in range(12):
        a = k / 12 * 2 * pi
        r1, r2 = (5.5, 6.7) if k % 3 == 0 else (6, 6.7)
        d.line((q(16 + cos(a) * r1), q(17.5 + sin(a) * r1), q(16 + cos(a) * r2), q(17.5 + sin(a) * r2)), fill=rgba((60, 60, 70)), width=q(0.5))
    d.line(pts([(16, 17.5), (16, 12.5)]), fill=rgba((30, 30, 40)), width=q(1))
    d.line(pts([(16, 17.5), (19.5, 19)]), fill=rgba((30, 30, 40)), width=q(0.9))
    ell(d, 16, 17.5, 0.9, 0.9, fill=rgba((214, 44, 44)))
    d.arc((q(9.5), q(11), q(22.5), q(24)), 200, 250, fill=rgba((255, 255, 255)), width=q(0.7))
    return finish(img)


def coin(frame):
    """Moeda de ouro girando: 6 quadros de meia volta."""
    img = new_cell()
    d = ImageDraw.Draw(img)
    angle = frame / 6 * pi
    k = abs(cos(angle))
    rx = max(1.1, 7.5 * k)
    cx, cy = 16, 16
    edge = 1.2 * sin(angle)
    ell(d, cx + edge, cy, rx, 7.5, fill=rgba((150, 96, 12)))
    ell(d, cx, cy, rx, 7.5, fill=rgba((196, 136, 20)))
    if rx > 2:
        ell(d, cx, cy, rx * 0.86, 6.5, fill=rgba((255, 206, 60)))
        ell(d, cx, cy, rx * 0.68, 5.2, fill=rgba((236, 170, 30)))
        star = []
        for i in range(10):
            a = -pi / 2 + i * pi / 5
            r = 3.4 if i % 2 == 0 else 1.5
            star.append((cx + cos(a) * r * k, cy + sin(a) * r))
        d.polygon(pts(star), fill=rgba((255, 226, 110)))
        d.arc((q(cx - rx * 0.86), q(cy - 6.5), q(cx + rx * 0.86), q(cy + 6.5)), 200, 260, fill=rgba((255, 250, 210)), width=q(0.8))
    else:
        d.rectangle((q(cx - 0.7), q(cy - 7), q(cx + 0.7), q(cy + 7)), fill=rgba((255, 214, 80)))
    ell(d, cx, cy, rx, 7.5, outline=rgba((110, 70, 8)), width=q(0.5))
    return finish(img)


def bat(frame):
    img = new_cell()
    d = ImageDraw.Draw(img)
    body = (74, 44, 104)
    wing = (104, 64, 140)
    up = frame == 0
    for sx in (-1, 1):
        if up:
            poly = [(16 + sx * 3, 14), (16 + sx * 9, 5), (16 + sx * 15, 8), (16 + sx * 13, 12), (16 + sx * 10, 11), (16 + sx * 8, 15)]
        else:
            poly = [(16 + sx * 3, 14), (16 + sx * 10, 14), (16 + sx * 15, 20), (16 + sx * 12, 20), (16 + sx * 10, 23), (16 + sx * 7, 19)]
        d.polygon(pts(poly), fill=rgba(wing), outline=rgba(shade(body, -0.4)))
        d.line(pts([poly[0], poly[2]]), fill=rgba(shade(wing, -0.25)), width=q(0.5))
    ell(d, 16, 15, 5, 5.5, fill=rgba(body), outline=rgba(shade(body, -0.45)), width=q(0.5))
    for sx in (-1, 1):
        d.polygon(pts([(16 + sx * 1.5, 11), (16 + sx * 3.8, 6.5), (16 + sx * 4.2, 11.5)]), fill=rgba(body))
        ell(d, 16 + sx * 2, 14, 1.5, 1.5, fill=rgba((255, 220, 70)))
        ell(d, 16 + sx * 2.2, 14.2, 0.6, 0.8, fill=rgba((30, 20, 20)))
    d.polygon(pts([(14.8, 17.5), (15.6, 17.5), (15.2, 19)]), fill=rgba((255, 255, 255)))
    d.polygon(pts([(16.4, 17.5), (17.2, 17.5), (16.8, 19)]), fill=rgba((255, 255, 255)))
    ell(d, 14.5, 12.5, 1.4, 0.9, fill=rgba(shade(body, 0.3)))
    return finish(img)


def fish(frame):
    img = new_cell()
    d = ImageDraw.Draw(img)
    body = (226, 84, 58)
    tail_up = frame == 0
    tail = [(7, 16), (1.5, 11 if tail_up else 12.5), (2.5, 16), (1.5, 21 if tail_up else 19.5)]
    d.polygon(pts(tail), fill=rgba(shade(body, -0.2)), outline=rgba(shade(body, -0.5)))
    d.polygon(pts([(12, 9.5), (17, 5.5), (20, 9.5)]), fill=rgba(shade(body, -0.15)), outline=rgba(shade(body, -0.5)))
    ell(d, 16, 16, 10, 6.8, fill=rgba(body), outline=rgba(shade(body, -0.5)), width=q(0.5))
    d.chord((q(7), q(15), q(25), q(22.5)), 0, 180, fill=rgba((255, 200, 150)))
    ell(d, 14, 13, 5, 2, fill=rgba(shade(body, 0.3)))
    # boca com dentes
    d.polygon(pts([(26.2, 15.5), (21.5, 17.5), (26.2, 19.5)]), fill=rgba((80, 20, 20)))
    for tx in (22.5, 24, 25.3):
        d.polygon(pts([(tx, 16.4), (tx + 0.8, 16.4), (tx + 0.4, 17.6)]), fill=rgba((255, 255, 255)))
    ell(d, 21.5, 13.5, 2, 2, fill=rgba((255, 255, 255)), outline=rgba((40, 20, 20)), width=q(0.4))
    ell(d, 22, 13.6, 0.9, 1.1, fill=rgba((20, 10, 10)))
    d.line(pts([(19.8, 11.2), (23, 12)]), fill=rgba((80, 20, 20)), width=q(0.6))
    d.polygon(pts([(13, 18), (16, 20), (12, 21.5)]), fill=rgba(shade(body, -0.1)))
    return finish(img)


BLOCK_LETTERS = {
    "E": [(0, 0, 3, 1), (0, 0, 1, 5), (0, 2, 2.5, 3), (0, 4, 3, 5)],
    "I": [(1, 0, 2, 5), (0.3, 0, 2.7, 1), (0.3, 4, 2.7, 5)],
    "T": [(0, 0, 3, 1), (1, 0, 2, 5)],
}


def exit_sign():
    """Placa grande de EXIT (celula 2x2 = 64x64 unidades do jogo)."""
    img = new_cell(2, 2)
    d = ImageDraw.Draw(img)
    # poste
    d.rectangle((q(29), q(24), q(35), q(64)), fill=rgba((110, 70, 34)))
    d.rectangle((q(29), q(24), q(30.5), q(64)), fill=rgba((150, 100, 52)))
    d.rectangle((q(33.5), q(24), q(35), q(64)), fill=rgba((80, 48, 22)))
    # sombra da placa
    d.rounded_rectangle((q(3.5), q(5.5), q(62.5), q(31.5)), radius=q(3), fill=(0, 0, 0, 70))
    d.rounded_rectangle((q(2), q(4), q(61), q(30)), radius=q(3), fill=rgba((110, 16, 22)))
    d.rounded_rectangle((q(3.2), q(5.2), q(59.8), q(28.8)), radius=q(2.4), fill=rgba((214, 40, 44)))
    d.rounded_rectangle((q(3.2), q(5.2), q(59.8), q(12)), radius=q(2.4), fill=rgba((236, 76, 70)))
    d.rectangle((q(3.2), q(10), q(59.8), q(12)), fill=rgba((214, 40, 44)))
    # letras em blocos com sombra
    scale = 3
    x = 9.5
    for ch in "EXIT":
        for dx, col in ((0.8, (90, 10, 16)), (0, (255, 255, 255))):
            if ch == "X":
                for a, b in (((0, 0), (3, 5)), ((3, 0), (0, 5))):
                    d.line((q(x + a[0] * scale + dx), q(9 + a[1] * scale * 0.8 + dx), q(x + b[0] * scale + dx), q(9 + b[1] * scale * 0.8 + dx)), fill=rgba(col), width=q(3))
            else:
                for x0, y0, x1, y1 in BLOCK_LETTERS[ch]:
                    d.rectangle((q(x + x0 * scale + dx), q(9 + y0 * scale * 0.8 + dx), q(x + x1 * scale + dx), q(9 + y1 * scale * 0.8 + dx)), fill=rgba(col))
        x += 3 * scale + 3.2
    for bx, by in ((5.5, 7.5), (57.5, 7.5), (5.5, 26.5), (57.5, 26.5)):
        ell(d, bx, by, 1, 1, fill=rgba((230, 220, 200)))
        ell(d, bx - 0.3, by - 0.3, 0.4, 0.4, fill=rgba((255, 255, 255)))
    # seta
    d.polygon(pts([(26, 33), (38, 33), (38, 31), (43, 35.5), (38, 40), (38, 38), (26, 38)]), fill=rgba((255, 230, 90)), outline=rgba((120, 80, 10)))
    return finish(img, 2, 2)


def build_atlas():
    atlas = Image.new("RGBA", (CELL * COLS, CELL * ROWS), (0, 0, 0, 0))

    def put(img, col, row):
        atlas.alpha_composite(img, (col * CELL, row * CELL))

    for row, theme in enumerate(THEMES):
        put(ground_inner(theme, 0), 0, row)
        put(ground_inner(theme, 1), 1, row)
        put(ground_top(theme, 0), 2, row)
        put(ground_top(theme, 1), 3, row)
        put(fringe_above(theme, 0), 4, row)
        put(fringe_above(theme, 1), 5, row)
        put(fringe_below(theme, 0), 6, row)
        put(soft_block(theme), 7, row)
    for col, theme in enumerate(THEMES):
        put(spikes(theme), col, 4)
    put(crate(), 4, 4)
    put(barrier(), 5, 4)
    put(hook(), 6, 4)
    put(fruit(), 7, 4)
    put(clock(), 0, 5)
    put(bat(0), 1, 5)
    put(bat(1), 2, 5)
    put(fish(0), 3, 5)
    put(fish(1), 4, 5)
    for i in range(6):
        put(coin(i), 2 + i, 6)
    put(exit_sign(), 0, 6)
    return atlas
