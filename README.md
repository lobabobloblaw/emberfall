# Emberfall

**Play it: <https://lobabobloblaw.github.io/emberfall/>**

A 16-bit style browser RPG prototype. Every texture and sprite is AI-generated through
[Replicate](https://replicate.com)'s Retro Diffusion models (`rd-fast`, `rd-plus`,
`rd-tile`, `rd-animation`) from the declarative shot list in `tools/shotlist.ts`.

## Run

```bash
npm install
npx playwright install chromium   # once, for e2e tests
npm run dev                       # play at http://localhost:5173
```

Arrow keys / WASD to move, E or Space to interact, I for inventory, T to toggle the
evening tint (FX layer). Talk to the elder, loot the chest by the pond, beat the slime
in the east meadow, and save by drinking at the well.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` / `npm run preview` | Static production build / serve it |
| `npm test` | Vitest unit tests (dialogue, inventory, battle, map logic) |
| `npm run test:e2e` | Playwright e2e + layering screenshot regression |
| `npm run verify` | gen:qa + unit + e2e + typecheck — the full gate |
| `npm run gen` | Run the shot list (cache-first; `-- --only <id>` for one asset) |
| `npm run gen:qa` | Asset QA gate (alpha edges, sizes, palette discipline, blank frames) |
| `npm run postprocess` | Slice spritesheets, split canopies/roofs, quantize, emit manifest |

## Asset pipeline

`tools/shotlist.ts` (what to generate) → `tools/generate.ts` (content-addressed cache in
`tools/.cache/`, then copies to `assets-src/raw/`) → `tools/postprocess.ts` (slice, split,
DB32-quantize, pack into `public/assets/` + `manifest.json`) → the game loads **only** via
`public/assets/manifest.json`.

Model input schemas fetched from Replicate live in `tools/schemas/*.json` — ground truth
for style enums and size limits. Spritesheet grid layouts were probed from real outputs
and are recorded in `tools/atlas.config.ts`.

To regenerate art you need `REPLICATE_API_TOKEN` in `.env` (set a spend limit in the
Replicate billing dashboard first). Unchanged entries replay from `tools/.cache` at $0.

Future upgrade path: Retro Diffusion's native API (RD Pro tier) adds spritesheet /
inventory-grid styles and a `check_cost` dry-run endpoint beyond what the four Replicate
models expose.
