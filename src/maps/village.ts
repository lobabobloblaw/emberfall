// The village map — hand-authored, typed, testable (plan §5).
// Paint legend: "." grass, "D" dirt path, "S" stone plaza, "W" water, " " empty vista.
// Rows 0-1 are untiled vista where the parallax treeline shows through; the camera can
// see it but the player is walled at row 3.
import type { Facing } from "../types";

export const TILE = 32;
export const MAP_W = 40;
export const MAP_H = 30;

// prettier-ignore
export const paint: string[] = [
  "                                        ", // 0 vista
  "                                        ", // 1 vista
  "........................................", // 2
  "........................................", // 3
  "........................................", // 4
  "........................................", // 5
  "........................................", // 6
  "........................................", // 7
  ".........DDDDDDDDDDDDDDDDDDDDDD.........", // 8  village road x9-30
  ".........DDDDDDDDDDDDDDDDDDDDDD.........", // 9
  "...................DD...................", // 10 road->plaza connector
  "................SSSSSSSS................", // 11 plaza x16-23
  "........DDDDDDDDSSSSSSSSDDDDDDDDDD......", // 12 west path x8-15, east path x24-33
  "........DDDDDDDDSSSSSSSSDDDDDDDDDD......", // 13
  "................SSSSSSSS................", // 14
  "................SSSSSSSS................", // 15
  "...................DD...................", // 16 south path
  "...................DD...................", // 17
  "...................DD...................", // 18
  "......WWWWWW.......DD...................", // 19 pond x6-11 y19-23
  "......WWWWWW.......DD...................", // 20
  "......WWWWWW.......DD...................", // 21
  "......WWWWWW.......DD...................", // 22
  "......WWWWWW.......DD...................", // 23
  "...................DD...................", // 24
  "...................DD...................", // 25
  "........................................", // 26
  "........................................", // 27
  "........................................", // 28
  "........................................"  // 29
];

export type ObjectType =
  | "tree-oak"
  | "tree-pine"
  | "cottage"
  | "shop"
  | "well"
  | "chest-closed"
  | "sign"
  | "bush"
  | "rock"
  | "fence";

export interface MapObject {
  type: ObjectType;
  /** base-center x in tile units (0.5 = half tile) */
  tx: number;
  /** base row — the sprite's bottom edge sits at (ty+1)*TILE */
  ty: number;
}

// Collision footprint (tiles) and on-screen display size (world px, null = native)
// per object type. Footprint is anchored to the base-center.
export const OBJECT_INFO: Record<ObjectType, { foot: { w: number; h: number }; display: number | null }> = {
  "tree-oak": { foot: { w: 1, h: 1 }, display: null },
  "tree-pine": { foot: { w: 1, h: 1 }, display: null },
  cottage: { foot: { w: 5, h: 3 }, display: null },
  shop: { foot: { w: 5, h: 3 }, display: null },
  well: { foot: { w: 2, h: 2 }, display: null },
  "chest-closed": { foot: { w: 1, h: 1 }, display: 32 },
  sign: { foot: { w: 1, h: 1 }, display: 32 },
  bush: { foot: { w: 1, h: 1 }, display: 48 },
  rock: { foot: { w: 1, h: 1 }, display: 48 },
  fence: { foot: { w: 1, h: 1 }, display: 32 }
};

const o = (type: ObjectType, tx: number, ty: number): MapObject => ({ type, tx, ty });

export const objects: MapObject[] = [
  // west tree wall
  o("tree-oak", 2.5, 5), o("tree-pine", 3.5, 8), o("tree-oak", 2.5, 11), o("tree-pine", 3.5, 14),
  o("tree-oak", 2.5, 17), o("tree-pine", 3.5, 20), o("tree-oak", 2.5, 23), o("tree-pine", 3.5, 26),
  // east tree wall
  o("tree-pine", 37.5, 5), o("tree-oak", 36.5, 8), o("tree-pine", 37.5, 11), o("tree-oak", 36.5, 14),
  o("tree-pine", 37.5, 17), o("tree-oak", 36.5, 20), o("tree-pine", 37.5, 23), o("tree-oak", 36.5, 26),
  // north band
  o("tree-oak", 5.5, 4), o("tree-pine", 14.5, 4), o("tree-oak", 17.5, 3), o("tree-pine", 23.5, 3),
  o("tree-oak", 25.5, 4), o("tree-pine", 33.5, 4),
  // south band
  o("tree-pine", 5.5, 27), o("tree-oak", 9.5, 26), o("tree-pine", 13.5, 27), o("tree-oak", 17.5, 26),
  o("tree-pine", 21.5, 27), o("tree-oak", 25.5, 26), o("tree-pine", 29.5, 27), o("tree-oak", 33.5, 26),
  // interior grove + accents
  o("tree-oak", 5.5, 15), o("tree-pine", 4.5, 18), o("tree-oak", 34.5, 17),
  // buildings & props
  o("cottage", 9.5, 7), o("shop", 28.5, 7), o("well", 20, 13),
  o("chest-closed", 5.5, 17), o("sign", 22.5, 16),
  o("bush", 13.5, 15), o("bush", 26.5, 16), o("bush", 15.5, 22),
  o("rock", 24.5, 20), o("rock", 7.5, 25),
  o("fence", 32.5, 8), o("fence", 33.5, 8), o("fence", 34.5, 8), o("fence", 35.5, 8)
];

