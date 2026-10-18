"""Erases the eyes, brows and mouth baked into PixelLab body frames; the nose stays:

    python clean_faces.py <Idle dir with faces> <out Idle dir>

Writes the cleaned frames with the same layout plus review.png (before / after of every head).
This made the current body frames from the PixelLab originals (commit 09663a2), which were then
retouched by hand in base.aseprite; it is kept to redo the cleanup for new bodies or animations.

PixelLab redraws the face in every frame, so nothing is copied from the rotations: features are
found per frame as dark islands enclosed by the light skin of the face.
"""
import sys
from collections import Counter, deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from doll import OUTLINE, body_frames, facing, load, lum

NOSE_ROWS = range(19, 22)   # rows below the head top where a front nose sits
MOUTH_ROWS = range(22, 25)  # rows below the head top where a profile mouth sits
HEAD_ROWS = 31              # head rows below the silhouette top, above the shoulders

# Three-quarter frames whose far eye is pressed against the contour, so it is never enclosed.
# Rects are inclusive frame coordinates; everything in them but the black outline is erased.
RECTS = {
    'animations/stop-turn-south/west/frame_002.png': [(46, 43, 48, 47)],
    'animations/stop-turn-south/east/frame_002.png': [(76, 41, 79, 45)],
    'animations/south-turn-walk/west/frame_002.png': [(65, 41, 67, 44)],
}


def is_light(c):
    return c[3] and 165 <= lum(c) <= 235 and c[0] > c[1] > c[2]


def head_top(img):
    a = img.getchannel('A')
    return next(y for y in range(img.height) if any(a.getpixel((x, y)) for x in range(img.width)))


def head_columns(img, top):
    a = img.getchannel('A')
    xs = [x for y in range(top, top + 28) for x in range(img.width) if a.getpixel((x, y))]
    return min(xs), max(xs)


def is_front(rel):
    """Whether the face looks at the viewer (or three-quarters), judged by eye from the frame sheet."""
    if rel.startswith('rotations/'):
        return 'south' in rel
    anim, _, frame = rel.split('/')[-3:]
    i = int(frame[6:9])
    return {'south-turn-walk': i <= 2, 'stop-turn-south': i >= 2}.get(anim, False)


def enclosed(img):
    """Non-light pixels of the head enclosed by light skin, as 8-connected components."""
    w, h = img.size
    px = img.load()
    top = head_top(img)
    bottom = top + HEAD_ROWS
    light = [[is_light(px[x, y]) and top <= y < bottom for x in range(w)] for y in range(h)]
    # flood the outside through non-light pixels (4-connected); what stays unreached is enclosed
    seen = [[False] * w for _ in range(h)]
    q = deque((x, y) for y in range(h) for x in range(w) if x in (0, w - 1) or y in (0, h - 1) or not top <= y < bottom)
    for x, y in q:
        seen[y][x] = True
    while q:
        x, y = q.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx] and not light[ny][nx]:
                seen[ny][nx] = True
                q.append((nx, ny))
    holes = {(x, y) for y in range(top, bottom) for x in range(w) if not light[y][x] and not seen[y][x] and px[x, y][3]}
    comps = []
    while holes:
        start = holes.pop()
        comp, q = [start], deque([start])
        while q:
            x, y = q.popleft()
            for n in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1), (x + 1, y + 1), (x - 1, y - 1), (x + 1, y - 1), (x - 1, y + 1)):
                if n in holes:
                    holes.remove(n)
                    comp.append(n)
                    q.append(n)
        comps.append(comp)
    return comps, top


def touches_outline(img, x, y):
    """Next to the outline or transparency: contour shading, not a feature's."""
    px = img.load()
    return any(px[x + dx, y + dy][3] == 0 or lum(px[x + dx, y + dy]) < OUTLINE for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))


def feature_pixels(img, rel):
    """Pixels of the eyes, brows and mouth of a frame (the nose excluded)."""
    px = img.load()
    side, front = facing(rel), is_front(rel)
    comps, top = enclosed(img)
    if not front:
        # a profile's features sit on the front half of the head; the back half has the ear
        left, right = head_columns(img, top)
        mid = (left + right) / 2
        comps = [c for c in comps if (sum(x for x, _ in c) / len(c) > mid) == (side == 'east')]
    # the nose stays: the lowest component inside the nose rows (eyes may sink into them when closed)
    noses = [c for c in comps if all(y - top in NOSE_ROWS for _, y in c)]
    nose = max(noses, key=lambda c: sum(y for _, y in c) / len(c)) if noses else None
    erase = {p for c in comps if c is not nose for p in c}
    if not front:
        # the profile mouth touches the outline, so it is never enclosed: dark pixels by the front contour
        for dy in MOUTH_ROWS:
            y = top + dy
            xs = [x for x in range(img.width) if px[x, y][3]]
            if not xs:
                continue
            edge = max(xs) if side == 'east' else min(xs)
            for k in range(1, 5):
                x = edge - k if side == 'east' else edge + k
                if px[x, y][3] and OUTLINE <= lum(px[x, y]) < 150:
                    erase.add((x, y))
    # soft shading around a feature (lids, lip shadow) goes too, but not around the nose
    for x, y in list(erase):
        for nx in (x - 1, x, x + 1):
            for ny in (y - 1, y, y + 1):
                c = px[nx, ny]
                soft = (nx, ny) not in erase and c[3] and OUTLINE <= lum(c) < 185
                away_from_nose = ny < top + NOSE_ROWS.start - 1 or ny >= top + MOUTH_ROWS.start
                if soft and away_from_nose and not touches_outline(img, nx, ny):
                    erase.add((nx, ny))
    for x0, y0, x1, y1 in RECTS.get(rel, ()):
        erase.update((x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1) if px[x, y][3] and px[x, y][:3] != (0, 0, 0))
    return erase, top


def clean(img, rel):
    erase, top = feature_pixels(img, rel)
    px = img.load()
    skin = Counter(px[x, y] for y in range(top, top + HEAD_ROWS) for x in range(img.width) if is_light(px[x, y])).most_common(1)[0][0]
    out = img.copy()
    op = out.load()
    for x, y in erase:
        op[x, y] = skin
    return out


def main(src, dst):
    rels = [r for r in body_frames() if 'breathing' not in r]
    k, bw, bh, cols = 4, 40, 34, 6
    cw = 2 * bw * k + 4
    sheet = Image.new('RGBA', (cols * (cw + 10) + 10, -(-len(rels) // cols) * (bh * k + 22) + 10), (200, 200, 200, 255))
    d = ImageDraw.Draw(sheet)
    for i, rel in enumerate(rels):
        img = load(src / rel)
        out = clean(img, rel)
        (dst / rel).parent.mkdir(parents=True, exist_ok=True)
        out.save(dst / rel)
        top = head_top(img)
        left, right = head_columns(img, top)
        cx = (left + right) // 2
        box = (cx - bw // 2, top - 2, cx + bw // 2, top - 2 + bh)
        x, y = 10 + (i % cols) * (cw + 10), 10 + (i // cols) * (bh * k + 22)
        sheet.alpha_composite(img.crop(box).resize((bw * k, bh * k), Image.NEAREST), (x, y))
        sheet.alpha_composite(out.crop(box).resize((bw * k, bh * k), Image.NEAREST), (x + bw * k + 4, y))
        d.text((x, y + bh * k + 3), rel.replace('animations/', ''), fill=(30, 30, 30, 255), font=ImageFont.load_default(size=13))
    sheet.save(dst / 'review.png')


if __name__ == '__main__':
    main(Path(sys.argv[1]), Path(sys.argv[2]))
