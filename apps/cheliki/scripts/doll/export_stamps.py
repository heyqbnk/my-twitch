"""Writes face-stamps.json, the face stamps the app draws with:

    python export_stamps.py

Every stamp is a list of [dx, dy, "#rrggbb"] from its anchor (see stamps.py):
  eyes[name][state]  {front: {left, right}, profile}   state: 0 open, 1 half, 2 closed
  brows[name]        {front: {left, right}, profile}
  mouths[name]       {front, profile}
Profiles are east; west mirrors them: x = anchor + 1 - dx.
"""
import json

import stamps
from doll import STAMPS_JSON


def hexed(px):
    return [[dx, dy, '#%02x%02x%02x' % c[:3]] for dx, dy, c in px]


def pair(front):
    return {'left': hexed(front[0]), 'right': hexed(front[1])}


data = {
    'eyes': {n: [{'front': pair(stamps.front_eye(n, s)), 'profile': hexed(stamps.profile_eye(n, s))} for s in range(3)]
             for n in stamps.EYES},
    'brows': {n: {'front': pair(stamps.front_brow(n)), 'profile': hexed(stamps.profile_brow(n))} for n in stamps.BROWS},
    'mouths': {n: {'front': hexed(stamps.front_mouth(n)), 'profile': hexed(stamps.profile_mouth(n))} for n in stamps.MOUTHS},
}
with open(STAMPS_JSON, 'w', newline='\n') as fh:
    json.dump(data, fh, separators=(',', ':'))
    fh.write('\n')
print('wrote', STAMPS_JSON, STAMPS_JSON.stat().st_size, 'bytes')
