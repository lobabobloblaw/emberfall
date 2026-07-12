import { describe, expect, it } from "vitest";
import { act, createBattle, heroDamage, slimeDamage, REWARDS } from "./battle";

/** rng that replays a fixed sequence */
const seq = (...vals: number[]) => {
  let i = 0;
  return () => vals[i++ % vals.length];
};

describe("battle math", () => {
  it("sword raises damage from 4-6 to 7-9", () => {
    expect(heroDamage(false, () => 0)).toBe(4);
    expect(heroDamage(false, () => 0.99)).toBe(6);
    expect(heroDamage(true, () => 0)).toBe(7);
    expect(heroDamage(true, () => 0.99)).toBe(9);
    expect(slimeDamage(() => 0)).toBe(2);
    expect(slimeDamage(() => 0.99)).toBe(3);
  });

  it("attack exchanges blows until the slime drops", () => {
    let s = createBattle(20, 20, true, 0);
    const rng = seq(0.5); // hero 8 dmg, slime always acts at 2+floor(.5*2)=3
    const r1 = act(s, "attack", rng);
    s = r1.state;
    expect(s.slimeHp).toBe(10);
    expect(s.heroHp).toBe(17);
    expect(r1.events.map((e) => e.type)).toEqual(["hero-attack", "slime-attack"]);
    s = act(s, "attack", rng).state; // slime 2
    const r3 = act(s, "attack", rng); // slime 0 -> won, no counterattack
    expect(r3.state.phase).toBe("won");
    expect(r3.state.rewards).toEqual(REWARDS);
    expect(r3.events.at(-1)).toEqual({ type: "slime-defeated" });
    expect(r3.state.heroHp).toBe(14); // no slime hit on the killing blow
  });

  it("hero can lose", () => {
    let s = createBattle(2, 20, false, 0);
    s = { ...s, slimeHp: 18 };
    const r = act(s, "attack", seq(0.99)); // slime hits for 3
    expect(r.state.phase).toBe("lost");
    expect(r.state.heroHp).toBe(0);
    expect(r.events.at(-1)).toEqual({ type: "hero-defeated" });
  });

  it("potion heals up to 8, capped at max, consumes one, slime still attacks", () => {
    const s = createBattle(10, 20, false, 2);
    const r = act(s, "potion", seq(0));
    expect(r.state.heroHp).toBe(16); // 10 + 8 - 2 slime hit
    expect(r.state.potions).toBe(1);
    expect(r.events[0]).toEqual({ type: "heal", amount: 8 });
    expect(r.events[1]).toEqual({ type: "slime-attack", dmg: 2 });

    const nearFull = act(createBattle(19, 20, false, 1), "potion", seq(0));
    expect(nearFull.events[0]).toEqual({ type: "heal", amount: 1 });
  });

  it("empty potion bag wastes no turn", () => {
    const r = act(createBattle(10, 20, false, 0), "potion", seq(0));
    expect(r.events).toEqual([{ type: "no-potion" }]);
    expect(r.state.heroHp).toBe(10);
  });

  it("flee succeeds under 0.5 and fails over it (slime punishes)", () => {
    const success = act(createBattle(20, 20, false, 0), "flee", seq(0.2));
    expect(success.state.phase).toBe("fled");
    expect(success.events).toEqual([{ type: "flee-success" }]);

    const fail = act(createBattle(20, 20, false, 0), "flee", seq(0.9, 0));
    expect(fail.state.phase).toBe("player");
    expect(fail.events).toEqual([{ type: "flee-fail" }, { type: "slime-attack", dmg: 2 }]);
  });

  it("acting outside the player phase is a no-op", () => {
    const won = { ...createBattle(20, 20, false, 0), phase: "won" as const };
    const r = act(won, "attack", seq(0));
    expect(r.events).toHaveLength(0);
    expect(r.state).toBe(won);
  });
});
