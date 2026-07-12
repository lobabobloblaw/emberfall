// Central game state — flags, inventory, vitals. Pure module (no Phaser).
import { Inventory, type ItemStack } from "./inventory";
import type { Facing } from "../types";

export interface GameStateData {
  pos: { x: number; y: number };
  facing: Facing;
  hp: number;
  maxHp: number;
  coins: number;
  xp: number;
  flags: string[];
  inventory: ItemStack[];
}

export class GameState {
  pos: { x: number; y: number };
  facing: Facing;
  hp: number;
  maxHp: number;
  coins: number;
  xp: number;
  flags: Set<string>;
  inventory: Inventory;

  private constructor(d: GameStateData) {
    this.pos = { ...d.pos };
    this.facing = d.facing;
    this.hp = d.hp;
    this.maxHp = d.maxHp;
    this.coins = d.coins;
    this.xp = d.xp;
    this.flags = new Set(d.flags);
    this.inventory = Inventory.from(d.inventory);
  }

  static fresh(spawn: { x: number; y: number }): GameState {
    return new GameState({
      pos: spawn,
      facing: "up",
      hp: 20,
      maxHp: 20,
      coins: 0,
      xp: 0,
      flags: [],
      inventory: []
    });
  }

  static from(d: GameStateData): GameState {
    return new GameState(d);
  }

  toJSON(): GameStateData {
    return {
      pos: { ...this.pos },
      facing: this.facing,
      hp: this.hp,
      maxHp: this.maxHp,
      coins: this.coins,
      xp: this.xp,
      flags: [...this.flags].sort(),
      inventory: this.inventory.list()
    };
  }
}
