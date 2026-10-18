const CHARACTER_URL = '/characters/paper-doll-128';

export const FPS = 10;
/**
 * The sprite box, in sprite px: every frame was drawn around a 128px rotation. Animation canvases
 * are bigger (v3 grows them), so each frame knows where that box sits on its canvas; drawing
 * frames by the box keeps the feet in place across animations.
 */
export const SPRITE_SIZE = 128;

export type Direction = 'west' | 'east';
export type Facing = Direction | 'south';

export interface Frame {
  /** Path inside Idle/, the key of the frame in face-anchors.json. */
  src: string;
  facing: Facing;
  width: number;
  height: number;
  /** Where the sprite box sits on the frame canvas. */
  boxX: number;
  boxY: number;
}

export const bodyUrl = (frame: Frame) => `${CHARACTER_URL}/Idle/${frame.src}`;

/**
 * Names follow the PixelLab export: frame_000..frame_00N. PixelLab centers the box horizontally
 * and puts it 16px below the top of a taller canvas.
 */
function animation(
  name: string,
  facing: Facing,
  count: number,
  [width, height]: [number, number],
): Frame[] {
  return Array.from({ length: count }, (_, i) => ({
    src: `animations/${name}/${facing}/frame_${String(i).padStart(3, '0')}.png`,
    facing,
    width,
    height,
    boxX: (width - SPRITE_SIZE) / 2,
    boxY: height > SPRITE_SIZE ? 16 : 0,
  }));
}

const perDirection = (name: string, count: number, size: [number, number]) => ({
  west: animation(name, 'west', count, size),
  east: animation(name, 'east', count, size),
});

/** Standing still facing the viewer; the chest rises, the head moves with it. */
const BREATHING = animation('breathing-idle', 'south', 4, [128, 128]);
/** Ticks each breathing frame is held: 400 / 300 / 400 / 300 ms. */
const BREATHING_TICKS = [4, 3, 4, 3];
export const IDLE = BREATHING.flatMap((frame, i) => (
  Array.from({ length: BREATHING_TICKS[i]! }, () => frame)
));

/** Turns from facing the viewer and steps off; its last frame repeats WALK[0]. */
export const SOUTH_TURN_WALK = perDirection('south-turn-walk', 8, [160, 160]);
export const WALK = perDirection('walk-loop', 8, [160, 160]);
/** Slows down from the walk and ends facing the viewer; the last frame repeats IDLE[0]. */
export const STOP_TURN_SOUTH = perDirection('stop-turn-south', 8, [128, 160]);

/** Every frame the doll is drawn with. */
export const FRAMES: Frame[] = [
  ...BREATHING,
  ...(['west', 'east'] as const).flatMap(d => [
    ...SOUTH_TURN_WALK[d],
    ...WALK[d],
    ...STOP_TURN_SOUTH[d],
  ]),
];
