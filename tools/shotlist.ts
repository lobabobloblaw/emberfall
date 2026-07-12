// The single source of truth for every piece of art in Emberfall.
// Every visible asset in the game traces back to exactly one entry here.
// Inputs are validated against tools/schemas/*.json (fetched from Replicate).
//
// Key rules:
// - Property order inside `input` is part of the cache key (JSON.stringify) — never
//   reorder properties of an existing entry.
// - Only non-default parameters are included, and every entry pins a `seed`.
// - rd-fast / rd-plus entries carry the DB32 palette as input_palette; rd-tile and
//   rd-animation have no palette parameter, so postprocess quantizes those outputs.

import { fileToDataUrl } from "./lib";

export interface Shot {
  id: string;
  model: `${string}/${string}`;
  input: Record<string, unknown>;
  out: string; // raw output path under assets-src/raw/
}

const RD_FAST = "retro-diffusion/rd-fast" as const;
const RD_PLUS = "retro-diffusion/rd-plus" as const;
const RD_TILE = "retro-diffusion/rd-tile" as const;
const RD_ANIM = "retro-diffusion/rd-animation" as const;

export async function buildShotlist(): Promise<Shot[]> {
  const palette = await fileToDataUrl("assets-src/palette.png");
  const raw = (id: string) => `assets-src/raw/${id}.png`;

  const shots: Shot[] = [
    // ---------------------------------------------------------------- tiles
    {
      id: "tileset-terrain",
      model: RD_TILE,
      input: {
        prompt: "lush green grass meadow and packed brown dirt path, top-down JRPG village terrain",
        style: "tileset",
        width: 32,
        height: 32,
        seed: 7101
      },
      out: raw("tileset-terrain")
    },
    {
      id: "tileset-water",
      model: RD_TILE,
      input: {
        prompt: "clear blue pond water with gentle ripples and grassy green shore, top-down JRPG",
        style: "tileset",
        width: 32,
        height: 32,
        seed: 7102
      },
      out: raw("tileset-water")
    },
    {
      id: "tile-grass-a",
      model: RD_TILE,
      input: {
        prompt: "plain lush green grass texture, top-down JRPG ground",
        style: "single_tile",
        width: 32,
        height: 32,
        seed: 7103
      },
      out: raw("tile-grass-a")
    },
    {
      id: "tile-grass-b",
      model: RD_TILE,
      input: {
        prompt: "green grass with a few small weeds and pebbles, top-down JRPG ground",
        style: "single_tile",
        width: 32,
        height: 32,
        seed: 7104
      },
      out: raw("tile-grass-b")
    },
    {
      id: "tile-flowers",
      model: RD_TILE,
      input: {
        prompt: "green grass dotted with tiny red and yellow wildflowers, top-down JRPG ground",
        style: "single_tile",
        width: 32,
        height: 32,
        seed: 7105
      },
      out: raw("tile-flowers")
    },
    {
      id: "tile-stone-path",
      model: RD_TILE,
      input: {
        prompt: "grey cobblestone path texture, worn round stones, top-down JRPG ground",
        style: "single_tile",
        width: 32,
        height: 32,
        seed: 7106
      },
      out: raw("tile-stone-path")
    },

    // ------------------------------------------------------- large scenery
    {
      id: "obj-tree-oak",
      model: RD_PLUS,
      input: {
        prompt: "large oak tree with a wide round leafy canopy and visible trunk, single game object",
        style: "topdown_asset",
        width: 96,
        height: 96,
        remove_bg: true,
        input_palette: palette,
        seed: 7201
      },
      out: raw("obj-tree-oak")
    },
    {
      id: "obj-tree-pine",
      model: RD_PLUS,
      input: {
        prompt: "tall dark green pine tree with layered branches and visible trunk, single game object",
        style: "topdown_asset",
        width: 96,
        height: 96,
        remove_bg: true,
        input_palette: palette,
        seed: 7202
      },
      out: raw("obj-tree-pine")
    },
    {
      id: "obj-rock",
      model: RD_FAST,
      input: {
        prompt: "grey mossy boulder rock, top-down JRPG map object",
        style: "game_asset",
        width: 48,
        height: 48,
        remove_bg: true,
        input_palette: palette,
        seed: 7203
      },
      out: raw("obj-rock")
    },
    {
      id: "obj-bush",
      model: RD_FAST,
      input: {
        prompt: "round green leafy bush with small red berries, top-down JRPG map object",
        style: "game_asset",
        width: 48,
        height: 48,
        remove_bg: true,
        input_palette: palette,
        seed: 7204
      },
      out: raw("obj-bush")
    },
    {
      id: "obj-well",
      model: RD_PLUS,
      input: {
        prompt: "old stone water well with wooden roof and bucket on a rope, village prop",
        style: "topdown_asset",
        width: 64,
        height: 64,
        remove_bg: true,
        input_palette: palette,
        seed: 7205
      },
      out: raw("obj-well")
    },
    {
      id: "obj-fence",
      model: RD_FAST,
      input: {
        prompt: "wooden fence segment with two horizontal rails, top-down JRPG map object",
        style: "game_asset",
        width: 32,
        height: 32,
        remove_bg: true,
        input_palette: palette,
        seed: 7206
      },
      out: raw("obj-fence")
    },
    {
      id: "obj-cottage",
      model: RD_PLUS,
      input: {
        prompt: "small village cottage with red shingle roof, stone walls, wooden door and one window",
        style: "topdown_asset",
        width: 160,
        height: 160,
        remove_bg: true,
        input_palette: palette,
        seed: 7207
      },
      out: raw("obj-cottage")
    },
    {
      id: "obj-shop",
      model: RD_PLUS,
      input: {
        prompt: "village general store with green roof, striped awning and hanging shop sign",
        style: "topdown_asset",
        width: 160,
        height: 160,
        remove_bg: true,
        input_palette: palette,
        seed: 7208
      },
      out: raw("obj-shop")
    },
    {
      id: "obj-chest-closed",
      model: RD_FAST,
      input: {
        prompt: "closed wooden treasure chest with iron bands, top-down JRPG map object",
        style: "game_asset",
        width: 32,
        height: 32,
        remove_bg: true,
        input_palette: palette,
        seed: 7209
      },
      out: raw("obj-chest-closed")
    },
    {
      id: "obj-chest-open",
      model: RD_FAST,
      input: {
        prompt: "open wooden treasure chest with iron bands, lid up, gold coins inside, top-down JRPG map object",
        style: "game_asset",
        width: 32,
        height: 32,
        remove_bg: true,
        input_palette: palette,
        seed: 7209
      },
      out: raw("obj-chest-open")
    },
    {
      id: "obj-sign",
      model: RD_FAST,
      input: {
        prompt: "wooden signpost with blank plank, top-down JRPG map object",
        style: "game_asset",
        width: 32,
        height: 32,
        remove_bg: true,
        input_palette: palette,
        seed: 7211
      },
      out: raw("obj-sign")
    },

    // ------------------------------------------------------------ characters
    {
      id: "char-hero-walk",
      model: RD_ANIM,
      input: {
        prompt: "young ranger with short brown hair, green hooded cloak, leather boots, walking",
        style: "four_angle_walking",
        width: 48,
        height: 48,
        return_spritesheet: true,
        seed: 7301
      },
      out: raw("char-hero-walk")
    },
    {
      id: "char-elder-walk",
      model: RD_ANIM,
      input: {
        prompt: "elderly village elder with long white beard, brown hooded robe, wooden staff",
        style: "walking_and_idle",
        width: 48,
        height: 48,
        return_spritesheet: true,
        seed: 7302
      },
      out: raw("char-elder-walk")
    },
    {
      id: "char-merchant-walk",
      model: RD_ANIM,
      input: {
        prompt: "cheerful merchant woman with red headscarf, white apron over blue dress",
        style: "walking_and_idle",
        width: 48,
        height: 48,
        return_spritesheet: true,
        seed: 7303
      },
      out: raw("char-merchant-walk")
    },
    {
      id: "char-villager-walk",
      model: RD_ANIM,
      input: {
        prompt: "village farm boy with straw hat and simple beige tunic",
        style: "walking_and_idle",
        width: 48,
        height: 48,
        return_spritesheet: true,
        seed: 7304
      },
      out: raw("char-villager-walk")
    },
    {
      id: "char-slime",
      model: RD_ANIM,
      input: {
        prompt: "cute blue slime blob monster with big round eyes",
        style: "small_sprites",
        width: 32,
        height: 32,
        return_spritesheet: true,
        seed: 7305
      },
      out: raw("char-slime")
    },
    {
      id: "battle-slime",
      model: RD_FAST,
      input: {
        prompt: "blue slime blob monster with big shiny eyes and glossy highlights, side view battle sprite",
        style: "game_asset",
        width: 96,
        height: 96,
        remove_bg: true,
        input_palette: palette,
        seed: 7306
      },
      out: raw("battle-slime")
    },

    // ------------------------------------------------------------- portraits
    {
      id: "portrait-hero",
      model: RD_FAST,
      input: {
        prompt: "young ranger with short brown hair and green hood, determined eyes, bust portrait",
        style: "portrait",
        width: 96,
        height: 96,
        input_palette: palette,
        seed: 7401
      },
      out: raw("portrait-hero")
    },
    {
      id: "portrait-elder",
      model: RD_FAST,
      input: {
        prompt: "wise elderly man with long white beard and brown hood, kind wrinkled face, bust portrait",
        style: "portrait",
        width: 96,
        height: 96,
        input_palette: palette,
        seed: 7402
      },
      out: raw("portrait-elder")
    },
    {
      id: "portrait-merchant",
      model: RD_FAST,
      input: {
        prompt: "cheerful middle-aged merchant woman with red headscarf, warm smile, bust portrait",
        style: "portrait",
        width: 96,
        height: 96,
        input_palette: palette,
        seed: 7403
      },
      out: raw("portrait-merchant")
    },
    {
      id: "portrait-villager",
      model: RD_FAST,
      input: {
        prompt: "young farm boy with straw hat and freckles, curious expression, bust portrait",
        style: "portrait",
        width: 96,
        height: 96,
        input_palette: palette,
        seed: 7404
      },
      out: raw("portrait-villager")
    },

    // ---------------------------------------------------------------- scenes
    {
      id: "scene-title",
      model: RD_PLUS,
      input: {
        prompt: "misty village nestled in a forest valley at dawn, warm glowing cottage windows, distant mountains, 16-bit JRPG title screen background",
        style: "classic",
        width: 320,
        height: 180,
        input_palette: palette,
        seed: 7501
      },
      out: raw("scene-title")
    },
    {
      id: "scene-battle-forest",
      model: RD_PLUS,
      input: {
        prompt: "forest clearing battle background, dense oak trees, grassy ground, dappled evening light",
        style: "environment",
        width: 320,
        height: 180,
        input_palette: palette,
        seed: 7502
      },
      out: raw("scene-battle-forest")
    },
    {
      id: "scene-parallax-forest",
      model: RD_PLUS,
      input: {
        prompt: "distant dark forest treeline silhouette at dusk with soft mist, layered hills",
        style: "classic",
        width: 320,
        height: 80,
        tile_x: true,
        input_palette: palette,
        seed: 7503
      },
      out: raw("scene-parallax-forest")
    },

    // -------------------------------------------------------------------- UI
    {
      id: "ui-panel",
      model: RD_PLUS,
      input: {
        prompt: "square wooden RPG dialogue panel with carved ornate corners and dark parchment center",
        style: "ui_element",
        width: 96,
        height: 96,
        input_palette: palette,
        seed: 7601
      },
      out: raw("ui-panel")
    },
    {
      id: "icon-heart",
      model: RD_FAST,
      input: {
        prompt: "small red heart icon, game HUD item",
        style: "game_asset",
        width: 24,
        height: 24,
        remove_bg: true,
        input_palette: palette,
        seed: 7602
      },
      out: raw("icon-heart")
    },
    {
      id: "icon-potion",
      model: RD_FAST,
      input: {
        prompt: "small red healing potion in a round glass bottle with cork, game item icon",
        style: "game_asset",
        width: 24,
        height: 24,
        remove_bg: true,
        input_palette: palette,
        seed: 7603
      },
      out: raw("icon-potion")
    },
    {
      id: "icon-coin",
      model: RD_FAST,
      input: {
        prompt: "single shiny gold coin, game item icon",
        style: "game_asset",
        width: 24,
        height: 24,
        remove_bg: true,
        input_palette: palette,
        seed: 7604
      },
      out: raw("icon-coin")
    },
    {
      id: "icon-sword",
      model: RD_FAST,
      input: {
        prompt: "rusty iron short sword with worn leather grip, game item icon",
        style: "game_asset",
        width: 24,
        height: 24,
        remove_bg: true,
        input_palette: palette,
        seed: 7605
      },
      out: raw("icon-sword")
    }
  ];

  const ids = new Set<string>();
  for (const s of shots) {
    if (ids.has(s.id)) throw new Error(`duplicate shot id: ${s.id}`);
    ids.add(s.id);
  }
  return shots;
}