export interface NpcDef {
  id: string;
  char: "elder" | "merchant" | "villager";
  tx: number;
  ty: number;
  facing: Facing;
  dialogue: string;
  /** horizontal patrol range in tiles, if the NPC wanders */
  patrol?: { minTx: number; maxTx: number; speed: number };
}

export const npcs: NpcDef[] = [
  { id: "elder", char: "elder", tx: 17.5, ty: 12, facing: "down", dialogue: "elder" },
  { id: "merchant", char: "merchant", tx: 29.5, ty: 9, facing: "down", dialogue: "merchant" },
  { id: "villager", char: "villager", tx: 23.5, ty: 19, facing: "right", dialogue: "villager", patrol: { minTx: 21.5, maxTx: 24.5, speed: 20 } }
];

export interface SlimeDef {
  tx: number;
  ty: number;
}

export const slimes: SlimeDef[] = [
  { tx: 29.5, ty: 22 },
  { tx: 32.5, ty: 24 }
];

/** tile-rect [x1,y1]..[x2,y2] inclusive */
export interface TileRect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export const battleZone: TileRect = { x1: 26, y1: 18, x2: 35, y2: 26 };

export const spawn = { tx: 20, ty: 24.5 };

export interface InteractableDef {
  id: string;
  tx: number;
  ty: number;
  kind: "chest" | "sign" | "door";
  /** dialogue id in the script table */
  dialogue: string;
}

export const interactables: InteractableDef[] = [
  { id: "chest", tx: 5.5, ty: 17, kind: "chest", dialogue: "chest" },
  { id: "sign", tx: 22.5, ty: 16, kind: "sign", dialogue: "sign" },
  { id: "cottage-door", tx: 9.5, ty: 7, kind: "door", dialogue: "cottage-door" },
  { id: "shop-door", tx: 28.5, ty: 7, kind: "door", dialogue: "shop-door" }
];

/**
 * Static collision grid: map borders, water, object footprints.
 * NPCs get physics bodies instead (the villager moves).
 */
export function buildCollision(): boolean[][] {
  const grid: boolean[][] = Array.from({ length: MAP_H }, () => Array<boolean>(MAP_W).fill(false));
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (y <= 2 || y >= 28 || x <= 1 || x >= 38) grid[y][x] = true;
      if (paint[y][x] === "W") grid[y][x] = true;
    }
  }
  for (const obj of objects) {
    const { foot } = OBJECT_INFO[obj.type];
    const x1 = Math.round(obj.tx - foot.w / 2);
    const y1 = obj.ty - foot.h + 1;
    for (let y = y1; y <= obj.ty; y++) {
      for (let x = x1; x < x1 + foot.w; x++) {
        if (y >= 0 && y < MAP_H && x >= 0 && x < MAP_W) grid[y][x] = true;
      }
    }
  }
  return grid;
}

/** Merge horizontal runs of solid cells into rectangles (fewer physics bodies). */
export function collisionRects(grid: boolean[][]): { x: number; y: number; w: number; h: number }[] {
  const rects: { x: number; y: number; w: number; h: number }[] = [];
  for (let y = 0; y < grid.length; y++) {
    let runStart = -1;
    for (let x = 0; x <= grid[y].length; x++) {
      const solid = x < grid[y].length && grid[y][x];
      if (solid && runStart < 0) runStart = x;
      if (!solid && runStart >= 0) {
        rects.push({ x: runStart * TILE, y: y * TILE, w: (x - runStart) * TILE, h: TILE });
        runStart = -1;
      }
    }
  }
  return rects;
}
