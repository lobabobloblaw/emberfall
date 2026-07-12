// UI layer: HUD, dialogue box (typewriter + portraits), inventory panel.
// Runs parallel to WorldScene, immune to camera scroll, always on top.
import Phaser from "phaser";
import { LAYERS } from "../config/layers";
import { DialogueRunner, type DialogueResult } from "../logic/dialogue";
import { getDialogue } from "../logic/scripts";
import type { GameState } from "../logic/state";
import { WORLD_EVT, type InteractTarget, type WorldScene } from "./WorldScene";

const TEXT_STYLE = {
  fontFamily: "monospace",
  fontSize: "13px",
  color: "#ffffff",
  stroke: "#222034",
  strokeThickness: 3,
  resolution: 2
};

export class UIScene extends Phaser.Scene {
  private hpText!: Phaser.GameObjects.Text;
  private coinText!: Phaser.GameObjects.Text;

  private dialogueBox!: Phaser.GameObjects.Container;
  private dialogueText!: Phaser.GameObjects.Text;
  private speakerText!: Phaser.GameObjects.Text;
  private portrait!: Phaser.GameObjects.Image;
  private moreArrow!: Phaser.GameObjects.Text;
  private runner: DialogueRunner | null = null;
  private pendingResult: DialogueResult | null = null;
  private dialogueWorld: WorldScene | null = null;
  private typeTimer: Phaser.Time.TimerEvent | null = null;
  private fullText = "";

  private invPanel!: Phaser.GameObjects.Container;
  private invText!: Phaser.GameObjects.Text;

  constructor() {
    super("UIScene");
  }

  create(): void {
    // HUD
    this.add.image(14, 14, "icon-heart").setDisplaySize(16, 16).setDepth(LAYERS.UI);
    this.hpText = this.add.text(26, 7, "", TEXT_STYLE).setDepth(LAYERS.UI);
    this.add.image(14, 34, "icon-coin").setDisplaySize(16, 16).setDepth(LAYERS.UI);
    this.coinText = this.add.text(26, 27, "", TEXT_STYLE).setDepth(LAYERS.UI);

    this.buildDialogueBox();
    this.buildInventoryPanel();

    this.game.events.on(WORLD_EVT.STATE_CHANGED, this.refresh, this);
    this.game.events.on(WORLD_EVT.INTERACT, this.onInteract, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(WORLD_EVT.STATE_CHANGED, this.refresh, this);
      this.game.events.off(WORLD_EVT.INTERACT, this.onInteract, this);
    });

    const kb = this.input.keyboard!;
    kb.on("keydown-E", () => this.advance());
    kb.on("keydown-SPACE", () => this.advance());
    kb.on("keydown-ENTER", () => this.advance());
    kb.on("keydown-I", () => this.toggleInventory());

