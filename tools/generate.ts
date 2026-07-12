// Cache-first asset generator.
//   npm run gen                  -> run every shot-list entry (cache hit = free replay)
//   npm run gen -- --only <id>   -> run a single entry
//   npm run gen -- --print-keys  -> print {id, key, model, input, out} JSON lines, no generation
//
// Cache misses call the Replicate API and need REPLICATE_API_TOKEN in .env.
// The committed art was originally generated through the Replicate MCP connector and
// stored in tools/.cache under these same keys, so a full run replays at $0.
import Replicate from "replicate";
import "dotenv/config";
import { buildShotlist, type Shot } from "./shotlist";
import { CACHE_DIR, cacheKeyFor, copyFileEnsuring, exists, writeFileEnsuring } from "./lib";

const argv = process.argv.slice(2);
const only = argv.includes("--only") ? argv[argv.indexOf("--only") + 1] : null;
const printKeys = argv.includes("--print-keys");
const CONCURRENCY = 3;

const all = await buildShotlist();
const shots = only ? all.filter((s) => s.id === only) : all;
if (only && shots.length === 0) {
  console.error(`no shot with id "${only}"`);
  process.exit(1);
}

if (printKeys) {
  for (const s of shots) {
    console.log(JSON.stringify({ id: s.id, key: cacheKeyFor(s.model, s.input), model: s.model, input: s.input, out: s.out }));
  }
  process.exit(0);
}

let replicate: Replicate | null = null;

async function runShot(shot: Shot): Promise<void> {
  const key = cacheKeyFor(shot.model, shot.input);
  const cached = `${CACHE_DIR}/${key}.png`;
  if (await exists(cached)) {
    await copyFileEnsuring(cached, shot.out);
    console.log(`✔ ${shot.id} (cache ${key}) -> ${shot.out}`);
    return;
  }
  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error(
      `${shot.id}: no cache entry ${key} and REPLICATE_API_TOKEN is not set.\n` +
        `Add a token to .env (replicate.com/account/api-tokens) to generate this asset.`
    );
  }
  replicate ??= new Replicate();
  const output = await replicate.run(shot.model, { input: shot.input });
  const file = Array.isArray(output) ? output[0] : output;
  // replicate JS client v1+ returns FileOutput; .blob() yields the bytes
  const bytes = await (file as { blob(): Promise<Blob> }).blob().then((b) => b.arrayBuffer());
  const buf = Buffer.from(new Uint8Array(bytes));
  await writeFileEnsuring(cached, buf);
  await copyFileEnsuring(cached, shot.out);
  console.log(`↻ ${shot.id} GENERATED (${key}) -> ${shot.out}`);
}

const failures: string[] = [];
for (let i = 0; i < shots.length; i += CONCURRENCY) {
  const batch = shots.slice(i, i + CONCURRENCY);
  const results = await Promise.allSettled(batch.map(runShot));
  results.forEach((r, j) => {
    if (r.status === "rejected") {
      failures.push(batch[j].id);
      console.error(`✘ ${batch[j].id}: ${r.reason instanceof Error ? r.reason.message : r.reason}`);
    }
  });
}

if (failures.length > 0) {
  console.error(`\n${failures.length} shot(s) failed: ${failures.join(", ")}`);
  process.exit(1);
}
console.log(`\nall ${shots.length} shot(s) ok`);
