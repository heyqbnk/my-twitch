"""Finds the face anchors of every body frame on the frames that still have their PixelLab faces:

    python face_anchors.py <Idle dir with faces> [--force]

Writes face-anchors.json: {frame: {eyes: [[x, y], ...], mouth: [x, y]}}, frames relative to Idle/.
Two eyes mean a front or three-quarter face, one a profile. An eye anchor is the top-left pixel of
the eye's dark core, the mouth anchor the middle of its line.

The current anchors were found this way and then fixed by hand in base.aseprite (see
aseprite_sync.py anchors), so the file is only overwritten with --force.
"""
import sys
from collections import Counter, defaultdict
from pathlib import Path

from clean_faces import feature_pixels, head_columns
from doll import ANCHORS_JSON, body_frames, load, lum, write_json_lines

# In the source sprite the eyes start EYE_DY rows below the head top and the mouth MOUTH_DY rows.
# Rows come from the features themselves when they are clear: an open eye is 3 rows tall, and the
# mouth line is MOUTH_DY - EYE_DY rows below the eye top.
EYE_DY, MOUTH_DY = 16, 24

# Three-quarter frames where detection is wrong, read off the original frames by eye:
# stop-turn-south/west/003 took the ear for an eye and missed the far one (x=48);
# south-turn-walk/west/002 has a blurred face, its eyes are centered on the mouth.
EYE_OVERRIDES = {
    'animations/stop-turn-south/west/frame_003.png': [[48, 42], [59, 42]],
    'animations/south-turn-walk/west/frame_002.png': [[65, 40], [75, 40]],
}


def clusters(xs, gap=2):
    groups = []
    for x in sorted(set(xs)):
        if groups and x - groups[-1][-1] <= gap:
            groups[-1].append(x)
        else:
            groups.append([x])
    return groups


def find(img, rel):
    erase, top = feature_pixels(img, rel)
    px = img.load()
    dark = [(x, y) for x, y in erase if lum(px[x, y]) < 120]
    eye_rows = sorted({y for _, y in dark if 14 <= y - top <= 20})
    eye_y = next((y for y in eye_rows if y + 1 in eye_rows and y + 2 in eye_rows), None)
    mouth_rows = sorted({y for _, y in dark if 21 <= y - top <= 27})
    mouth_y = mouth_rows[0] if mouth_rows else None
    eye_y = eye_y or (mouth_y and mouth_y - (MOUTH_DY - EYE_DY)) or top + EYE_DY
    mouth_y = mouth_y or eye_y + MOUTH_DY - EYE_DY
    eyes = [g[0] for g in clusters([x for x, y in dark if eye_y - 1 <= y <= eye_y + 3])]
    mouth_px = [x for x, y in erase if mouth_y - 1 <= y <= mouth_y + 1 and lum(px[x, y]) < 160]
    return {
        'eyes': EYE_OVERRIDES.get(rel) or [[x, eye_y] for x in eyes],
        'mouth': [round(sum(mouth_px) / len(mouth_px)), mouth_y],
        'head': list(head_columns(img, top)),
    }


def main(src, force):
    if ANCHORS_JSON.exists() and not force:
        sys.exit(f'{ANCHORS_JSON} has hand-fixed anchors; pass --force to overwrite it')
    rels = [r for r in body_frames() if 'breathing' not in r]
    data = {rel: find(load(src / rel), rel) for rel in rels}
    # AI frames jitter features by a pixel while the head stays put: inside one animation, frames
    # whose head spans the same columns get the most common offsets from the head
    groups = defaultdict(list)
    for rel, a in data.items():
        groups[(rel.rsplit('/', 1)[0], tuple(a['head']), len(a['eyes']))].append(a)
    for (_, (left, _), _), frames in groups.items():
        if len(frames) < 2:
            continue
        for i in range(len(frames[0]['eyes'])):
            dx = Counter(a['eyes'][i][0] - left for a in frames).most_common(1)[0][0]
            for a in frames:
                a['eyes'][i][0] = left + dx
        dx = Counter(a['mouth'][0] - left for a in frames).most_common(1)[0][0]
        for a in frames:
            a['mouth'][0] = left + dx
    out = {rel: {'eyes': a['eyes'], 'mouth': a['mouth']} for rel, a in data.items()}
    # breathing-idle is the south rotation with the head lifted 0, 1, 2, 1 px (breathing.py)
    south = out['rotations/south.png']
    for i, lift in enumerate((0, 1, 2, 1)):
        out[f'animations/breathing-idle/south/frame_{i:03d}.png'] = {
            'eyes': [[x, y - lift] for x, y in south['eyes']], 'mouth': [south['mouth'][0], south['mouth'][1] - lift]}
    write_json_lines(ANCHORS_JSON, out)


if __name__ == '__main__':
    main(Path(sys.argv[1]), '--force' in sys.argv)