    const current = this.registry.get("state") as GameState | undefined;
    if (current) this.refresh(current);
  }

  private buildDialogueBox(): void {
    const panel = this.add.nineslice(0, 0, "ui-panel", undefined, 596, 104, 24, 24, 24, 24);
    this.portrait = this.add.image(-244, 0, "portrait-elder").setDisplaySize(72, 72);
    this.speakerText = this.add.text(-196, -38, "", { ...TEXT_STYLE, color: "#fbf236" });
    this.dialogueText = this.add.text(-196, -20, "", { ...TEXT_STYLE, wordWrap: { width: 460 } });
    this.moreArrow = this.add.text(272, 30, "▼", { ...TEXT_STYLE, color: "#fbf236" }).setOrigin(0.5);
    this.dialogueBox = this.add
      .container(320, 300, [panel, this.portrait, this.speakerText, this.dialogueText, this.moreArrow])
      .setDepth(LAYERS.UI + 10)
      .setVisible(false);
  }

  private buildInventoryPanel(): void {
    const panel = this.add.nineslice(0, 0, "ui-panel", undefined, 232, 200, 24, 24, 24, 24);
    const title = this.add.text(-96, -84, "PACK", { ...TEXT_STYLE, color: "#fbf236" });
    this.invText = this.add.text(-96, -60, "", { ...TEXT_STYLE, lineSpacing: 6 });
    this.invPanel = this.add
      .container(510, 130, [panel, title, this.invText])
      .setDepth(LAYERS.UI + 5)
      .setVisible(false);
  }

  private refresh(state: GameState): void {
    this.hpText.setText(`${state.hp}/${state.maxHp}`);
    this.coinText.setText(`${state.coins}`);
    if (this.invPanel.visible) this.renderInventory(state);
  }

  private renderInventory(state: GameState): void {
    const items = state.inventory.list();
    const lines = items.length === 0 ? ["(empty)"] : items.map((i) => `${i.name} x${i.qty}`);
    lines.push("", `Coins: ${state.coins}`, `XP: ${state.xp}`);
    this.invText.setText(lines.join("\n"));
  }

  private toggleInventory(): void {
    if (this.runner) return; // not while dialogue is open
    const world = this.scene.get("WorldScene") as WorldScene;
    if (!world.scene.isActive()) return;
    const next = !this.invPanel.visible;
    this.invPanel.setVisible(next);
    if (next) this.renderInventory(world.state);
  }

  private onInteract(target: InteractTarget, world: WorldScene): void {
    this.openDialogue(target.dialogue, world);
  }

  /** open a dialogue by script id; also used by the defeat flow */
  openDialogue(id: string, world: WorldScene): void {
    if (this.runner) return;
    this.invPanel.setVisible(false);
    const result = getDialogue(id, {
      flags: world.state.flags,
      hasItem: (itemId) => world.state.inventory.has(itemId)
    });
    this.runner = new DialogueRunner(result.pages);
    this.pendingResult = result;
    this.dialogueWorld = world;
    world.controlsLocked = true;
    this.dialogueBox.setVisible(true);
    this.showPage();
  }

  private showPage(): void {
    if (!this.runner) return;
    const page = this.runner.current();
    this.speakerText.setText(page.speaker ?? "");
    if (page.portrait) {
      this.portrait.setTexture(page.portrait).setDisplaySize(72, 72).setVisible(true);
      this.speakerText.setX(-196);
      this.dialogueText.setX(-196);
    } else {
      this.portrait.setVisible(false);
      this.speakerText.setX(-270);
      this.dialogueText.setX(-270);
    }
    this.dialogueText.setY(page.speaker ? -20 : -30);
    this.moreArrow.setVisible(false);
    this.fullText = page.text;
    this.dialogueText.setText("");
    this.typeTimer?.remove();
    let i = 0;
    this.typeTimer = this.time.addEvent({
      delay: 18,
      repeat: this.fullText.length - 1,
      callback: () => {
        i++;
        this.dialogueText.setText(this.fullText.slice(0, i));
        if (i >= this.fullText.length) this.moreArrow.setVisible(true);
      }
    });
  }

  private advance(): void {
    if (!this.runner) return;
    if (this.typeTimer && this.typeTimer.getOverallRemaining() > 0) {
      this.typeTimer.remove();
      this.typeTimer = null;
      this.dialogueText.setText(this.fullText);
      this.moreArrow.setVisible(true);
      return;
    }
    if (this.runner.next()) {
      this.showPage();
    } else {
      this.closeDialogue();
    }
  }

  /** e2e/test probe */
  debugState(): { dialogueOpen: boolean; speaker: string; text: string; inventoryOpen: boolean } {
    return {
      dialogueOpen: this.runner !== null,
      speaker: this.speakerText.text,
      text: this.dialogueText.text,
      inventoryOpen: this.invPanel.visible
    };
  }

  private closeDialogue(): void {
    const world = this.dialogueWorld;
    const result = this.pendingResult;
    this.runner = null;
    this.pendingResult = null;
    this.dialogueWorld = null;
    this.typeTimer?.remove();
    this.typeTimer = null;
    this.dialogueBox.setVisible(false);
    if (world && result) {
      world.applyEffects(result.effects);
      world.controlsLocked = false;
    }
  }
}
