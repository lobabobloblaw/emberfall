// Pure auto-tiler: converts a paint map (characters) into tileset indices using the
// semantic tile names from the manifest. Transition conventions match the generated
// wang sheets (see tools/atlas.config.ts):
//   - grass<->dirt transitions are drawn on the GRASS side (blob pieces)
//   - grass<->water transitions are drawn on the WATER side (pool pieces)
//   - grass adjacent to water becomes dark "shore" grass
//   - stone plaza meets everything with a hard edge (deliberate, reads as constructed)
// Paint legend: "." grass, "D" dirt, "S" stone, "W" water, " " empty (vista, no tile)
export type TileNames = Record<string, number>;

const hash = (x: number, y: number) => (((x * 7919 + y * 104729) % 997) + 997) % 997;

function at(paint: string[], x: number, y: number): string {
  if (y < 0 || y >= paint.length || x < 0 || x >= paint[0].length) return ".";
  return paint[y][x];
}

export function buildGround(paint: string[], N: TileNames): (number | null)[][] {
  const H = paint.length;
  const W = paint[0].length;
  const out: (number | null)[][] = [];
  for (let y = 0; y < H; y++) {
    const row: (number | null)[] = [];
    for (let x = 0; x < W; x++) {
      row.push(groundTile(paint, x, y, N));
    }
    out.push(row);
  }
  return out;
}

function groundTile(paint: string[], x: number, y: number, N: TileNames): number | null {
  const c = at(paint, x, y);
  if (c === " ") return null;
  if (c === "S") return N.stonePath;
  if (c === "D") {
    const h = hash(x, y) % 100;
    return h < 8 ? N.dirt2 : h < 16 ? N.dirt3 : N.dirt;
  }
  if (c === "W") {
    const shore = (dx: number, dy: number) => at(paint, x + dx, y + dy) !== "W";
    const n = shore(0, -1);
    const e = shore(1, 0);
    const s = shore(0, 1);
    const w = shore(-1, 0);
    if (n && w) return N.waterNW;
    if (n && e) return N.waterNE;
    if (s && w) return N.waterSW;
    if (s && e) return N.waterSE;
    if (n) return N.waterN;
    if (e) return N.waterE;
    if (s) return N.waterS;
    if (w) return N.waterW;
    const h = hash(x, y) % 100;
    return h < 20 ? N.water2 : h < 40 ? N.water3 : N.water;
  }
  // grass
  const isW = (dx: number, dy: number) => at(paint, x + dx, y + dy) === "W";
  if (isW(0, -1) || isW(1, 0) || isW(0, 1) || isW(-1, 0) || isW(1, -1) || isW(1, 1) || isW(-1, 1) || isW(-1, -1)) {
    const h = hash(x, y) % 100;
    return h < 25 ? N.grassDark2 : h < 50 ? N.grassDark3 : N.grassDark;
  }
  const isD = (dx: number, dy: number) => at(paint, x + dx, y + dy) === "D";
  const n = isD(0, -1);
  const e = isD(1, 0);
  const s = isD(0, 1);
  const w = isD(-1, 0);
  if (n && w) return N.edgeNW;
  if (n && e) return N.edgeNE;
  if (s && w) return N.edgeSW;
  if (s && e) return N.edgeSE;
  if (n) return N.edgeN;
  if (e) return N.edgeE;
  if (s) return N.edgeS;
  if (w) return N.edgeW;
  if (isD(1, -1)) return N.holeNE;
  if (isD(-1, -1)) return N.holeNW;
  if (isD(1, 1)) return N.holeSE;
  if (isD(-1, 1)) return N.holeSW;
  return N.grass;
}

// Sparse decoration layer: flowers and bright grass variants on plain grass only.
export function buildDetail(paint: string[], N: TileNames): (number | null)[][] {
  const H = paint.length;
  const W = paint[0].length;
  const out: (number | null)[][] = [];
  for (let y = 0; y < H; y++) {
    const row: (number | null)[] = [];
    for (let x = 0; x < W; x++) {
      let tile: number | null = null;
      if (at(paint, x, y) === "." && groundTile(paint, x, y, N) === N.grass) {
        const h = hash(x, y) % 100;
        if (h < 4) tile = N.flowers;
      }
      row.push(tile);
    }
    out.push(row);
  }
  return out;
}
