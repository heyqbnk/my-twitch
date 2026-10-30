/** How long each animation frame is shown, in ms. */
export const FRAME_MS = 60;

export type Direction = 'west' | 'east';

export interface Frame {
  /** Path inside an animation folder, e.g. `walk-loop/east/frame_000.png`. */
  src: string;
  /** Frames of the direction that isn't drawn are the drawn ones mirrored. */
  mirrored: boolean;
  height: number;
  /** Where the sprite box sits on the frame canvas. */
  boxY: number;
}

/** A layer drawn over the body: one image per body frame in `<folder>/<name>/`. */
export interface Slot {
  key: string;
  folder: string;
  names: string[];
  /** The images are grey, multiplied by the part's colour. */
  tinted?: boolean;
  /** Colours that look natural on the part; random looks pick from them. */
  palette?: string[];
  /**
   * How many of 100 chatters wear each part; the rest go without the slot. Without it every
   * chatter wears one of the parts.
   */
  shares?: Record<string, number>;
}

/** The part a roll in 0..99 falls on, or null when it falls past the slot's shares. */
export function sharedName(slot: Slot, roll: number): string | null {
  for (const name of slot.names) {
    roll -= slot.shares?.[name] ?? 0;
    if (roll < 0) return name;
  }
  return null;
}

export interface Part {
  name: string;
  /** For tinted slots; without it the grey image is drawn as is. */
  color?: string;
}

/** A part per slot key, or null to draw the doll without it. */
export type Look = Record<string, Part | null>;

export interface Doll {
  url: string;
  /**
   * The sprite box, in sprite px. Animation canvases may be taller, so each frame knows where the
   * box sits on its canvas; drawing frames by the box keeps the feet in place across animations.
   * Canvases are as wide as the box.
   */
  size: number;
  /** How far one walk frame moves the doll, in sprite px. */
  walkStep: number;
  /** The row of the sprite box just below the soles, in sprite px: the ground line. */
  soles: number;
  /** Turns from facing the viewer and steps off. */
  start: Record<Direction, Frame[]>;
  walk: Record<Direction, Frame[]>;
  /** The walk frame that follows the last start frame. */
  walkAfterStart: number;
  /** Slows down from the walk and ends facing the viewer, in the idle pose. */
  stop: Record<Direction, Frame[]>;
  /** No breathing yet: stands in the pose the stop ends with. */
  idle: Frame;
  /** Bottom to top. */
  slots: Slot[];
}

/** Names follow the PixelLab export: frame_000..frame_00N. */
export function animation(
  name: string,
  drawn: Direction,
  count: number,
  height: number,
  boxY: number,
): Record<Direction, Frame[]> {
  const frames = Array.from({ length: count }, (_, i) => ({
    boxY,
    height,
    mirrored: false,
    src: `${name}/${drawn}/frame_${String(i).padStart(3, '0')}.png`,
  }));
  const mirrored = frames.map(frame => ({ ...frame, mirrored: true }));
  return drawn === 'east' ? { east: frames, west: mirrored } : { east: mirrored, west: frames };
}

export interface Layer {
  url: string;
  color?: string;
}

/** Images of the frame, bottom to top: the body, then the slots. */
export function frameLayers(doll: Doll, frame: Frame, look: Look): Layer[] {
  const parts = doll.slots.flatMap(slot => {
    const part = look[slot.key];
    if (!part) return [];
    return [{ color: slot.tinted ? part.color : undefined, url: `${doll.url}/${slot.folder}/${part.name}/${frame.src}` }];
  });
  return [{ url: `${doll.url}/Idle/animations/${frame.src}` }, ...parts];
}

const images = new Map<string, Promise<HTMLImageElement>>();

export function loadImage(url: string): Promise<HTMLImageElement> {
  let image = images.get(url);
  if (!image) {
    const img = new Image();
    img.src = url;
    image = img.decode().then(() => img);
    images.set(url, image);
  }
  return image;
}

/** Loads every frame with every part, so walking never waits for the network. */
export function preload(doll: Doll) {
  // West and east frames are the same images
  const frames = [...doll.start.east, ...doll.walk.east, ...doll.stop.east];
  for (const frame of frames) {
    void loadImage(`${doll.url}/Idle/animations/${frame.src}`);
    for (const slot of doll.slots) {
      for (const name of slot.names) void loadImage(`${doll.url}/${slot.folder}/${name}/${frame.src}`);
    }
  }
}
