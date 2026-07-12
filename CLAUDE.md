# Emberfall — 16-bit browser RPG

Commands: npm run dev | build | test | test:e2e | verify | gen [-- --only <id>] | gen:qa

Rules:

- All art comes from tools/shotlist.ts via Replicate. Never add art by other means.
- Never commit .env or tools/.cache. Never bulk-regenerate passing assets (real $ cost).
- After code changes run `npm run verify` before considering a task done.
- Depth constants live in src/config/layers.ts — never hardcode depths elsewhere.
- Game code reads assets only via public/assets/manifest.json.
- Screenshot baselines change only with intentional art changes, noted in the commit.

Docs: Replicate schemas in tools/schemas/*.json (source of truth for styles/sizes).

Note: art was generated through the Replicate MCP connector (hosted OAuth) because no
local REPLICATE_API_TOKEN existed; outputs were written into tools/.cache under the same
content-addressed keys `npm run gen` computes, so the pipeline replays from cache at $0.
Set REPLICATE_API_TOKEN in .env to regenerate new/changed shot-list entries directly.
