"""Shared paths and helpers for the 128px paper doll asset scripts."""
import os
import subprocess
import tempfile
from pathlib import Path

from PIL import Image

APP = Path(__file__).resolve().parents[2]
DOLL = APP / 'public/characters/paper-doll-128'
IDLE = DOLL / 'Idle'
HEAD = DOLL / 'head'
BASE_ASEPRITE = DOLL / 'base.aseprite'
# The app imports these two, so they live in src/ (Vite doesn't import from public/)
ANCHORS_JSON = APP / 'src/doll/face-anchors.json'
STAMPS_JSON = APP / 'src/doll/face-stamps.json'
PROFILE_EYES_JSON = HEAD / 'stamps/profile-eyes.json'
LUA = Path(__file__).resolve().parent / 'aseprite'

# Darker pixels are the outline: face layers never draw on them.
OUTLINE = 60

# Animations of base.aseprite: tag, first frame, frame count and where the aseprite canvas
# (128x128, the rotation) sits on the animation's own frame canvas.
TAGS = [
    ('south-turn-walk/east', 1, 8, (16, 15)), ('walk-loop/east', 9, 8, (16, 15)),
    ('stop-turn-south/east', 17, 8, (0, 16)), ('south-turn-walk/west', 25, 8, (16, 16)),
    ('walk-loop/west', 33, 8, (16, 16)), ('stop-turn-south/west', 41, 8, (0, 16)),
    ('breathing-idle/south', 49, 4, (0, 0)),
]


def lum(c):
    return (c[0] + c[1] + c[2]) / 3


def load(path):
    return Image.open(path).convert('RGBA')


def frame_path(tag, k):
    """A frame's path relative to Idle/, as used in face-anchors.json."""
    return f'animations/{tag}/frame_{k:03d}.png'


def tag_frames():
    """(path relative to Idle/, aseprite frame number, canvas offset) for every tagged frame."""
    for tag, first, count, offset in TAGS:
        for k in range(count):
            yield frame_path(tag, k), first + k, offset


def body_frames():
    """Every body frame relative to Idle/: the face rotations, then the animations."""
    rels = [f'rotations/{d}.png' for d in ('south', 'east', 'west')]
    return rels + [rel for rel, _, _ in tag_frames()]


def facing(rel):
    return 'east' if '/east' in rel or rel.endswith('east.png') else 'west' if '/west' in rel or rel.endswith('west.png') else 'south'


def write_json_lines(path, data):
    """One entry per line, sorted: small diffs when a few frames change."""
    import json
    with open(path, 'w', newline='\n') as fh:
        fh.write('{\n' + ',\n'.join(f'  {json.dumps(k)}: {json.dumps(v)}' for k, v in sorted(data.items())) + '\n}\n')


def aseprite(*args, script=None, **params):
    """Runs Aseprite in batch mode; `ASEPRITE` overrides the executable."""
    exe = os.environ.get('ASEPRITE', 'aseprite')
    cmd = [exe, '-b', *map(str, args)]
    for key, value in params.items():
        cmd += ['--script-param', f'{key}={value}']
    if script:
        cmd += ['--script', str(LUA / script)]
    out = subprocess.run(cmd, capture_output=True, text=True, check=True)
    # Some Aseprite extensions print errors in batch mode; they don't affect the result
    return out.stdout


def export_cels(sprite, layer=None):
    """Exports the cels of `layer` (all layers if None) into a temp dir: {frame: (image, (x, y))}."""
    tmp = Path(tempfile.mkdtemp())
    params = {'out': tmp.as_posix()}
    if layer:
        params['layer'] = layer
    aseprite(sprite, script='export_cels.lua', **params)
    cels = {}
    for line in (tmp / 'cels.txt').read_text().split('\n'):
        if line.strip():
            f, x, y = map(int, line.split())
            cels[f] = (load(tmp / f'{f}.png'), (x, y))
    return cels
