"""Face stamps of the paper doll: eyes (with blink states), brows and mouths, front and profile.

Stamps are drawn as rows of palette characters ('.' is empty) for the front face, the way they
sit on the south rotation. Everything else is derived from them:

- Each pixel is placed relative to an anchor from face-anchors.json. Eyes and brows hang off the
  eye anchor (top-left pixel of the original eye's dark core, (57, 26) and (68, 26) on south),
  mouths off the mouth anchor (the middle of the original mouth line, (63, 34) on south).
- A stamp row set describes the viewer's-left feature; the right one is its mirror about the face
  axis x=63 unless a `right` set is given (e.g. to keep a glint on the same side).
- The east profile looks right, like the viewer's-left eye of a front face, so a profile eye or
  brow is the front left stamp with the column next to the nose cut off. A profile mouth is the
  front one from its left corner to the middle, the middle against the face contour. West is
  east mirrored: x -> anchor + 1 - dx. Hand-edited profile eyes (head/stamps/<eye>-profile.aseprite)
  replace the derived ones.
- Face pixels land only on the body's skin: never on the outline or outside the body.
"""
import json

from doll import OUTLINE, PROFILE_EYES_JSON, lum

COLORS = {
    'i': (73, 32, 23, 255),     # darkest outline, from the sprite
    'g': (126, 61, 33, 255),    # iris brown, from the sprite
    'h': (202, 134, 92, 255),   # lid shadow, from the sprite
    'w': (255, 250, 240, 255),  # sclera, glint, teeth
    'n': (38, 40, 58, 255),     # navy lash / pupil
    'u': (74, 120, 180, 255),   # blue iris
    'B': (88, 52, 36, 255),     # brow
    'm': (110, 52, 38, 255),    # mouth line
    'r': (150, 45, 45, 255),    # mouth inside
    't': (214, 96, 96, 255),    # tongue
}

# Front stamps as they sit on the south rotation: x, y of the left feature's top-left corner.
EYES = {
    'bead':   dict(x=56, y=25, left=['.ii.', 'iwii', 'iiii', '.ii.'], right=['.ii.', 'iwii', 'iiii', '.ii.']),
    'open':   dict(x=56, y=26, left=['iiii', 'wgiw', 'wiiw']),
    'sleepy': dict(x=56, y=26, left=['hhhh', 'iiii', 'wgiw']),
    'lashes': dict(x=56, y=25, left=['i...', 'iiii', 'wgiw', 'wiiw']),
    'anime':  dict(x=55, y=25, left=['nnnnn', 'wnwnw', 'wuuuw', '.hhh.']),
    'narrow': dict(x=54, y=26, left=['iiiii.', '.iiiii', '..wgw.']),
    'happy':  dict(x=56, y=26, left=['.ii.', 'i..i']),
}
# Half-closed and closed rows of each eye, same anchor; happy is already closed and doesn't blink.
BLINK = {
    'bead':   (['....', 'hhhh', 'iiii', '.ii.'], ['....', '....', 'iiii', '.hh.']),
    'open':   (['hhhh', 'iiii', 'wiiw'], ['....', 'hhhh', 'iiii']),
    'sleepy': (['hhhh', 'hhhh', 'iiii'], ['hhhh', 'hhhh', 'iiii']),
    'lashes': (['....', 'ihhh', 'iiii', 'wiiw'], ['....', '....', 'ihhh', 'iiii']),
    'anime':  (['hhhhh', 'nnnnn', 'wuuuw', '.hhh.'], ['.....', '.....', 'nnnnn', '.hhh.']),
    'narrow': (['......', 'hhhhh.', 'iiiiii'], ['......', '......', 'iiiiii']),
}
BROWS = {
    'thin':      dict(x=55, y=23, left=['BBBBB']),
    'thick':     dict(x=55, y=22, left=['.BBBB', 'BBBBB']),
    'arched':    dict(x=55, y=21, left=['.BBB.', 'B...B']),
    'stern':     dict(x=55, y=22, left=['BBB..', '..BBB']),
    'angular':   dict(x=54, y=21, left=['.BB....', 'BBBBBB.', '...BBBB']),
    'feathered': dict(x=54, y=21, left=['..BBB.B', '.BBBBBB', 'B......']),
    'tapered':   dict(x=54, y=21, left=['..BBBBB', 'BB...BB']),
    'worried':   dict(x=55, y=22, left=['..BBB', 'BBB..']),
}
# Full rows centered on the mouth anchor (odd widths), top row at y.
MOUTHS = {
    'neutral': dict(y=34, rows=['mmmmm']),
    'smile':   dict(y=33, rows=['m.....m', '.mmmmm.']),
    'grin':    dict(y=33, rows=['mmmmmmm', '.mwwwm.', '..mmm..']),
    'laugh':   dict(y=33, rows=['mmmmmmm', 'mwwwwwm', '.mrtrm.', '..mmm..']),
    'smirk':   dict(y=33, rows=['......m', '.mmmmm.']),
}
PROFILE_EYES = {'happy': ['.i.', 'i.i']}      # cutting the arc would leave a hook
PROFILE_MOUTHS = {'smirk': ['m...', '.mmm']}  # the raised corner is the one shown

