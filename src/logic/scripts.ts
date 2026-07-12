// All dialogue content + flag-based branching. Pure: reads context, returns data.
import type { DialogueResult } from "./dialogue";

export interface ScriptContext {
  flags: ReadonlySet<string>;
  hasItem(id: string): boolean;
}

const ELDER = { speaker: "Elder Rowan", portrait: "portrait-elder" };
const MERCHANT = { speaker: "Marla", portrait: "portrait-merchant" };
const VILLAGER = { speaker: "Pip", portrait: "portrait-villager" };

export function getDialogue(id: string, ctx: ScriptContext): DialogueResult {
  switch (id) {
    case "elder": {
      if (!ctx.flags.has("quest_started")) {
        return {
          pages: [
            { ...ELDER, text: "Ah, a ranger of the green cloak! Emberfall could use your bow about now." },
            { ...ELDER, text: "Slimes have crept out of the east meadow. Drive off their leader before they reach the granary." },
            { ...ELDER, text: "My brother left his old gear in a chest by the pond, past the grove. Take it — you'll want steel in hand." }
          ],
          effects: [{ type: "set-flag", flag: "quest_started" }]
        };
      }
      if (!ctx.flags.has("battle_won")) {
        return {
          pages: [
            {
              ...ELDER,
              text: ctx.hasItem("sword")
                ? "You have the sword? Good. The big slime lurks in the east meadow, past the fences."
                : "The chest sits by the pond, southwest past the grove. Fetch the sword before you fight."
            }
          ],
          effects: []
        };
      }
      if (!ctx.flags.has("quest_rewarded")) {
        return {
          pages: [
            { ...ELDER, text: "The meadow is quiet again — you drove the beast off! You have my thanks." },
            { ...ELDER, text: "Take these coins. And rest at the well whenever you pass; its water keeps a traveler's strength." }
          ],
          effects: [
            { type: "give-coins", amount: 10 },
            { type: "set-flag", flag: "quest_rewarded" }
          ]
        };
      }
      return { pages: [{ ...ELDER, text: "Fine weather over Emberfall today. May your trails stay clear, ranger." }], effects: [] };
    }
    case "merchant":
      return {
        pages: [
          { ...MERCHANT, text: "Shop's shut while I mind the stall — but here's free advice, dear." },
          { ...MERCHANT, text: "Drop a coin's worth of thanks at the old well and take a drink. It mends wounds and... keeps your place in the world, if you follow me." }
        ],
        effects: []
      };
    case "villager":
      return {
        pages: [
          {
            ...VILLAGER,
            text: ctx.flags.has("battle_won")
              ? "You BONKED that slime! I saw it from the fence. Wham! Splat!"
              : "Don't go east past the fences! The slimes bounce around there. One's HUGE."
          }
        ],
        effects: []
      };
    case "chest": {
      if (!ctx.flags.has("chest_opened")) {
        return {
          pages: [
            { text: "The old chest creaks open..." },
            { text: "You found a Rusty Sword and 2 Potions!" }
          ],
          effects: [
            { type: "open-chest" },
            { type: "give-item", id: "sword", name: "Rusty Sword", qty: 1 },
            { type: "give-item", id: "potion", name: "Potion", qty: 2 }
          ]
        };
      }
      return { pages: [{ text: "The chest is empty." }], effects: [] };
    }
    case "sign":
      return {
        pages: [{ text: "EMBERFALL VILLAGE — pop. 23.\nEast meadow closed: slime infestation." }],
        effects: []
      };
    case "cottage-door":
      return { pages: [{ text: "The door is locked. The Farley family must be out in the fields." }], effects: [] };
    case "shop-door":
      return { pages: [{ text: "Closed today. A hand-drawn slime with X eyes decorates the notice." }], effects: [] };
    case "well": {
      return {
        pages: [
          { text: "You draw the bucket and drink. The cold water washes the road off you." },
          { text: "HP restored. Progress saved." }
        ],
        effects: [{ type: "save-heal" }]
      };
    }
    case "defeat":
      return {
        pages: [
          { text: "Everything goes green and sticky..." },
          { text: "You wake by the well, soaked and sore, clutching 1 HP. The well's water steadies you." }
        ],
        effects: []
      };
    default:
      return { pages: [{ text: "..." }], effects: [] };
  }
}
