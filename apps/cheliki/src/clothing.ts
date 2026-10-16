import { shallowRef, watch, type Ref } from 'vue';
import { clothingUrl, FRAMES, type Clothing, type Frame } from './paperDoll';

type Rgb = [number, number, number];
type Lch = { l: number; c: number; h: number };

/**
 * Red channel of the tone markers the layers are drawn in: light, mid, shadow.
 * Black (0) is the outline and keeps its color. Keep in sync with scripts/extract-clothing.mjs.
 */
const MARKERS = [255, 170, 85];

/** OKLCH lightness drop from the lit tone to the shadow. */
const SHADOW_DROP = 0.3;
/**
 * Lightness floors, so dark colors keep visible folds and the shadow never merges with
 * the black outline: a black t-shirt is drawn in dark grays.
 */
const MIN_LIGHT = 0.36;
const MIN_SHADOW = 0.24;
/** Shadows lean toward blue, as in hand-shaded pixel art; mid tones lean half as far. */
const SHADOW_HUE = 264 * Math.PI / 180;
const SHADOW_HUE_SHIFT = 15 * Math.PI / 180;
/** Grays get this much blue in the shadow, so a white t-shirt has cool folds, not dirty ones. */
const SHADOW_MIN_CHROMA = 0.02;

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

/** sRGB (0–255) to OKLCH, see https://bottosson.github.io/posts/oklab/ */
function toLch([r, g, b]: Rgb): Lch {
  const [lr, lg, lb] = [r, g, b].map(v => toLinear(v / 255)) as Rgb;
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return {
    l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    c: Math.hypot(a, bb),
    h: Math.atan2(bb, a),
  };
}

/** OKLCH to linear sRGB; components fall outside 0..1 when the color is out of gamut. */
function toLinearRgb({ l, c, h }: Lch): Rgb {
  const a = c * Math.cos(h);
  const b = c * Math.sin(h);
  const lp = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mp = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const sp = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * lp - 3.3077115913 * mp + 0.2309699292 * sp,
    -1.2684380046 * lp + 2.6097574011 * mp - 0.3413193965 * sp,
    -0.0041960863 * lp - 0.7034186147 * mp + 1.707614701 * sp,
  ];
}

const inGamut = (rgb: Rgb) => rgb.every(v => v >= -1e-4 && v <= 1 + 1e-4);

/** OKLCH to sRGB (0–255); out-of-gamut colors lose chroma, keeping lightness and hue. */
function toRgb(lch: Lch): Rgb {
  let rgb = toLinearRgb(lch);
  if (!inGamut(rgb)) {
    let [low, high] = [0, lch.c];
    for (let i = 0; i < 20; i++) {
      const c = (low + high) / 2;
      if (inGamut(toLinearRgb({ ...lch, c }))) low = c;
      else high = c;
    }
    rgb = toLinearRgb({ ...lch, c: low });
  }
  return rgb.map(v => Math.round(toGamma(Math.min(1, Math.max(0, v))) * 255)) as Rgb;
}

/** Turns hue `h` toward `target` by at most `limit`, the short way around. */
function shiftHue(h: number, target: number, limit: number) {
  const delta = Math.atan2(Math.sin(target - h), Math.cos(target - h));
  return h + Math.sign(delta) * Math.min(Math.abs(delta), limit);
}

function parseHex(hex: string): Rgb {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/**
 * Light, mid and shadow tones for a clothing color. The light tone is the color itself,
 * so the clothing reads as exactly what was picked; only very dark colors are lifted.
 */
export function toneRamp(hex: string): [Rgb, Rgb, Rgb] {
  const picked = parseHex(hex);
  const { l, c, h } = toLch(picked);
  const light = Math.max(l, MIN_LIGHT);
  const shadow = Math.max(light - SHADOW_DROP, MIN_SHADOW);
  // Gray has no hue of its own: its shadows take the blue one
  const isGray = c < SHADOW_MIN_CHROMA;
  const hueAt = (share: number) => (
    isGray ? SHADOW_HUE : shiftHue(h, SHADOW_HUE, SHADOW_HUE_SHIFT * share)
  );
  const chromaAt = (share: number) => Math.max(c, SHADOW_MIN_CHROMA * share);
  return [
    light === l ? picked : toRgb({ l: light, c, h }),
    toRgb({ l: (light + shadow) / 2, c: chromaAt(0.5), h: hueAt(0.5) }),
    toRgb({ l: shadow, c: chromaAt(1), h: hueAt(1) }),
  ];
}

async function loadPixels(url: string) {
  const image = new Image();
  image.src = url;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext('2d')!;
  context.drawImage(image, 0, 0);
  return context.getImageData(0, 0, image.width, image.height);
}

/** Paints a layer's tone markers with `ramp`; returns it as a data URL for an `<img>`. */
function recolor(source: ImageData, ramp: [Rgb, Rgb, Rgb]) {
  const pixels = new ImageData(new Uint8ClampedArray(source.data), source.width, source.height);
  const { data } = pixels;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0 || data[i] === 0) continue;
    const distances = MARKERS.map(marker => Math.abs(marker - data[i]!));
    data.set(ramp[distances.indexOf(Math.min(...distances))]!, i);
  }
  const canvas = document.createElement('canvas');
  canvas.width = pixels.width;
  canvas.height = pixels.height;
  canvas.getContext('2d')!.putImageData(pixels, 0, 0);
  return canvas.toDataURL();
}

/**
 * Layers of `clothing` painted in `color` (`#rrggbb`), by frame.
 * Empty until the layers load; repainted whenever the color changes.
 */
export function useClothing(clothing: Clothing, color: Ref<string>) {
  const layers = shallowRef(new Map<Frame, string>());
  const sources = Promise.all(FRAMES.map(frame => loadPixels(clothingUrl(clothing, frame))));
  watch(color, async value => {
    const ramp = toneRamp(value);
    const pixels = await sources;
    // A newer color was picked while the layers loaded
    if (color.value !== value) return;
    layers.value = new Map(FRAMES.map((frame, i) => [frame, recolor(pixels[i]!, ramp)]));
  }, { immediate: true });
  return layers;
}
