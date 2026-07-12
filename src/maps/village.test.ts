import { describe, expect, it } from "vitest";
import { buildGround, buildDetail } from "./autotile";
import { TILE_NAMES } from "../../tools/atlas.config";
import * as V from "./village";

const N = TILE_NAMES;

describe("village paint map", () => {
  it("is exactly 40x30", () => {
    expect(V.paint).toHaveLength(V.MAP_H);
    for (const row of V.paint) expect(row).toHaveLength(V.MAP_W);
  });

  it("contains only known materials", () => {
    for (const row of V.paint) expect(row).toMatch(/^[ .DSW]+$/);
  });

  it("spawn, NPCs and interactables stand on walkable ground", () => {
    const solid = V.buildCollision();
    const standable = (tx: number, ty: number) => !solid[Math.floor(ty)][Math.floor(tx)];
    expect(standable(V.spawn.tx, V.spawn.ty)).toBe(true);
    for (const npc of V.npcs) expect(standable(npc.tx, npc.ty), npc.id).toBe(true);
    // interactables themselves may be solid (chest/sign); the tile SOUTH of each must be
    // walkable so the player can face them
    for (const i of V.interactables) {
      expect(standable(i.tx, i.ty + 1), i.id).toBe(true);
    }
  });

  it("slimes and battle zone sit inside the map on grass", () => {
    for (const s of V.slimes) {
      expect(V.paint[s.ty][Math.floor(s.tx)]).toBe(".");
      expect(s.tx).toBeGreaterThanOrEqual(V.battleZone.x1);
      expect(s.tx).toBeLessThanOrEqual(V.battleZone.x2 + 1);
    }
  });
});

describe("autotile", () => {
  const ground = buildGround(V.paint, N);

  it("produces a full grid of valid indices (or null vista)", () => {
    expect(ground).toHaveLength(V.MAP_H);
    for (let y = 0; y < V.MAP_H; y++) {
      for (let x = 0; x < V.MAP_W; x++) {
        const t = ground[y][x];
        if (V.paint[y][x] === " ") expect(t).toBeNull();
        else {
          expect(t).not.toBeNull();
          expect(t!).toBeGreaterThanOrEqual(0);
          expect(t!).toBeLessThan(44);
        }
      }
    }
  });

  it("picks directional edge tiles around the village road", () => {
    // road spans x9-30, y8-9; the grass row above it must show south-facing dirt edges
    expect(ground[7][15]).toBe(N.edgeS);
    expect(ground[10][15]).toBe(N.edgeN);
    expect(ground[8][8]).toBe(N.edgeE);
    expect(ground[8][31]).toBe(N.edgeW);
    // diagonal-only contact NW of the road start -> donut inner-corner piece
    expect(ground[7][8]).toBe(N.holeSE);
    // road->plaza connector mouth: dirt N and E / N and W -> outer corners
    expect(ground[10][18]).toBe(N.edgeNE);
    expect(ground[10][21]).toBe(N.edgeNW);
  });

  it("rings the pond with dark shore grass and picks water edges", () => {
    expect(ground[18][6]).toBe(N.grassDark ?? ground[18][6]); // dark family
    const darks = [N.grassDark, N.grassDark2, N.grassDark3];
    expect(darks).toContain(ground[18][6]);
    expect(ground[19][6]).toBe(N.waterNW);
    expect(ground[19][11]).toBe(N.waterNE);
    expect(ground[23][6]).toBe(N.waterSW);
    expect(ground[23][11]).toBe(N.waterSE);
    expect(ground[20][6]).toBe(N.waterW);
    expect(ground[21][8]).toBe(N.water); // interior
  });

  it("keeps the plaza hard-edged stone", () => {
    expect(ground[11][16]).toBe(N.stonePath);
    // (17,16) touches only plaza stone -> plain grass, no dirt transition against stone
    expect(ground[16][17]).toBe(N.grass);
  });

  it("sprinkles detail only on plain grass", () => {
    const detail = buildDetail(V.paint, N);
    let count = 0;
    for (let y = 0; y < V.MAP_H; y++) {
      for (let x = 0; x < V.MAP_W; x++) {
        const d = detail[y][x];
        if (d !== null) {
          count++;
          expect(V.paint[y][x]).toBe(".");
          expect(d).toBe(N.flowers);
        }
      }
    }
    expect(count).toBeGreaterThan(5);
  });
});

describe("collision", () => {
  const grid = V.buildCollision();

  it("blocks water, borders and object footprints", () => {
    expect(grid[20][8]).toBe(true); // pond
    expect(grid[0][0]).toBe(true); // border
    expect(grid[29][20]).toBe(true); // south border
    expect(grid[15][5]).toBe(true); // grove oak trunk at (5.5,15)
    expect(grid[6][9]).toBe(true); // cottage walls
    expect(grid[13][20]).toBe(true); // well
  });

  it("keeps the road and plaza walkable", () => {
    expect(grid[8][15]).toBe(false);
    expect(grid[12][17]).toBe(false);
    expect(grid[24][20]).toBe(false);
  });

  it("merges runs into fewer rects than solid cells", () => {
    const cells = grid.flat().filter(Boolean).length;
    const rects = V.collisionRects(grid);
    expect(rects.length).toBeLessThan(cells / 2);
    for (const r of rects) {
      expect(r.w).toBeGreaterThan(0);
      expect(r.x + r.w).toBeLessThanOrEqual(V.MAP_W * V.TILE);
    }
  });
});
