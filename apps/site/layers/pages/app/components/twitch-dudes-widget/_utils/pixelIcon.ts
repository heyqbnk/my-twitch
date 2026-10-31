export interface PixelIcon {
  height: number;
  /**
   * CSS url() with the icon's SVG, for `mask`, so the icon takes the text color.
   */
  mask: string;
  /**
   * Size in grid pixels.
   */
  width: number;
}

/**
 * A pixel icon from an ASCII grid: '#' is a filled pixel, anything else is transparent.
 * Each row is drawn as runs of adjacent pixels, without anti-aliasing.
 */
export function pixelIcon(rows: string[]): PixelIcon {
  const width = Math.max(...rows.map(row => row.length));
  const height = rows.length;
  let d = '';
  rows.forEach((row, y) => {
    for (const match of row.matchAll(/#+/g)) {
      d += `M${match.index} ${y}h${match[0].length}v1h-${match[0].length}z`;
    }
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges"><path d="${d}"/></svg>`;
  return { height, mask: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`, width };
}

/**
 * A chain link in front of a link's domain.
 */
export const LINK_ICON = pixelIcon([
  '.##...##.',
  '#.......#',
  '#..###..#',
  '#.......#',
  '.##...##.',
]);
