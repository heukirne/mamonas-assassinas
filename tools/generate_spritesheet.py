"""Gera assets/tiny_spritesheet.png e assets/elements.png.

Os Tinies sao desenhados em alta resolucao (supersampling 4x e reducao com
filtro LANCZOS) para ficarem suaves no jogo. Cada linha e uma forma e cada
coluna um estado de animacao, na ordem de STATES (a mesma usada em game.js).
"""

import random
from math import cos, pi, sin

from PIL import Image, ImageDraw, ImageFilter

import elements_art

FRAME = 128
SS = 4
W = FRAME * SS

STATES = [
    "idle1",
    "idle2",
    "run1",
    "run2",
    "run3",
    "run4",
    "jump",
    "fall",
    "attack1",
    "attack2",
    "ability1",
    "ability2",
]
FORMS = ["yellow", "blue", "red", "green"]
PALETTE = {
    "yellow": {"light": (255, 226, 120), "main": (250, 170, 40), "dark": (196, 104, 18)},
    "blue": {"light": (170, 226, 255), "main": (64, 156, 238), "dark": (28, 88, 170)},
    "red": {"light": (255, 170, 150), "main": (230, 82, 72), "dark": (150, 36, 40)},
    "green": {"light": (190, 240, 160), "main": (96, 192, 92), "dark": (40, 120, 52)},
    "enemy": {"light": (206, 160, 245), "main": (140, 80, 205), "dark": (80, 36, 140)},
}

OUTLINE = (34, 22, 30, 255)
EYE_WHITE = (255, 255, 255, 255)
EYE_SHADE = (205, 214, 230, 255)
PUPIL = (26, 24, 38, 255)
MOUTH = (90, 24, 34, 255)
TONGUE = (240, 104, 120, 255)
TOOTH = (255, 250, 240, 255)
SHOE = (236, 120, 46)
SHOE_DARK = (170, 70, 24)
SHOE_LIGHT = (255, 190, 120)
SOLE = (250, 240, 225, 255)

# Linha do chao no quadro de 128px (o jogo alinha a caixa de colisao nela).
GROUND = 105
BODY_R = 33


def s(v):
    """Converte coordenada do quadro de 128px para a tela supersampled."""
    return int(round(v * SS))


def rgba(c, a=255):
    return (c[0], c[1], c[2], a)


