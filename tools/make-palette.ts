// Writes assets-src/palette.png — the DawnBringer-32 master palette, one pixel per color.
// This PNG is inlined as a data URL into every rd-fast/rd-plus shot-list input, so its
// BYTES ARE PART OF EVERY CACHE KEY. Do not regenerate it after assets have been
// generated unless you intend to invalidate the entire cache.
import sharp from "sharp";
import { DB32_RGB } from "./db32";

const raw = Buffer.alloc(DB32_RGB.length * 3);
DB32_RGB.forEach(([r, g, b], i) => {
  raw[i * 3] = r;
  raw[i * 3 + 1] = g;
  raw[i * 3 + 2] = b;
});

const img = sharp(raw, { raw: { width: DB32_RGB.length, height: 1, channels: 3 } });
await img.clone().png({ compressionLevel: 9 }).toFile("assets-src/palette.png");
await img
  .clone()
  .resize(DB32_RGB.length * 8, 8, { kernel: "nearest" })
  .png()
  .toFile("assets-src/palette-preview.png");

console.log("✔ assets-src/palette.png (32x1) + palette-preview.png");
