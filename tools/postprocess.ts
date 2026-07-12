// Turns raw generations (assets-src/raw) into game-ready assets (public/assets) plus
// public/assets/manifest.json — the ONLY path through which the game loads art.
//   - quantizes rd-tile / rd-animation outputs to DB32 (those models take no palette input)
//   - binarizes alpha on remove_bg outputs (halo cleanup)
//   - splits tall objects into below (base) / above (walk-behind) layers
//   - packs terrain+water+extra tiles into one master tileset
//   - emits debug sheets to tools/.cache/contact/ for eyeballing
import sharp, { type OverlayOptions } from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { nearestDb32 } from "./db32";
import { CHAR_SHEETS, SLIME_SHEET, OBJECT_SPLITS, PLAIN_OBJECTS, TILESET, TILE_NAMES, COPY_GROUPS } from "./atlas.config";

const RAW = "assets-src/raw";
const OUT = "public/assets";
const DEBUG = "tools/.cache/contact";

interface RawImage {
  data: Buffer;
  width: number;
  height: number;
}

async function loadRaw(path: string): Promise<RawImage> {
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

function process(img: RawImage, opts: { quantize: boolean; binarizeAlpha: boolean }): RawImage {
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (opts.binarizeAlpha) d[i + 3] = d[i + 3] < 64 ? 0 : 255;
    if (d[i + 3] === 0) {
      d[i] = d[i + 1] = d[i + 2] = 0; // uniform transparent pixels compress better
      continue;
    }
    if (opts.quantize) {
      const [r, g, b] = nearestDb32(d[i], d[i + 1], d[i + 2]);
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
    }
  }
  return img;
}

