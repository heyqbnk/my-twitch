"""Moves the doll between base.aseprite and the files the app uses (needs Aseprite, see ASEPRITE):

    python aseprite_sync.py frames             body frames: base.aseprite layer "animations" -> Idle/
    python aseprite_sync.py layers             rebuild the "face preview" and "anchors" layers
    python aseprite_sync.py anchors            "anchors" layer -> face-anchors.json, then `layers`
                                               and head/anchors-preview.png
    python aseprite_sync.py profile-eye new <eye>
    python aseprite_sync.py profile-eye read <eye>

base.aseprite holds one 128x128 canvas; each tag is an animation direction whose frames sit on
their own canvas at the offset in doll.TAGS. There are no rotations in it: south is breathing-idle
frame 0, east and west exist only as Idle/rotations/*.png.

The "anchors" layer has one pixel per anchor: magenta #ff00ff on an eye, cyan #00ffff on the
mouth. Move them and run `anchors`; "face preview" (locked) shows the face they give.

`profile-eye new` writes head/stamps/<eye>-profile.aseprite: the east rotation with the eye's open,
half and closed profile stamps on an "eye" layer. Draw on it and run `profile-eye read`: the
pixels go to head/stamps/profile-eyes.json and replace the profile stamps derived from the front.
"""
import json
import sys
import tempfile
from pathlib import Path

from PIL import Image

import stamps
from doll import (ANCHORS_JSON, BASE_ASEPRITE, HEAD, IDLE, PROFILE_EYES_JSON, aseprite, export_cels, facing,
                  load, tag_frames, write_json_lines)

EYE_MARK, MOUTH_MARK = (255, 0, 255), (0, 255, 255)


def on_canvas(cel, size, offset):
    img, (x, y) = cel
    canvas = Image.new('RGBA', size)
    canvas.paste(img, (x + offset[0], y + offset[1]), img)
    return canvas


def frames():
    cels = export_cels(BASE_ASEPRITE, 'animations')
    changed = 0
    for rel, f, offset in tag_frames():
        old = load(IDLE / rel)
        img = on_canvas(cels[f], old.size, offset)
        if img.tobytes() != old.tobytes():
            changed += 1
            print('changed', rel)
            img.save(IDLE / rel)
    south = load(IDLE / 'animations/breathing-idle/south/frame_000.png')
    if south.tobytes() != load(IDLE / 'rotations/south.png').tobytes():
        print('changed rotations/south.png')
        south.save(IDLE / 'rotations/south.png')
    print(changed, 'animation frames changed')


def layers():
    anchors = json.loads(ANCHORS_JSON.read_text())
    tmp = Path(tempfile.mkdtemp())
    lines = []
    for rel, f, (ox, oy) in tag_frames():
        a = anchors[rel]
        body = load(IDLE / rel)
        img = body.copy()
        stamps.draw_face(img, a, facing(rel), eyes='open', brows='thin', mouth='smile')
        # the face layer holds only what the stamps changed
        face = Image.new('RGBA', body.size)
        fp, ip, bp = face.load(), img.load(), body.load()
        for y in range(body.height):
            for x in range(body.width):
                if ip[x, y] != bp[x, y]:
                    fp[x, y] = ip[x, y]
        marks = Image.new('RGBA', body.size)
        mp = marks.load()
        for x, y in a['eyes']:
            mp[x, y] = EYE_MARK + (255,)
        mp[a['mouth'][0], a['mouth'][1]] = MOUTH_MARK + (255,)
        face.save(tmp / f'face-{f}.png')
        marks.save(tmp / f'marks-{f}.png')
        lines.append(f'{f} {-ox} {-oy}')
    (tmp / 'list.txt').write_text('\n'.join(lines) + '\n')
    aseprite(BASE_ASEPRITE, script='add_layers.lua', dir=tmp.as_posix())


