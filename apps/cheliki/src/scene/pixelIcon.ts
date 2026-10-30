export interface PixelIcon {
  /**
   * CSS url() с SVG иконки — для mask, чтобы иконка красилась цветом текста
   */
  mask: string;
  /**
   * Размер в пикселях сетки
   */
  width: number;
  height: number;
}

/**
 * Пиксельная иконка из ASCII-сетки: '#' — закрашенный пиксель, остальное — прозрачное.
 * Каждый ряд — отрезки подряд идущих пикселей, без сглаживания краёв
 */
export function pixelIcon(rows: string[]): PixelIcon {
  const width = Math.max(...rows.map(row => row.length));
  const height = rows.length;
  let d = '';
  rows.forEach((row, y) => {
    for (const match of row.matchAll(/#+/g)) d += `M${match.index} ${y}h${match[0].length}v1h-${match[0].length}z`;
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges"><path d="${d}"/></svg>`;
  return { mask: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`, width, height };
}

/**
 * Звено цепи перед доменом ссылки
 */
export const LINK_ICON = pixelIcon([
  '.##...##.',
  '#.......#',
  '#..###..#',
  '#.......#',
  '.##...##.',
]);
