// Turn-based battle launched over the paused WorldScene.
// All combat math lives in logic/battle.ts; this scene only animates the events.
import Phaser from "phaser";
import { act, createBattle, type BattleEvent, type BattleState } from "../logic/battle";
import type { Manifest } from "../types";
import type { WorldScene } from "./WorldScene";

const TEXT_STYLE = {
  fontFamily: "monospace",
  fontSize: "13px",
  color: "#ffffff",
  stroke: "#222034",
  strokeThickness: 3,
  resolution: 2
};

const MENU: { key: "attack" | "potion" | "flee"; label: string }[] = [
  { key: "attack", label: "Attack" },
  { key: "potion", label: "Potion" },
  { key: "flee", label: "Flee" }
];

export class BattleScene extends Phaser.Scene {
  private world!: WorldScene;
  private battle!: BattleState;
  private slime!: Phaser.GameObjects.Image;
  private hero!: Phaser.GameObjects.Sprite;
  private menuTexts: Phaser.GameObjects.Text[] = [];
  private logText!: Phaser.GameObjects.Text;
  private heroHpText!: Phaser.GameObjects.Text;
  private slimeHpText!: Phaser.GameObjects.Text;
  private menuIndex = 0;
  private busy = true;

  constructor() {
    super("BattleScene");
  }

  create(): void {
    this.world = this.scene.get("WorldScene") as WorldScene;
    const manifest = this.registry.get("manifest") as Manifest;
    const s = this.world.state;
    this.battle = createBattle(s.hp, s.maxHp, s.inventory.has("sword"), s.inventory.count("potion"));
    this.menuIndex = 0;
    this.menuTexts = [];

    this.add.image(0, 0, "scene-battle-forest").setOrigin(0).setScale(2).setDepth(0);

    this.slime = this.add.image(190, 240, "battle-slime").setScale(2).setDepth(10);
    this.tweens.add({ targets: this.slime, y: 232, duration: 700, yoyo: true, repeat: -1, ease: "sine.inout" });
    this.hero = this.add.sprite(480, 262, "char-hero", manifest.characters.hero.idle.left).setScale(2.5).setDepth(10);

    this.slimeHpText = this.add.text(130, 130, "", TEXT_STYLE).setDepth(20);
    this.heroHpText = this.add.text(430, 160, "", TEXT_STYLE).setDepth(20);

    this.add.nineslice(320, 322, "ui-panel", undefined, 608, 68, 24, 24, 24, 24).setDepth(20);
    MENU.forEach((m, i) => {
      this.menuTexts.push(this.add.text(50 + i * 110, 314, m.label, TEXT_STYLE).setDepth(21));
    });
    this.logText = this.add.text(390, 302, "A wild slime blocks the meadow!", { ...TEXT_STYLE, wordWrap: { width: 210 } }).setDepth(21);

    const kb = this.input.keyboard!;
    kb.on("keydown-LEFT", () => this.moveCursor(-1));
    kb.on("keydown-RIGHT", () => this.moveCursor(1));
    kb.on("keydown-ENTER", () => this.choose());
    kb.on("keydown-SPACE", () => this.choose());
    kb.on("keydown-E", () => this.choose());

    this.refreshHud();
    this.cameras.main.fadeIn(350, 16, 18, 28);
    this.time.delayedCall(400, () => {
      this.busy = false;
      this.highlight();
    });
  }

  private refreshHud(): void {
    this.slimeHpText.setText(`Slime  ${this.battle.slimeHp}/${this.battle.slimeMaxHp}`);
    this.heroHpText.setText(`Ranger ${this.battle.heroHp}/${this.battle.heroMaxHp}`);
    const potions = this.menuTexts[1];
    potions.setText(`Potion x${this.battle.potions}`);
  }

  private highlight(): void {
    this.menuTexts.forEach((t, i) => t.setColor(!this.busy && i === this.menuIndex ? "#fbf236" : "#cbdbfc"));
  }