def read_anchors():
    """The anchors layer as {frame: anchors}; exits listing the frames whose marks are off."""
    cels = export_cels(BASE_ASEPRITE, 'anchors')
    found, problems = {}, []
    for rel, f, (ox, oy) in tag_frames():
        if f not in cels:
            problems.append(f'{rel}: no marks')
            continue
        img, (cx, cy) = cels[f]
        px = img.load()
        eyes, mouth, other = [], [], 0
        for y in range(img.height):
            for x in range(img.width):
                c = px[x, y]
                if not c[3]:
                    continue
                at = [x + cx + ox, y + cy + oy]
                if c[:3] == EYE_MARK:
                    eyes.append(at)
                elif c[:3] == MOUTH_MARK:
                    mouth.append(at)
                else:
                    other += 1
        if len(eyes) not in (1, 2) or len(mouth) != 1 or other:
            problems.append(f'{rel}: {len(eyes)} eye marks, {len(mouth)} mouth marks, {other} other pixels')
        found[rel] = {'eyes': sorted(eyes), 'mouth': mouth[0] if mouth else None}
    if problems:
        sys.exit('\n'.join(problems))
    return found


def anchors():
    data = json.loads(ANCHORS_JSON.read_text())
    for rel, new in read_anchors().items():
        if new != data[rel]:
            print(f'{rel}: {data[rel]} -> {new}')
            data[rel] = new
    data['rotations/south.png'] = data['animations/breathing-idle/south/frame_000.png']
    write_json_lines(ANCHORS_JSON, data)
    layers()
    if read_anchors() != {rel: data[rel] for rel, _, _ in tag_frames()}:
        sys.exit('the rebuilt anchors layer reads back differently')
    import sheets
    sheets.ANCHORS = data
    sheets.anchors()


def profile_eye_file(eye):
    return HEAD / f'stamps/{eye}-profile.aseprite'


def profile_eye_new(eye):
    rel = 'rotations/east.png'
    a = json.loads(ANCHORS_JSON.read_text())[rel]
    body = load(IDLE / rel)
    context = body.copy()
    stamps.draw_face(context, a, 'east', brows='thin', mouth='neutral')
    tmp = Path(tempfile.mkdtemp())
    context.save(tmp / 'context.png')
    for state in range(3):
        eye_layer = Image.new('RGBA', body.size)
        stamps.draw(eye_layer, context, stamps.profile_eye(eye, state), a['eyes'][0])
        eye_layer.save(tmp / f'eye-{state}.png')
    profile_eye_file(eye).parent.mkdir(parents=True, exist_ok=True)
    aseprite(script='new_profile_eye.lua', dir=tmp.as_posix(), out=profile_eye_file(eye).as_posix())
    print('wrote', profile_eye_file(eye))


def profile_eye_read(eye):
    ax, ay = json.loads(ANCHORS_JSON.read_text())['rotations/east.png']['eyes'][0]
    cels = export_cels(profile_eye_file(eye), 'eye')
    states = []
    for f in (1, 2, 3):
        if f not in cels:
            states.append([])
            continue
        img, (cx, cy) = cels[f]
        px = img.load()
        states.append([[x + cx - ax, y + cy - ay, list(px[x, y])]
                       for y in range(img.height) for x in range(img.width) if px[x, y][3]])
    data = json.loads(PROFILE_EYES_JSON.read_text()) if PROFILE_EYES_JSON.exists() else {}
    data[eye] = states
    with open(PROFILE_EYES_JSON, 'w', newline='\n') as fh:
        json.dump(data, fh, indent=1)
    print(eye, [len(s) for s in states], 'px per state; run export_stamps.py and sheets.py profile')


if __name__ == '__main__':
    match sys.argv[1:]:
        case ['frames']: frames()
        case ['layers']: layers()
        case ['anchors']: anchors()
        case ['profile-eye', 'new', eye]: profile_eye_new(eye)
        case ['profile-eye', 'read', eye]: profile_eye_read(eye)
        case _: sys.exit(__doc__)
