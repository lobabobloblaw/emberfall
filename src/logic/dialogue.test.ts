import { describe, expect, it } from "vitest";
import { DialogueRunner } from "./dialogue";
import { getDialogue, type ScriptContext } from "./scripts";

const ctx = (flags: string[], items: string[] = []): ScriptContext => ({
  flags: new Set(flags),
  hasItem: (id) => items.includes(id)
});

describe("DialogueRunner", () => {
  it("pages through and reports the last page", () => {
    const r = new DialogueRunner([{ text: "a" }, { text: "b" }, { text: "c" }]);
    expect(r.current().text).toBe("a");
    expect(r.isLast()).toBe(false);
    expect(r.next()).toBe(true);
    expect(r.next()).toBe(true);
    expect(r.current().text).toBe("c");
    expect(r.isLast()).toBe(true);
    expect(r.next()).toBe(false);
  });

  it("rejects empty scripts", () => {
    expect(() => new DialogueRunner([])).toThrow();
  });
});

describe("scripts branching", () => {
  it("elder introduces the quest exactly once", () => {
    const first = getDialogue("elder", ctx([]));
    expect(first.pages).toHaveLength(3);
    expect(first.effects).toContainEqual({ type: "set-flag", flag: "quest_started" });

    const again = getDialogue("elder", ctx(["quest_started"]));
    expect(again.effects).toHaveLength(0);
    expect(again.pages[0].text).toContain("chest");
  });

  it("elder acknowledges the sword once collected", () => {
    const d = getDialogue("elder", ctx(["quest_started"], ["sword"]));
    expect(d.pages[0].text).toContain("sword");
    expect(d.pages[0].text).toContain("meadow");
  });

  it("elder pays the reward exactly once after victory", () => {
    const win = getDialogue("elder", ctx(["quest_started", "battle_won"]));
    expect(win.effects).toContainEqual({ type: "give-coins", amount: 10 });
    expect(win.effects).toContainEqual({ type: "set-flag", flag: "quest_rewarded" });

    const after = getDialogue("elder", ctx(["quest_started", "battle_won", "quest_rewarded"]));
    expect(after.effects).toHaveLength(0);
  });

  it("chest grants gear once, then reads empty", () => {
    const first = getDialogue("chest", ctx([]));
    expect(first.effects).toContainEqual({ type: "open-chest" });
    expect(first.effects).toContainEqual({ type: "give-item", id: "sword", name: "Rusty Sword", qty: 1 });
    expect(first.effects).toContainEqual({ type: "give-item", id: "potion", name: "Potion", qty: 2 });

    const opened = getDialogue("chest", ctx(["chest_opened"]));
    expect(opened.effects).toHaveLength(0);
    expect(opened.pages[0].text).toContain("empty");
  });

  it("well saves and heals", () => {
    const d = getDialogue("well", ctx([]));
    expect(d.effects).toEqual([{ type: "save-heal" }]);
  });

  it("unknown ids fall back to ellipsis instead of crashing", () => {
    expect(getDialogue("nope", ctx([])).pages[0].text).toBe("...");
  });
});
