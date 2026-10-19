# Paper doll asset scripts

Prepare the 128px paper doll in `public/characters/paper-doll-128/` for the app. They run once
per asset change, not at build time.

```sh
pnpm --filter cheliki doll <command>
```

Commands that need Aseprite find a Steam or standalone install on Windows, or `aseprite` on PATH;
`ASEPRITE=<path to the executable>` overrides it.

## What the app reads

- `Idle/animations/<animation>/<direction>/frame_NNN.png`: body frames without eyes, brows and
  mouth (the nose stays).
- `src/doll/face-anchors.json`: per body frame, where the eyes and the mouth go.
- `src/doll/face/<eyes|brows|mouths>/<name>.png`: the face parts, exported from `base.aseprite`.
  How they are cut into stamps and drawn is in `src/doll/stamps.ts`.

## base.aseprite

- Body animations: one tag per animation direction on the "animations" layer, with the "anchors"
  layer (a magenta pixel per eye, a cyan one on the mouth) and a locked "face preview".
- Face parts: the "facial-features" tag holds the tags `eyes`, `brows` and `mouths`, two frames
  each: front over the south rotation, profile over the east one (the "animations" cels there are
  a reference, `frames` doesn't read them). Every part is a layer in the "facial-features" layer
  group, under its kind's group: `facial-features/eyes/open` is drawn on the `eyes` frames. Both
  front eyes are drawn; west profiles mirror east. A new part is a new layer in its kind's group.
  Eyes don't blink yet.

## Commands

| Command | Does |
| --- | --- |
| `face` | Face parts of `base.aseprite` → `src/doll/face/`. Also runs inside Aseprite: `aseprite/export_face.lua`. |
| `frames` | Body frames retouched in `base.aseprite` → `Idle/`. |
| `anchors` | Anchor marks moved in `base.aseprite` → `face-anchors.json`, then `layers`. |
| `layers` | Rebuilds the "face preview" and "anchors" layers of `base.aseprite`. |
| `breathing` | `breathing-idle` from the south rotation. |
| `pixellab-gifs <dir>` | Body animations as GIFs for saving back to PixelLab. |

`aseprite/face_preview.lua` runs inside Aseprite on `base.aseprite` (File > Scripts): it redraws
"face preview" from the "anchors" layer and the part layers as you edit them, with any face. It
writes nothing to `face-anchors.json` or `src/doll/face/`; `anchors` and `face` do.

Commands that write a `.aseprite` file (`anchors`, `layers`) overwrite it: save and close it in
Aseprite first.
