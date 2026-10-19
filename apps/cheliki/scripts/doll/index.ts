/**
 * Asset scripts of the 128px paper doll (see README.md); `ASEPRITE` points at the Aseprite
 * executable for the commands that need it.
 */
import { aseprite, BASE_ASEPRITE } from './lib.ts';
import { breathing } from './breathing.ts';
import { pixellabGifs } from './pixellab-gifs.ts';
import { anchors, frames, layers } from './sync.ts';

const USAGE = `pnpm doll <command>

  face               face parts of base.aseprite -> src/doll/face/<kind>/<name>.png
  frames             body frames retouched in base.aseprite -> Idle/
  anchors            "anchors" layer of base.aseprite -> face-anchors.json, then \`layers\`
  layers             rebuild the "face preview" and "anchors" layers of base.aseprite
  breathing          breathing-idle from the south rotation
  pixellab-gifs <dir>  body animations as GIFs for saving back to PixelLab`;

const [command, arg] = process.argv.slice(2);
switch (command) {
  case 'face':
    process.stdout.write(aseprite([BASE_ASEPRITE], 'export_face.lua'));
    break;
  case 'frames':
    frames();
    break;
  case 'anchors':
    anchors();
    break;
  case 'layers':
    layers();
    break;
  case 'breathing':
    breathing();
    break;
  case 'pixellab-gifs':
    if (!arg) {
      console.error(USAGE);
      process.exit(1);
    }
    pixellabGifs(arg);
    break;
  default:
    console.error(USAGE);
    process.exit(1);
}
