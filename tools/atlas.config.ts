// Measured ground truth about generated sheet layouts + postprocess directives.
// Row orders were PROBED from real rd-animation outputs on 2026-07-12 (see plan §4.5.1):
//   - four_angle_walking probe (hero):    rows top->bottom = up, right, down, left
//   - walking_and_idle probes (NPCs):     rows top->bottom = down, right, up, left
// Do not guess: if a sheet is regenerated, re-view it and update its row map here.

export type Facing = "up" | "down" | "left" | "right";

export interface CharSheetSpec {
  src: string; // shot-list id
  frame: number;
  cols: number;
  rows: Record<Facing, number>;
  idleCol: number; // column used as standing frame
  quantize: boolean;
}

export const CHAR_SHEETS: Record<string, CharSheetSpec> = {
  hero: { src: "char-hero-walk", frame: 48, cols: 4, rows: { up: 0, right: 1, down: 2, left: 3 }, idleCol: 0, quantize: true },
  elder: { src: "char-elder-walk", frame: 48, cols: 4, rows: { down: 0, right: 1, up: 2, left: 3 }, idleCol: 0, quantize: true },
  merchant: { src: "char-merchant-walk", frame: 48, cols: 4, rows: { down: 0, right: 1, up: 2, left: 3 }, idleCol: 0, quantize: true },
  villager: { src: "char-villager-walk", frame: 48, cols: 4, rows: { down: 0, right: 1, up: 2, left: 3 }, idleCol: 0, quantize: true }
};

// small_sprites sheet: 160x128 = 5 cols x 4 rows of 32. Row 0 faces down; cols 0-1 are a
// clean 2-frame bounce. That is all the overworld slime needs.
export const SLIME_SHEET = { src: "char-slime", frame: 32, cols: 5, idleFrames: [0, 1], quantize: true };

// Tall objects that split into a collidable base (objects-below layer) and a walk-behind
// top (objects-above layer). Value = fraction of image height (from top) where the cut
// happens: [0, splitY) -> above, [splitY, H) -> below.
export const OBJECT_SPLITS: Record<string, number> = {
  "obj-tree-oak": 0.6,
  "obj-tree-pine": 0.66,
  "obj-cottage": 0.52,
  "obj-shop": 0.55,
  "obj-well": 0.48
};

// Short props: fully on the objects-below layer (never occlude entities).
export const PLAIN_OBJECTS = ["obj-rock", "obj-bush", "obj-fence", "obj-chest-closed", "obj-chest-open", "obj-sign"];

// Master tileset packing: terrain sheet cells 0-19, water sheet cells 20-39, extras 40-43.
export const TILESET = {
  columns: 8,
  terrain: { src: "tileset-terrain", cols: 4, rows: 5 }, // 128x160
  water: { src: "tileset-water", cols: 4, rows: 5 }, // 128x160
  extras: ["tile-grass-a", "tile-grass-b", "tile-flowers", "tile-stone-path"]
};

// Semantic names for master tileset indices, assigned by eyeballing the indexed debug
// sheets (tools/.cache/contact/tileset-*-orig-indexed.png).
// Terrain blob = bright grass patch on dirt; transitions live on the GRASS side:
//   edgeN = grass tile with dirt along its north edge, holeSE = grass with dirt at the
//   SE diagonal (donut piece), etc.
// Water blob = pool on dark grass; transitions live on the WATER side:
//   waterN = water tile with grass along its north edge, islandSE = water with a grass
//   arc at the SE diagonal.
export const TILE_NAMES: Record<string, number> = {
  dirt: 0,
  dirt2: 4,
  dirt3: 8,
  edgeNW: 1,
  edgeN: 2,
  edgeNE: 3,
  edgeW: 5,
  grass: 6,
  edgeE: 7,
  edgeSW: 9,
  edgeS: 10,
  edgeSE: 11,
  grassField: 12,
  holeSE: 13,
  holeSW: 14,
  pathCornerA: 15,
  grassField2: 16,
  holeNE: 17,
  holeNW: 18,
  pathCornerB: 19,
  grassDark: 20,
  waterNW: 21,
  waterN: 22,
  waterNE: 23,
  grassDark2: 24,
  waterW: 25,
  water: 26,
  waterE: 27,
  grassDark3: 28,
  waterSW: 29,
  waterS: 30,
  waterSE: 31,
  water2: 32,
  islandSE: 33,
  islandSW: 34,
  waterAltA: 35,
  water3: 36,
  islandSW2: 37,
  islandNW: 38,
  waterAltB: 39,
  grassA: 40,
  grassB: 41,
  flowers: 42,
  stonePath: 43
};

// Straight copies into public/assets/<folder>/<name>.png.
// binarizeAlpha: snap alpha to 0/255 (kills remove_bg halo pixels, plan §9).
export const COPY_GROUPS: Record<string, { folder: string; strip: string; binarizeAlpha: boolean; ids: string[] }> = {
  portraits: { folder: "portraits", strip: "portrait-", binarizeAlpha: false, ids: ["portrait-hero", "portrait-elder", "portrait-merchant", "portrait-villager"] },
  icons: { folder: "icons", strip: "icon-", binarizeAlpha: true, ids: ["icon-heart", "icon-potion", "icon-coin", "icon-sword"] },
  scenes: { folder: "scenes", strip: "scene-", binarizeAlpha: false, ids: ["scene-title", "scene-battle-forest", "scene-parallax-forest"] },
  battle: { folder: "battle", strip: "battle-", binarizeAlpha: true, ids: ["battle-slime"] },
  ui: { folder: "ui", strip: "ui-", binarizeAlpha: false, ids: ["ui-panel"] }
};
