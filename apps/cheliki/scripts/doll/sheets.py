"""Review sheets of the face stamps, written to head/:

    python sheets.py [concepts|blink|mouths|profile|profile-frames|anchors ...]   (default: all)

concepts        face-concepts.png    every eye (thin brows) and every brow (open eyes), front
blink           blink-concepts.png   open / half / closed of every eye, plus an animated .gif
mouths          mouth-concepts.png   every mouth, front
profile         profile-concepts.png every eye state, brow and mouth on the east rotation
profile-frames  profile-frames.png   profile faces on animation frames, a few combos
anchors         anchors-preview.png  every body frame: a front face, or anchor marks on profiles
"""
import json
import sys

from PIL import Image, ImageDraw, ImageFont

import stamps
from doll import ANCHORS_JSON, HEAD, IDLE, body_frames, facing, load

BG = (200, 200, 200, 255)
INK = (30, 30, 30, 255)
ANCHORS = json.loads(ANCHORS_JSON.read_text())


def font(size):
    return ImageFont.load_default(size=size)


def head_box(img):
    """Top row and left/right columns of the head (the 28 rows under the silhouette top)."""
    a = img.getchannel('A')
    top = next(y for y in range(img.height) if any(a.getpixel((x, y)) for x in range(img.width)))
    xs = [x for y in range(top, top + 28) for x in range(img.width) if a.getpixel((x, y))]
    return top, min(xs), max(xs)


def face(rel, **parts):
    img = load(IDLE / rel)
    stamps.draw_face(img, ANCHORS[rel], facing(rel), **parts)
    return img


