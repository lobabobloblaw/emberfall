import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { dirname } from "node:path";

export const CACHE_DIR = "tools/.cache";

// The reproducibility contract: an asset's identity is the hash of (model + exact input
// JSON). Same shot-list entry -> same key -> free replay from tools/.cache.
export function cacheKeyFor(model: string, input: Record<string, unknown>): string {
  return createHash("sha256")
    .update(model + JSON.stringify(input))
    .digest("hex")
    .slice(0, 16);
}

export async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function writeFileEnsuring(path: string, data: Buffer | string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, data);
}

export async function copyFileEnsuring(from: string, to: string): Promise<void> {
  await writeFileEnsuring(to, await readFile(from));
}

export async function fileToDataUrl(path: string): Promise<string> {
  const buf = await readFile(path);
  return `data:image/png;base64,${buf.toString("base64")}`;
}
