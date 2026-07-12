import { describe, expect, it } from "vitest";
import { clearSave, hasSave, loadGame, saveGame, SAVE_KEY, type StorageLike } from "./save";
import { GameState } from "./state";

function fakeStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k)
  };
}

describe("save/load", () => {
  it("round-trips full game state", () => {
    const storage = fakeStorage();
    const state = GameState.fresh({ x: 640, y: 816 });
    state.flags.add("quest_started");
    state.flags.add("chest_opened");
    state.inventory.add("sword", "Rusty Sword");
    state.inventory.add("potion", "Potion", 2);
    state.hp = 13;
    state.coins = 12;
    state.xp = 20;
    state.facing = "left";

    saveGame(state.toJSON(), storage);
    const loaded = loadGame(storage);
    expect(loaded).not.toBeNull();
    const revived = GameState.from(loaded!);
    expect(revived.toJSON()).toEqual(state.toJSON());
  });

  it("reports absence and clears", () => {
    const storage = fakeStorage();
    expect(hasSave(storage)).toBe(false);
    saveGame(GameState.fresh({ x: 1, y: 2 }).toJSON(), storage);
    expect(hasSave(storage)).toBe(true);
    clearSave(storage);
    expect(hasSave(storage)).toBe(false);
  });

  it("treats corrupt or foreign payloads as no save", () => {
    const storage = fakeStorage();
    storage.data.set(SAVE_KEY, "{not json");
    expect(loadGame(storage)).toBeNull();
    storage.data.set(SAVE_KEY, JSON.stringify({ hello: "world" }));
    expect(loadGame(storage)).toBeNull();
  });
});
