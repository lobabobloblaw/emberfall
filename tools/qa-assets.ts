// Asset QA gate (plan §4.5.4) — fails loudly with the offending asset id.
// Checks, per game-ready asset in public/assets:
//   - manifest-referenced files exist with the expected dimensions
//   - remove_bg outputs have binarized alpha and transparent corners (no halos)
//   - quantized assets use ONLY DB32 colors; palette-guided ones stay near-palette
//   - no blank animation frame in any character sheet
//   - every packed tileset cell is non-blank and fully opaque
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { DB32_RGB } from "./db32";

const OUT = "public/assets";
const failures: string[] = [];
const ok = (msg: string) => console.log(`  ✔ ${msg}`);
const fail = (msg: string) => {
  failures.push(msg);
  console.error(`  ✘ ${msg}`);
};

const manifest = JSON.parse(await readFile(`${OUT}/manifest.json`, "utf8"));
const db32set = new Set(DB32_RGB.map(([r, g, b]) => (r << 16) | (g << 8) | b));

async function raw(file: string) {
  const { data, info } = await sharp(`${OUT}/${file}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { d: data, w: info.width, h: info.height };
}

function colorStats(d: Buffer) {
  const colors = new Set<number>();
  let softAlpha = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] !== 0 && d[i + 3] !== 255) softAlpha++;
    if (d[i + 3] > 0) colors.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
  }
  return { colors, softAlpha };
}

function frameBlank(img: { d: Buffer; w: number }, fx: number, fy: number, fw: number, fh: number): boolean {
  let opaque = 0;
  for (let y = fy; y < fy + fh; y++) {
    for (let x = fx; x < fx + fw; x++) {
      if (img.d[(y * img.w + x) * 4 + 3] > 0) opaque++;
    }
  }
  return opaque < 40;
}

console.log("characters:");
for (const [name, c] of Object.entries<any>(manifest.characters)) {
  const img = await raw(c.file);
  if (img.w % c.frameWidth !== 0 || img.h % c.frameHeight !== 0) {
    fail(`${name}: sheet ${img.w}x${img.h} not divisible by frame ${c.frameWidth}x${c.frameHeight}`);
    continue;
  }
  const { colors, softAlpha } = colorStats(img.d);
  if (softAlpha > 0) fail(`${name}: ${softAlpha} soft-alpha pixels (binarize failed)`);
  const offPalette = [...colors].filter((c) => !db32set.has(c));
  if (offPalette.length > 0) fail(`${name}: ${offPalette.length} non-DB32 colors after quantize`);
  const usedFrames = new Set<number>(Object.values(c.anims as Record<string, number[]>).flat());
  const cols = c.columns;
  for (const f of usedFrames) {
    const fx = (f % cols) * c.frameWidth;
    const fy = Math.floor(f / cols) * c.frameHeight;
    if (frameBlank(img, fx, fy, c.frameWidth, c.frameHeight)) fail(`${name}: frame ${f} is blank`);
  }
  ok(`${name}: ${img.w}x${img.h}, ${colors.size} colors, ${usedFrames.size} frames non-blank`);
}

console.log("tileset:");
{
  const t = manifest.tileset;
  const img = await raw(t.file);
  const T = manifest.tileSize;
  if (img.w !== t.columns * T) fail(`tileset: width ${img.w} != ${t.columns * T}`);
  const { colors, softAlpha } = colorStats(img.d);
  if (softAlpha > 0) fail(`tileset: soft alpha pixels`);
  const offPalette = [...colors].filter((c) => !db32set.has(c));
  if (offPalette.length > 0) fail(`tileset: ${offPalette.length} non-DB32 colors`);
  for (let i = 0; i < t.count; i++) {
    const fx = (i % t.columns) * T;
    const fy = Math.floor(i / t.columns) * T;
    if (frameBlank(img, fx, fy, T, T)) fail(`tileset: cell ${i} is blank`);
    for (let y = fy; y < fy + T; y++) {
      for (let x = fx; x < fx + T; x++) {
        if (img.d[(y * img.w + x) * 4 + 3] !== 255) {
          fail(`tileset: cell ${i} has transparent pixels`);
          y = fy + T;
          break;
        }
      }
    }
  }
  const named = Object.values(t.names as Record<string, number>);
  if (new Set(named).size !== named.length) fail("tileset: duplicate indices in names");
  if (Math.max(...named) >= t.count) fail("tileset: name index out of range");
  ok(`tileset: ${t.count} cells packed, ${named.length} named, ${colors.size} colors`);
}

console.log("objects (transparent, halo-free):");
for (const [name, o] of Object.entries<any>(manifest.objects)) {
  for (const part of ["below", "above"] as const) {
    if (!o[part]) continue;
    const img = await raw(o[part]);
    if (img.w !== o.width) fail(`${name}.${part}: width ${img.w} != ${o.width}`);
    const { colors, softAlpha } = colorStats(img.d);
    if (softAlpha > 0) fail(`${name}.${part}: soft alpha`);
    if (colors.size > 48) fail(`${name}.${part}: ${colors.size} colors > 48 (palette drift)`);
    const corners = [0, (img.w - 1) * 4, (img.h - 1) * img.w * 4, ((img.h - 1) * img.w + img.w - 1) * 4];
    // "above" parts sit at the image top so their lower corners may touch content;
    // check top corners for above, bottom corners for below, all four for unsplit.
    const check = o.above ? (part === "above" ? corners.slice(0, 2) : corners.slice(2)) : corners;
    for (const cidx of check) {
      if (img.d[cidx + 3] !== 0) {
        fail(`${name}.${part}: corner not transparent (remove_bg halo?)`);
        break;
      }
    }
  }
  const below = await sharp(`${OUT}/${o.below}`).metadata();
  const above = o.above ? await sharp(`${OUT}/${o.above}`).metadata() : null;
  const totalH = (below.height ?? 0) + (above?.height ?? 0);
  if (totalH !== o.height) fail(`${name}: split heights ${totalH} != ${o.height}`);
  ok(`${name}: ${o.width}x${o.height}${o.above ? ` split at ${o.splitY}` : ""}`);
}

console.log("flat copies:");
for (const group of ["portraits", "icons", "scenes", "battle", "ui"]) {
  for (const [name, file] of Object.entries<string>(manifest[group])) {
    const img = await raw(file);
    const { colors, softAlpha } = colorStats(img.d);
    const limit = group === "scenes" ? 64 : 48;
    if (colors.size > limit) fail(`${group}/${name}: ${colors.size} colors > ${limit}`);
    if ((group === "icons" || group === "battle") && softAlpha > 0) fail(`${group}/${name}: soft alpha`);
    ok(`${group}/${name}: ${img.w}x${img.h}, ${colors.size} colors`);
  }
}

if (failures.length > 0) {
  console.error(`\nQA FAILED: ${failures.length} issue(s)`);
  process.exit(1);
}
console.log("\nQA PASSED");
