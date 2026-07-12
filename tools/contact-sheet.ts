// Builds labeled contact sheets of assets-src/raw for human/agent review.
// Output: tools/.cache/contact/*.png (ephemeral, gitignored).
import sharp from "sharp";
import { readdir, mkdir } from "node:fs/promises";

const OUT = "tools/.cache/contact";
const RAW = "assets-src/raw";
await mkdir(OUT, { recursive: true });

const groups: Record<string, (n: string) => boolean> = {
  "sheet-props": (n) => n.startsWith("obj-") || n.startsWith("icon-") || n === "battle-slime" || n === "ui-panel",
  "sheet-tiles": (n) => n.startsWith("tile"),
  "sheet-chars": (n) => n.startsWith("char-") || n.startsWith("portrait-"),
  "sheet-scenes": (n) => n.startsWith("scene-")
};

const files = (await readdir(RAW)).filter((f) => f.endsWith(".png")).sort();

for (const [sheetName, match] of Object.entries(groups)) {
  const members = files.filter((f) => match(f.replace(".png", "")));
  if (members.length === 0) continue;
  const cells: { img: Buffer; w: number; h: number; label: string }[] = [];
  for (const f of members) {
    const p = `${RAW}/${f}`;
    const meta = await sharp(p).metadata();
    const scale = meta.width! <= 100 ? 3 : meta.width! <= 200 ? 2 : 1;
    const w = meta.width! * scale;
    const h = meta.height! * scale;
    const img = await sharp(p).resize(w, h, { kernel: "nearest" }).png().toBuffer();
    cells.push({ img, w, h, label: f.replace(".png", "") });
  }
  const cols = sheetName === "sheet-scenes" ? 2 : 5;
  const cellW = Math.max(...cells.map((c) => c.w)) + 16;
  const cellH = Math.max(...cells.map((c) => c.h)) + 34;
  const rows = Math.ceil(cells.length / cols);
  const W = cols * cellW;
  const H = rows * cellH;
  const composites: sharp.OverlayOptions[] = [];
  const labels: string[] = [];
  cells.forEach((c, i) => {
    const x = (i % cols) * cellW + Math.floor((cellW - c.w) / 2);
    const y = Math.floor(i / cols) * cellH + 4;
    composites.push({ input: c.img, left: x, top: y });
    const lx = (i % cols) * cellW + cellW / 2;
    const ly = Math.floor(i / cols) * cellH + cellH - 10;
    labels.push(`<text x="${lx}" y="${ly}" font-family="monospace" font-size="13" fill="#e8e8f0" text-anchor="middle">${c.label}</text>`);
  });
  composites.push({ input: Buffer.from(`<svg width="${W}" height="${H}">${labels.join("")}</svg>`), left: 0, top: 0 });
  await sharp({ create: { width: W, height: H, channels: 4, background: { r: 42, g: 45, b: 62, alpha: 1 } } })
    .composite(composites)
    .png()
    .toFile(`${OUT}/${sheetName}.png`);
  console.log(`${sheetName}: ${members.length} assets -> ${W}x${H}`);
}
