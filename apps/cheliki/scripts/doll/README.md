# Paper doll asset scripts

Prepare the 128px paper doll in `public/characters/paper-doll-128/` for the app. They run once
per asset change, not at build time.

```sh
pip install -r requirements.txt   # Pillow
export ASEPRITE="D:/SteamLibrary/steamapps/common/Aseprite/Aseprite.exe"   # for aseprite_sync.py
```

## What the app reads

- `Idle/animations/<animation>/<direction>/frame_NNN.png`: body frames without eyes, brows and
  mouth (the nose stays).
- `src/doll/face-anchors.json`: per body frame, where the eyes and the mouth go.
- `src/doll/face-stamps.json`: the face stamps, from `stamps.py` (`python export_stamps.py`).

## Scripts

| Script | Does |
| --- | --- |
| `stamps.py` | Eyes, blink states, brows and mouths; how profiles derive from the front; drawing a face by anchors. |
| `export_stamps.py` | `stamps.py` → `face-stamps.json`. Run after any stamp change. |
| `sheets.py` | Review sheets in `head/`: concepts, blink, mouths, profile, anchors preview. |
| `aseprite_sync.py frames` | Body frames retouched in `base.aseprite` → `Idle/`. |
| `aseprite_sync.py anchors` | Anchor marks moved in `base.aseprite` → `face-anchors.json`, then rebuilds the helper layers and the anchors preview. |
| `aseprite_sync.py profile-eye new/read <eye>` | Draw a profile eye by hand in `head/stamps/<eye>-profile.aseprite`. |
| `breathing.py` | `breathing-idle` from the south rotation. |
| `pixellab_gifs.py <dir>` | Body animations as GIFs for saving back to PixelLab. |
| `clean_faces.py <src> <dst>` | Erases the faces PixelLab draws into body frames. |
| `face_anchors.py <src> --force` | Finds the anchors on frames that still have their faces. Overwrites the hand-fixed ones. |

The current body frames came from the PixelLab originals (commit `09663a2`) via `clean_faces.py`
and `face_anchors.py`, then were retouched in `base.aseprite`. A new body type or animation goes
the same way: generate → `clean_faces.py` → `face_anchors.py` → fix both in Aseprite.
