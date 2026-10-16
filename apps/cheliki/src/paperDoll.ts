const CHARACTER_URL = '/characters/paper-doll';

export const FPS = 10;
/** Frame canvas in px: v3 grows it past the 64px sprite. */
export const FRAME_SIZE = 76;
/**
 * Shift for mirrored frames, in sprite px. The body is symmetric about column 37,
 * not the frame center at 37.5, so a plain mirror moves it 1px right; with this
 * shift the facing-viewer pose stays put when the dude flips direction.
 */
export const MIRROR_OFFSET = -1;

/**
 * A frame's path inside an animations folder, e.g. `walk-loop/west/frame_000.png`.
 * The body, the eyes and every clothing layer share it, so one frame addresses them all.
 */
export type Frame = string;

/** Clothing drawn over the body; its layers live in `clothes/<name>/`. */
export type Clothing = 't-shirt' | 'jeans' | 'shorts';

/**
 * Eyes drawn over the body, which has none; their layers live in `eyes/<name>/`.
 * `sticks` are the original ones and mark where the eyes go: scripts/place-eyes.mjs
 * draws the rest from them.
 */
export type Eyes = 'sticks' | 'big' | 'sleepy' | 'happy';

export const bodyUrl = (frame: Frame) => `${CHARACTER_URL}/Idle/animations/${frame}`;
export const clothingUrl = (clothing: Clothing, frame: Frame) => `${CHARACTER_URL}/clothes/${clothing}/${frame}`;
export const eyesUrl = (eyes: Eyes, frame: Frame) => `${CHARACTER_URL}/eyes/${eyes}/${frame}`;

/**
 * Only west frames exist: east is the same frames mirrored.
 * Names follow the PixelLab export: frame_000..frame_00N.
 */
function westFrames(animation: string, frameCount: number): Frame[] {
  return Array.from(
    { length: frameCount },
    (_, i) => `${animation}/west/frame_${String(i).padStart(3, '0')}.png`,
  );
}

export const WALK = westFrames('walk-loop', 8);
/** Slows down from the walk and ends facing the viewer. */
export const STOP_TURN_SOUTH = westFrames('stop-turn-south', 8);
export const FACING_SOUTH = STOP_TURN_SOUTH.at(-1)!;
/**
 * Turns from facing the viewer and steps off; hands over to WALK[0].
 * Its ends are trimmed: they repeat FACING_SOUTH and WALK[0].
 */
export const START_WALK = westFrames('start-walk', 9).slice(1, -1);

/** Every frame the dude is drawn with: clothing layers exist for exactly these. */
export const FRAMES: Frame[] = [...WALK, ...STOP_TURN_SOUTH, ...START_WALK];