  private moveCursor(d: number): void {
    if (this.busy) return;
    this.menuIndex = Phaser.Math.Wrap(this.menuIndex + d, 0, MENU.length);
    this.highlight();
  }

  private choose(): void {
    if (this.busy) return;
    this.busy = true;
    this.highlight();
    const { state, events } = act(this.battle, MENU[this.menuIndex].key, Math.random);
    this.battle = state;
    void this.playEvents(events);
  }

  private async playEvents(events: BattleEvent[]): Promise<void> {
    for (const e of events) {
      await this.playEvent(e);
      this.syncWorldState();
      this.refreshHud();
    }
    switch (this.battle.phase) {
      case "player":
        this.busy = false;
        this.highlight();
        return;
      case "won": {
        const r = this.battle.rewards!;
        this.world.state.coins += r.coins;
        this.world.state.xp += r.xp;
        this.log(`Victory! +${r.coins} coins, +${r.xp} XP`);
        await this.delay(1400);
        this.finish("won");
        return;
      }
      case "lost":
        await this.delay(900);
        this.finish("lost");
        return;
      case "fled":
        await this.delay(600);
        this.finish("fled");
        return;
    }
  }

  private playEvent(e: BattleEvent): Promise<void> {
    switch (e.type) {
      case "hero-attack":
        this.log(`You strike for ${e.dmg}!`);
        return this.lunge(this.hero, -40).then(() => this.flash(this.slime));
      case "slime-attack":
        this.log(`The slime slams you for ${e.dmg}!`);
        return this.lunge(this.slime, 40).then(() => this.flash(this.hero));
      case "heal":
        this.log(`You drink a potion. +${e.amount} HP`);
        return this.flash(this.hero, 0x99e550);
      case "no-potion":
        this.log("No potions left!");
        return this.delay(500);
      case "flee-success":
        this.log("You slip away!");
        return this.delay(400);
      case "flee-fail":
        this.log("Can't escape!");
        return this.delay(500);
      case "slime-defeated":
        this.log("The slime bursts apart!");
        return new Promise((resolve) => {
          this.tweens.add({
            targets: this.slime,
            alpha: 0,
            scaleY: 0.3,
            y: this.slime.y + 30,
            duration: 500,
            onComplete: () => resolve()
          });
        });
      case "hero-defeated":
        this.log("You black out...");
        return new Promise((resolve) => {
          this.tweens.add({ targets: this.hero, alpha: 0, angle: -90, duration: 500, onComplete: () => resolve() });
        });
    }
  }

  private syncWorldState(): void {
    const s = this.world.state;
    s.hp = Math.max(this.battle.phase === "lost" ? 1 : this.battle.heroHp, this.battle.phase === "lost" ? 1 : 0);
    while (s.inventory.count("potion") > this.battle.potions) s.inventory.remove("potion");
    this.world.emitState();
  }

  private log(msg: string): void {
    this.logText.setText(msg);
  }

  private lunge(target: Phaser.GameObjects.Components.Transform, dx: number): Promise<void> {
    return new Promise((resolve) => {
      this.tweens.add({
        targets: target,
        x: (target as unknown as { x: number }).x + dx,
        duration: 130,
        yoyo: true,
        ease: "quad.out",
        onComplete: () => resolve()
      });
    });
  }

  private flash(target: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite, tint = 0xd95763): Promise<void> {
    return new Promise((resolve) => {
      target.setTint(tint).setTintMode(Phaser.TintModes.FILL);
      this.time.delayedCall(160, () => {
        target.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
        this.time.delayedCall(160, () => resolve());
      });
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, () => resolve()));
  }

  private finish(outcome: "won" | "lost" | "fled"): void {
    this.cameras.main.fadeOut(350, 16, 18, 28);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.stop();
      this.world.onBattleEnd(outcome);
    });
  }
}
