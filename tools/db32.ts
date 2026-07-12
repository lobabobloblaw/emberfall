// DawnBringer-32 — classic public 32-color pixel art palette.
// This is the master palette for every Emberfall asset (passed as input_palette to
// rd-fast/rd-plus; enforced by nearest-color quantize in postprocess for rd-tile/rd-animation).
export const DB32 = [
  "#000000", "#222034", "#45283c", "#663931", "#8f563b", "#df7126", "#d9a066", "#eec39a",
  "#fbf236", "#99e550", "#6abe30", "#37946e", "#4b692f", "#524b24", "#323c39", "#3f3f74",
  "#306082", "#5b6ee1", "#639bff", "#5fcde4", "#cbdbfc", "#ffffff", "#9badb7", "#847e87",
  "#696a6a", "#595652", "#76428a", "#ac3232", "#d95763", "#d77bba", "#8f974a", "#8a6f30"
] as const;

export type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

export const DB32_RGB: Rgb[] = DB32.map(hexToRgb);

export function nearestDb32(r: number, g: number, b: number): Rgb {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < DB32_RGB.length; i++) {
    const [pr, pg, pb] = DB32_RGB[i];
    const d = (r - pr) * (r - pr) + (g - pg) * (g - pg) + (b - pb) * (b - pb);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return DB32_RGB[best];
}