def mix(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def ellipse(draw, cx, cy, rx, ry, **kw):
    draw.ellipse((s(cx - rx), s(cy - ry), s(cx + rx), s(cy + ry)), **kw)


def radial_fill(size, hx, hy, radius, light, main, dark):
    """Imagem com degrade radial: claro no ponto de luz, escuro nas bordas."""
    grad = Image.radial_gradient("L")
    rr = max(2, int(radius * 2))
    grad = grad.resize((rr, rr), Image.BILINEAR)
    mask = Image.new("L", (size, size), 255)
    mask.paste(grad, (int(hx - rr / 2), int(hy - rr / 2)))
    inner = mask.point(lambda v: min(255, v * 2))
    outer = mask.point(lambda v: max(0, (v - 128) * 2))
    img = Image.composite(Image.new("RGBA", (size, size), rgba(main)), Image.new("RGBA", (size, size), rgba(light)), inner)
    img = Image.composite(Image.new("RGBA", (size, size), rgba(dark)), img, outer)
    return img


def fur_mask(cx, cy, rx, ry, seed, spiky=0.0):
    """Silhueta da bola de pelo: elipse com tufos pontudos em volta."""
    rnd = random.Random(seed)
    mask = Image.new("L", (W, W), 0)
    d = ImageDraw.Draw(mask)
    ellipse(d, cx, cy, rx, ry, fill=255)
    tufts = 30
    for i in range(tufts):
        a = i / tufts * 2 * pi + rnd.uniform(-0.06, 0.06)
        width = 0.13 + rnd.uniform(0, 0.05)
        length = 5 + rnd.uniform(0, 4) + spiky * 5
        # menos pelo embaixo, onde ficam os pes
        if 0.35 * pi < a < 0.65 * pi:
            length *= 0.45
        base1 = (cx + cos(a - width) * rx * 0.96, cy + sin(a - width) * ry * 0.96)
        base2 = (cx + cos(a + width) * rx * 0.96, cy + sin(a + width) * ry * 0.96)
        bend = rnd.uniform(-0.12, 0.12)
        tip = (cx + cos(a + bend) * (rx + length), cy + sin(a + bend) * (ry + length))
        d.polygon([(s(base1[0]), s(base1[1])), (s(tip[0]), s(tip[1])), (s(base2[0]), s(base2[1]))], fill=255)
    return mask


def paste_shape(img, mask, fill_img, outline_px):
    """Desenha a forma com contorno escuro (dilatacao da mascara)."""
    size = outline_px * 2 + 1
    outline = mask.filter(ImageFilter.MaxFilter(size))
    img.paste(Image.new("RGBA", img.size, OUTLINE), (0, 0), outline)
    img.paste(fill_img, (0, 0), mask)


def draw_shoe(img, cx, cy, tilt, colors=None):
    """Tenis grandes e arredondados, tipicos dos Tinies."""
    layer = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    rx, ry = 15, 8.5
    mask = Image.new("L", (W, W), 0)
    ImageDraw.Draw(mask).ellipse((s(cx - rx), s(cy - ry), s(cx + rx), s(cy + ry)), fill=255)
    fill = radial_fill(W, s(cx - 4), s(cy - 5), s(22), SHOE_LIGHT, SHOE, SHOE_DARK)
    paste_shape(layer, mask, fill, s(1.6))
    # sola clara
    d.chord((s(cx - rx + 1.5), s(cy - 1), s(cx + rx - 1.5), s(cy + ry - 1)), 10, 170, fill=SOLE)
    d.arc((s(cx - rx + 1.5), s(cy - 1), s(cx + rx - 1.5), s(cy + ry - 1)), 10, 170, fill=OUTLINE, width=s(1))
    # brilho
    ellipse(d, cx - 5, cy - 4, 4, 1.6, fill=(255, 235, 200, 200))
    if tilt:
        layer = layer.rotate(tilt, center=(s(cx), s(cy)), resample=Image.BICUBIC)
    img.alpha_composite(layer)


def draw_arm(img, cx, cy, colors, angle=0):
    mask = Image.new("L", (W, W), 0)
    md = ImageDraw.Draw(mask)
    ellipse(md, cx, cy, 7, 5.5, fill=255)
    if angle:
        mask = mask.rotate(angle, center=(s(cx), s(cy)), resample=Image.BICUBIC)
    fill = radial_fill(W, s(cx - 2), s(cy - 3), s(12), colors["light"], colors["main"], colors["dark"])
    paste_shape(img, mask, fill, s(1.5))


def draw_eyes(img, cx, cy, look, mode, angry=False, colors=None):
    d = ImageDraw.Draw(img)
    ex_l, ex_r = cx - 11.5, cx + 11.5
    rx, ry = 11.5, 14
    if mode == "blink":
        for ex in (ex_l, ex_r):
            d.arc((s(ex - rx + 2), s(cy - 4), s(ex + rx - 2), s(cy + 8)), 200, 340, fill=OUTLINE, width=s(2.2))
        return
    for ex in (ex_l, ex_r):
        ellipse(d, ex, cy, rx + 1.6, ry + 1.6, fill=OUTLINE)
    for ex in (ex_l, ex_r):
        ellipse(d, ex, cy, rx, ry, fill=EYE_SHADE)
        ellipse(d, ex - 1, cy - 1.8, rx - 1.2, ry - 2, fill=EYE_WHITE)
    pr = 5.2 if mode != "wide" else 3.8
    for ex in (ex_l, ex_r):
        px = ex + look * 4.2
        py = cy + (2.5 if mode == "squint" else 1.5)
        ellipse(d, px, py, pr, pr * 1.18, fill=PUPIL)
        ellipse(d, px - 1.8, py - 2.4, 1.9, 1.9, fill=EYE_WHITE)
        ellipse(d, px + 1.8, py + 2.2, 0.9, 0.9, fill=(255, 255, 255, 200))
    if mode == "squint" and colors:
        # palpebras abaixadas de concentracao
        for ex in (ex_l, ex_r):
            d.chord((s(ex - rx - 1.6), s(cy - ry - 1.6), s(ex + rx + 1.6), s(cy + ry + 1.6)), 180, 360, fill=rgba(colors["main"]))
            d.line((s(ex - rx - 1), s(cy), s(ex + rx + 1), s(cy)), fill=OUTLINE, width=s(1.8))
    brow_col = OUTLINE if angry else rgba(colors["dark"]) if colors else OUTLINE
    if angry:
        d.line((s(ex_l - 9), s(cy - 17), s(ex_l + 7), s(cy - 11)), fill=brow_col, width=s(3))
        d.line((s(ex_r + 9), s(cy - 17), s(ex_r - 7), s(cy - 11)), fill=brow_col, width=s(3))
    elif mode == "wide":
        d.arc((s(ex_l - 8), s(cy - 24), s(ex_l + 8), s(cy - 14)), 200, 340, fill=brow_col, width=s(2.2))
        d.arc((s(ex_r - 8), s(cy - 24), s(ex_r + 8), s(cy - 14)), 200, 340, fill=brow_col, width=s(2.2))


def draw_mouth(img, cx, cy, kind, angry=False):
    d = ImageDraw.Draw(img)
    if kind == "smile":
        d.chord((s(cx - 9), s(cy - 7), s(cx + 9), s(cy + 6)), 10, 170, fill=MOUTH, outline=OUTLINE, width=s(1.4))
        ellipse(d, cx, cy + 3.2, 4.2, 2, fill=TONGUE)
    elif kind == "o":
        ellipse(d, cx, cy + 2, 5, 6, fill=MOUTH, outline=OUTLINE, width=s(1.4))
        ellipse(d, cx, cy + 5, 3, 1.8, fill=TONGUE)
    elif kind == "small_o":
        ellipse(d, cx, cy + 2, 3, 3.6, fill=MOUTH, outline=OUTLINE, width=s(1.2))
    elif kind == "grin":
        d.chord((s(cx - 11), s(cy - 8), s(cx + 11), s(cy + 8)), 0, 180, fill=MOUTH, outline=OUTLINE, width=s(1.4))
        d.rectangle((s(cx - 8), s(cy), s(cx + 8), s(cy + 2.4)), fill=TOOTH)
        ellipse(d, cx, cy + 5.5, 4, 1.8, fill=TONGUE)
    elif kind == "chomp_open":
        ellipse(d, cx + 1, cy + 2, 9, 8, fill=MOUTH, outline=OUTLINE, width=s(1.4))
        for tx in (-5, 0, 5):
            d.polygon([(s(cx + tx - 2), s(cy - 5)), (s(cx + tx + 2), s(cy - 5)), (s(cx + tx), s(cy - 1))], fill=TOOTH)
        ellipse(d, cx + 1, cy + 6.5, 4, 2, fill=TONGUE)
    elif kind == "chomp_closed":
        d.line((s(cx - 8), s(cy + 2), s(cx + 9), s(cy + 2)), fill=OUTLINE, width=s(2))
        for tx in (-4, 2):
            d.polygon([(s(cx + tx), s(cy + 2)), (s(cx + tx + 3), s(cy + 2)), (s(cx + tx + 1.5), s(cy + 5))], fill=TOOTH)
    elif kind == "frown":
        d.arc((s(cx - 7), s(cy + 1), s(cx + 7), s(cy + 9)), 200, 340, fill=OUTLINE, width=s(2.2))
        d.polygon([(s(cx - 5), s(cy + 2.5)), (s(cx - 2.5), s(cy + 2.5)), (s(cx - 3.7), s(cy + 6.5))], fill=TOOTH)
        d.polygon([(s(cx + 2.5), s(cy + 2.5)), (s(cx + 5), s(cy + 2.5)), (s(cx + 3.7), s(cy + 6.5))], fill=TOOTH)


def draw_crest(img, form, cx, top, t):
    """Acessorio no topo da cabeca que identifica cada elemento."""
    d = ImageDraw.Draw(img)
    if form == "yellow":
        sway = sin(t * 2 * pi) * 2
        outer = [(cx - 9, top + 8), (cx - 7 + sway, top - 6), (cx - 2, top + 1), (cx + 1 + sway, top - 13),
                 (cx + 4, top), (cx + 9 + sway, top - 7), (cx + 9, top + 8)]
        d.polygon([(s(x), s(y)) for x, y in outer], fill=(235, 70, 30, 255), outline=OUTLINE, width=s(1.4))
        inner = [(cx - 5, top + 8), (cx - 2 + sway, top - 2), (cx + 1, top + 3), (cx + 4 + sway, top - 3), (cx + 6, top + 8)]
        d.polygon([(s(x), s(y)) for x, y in inner], fill=(255, 214, 70, 255))
    elif form == "blue":
        pts = []
        for i in range(24):
            a = i / 24 * 2 * pi
            r = 6.5
            x = cx + sin(a) * r
            y = top + 1 - cos(a) * r
            if a < 0.5 or a > 2 * pi - 0.5:
                y = top - 7 - (1 - abs(sin(a)) * 3)
            pts.append((s(x), s(y)))
        d.polygon(pts, fill=(120, 205, 255, 255), outline=OUTLINE, width=s(1.4))
        ellipse(d, cx - 2, top, 1.6, 2.6, fill=(235, 250, 255, 255))
    elif form == "red":
        for dx, h in ((-7, 8), (0, 12), (7, 8)):
            d.polygon([(s(cx + dx - 4.5), s(top + 7)), (s(cx + dx + 1.5), s(top + 7 - h)), (s(cx + dx + 4.5), s(top + 7))],
                      fill=(170, 40, 40, 255), outline=OUTLINE, width=s(1.3))
    elif form == "green":
        d.line((s(cx), s(top + 7), s(cx + 1), s(top - 4)), fill=(60, 120, 40, 255), width=s(2.4))
        for sign in (-1, 1):
            leaf = [(cx + 1, top - 3), (cx + 1 + sign * 5, top - 10), (cx + 1 + sign * 12, top - 7), (cx + 1 + sign * 6, top - 1)]
            d.polygon([(s(x), s(y)) for x, y in leaf], fill=(120, 220, 90, 255), outline=OUTLINE, width=s(1.3))
            d.line((s(cx + 1), s(top - 3), s(cx + 1 + sign * 9), s(top - 7)), fill=(70, 150, 50, 255), width=s(1))
    elif form == "enemy":
        for sign in (-1, 1):
            horn = [(cx + sign * 8, top + 9), (cx + sign * 14, top - 6), (cx + sign * 16, top + 8)]
            d.polygon([(s(x), s(y)) for x, y in horn], fill=(245, 225, 170, 255), outline=OUTLINE, width=s(1.4))


def draw_fur_strokes(img, cx, cy, rx, ry, colors, seed):
    rnd = random.Random(seed * 7 + 3)
    d = ImageDraw.Draw(img)
    dark = rgba(mix(colors["main"], colors["dark"], 0.55), 190)
    light = rgba(colors["light"], 170)
    for _ in range(22):
        a = rnd.uniform(0, 2 * pi)
        r = rnd.uniform(0.45, 0.9)
        x = cx + cos(a) * rx * r
        y = cy + sin(a) * ry * r
        ln = rnd.uniform(3, 5.5)
        col = light if (cos(a) < 0 and sin(a) < 0.2) else dark
        d.line((s(x), s(y), s(x + cos(a) * ln), s(y + sin(a) * ln)), fill=col, width=s(1.1))


def draw_effects(img, form, state):
    d = ImageDraw.Draw(img)
    if state in ("attack1", "attack2") and form in ("yellow",):
        big = state == "attack2"
        fx, fy, r = (112, 70, 12) if big else (106, 72, 8)
        glow = Image.new("RGBA", (W, W), (0, 0, 0, 0))
        gd = ImageDraw.Draw(glow)
        ellipse(gd, fx, fy, r + 7, r + 7, fill=(255, 140, 40, 110))
        glow = glow.filter(ImageFilter.GaussianBlur(s(3)))
        img.alpha_composite(glow)
        ellipse(d, fx, fy, r, r, fill=(255, 110, 30, 255))
        ellipse(d, fx - 1, fy - 1, r * 0.62, r * 0.62, fill=(255, 220, 80, 255))
        ellipse(d, fx - 2, fy - 3, r * 0.25, r * 0.25, fill=(255, 255, 230, 255))
    if state in ("ability1", "ability2"):
        if form == "blue":
            off = 0 if state == "ability1" else 6
            for bx, by, br in ((104 + off, 64, 7), (116 + off * 0.5, 52, 4.5), (110, 44 - off, 3)):
                ellipse(d, bx, by, br, br, fill=(190, 240, 255, 120), outline=(235, 252, 255, 255), width=s(1.4))
                ellipse(d, bx - br * 0.35, by - br * 0.35, br * 0.25, br * 0.25, fill=(255, 255, 255, 255))
        elif form == "red":
            rnd = random.Random(1 if state == "ability1" else 2)
            for _ in range(6):
                x = 104 + rnd.uniform(-6, 14)
                y = 72 + rnd.uniform(-10, 14)
                c = rnd.choice([(150, 96, 52, 255), (110, 70, 36, 255), (190, 130, 70, 255)])
                d.rectangle((s(x), s(y), s(x + rnd.uniform(2, 4)), s(y + rnd.uniform(2, 4))), fill=c)
        elif form == "green":
            # gancho e corda enrolada na mao erguida
            hx, hy = (104, 34) if state == "ability1" else (110, 26)
            d.arc((s(hx - 6), s(hy - 6), s(hx + 6), s(hy + 6)), 180, 90, fill=(210, 214, 225, 255), width=s(2.6))
            d.line((s(hx + 6), s(hy), s(hx + 6), s(hy + 8)), fill=(210, 214, 225, 255), width=s(2.6))
            d.line((s(96), s(58), s(hx + 6), s(hy + 8)), fill=(240, 230, 200, 255), width=s(1.8))


POSES = {
    #          bob  sx    sy    look  eyes      mouth        feet [(dx, dy, tilt)]               arm
    "idle1": (0, 1.00, 1.00, 1, "open", "smile", [(-15, 0, 0), (15, 0, 0)], None),
    "idle2": (1, 1.03, 0.97, 1, "blink", "smile", [(-15, 0, 0), (15, 0, 0)], None),
    "run1": (-3, 0.97, 1.03, 1, "open", "smile", [(-18, -9, 25), (14, 0, -5)], None),
    "run2": (0, 1.02, 0.98, 1, "open", "smile", [(-10, 0, 0), (19, -5, -18)], None),
    "run3": (-3, 0.97, 1.03, 1, "open", "smile", [(-14, 0, 5), (18, -9, -25)], None),
    "run4": (0, 1.02, 0.98, 1, "open", "smile", [(-19, -5, 18), (10, 0, 0)], None),
    "jump": (-6, 0.93, 1.07, 1, "wide", "o", [(-9, -2, 20), (9, -2, -20)], "up"),
    "fall": (-2, 1.06, 0.95, 1, "wide", "small_o", [(-20, -8, 30), (20, -8, -30)], "up"),
    "attack1": (0, 1.03, 0.97, 1, "squint", "grin", [(-17, 0, 0), (15, 0, 0)], "front"),
    "attack2": (1, 1.05, 0.95, 1, "squint", "grin", [(-18, 0, 0), (15, 0, 0)], "front"),
    "ability1": (0, 1.02, 0.98, 1, "open", "chomp_open", [(-16, 0, 0), (15, 0, 0)], "front"),
    "ability2": (1, 1.04, 0.96, 1, "squint", "chomp_closed", [(-16, 0, 0), (15, 0, 0)], "front"),
}


def draw_tiny(form, state, index):
    img = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    colors = PALETTE[form]
    enemy = form == "enemy"
    bob, sx, sy, look, eyes, mouth, feet, arm = POSES[state]
    if enemy:
        mouth = {"smile": "frown", "o": "o", "small_o": "small_o"}.get(mouth, mouth)
    if form == "green" and state in ("ability1", "ability2"):
        arm = "raise"

    cx = 64
    rx = BODY_R * sx
    ry = BODY_R * sy
    cy = GROUND - 12 - ry + bob

    # braco de tras e pes ficam atras do corpo
    if arm == "up":
        draw_arm(img, cx - rx - 3, cy - 2, colors, 40)
    for dx, dy, tilt in feet:
        draw_shoe(img, cx + dx, GROUND - 8 + dy, tilt)

    seed = 11 + index * 3 + (0 if not enemy else 50)
    mask = fur_mask(cx, cy, rx, ry, seed, spiky=0.8 if enemy else 0.0)
    fill = radial_fill(W, s(cx - rx * 0.35), s(cy - ry * 0.45), s(rx * 2.3), colors["light"], colors["main"], colors["dark"])
    paste_shape(img, mask, fill, s(1.8))
    draw_fur_strokes(img, cx, cy, rx, ry, colors, seed)

    # bochechas
    d = ImageDraw.Draw(img)
    blush = (255, 96, 128, 115) if not enemy else (255, 70, 120, 80)
    ellipse(d, cx - 20, cy + 12, 5.5, 3, fill=blush)
    ellipse(d, cx + 22, cy + 12, 5.5, 3, fill=blush)

    draw_crest(img, "enemy" if enemy else form, cx + 2, cy - ry - 3, index / 12)
    draw_eyes(img, cx + 3, cy - 6, look, eyes, angry=enemy, colors=colors)
    draw_mouth(img, cx + 5, cy + 13, mouth, angry=enemy)

    if arm == "front":
        draw_arm(img, cx + rx - 1, cy + 8, colors, -15)
    elif arm == "up":
        draw_arm(img, cx + rx + 3, cy - 2, colors, -40)
    elif arm == "raise":
        draw_arm(img, cx + rx - 4, cy - 12, colors, -60)

    draw_effects(img, form, state)
    return img.resize((FRAME, FRAME), Image.LANCZOS)


def main():
    rows = FORMS + ["enemy"]
    atlas = Image.new("RGBA", (FRAME * len(STATES), FRAME * len(rows)), (0, 0, 0, 0))
    for row, form in enumerate(rows):
        for col, state in enumerate(STATES):
            atlas.alpha_composite(draw_tiny(form, state, col), (col * FRAME, row * FRAME))
    atlas.save("assets/tiny_spritesheet.png", optimize=True)
    print("Gerado: assets/tiny_spritesheet.png", atlas.size, "frame", FRAME)

    elements = elements_art.build_atlas()
    elements.save("assets/elements.png", optimize=True)
    print("Gerado: assets/elements.png", elements.size, "celula", elements_art.CELL)


if __name__ == "__main__":
    main()
