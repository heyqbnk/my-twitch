"""Draws breathing-idle from the south rotation; no PixelLab generation:

    python breathing.py

Frame 0 is the rotation, frame 1 lifts everything above the belly by 1px (repeating the row under
the cut, so the torso stretches), frame 2 also lifts everything above the chest by 1px, frame 3
repeats frame 1. Meant to be played at 400 / 250 / 400 / 250 ms. The head moves with the lifts,
so the face anchors of these frames are the south ones lifted by 0, 1, 2, 1 px.
"""
from PIL import Image

from doll import IDLE, load

BELLY, CHEST = 66, 54  # first row that stays put in each lift


def lift(img, cut):
    """Rows above `cut` move up by 1px; row cut - 1 is repeated to fill the gap."""
    out = img.copy()
    out.paste(Image.new('RGBA', (img.width, cut)), (0, 0))
    out.paste(img.crop((0, 0, img.width, cut)), (0, -1))
    out.paste(img.crop((0, cut - 1, img.width, cut)), (0, cut - 1))
    return out


if __name__ == '__main__':
    south = load(IDLE / 'rotations/south.png')
    f1 = lift(south, BELLY)
    f2 = lift(f1, CHEST - 1)
    out = IDLE / 'animations/breathing-idle/south'
    out.mkdir(parents=True, exist_ok=True)
    for i, frame in enumerate((south, f1, f2, f1)):
        frame.save(out / f'frame_{i:03d}.png')