async function savePng(img: RawImage, path: string): Promise<void> {
  await mkdir(path.slice(0, path.lastIndexOf("/")), { recursive: true });
  await sharp(img.data, { raw: { width: img.width, height: img.height, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(path);
}

function crop(img: RawImage, x: number, y: number, w: number, h: number): RawImage {
  const out = Buffer.alloc(w * h * 4);
  for (let row = 0; row < h; row++) {
    img.data.copy(out, row * w * 4, ((y + row) * img.width + x) * 4, ((y + row) * img.width + x + w) * 4);
  }
  return { data: out, width: w, height: h };
}

function blit(dst: RawImage, src: RawImage, x: number, y: number): void {
  for (let row = 0; row < src.height; row++) {
    src.data.copy(dst.data, ((y + row) * dst.width + x) * 4, row * src.width * 4, (row + 1) * src.width * 4);
  }
}

const manifest: Record<string, unknown> = { version: 1, tileSize: 32 };

await mkdir(DEBUG, { recursive: true });

// ------------------------------------------------------------------ characters
const characters: Record<string, unknown> = {};
for (const [name, spec] of Object.entries(CHAR_SHEETS)) {
  const img = process(await loadRaw(`${RAW}/${spec.src}.png`), { quantize: spec.quantize, binarizeAlpha: true });
  await savePng(img, `${OUT}/characters/${name}.png`);
  const anims: Record<string, number[]> = {};
  const idle: Record<string, number> = {};
  for (const facing of ["up", "down", "left", "right"] as const) {
    const row = spec.rows[facing];
    anims[facing] = Array.from({ length: spec.cols }, (_, c) => row * spec.cols + c);
    idle[facing] = row * spec.cols + spec.idleCol;
  }
  characters[name] = {
    file: `characters/${name}.png`,
    frameWidth: spec.frame,
    frameHeight: spec.frame,
    columns: spec.cols,
    anims,
    idle,
    frameRate: 8
  };
}
{
  const img = process(await loadRaw(`${RAW}/${SLIME_SHEET.src}.png`), { quantize: SLIME_SHEET.quantize, binarizeAlpha: true });
  await savePng(img, `${OUT}/characters/slime.png`);
  characters["slime"] = {
    file: "characters/slime.png",
    frameWidth: SLIME_SHEET.frame,
    frameHeight: SLIME_SHEET.frame,
    columns: SLIME_SHEET.cols,
    anims: { idle: SLIME_SHEET.idleFrames },
    idle: { down: SLIME_SHEET.idleFrames[0] },
    frameRate: 4
  };
}
manifest.characters = characters;

// ------------------------------------------------------------------- objects
const objects: Record<string, unknown> = {};
for (const [id, frac] of Object.entries(OBJECT_SPLITS)) {
  const img = process(await loadRaw(`${RAW}/${id}.png`), { quantize: false, binarizeAlpha: true });
  const name = id.replace(/^obj-/, "");
  const splitY = Math.round(img.height * frac);
  const above = crop(img, 0, 0, img.width, splitY);
  const below = crop(img, 0, splitY, img.width, img.height - splitY);
  await savePng(above, `${OUT}/objects/${name}-above.png`);
  await savePng(below, `${OUT}/objects/${name}-below.png`);
  objects[name] = {
    below: `objects/${name}-below.png`,
    above: `objects/${name}-above.png`,
    width: img.width,
    height: img.height,
    splitY
  };
}
for (const id of PLAIN_OBJECTS) {
  const img = process(await loadRaw(`${RAW}/${id}.png`), { quantize: false, binarizeAlpha: true });
  const name = id.replace(/^obj-/, "");
  await savePng(img, `${OUT}/objects/${name}.png`);
  objects[name] = { below: `objects/${name}.png`, width: img.width, height: img.height };
}
manifest.objects = objects;

// -------------------------------------------------------------------- tileset
{
  const T = 32;
  const cols = TILESET.columns;
  const cells: RawImage[] = [];
  for (const part of [TILESET.terrain, TILESET.water]) {
    const img = process(await loadRaw(`${RAW}/${part.src}.png`), { quantize: true, binarizeAlpha: true });
    if (img.width !== part.cols * T || img.height !== part.rows * T) {
      throw new Error(`${part.src}: expected ${part.cols * T}x${part.rows * T}, got ${img.width}x${img.height}`);
    }
    for (let r = 0; r < part.rows; r++) for (let c = 0; c < part.cols; c++) cells.push(crop(img, c * T, r * T, T, T));
  }
  for (const id of TILESET.extras) {
    const img = process(await loadRaw(`${RAW}/${id}.png`), { quantize: true, binarizeAlpha: true });
    if (img.width !== T || img.height !== T) throw new Error(`${id}: expected ${T}x${T}, got ${img.width}x${img.height}`);
    cells.push(img);
  }
  const rows = Math.ceil(cells.length / cols);
  const master: RawImage = { data: Buffer.alloc(cols * T * rows * T * 4), width: cols * T, height: rows * T };
  cells.forEach((cell, i) => blit(master, cell, (i % cols) * T, Math.floor(i / cols) * T));
  await savePng(master, `${OUT}/tiles/tileset.png`);
  manifest.tileset = { file: "tiles/tileset.png", columns: cols, count: cells.length, names: TILE_NAMES };

  // debug: x4 upscale with index labels
  const scale = 4;
  const up = await sharp(`${OUT}/tiles/tileset.png`).resize(master.width * scale, master.height * scale, { kernel: "nearest" }).png().toBuffer();
  const labels = cells
    .map((_, i) => {
      const x = (i % cols) * T * scale + 4;
      const y = Math.floor(i / cols) * T * scale + 18;
      return `<text x="${x}" y="${y}" font-family="monospace" font-size="16" font-weight="bold" fill="#ffffff" stroke="#000000" stroke-width="3" paint-order="stroke">${i}</text>`;
    })
    .join("");
  await sharp({ create: { width: master.width * scale, height: master.height * scale, channels: 4, background: { r: 42, g: 45, b: 62, alpha: 1 } } })
    .composite([{ input: up, left: 0, top: 0 }, { input: Buffer.from(`<svg width="${master.width * scale}" height="${master.height * scale}">${labels}</svg>`), left: 0, top: 0 }])
    .png()
    .toFile(`${DEBUG}/tileset-indexed.png`);
}

// --------------------------------------------------------------------- copies
for (const group of Object.values(COPY_GROUPS)) {
  const entries: Record<string, string> = {};
  for (const id of group.ids) {
    const img = process(await loadRaw(`${RAW}/${id}.png`), { quantize: false, binarizeAlpha: group.binarizeAlpha });
    const name = id.replace(group.strip, "");
    await savePng(img, `${OUT}/${group.folder}/${name}.png`);
    entries[name] = `${group.folder}/${name}.png`;
  }
  manifest[group.folder] = entries;
}

await writeFile(`${OUT}/manifest.json`, JSON.stringify(manifest, null, 2));
console.log(`✔ postprocess complete -> ${OUT}/manifest.json`);

// debug sheet: object splits with cut line marked
{
  const ids = Object.keys(OBJECT_SPLITS);
  const cellW = 200;
  const cellH = 220;
  const comps: OverlayOptions[] = [];
  const svgs: string[] = [];
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const meta = await sharp(`${RAW}/${id}.png`).metadata();
    const scale = Math.floor(Math.min((cellW - 20) / meta.width!, (cellH - 40) / meta.height!));
    const w = meta.width! * scale;
    const h = meta.height! * scale;
    const buf = await sharp(`${RAW}/${id}.png`).resize(w, h, { kernel: "nearest" }).png().toBuffer();
    const x = i * cellW + Math.floor((cellW - w) / 2);
    const y = 10;
    comps.push({ input: buf, left: x, top: y });
    const cutY = y + Math.round(meta.height! * OBJECT_SPLITS[id]) * scale;
    svgs.push(`<line x1="${x}" y1="${cutY}" x2="${x + w}" y2="${cutY}" stroke="#ff4488" stroke-width="2" stroke-dasharray="6,3"/>`);
    svgs.push(`<text x="${i * cellW + cellW / 2}" y="${cellH - 8}" font-family="monospace" font-size="13" fill="#e8e8f0" text-anchor="middle">${id}</text>`);
  }
  const W = ids.length * cellW;
  comps.push({ input: Buffer.from(`<svg width="${W}" height="${cellH}">${svgs.join("")}</svg>`), left: 0, top: 0 });
  await sharp({ create: { width: W, height: cellH, channels: 4, background: { r: 42, g: 45, b: 62, alpha: 1 } } })
    .composite(comps)
    .png()
    .toFile(`${DEBUG}/object-splits.png`);
  console.log(`✔ debug sheets -> ${DEBUG}/tileset-indexed.png, ${DEBUG}/object-splits.png`);
}
