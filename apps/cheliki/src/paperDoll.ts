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

/** A frame's path inside an animations folder, e.g. `walk-loop/west/frame_000.png`. */
export type Frame = string;

export const bodyUrl = (frame: Frame) => `${CHARACTER_URL}/Idle/animations/${frame}`;

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
