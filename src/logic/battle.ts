// Turn-based battle core — pure and deterministic (rng injected). BattleScene animates
// the returned events; this module owns all the numbers.
export interface BattleState {
  heroHp: number;
  heroMaxHp: number;
  slimeHp: number;
  slimeMaxHp: number;
  hasSword: boolean;
  potions: number;
  phase: "player" | "won" | "lost" | "fled";
  rewards: { coins: number; xp: number } | null;
}

export type BattleEvent =
  | { type: "hero-attack"; dmg: number }
  | { type: "slime-attack"; dmg: number }
  | { type: "heal"; amount: number }
  | { type: "flee-success" }
  | { type: "flee-fail" }
  | { type: "no-potion" }
  | { type: "slime-defeated" }
  | { type: "hero-defeated" };

export type BattleAction = "attack" | "potion" | "flee";

export const REWARDS = { coins: 12, xp: 20 };

export function createBattle(heroHp: number, heroMaxHp: number, hasSword: boolean, potions: number): BattleState {
  return {
    heroHp,
    heroMaxHp,
    slimeHp: 18,
    slimeMaxHp: 18,
    hasSword,
    potions,
    phase: "player",
    rewards: null
  };
}

export function heroDamage(hasSword: boolean, rng: () => number): number {
  return (hasSword ? 7 : 4) + Math.floor(rng() * 3); // sword 7-9, bare 4-6
}

export function slimeDamage(rng: () => number): number {
  return 2 + Math.floor(rng() * 2); // 2-3
}

/** Resolve one player action plus the slime's response. Mutates nothing; returns a new state. */
export function act(state: BattleState, action: BattleAction, rng: () => number): { state: BattleState; events: BattleEvent[] } {
  if (state.phase !== "player") return { state, events: [] };
  const s: BattleState = { ...state };
  const events: BattleEvent[] = [];

  let slimeGetsATurn = true;

  if (action === "attack") {
    const dmg = heroDamage(s.hasSword, rng);
    s.slimeHp = Math.max(0, s.slimeHp - dmg);
    events.push({ type: "hero-attack", dmg });
    if (s.slimeHp === 0) {
      s.phase = "won";
      s.rewards = { ...REWARDS };
      events.push({ type: "slime-defeated" });
      return { state: s, events };
    }
  } else if (action === "potion") {
    if (s.potions <= 0) {
      events.push({ type: "no-potion" });
      slimeGetsATurn = false; // fumbling in an empty bag costs no turn
    } else {
      s.potions--;
      const amount = Math.min(8, s.heroMaxHp - s.heroHp);
      s.heroHp += amount;
      events.push({ type: "heal", amount });
    }
  } else {
    if (rng() < 0.5) {
      s.phase = "fled";
      events.push({ type: "flee-success" });
      return { state: s, events };
    }
    events.push({ type: "flee-fail" });
  }

  if (slimeGetsATurn) {
    const dmg = slimeDamage(rng);
    s.heroHp = Math.max(0, s.heroHp - dmg);
    events.push({ type: "slime-attack", dmg });
    if (s.heroHp === 0) {
      s.phase = "lost";
      events.push({ type: "hero-defeated" });
    }
  }

  return { state: s, events };
}