def front_sheet(cells, out, scale=6, cols=None, label_h=26):
    """cells: [(image, label)] of the south rotation, cropped to the head."""
    crop, size = (47, 6, 81, 40), 34 * scale
    cols = cols or len(cells)
    rows = -(-len(cells) // cols)
    sheet = Image.new('RGBA', (12 + cols * (size + 12), 12 + rows * (size + label_h + 12)), BG)
    d = ImageDraw.Draw(sheet)
    for i, (img, label) in enumerate(cells):
        x, y = 12 + (i % cols) * (size + 12), 12 + (i // cols) * (size + label_h + 12)
        sheet.alpha_composite(img.crop(crop).resize((size, size), Image.NEAREST), (x, y))
        d.text((x + 4, y + size + 2), label, fill=INK, font=font(20))
    sheet.save(out)


def concepts():
    south = 'rotations/south.png'
    cells = [(face(south, eyes=e, brows='thin', mouth='neutral'), f'eyes: {e}') for e in stamps.EYES]
    cells += [(face(south, eyes='open', brows=b, mouth='neutral'), f'brows: {b}') for b in stamps.BROWS]
    front_sheet(cells, HEAD / 'face-concepts.png', cols=max(len(stamps.EYES), len(stamps.BROWS)))


def mouths():
    south = 'rotations/south.png'
    front_sheet([(face(south, eyes='open', brows='thin', mouth=m), f'mouth: {m}') for m in stamps.MOUTHS],
                HEAD / 'mouth-concepts.png')


def blink():
    south = 'rotations/south.png'
    k, w, crop = 6, 34, (47, 14, 81, 34)
    h = (crop[3] - crop[1]) * k
    names = list(stamps.EYES)
    sheet = Image.new('RGBA', (140 + 3 * (w * k + 12), 12 + len(names) * (h + 12)), BG)
    d = ImageDraw.Draw(sheet)
    for r, n in enumerate(names):
        y = 12 + r * (h + 12)
        d.text((12, y + h // 2 - 10), n, fill=INK, font=font(20))
        for c in range(3):
            img = face(south, eyes=n, brows='thin', mouth='neutral', state=c)
            sheet.alpha_composite(img.crop(crop).resize((w * k, h), Image.NEAREST), (140 + c * (w * k + 12), y))
    sheet.save(HEAD / 'blink-concepts.png')
    # all faces blinking together: open (long), half, closed, half
    fk = 4
    def strip(state):
        st = Image.new('RGBA', (len(names) * w * fk, w * fk), BG)
        for i, n in enumerate(names):
            img = face(south, eyes=n, brows='thin', mouth='neutral', state=state)
            st.alpha_composite(img.crop((47, 6, 81, 40)).resize((w * fk, w * fk), Image.NEAREST), (i * w * fk, 0))
        return st.convert('RGB')
    frames = [strip(s) for s in (0, 1, 2, 1)]
    frames[0].save(HEAD / 'blink-concepts.gif', save_all=True, append_images=frames[1:], duration=[1500, 50, 80, 50], loop=0)


def profile():
    rel, k, box = 'rotations/east.png', 7, (54, 12, 82, 40)
    cell, ch = (box[2] - box[0]) * k, (box[3] - box[1]) * k
    groups = [
        [(dict(eyes=n, state=s, brows='thin', mouth='neutral'), n + ['', ' half', ' closed'][s]) for n in stamps.EYES for s in (0, 1, 2)],
        [(dict(eyes='open', brows=b, mouth='neutral'), b) for b in stamps.BROWS],
        [(dict(eyes='open', brows='thin', mouth=m), m) for m in stamps.MOUTHS],
    ]
    cols = 12
    nrows = sum(-(-len(g) // cols) for g in groups)
    sheet = Image.new('RGBA', (10 + cols * (cell + 8), 10 + nrows * (ch + 30)), BG)
    d = ImageDraw.Draw(sheet)
    r = 0
    for group in groups:
        for i, (parts, label) in enumerate(group):
            x, y = 10 + (i % cols) * (cell + 8), 10 + (r + i // cols) * (ch + 30)
            sheet.alpha_composite(face(rel, **parts).crop(box).resize((cell, ch), Image.NEAREST), (x, y))
            d.text((x + 2, y + ch + 4), label, fill=INK, font=font(16))
        r += -(-len(group) // cols)
    sheet.save(HEAD / 'profile-concepts.png')


def profile_frames():
    combos = [('open', 'thin', 'smile'), ('anime', 'feathered', 'grin'), ('narrow', 'angular', 'laugh'), ('lashes', 'arched', 'smirk')]
    rels = ['rotations/west.png', 'animations/walk-loop/east/frame_003.png', 'animations/walk-loop/west/frame_005.png',
            'animations/south-turn-walk/west/frame_006.png', 'animations/stop-turn-south/east/frame_001.png']
    k, bw, bh = 5, 36, 30
    sheet = Image.new('RGBA', (len(rels) * (bw * k + 8) + 8, len(combos) * (bh * k + 8) + 30), BG)
    d = ImageDraw.Draw(sheet)
    for r, (e, b, m) in enumerate(combos):
        for c, rel in enumerate(rels):
            img = face(rel, eyes=e, brows=b, mouth=m)
            ex, ey = ANCHORS[rel]['eyes'][0]
            cx = ex - 6 if facing(rel) == 'east' else ex + 6  # center on the head, not the eye
            canvas = Image.new('RGBA', (img.width + 64, img.height + 64))
            canvas.paste(img, (32, 32))
            box = (cx + 32 - bw // 2, ey + 32 - 14, cx + 32 + bw // 2, ey + 32 + 16)
            sheet.alpha_composite(canvas.crop(box).resize((bw * k, bh * k), Image.NEAREST), (8 + c * (bw * k + 8), 8 + r * (bh * k + 8)))
    for c, rel in enumerate(rels):
        name = rel.replace('animations/', '').replace('frame_', '').replace('.png', '')
        d.text((8 + c * (bw * k + 8), sheet.height - 20), name, fill=INK, font=font(14))
    sheet.save(HEAD / 'profile-frames.png')


def anchors():
    rels = [r for r in body_frames() if 'breathing' not in r]
    k, bw, bh, cols = 4, 40, 34, 8
    sheet = Image.new('RGBA', (cols * (bw * k + 10) + 10, -(-len(rels) // cols) * (bh * k + 22) + 10), BG)
    d = ImageDraw.Draw(sheet)
    for i, rel in enumerate(rels):
        a = ANCHORS[rel]
        body = load(IDLE / rel)
        top, left, right = head_box(body)
        if len(a['eyes']) == 2:
            img = face(rel, eyes='open', brows='thin', mouth='smile')
        else:
            img = body.copy()
            p = img.load()
            for x, y in a['eyes']:
                for dy in range(3):
                    p[x, y + dy] = (255, 0, 255, 255)
            x, y = a['mouth']
            p[x, y] = p[x - 1, y] = (0, 160, 255, 255)
        cx = (left + right) // 2
        x, y = 10 + (i % cols) * (bw * k + 10), 10 + (i // cols) * (bh * k + 22)
        sheet.alpha_composite(img.crop((cx - bw // 2, top - 2, cx + bw // 2, top - 2 + bh)).resize((bw * k, bh * k), Image.NEAREST), (x, y))
        d.text((x, y + bh * k + 3), rel.replace('animations/', '').replace('frame_', '').replace('.png', ''), fill=INK, font=font(13))
    sheet.save(HEAD / 'anchors-preview.png')


SHEETS = {'concepts': concepts, 'blink': blink, 'mouths': mouths, 'profile': profile,
          'profile-frames': profile_frames, 'anchors': anchors}

if __name__ == '__main__':
    for name in sys.argv[1:] or SHEETS:
        SHEETS[name]()
        print('wrote', name)
