"""Packs the body animations into GIFs laid out like their PixelLab canvases, for save_to_asset:

    python pixellab_gifs.py <out dir>

PixelLab character "Paper doll (male, 4-dir, 128px)" 0849f3ec-0676-4b70-9035-f839e5ab11f3 keeps
walk-loop as 9 frames (the 9th repeats frame 0) and its west direction on a 160x164 canvas with our
frames at (0, 2). The GIFs get an exact palette, since Pillow's quantize merges close dark colors,
and every frame is decoded back and compared before it is kept.

Upload each GIF (get_upload_url + curl) and save it with
save_to_asset(image="upload:<id>", target="character:<id>:<direction>:<group id>"); rotations go
as plain PNGs to "character:<id>:<direction>".
"""
import sys
from pathlib import Path

from PIL import Image

from doll import IDLE, load

# name, animation, frames, PixelLab canvas, where our frame sits on it
JOBS = [
    ('stop-turn-south-west', 'stop-turn-south/west', list(range(8)), (128, 160), (0, 0)),
    ('stop-turn-south-east', 'stop-turn-south/east', list(range(8)), (128, 160), (0, 0)),
    ('south-turn-walk-west', 'south-turn-walk/west', list(range(8)), (160, 160), (0, 0)),
    ('south-turn-walk-east', 'south-turn-walk/east', list(range(8)), (160, 160), (0, 0)),
    ('walk-loop-west', 'walk-loop/west', list(range(8)) + [0], (160, 164), (0, 2)),
    ('walk-loop-east', 'walk-loop/east', list(range(8)) + [0], (160, 160), (0, 0)),
]


def rgba(img):
    data = img.tobytes()
    return [tuple(data[i:i + 4]) for i in range(0, len(data), 4)]


def pack(frames, path):
    frames_px = [rgba(f) for f in frames]
    colors = sorted({p[:3] for px in frames_px for p in px if p[3]})
    assert all(p[3] in (0, 255) for px in frames_px for p in px), 'partial alpha'
    assert len(colors) <= 255, f'{len(colors)} colors'
    index = {c: i + 1 for i, c in enumerate(colors)}
    palette = [0, 0, 0] + [v for c in colors for v in c]
    out = []
    for f, px in zip(frames, frames_px):
        p = Image.new('P', f.size, 0)
        p.putpalette(palette + [0] * (768 - len(palette)))
        p.putdata([index[q[:3]] if q[3] else 0 for q in px])
        out.append(p)
    out[0].save(path, save_all=True, append_images=out[1:], duration=100, loop=0, transparency=0, disposal=2, optimize=False)
    gif = Image.open(path)
    for k, px in enumerate(frames_px):
        gif.seek(k)
        back = rgba(gif.convert('RGBA'))
        assert all(a[3] == b[3] and (not a[3] or a[:3] == b[:3]) for a, b in zip(back, px)), f'frame {k} differs'
    return len(colors)


if __name__ == '__main__':
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    for name, anim, idx, size, offset in JOBS:
        frames = []
        for i in idx:
            canvas = Image.new('RGBA', size)
            canvas.paste(load(IDLE / f'animations/{anim}/frame_{i:03d}.png'), offset)
            frames.append(canvas)
        print(name, size, len(frames), 'frames', pack(frames, out / f'{name}.gif'), 'colors')