STATES = ('open', 'half', 'closed')
# South rotation geometry the stamps are drawn on
AXIS, LEFT_EYE, RIGHT_EYE, EYE_Y, MOUTH_Y = 63, 57, 68, 26, 34


def pixels(rows, dx0, dy0):
    return [(dx0 + dx, dy0 + dy, COLORS[ch]) for dy, row in enumerate(rows) for dx, ch in enumerate(row) if ch != '.']


def _cut(rows):
    return [r[:-1] for r in rows]


def _front_pair(spec, left):
    """Left/right pixels of a front feature, relative to the left/right eye anchor."""
    right = spec.get('right') if left is spec['left'] else None
    right = right or [r[::-1] for r in left]
    w = len(left[0])
    return (pixels(left, spec['x'] - LEFT_EYE, spec['y'] - EYE_Y),
            pixels(right, 2 * AXIS - (spec['x'] + w - 1) - RIGHT_EYE, spec['y'] - EYE_Y))


def eye_rows(name, state=0):
    if state and name in BLINK:
        return BLINK[name][state - 1]
    return EYES[name]['left']


def front_eye(name, state=0):
    return _front_pair(EYES[name], eye_rows(name, state))


def front_brow(name):
    return _front_pair(BROWS[name], BROWS[name]['left'])


def front_mouth(name):
    m = MOUTHS[name]
    return pixels(m['rows'], -(len(m['rows'][0]) // 2), m['y'] - MOUTH_Y)


def _edited_profile_eyes():
    try:
        return json.loads(PROFILE_EYES_JSON.read_text())
    except FileNotFoundError:
        return {}


EDITED_PROFILE_EYES = _edited_profile_eyes()


def profile_eye(name, state=0):
    """East profile eye relative to the eye anchor."""
    if name in EDITED_PROFILE_EYES:
        return [(dx, dy, tuple(c)) for dx, dy, c in EDITED_PROFILE_EYES[name][state]]
    spec = EYES[name]
    rows = PROFILE_EYES.get(name) or _cut(eye_rows(name, state))
    return pixels(rows, spec['x'] - LEFT_EYE, spec['y'] - EYE_Y)


def profile_brow(name):
    spec = BROWS[name]
    return pixels(_cut(spec['left']), spec['x'] - LEFT_EYE, spec['y'] - EYE_Y)


def profile_mouth(name):
    """East profile mouth relative to the mouth anchor: its middle one pixel in front of it."""
    m = MOUTHS[name]
    rows = PROFILE_MOUTHS.get(name) or [r[:len(r) // 2 + 1] for r in m['rows']]
    return pixels(rows, 2 - len(rows[0]), m['y'] - MOUTH_Y)


def draw(img, body, px, anchor, mirror=False):
    """Draws pixels at the anchor on `img`, only where `body` has skin; mirrored = west profile."""
    out, skin = img.load(), body.load()
    ax, ay = anchor
    for dx, dy, color in px:
        x, y = (ax + 1 - dx if mirror else ax + dx), ay + dy
        if 0 <= x < body.width and 0 <= y < body.height and skin[x, y][3] and lum(skin[x, y]) >= OUTLINE:
            out[x, y] = color


def draw_face(img, anchors, facing, eyes=None, brows=None, mouth=None, state=0):
    """Stamps a face on `img` (a body frame) by its anchors; any part may be None."""
    body = img.copy()
    if len(anchors['eyes']) == 2:
        left, right = anchors['eyes']
        for feature in ([front_brow(brows)] if brows else []) + ([front_eye(eyes, state)] if eyes else []):
            draw(img, body, feature[0], left)
            draw(img, body, feature[1], right)
        if mouth:
            draw(img, body, front_mouth(mouth), anchors['mouth'])
    else:
        (eye,) = anchors['eyes']
        mirror = facing == 'west'
        if brows:
            draw(img, body, profile_brow(brows), eye, mirror)
        if eyes:
            draw(img, body, profile_eye(eyes, state), eye, mirror)
        if mouth:
            draw(img, body, profile_mouth(mouth), anchors['mouth'], mirror)
