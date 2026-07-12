// HUD layer — runs parallel to WorldScene, immune to camera scroll.
// Dialogue box and inventory panel are wired in Phase 3.
import Phaser from "phaser";
import { LAYERS } from "../config/layers";
import type { GameState } from "../logic/state";

export const EVT = {
  STATE_CHANGED: "state-changed"
} as const;

export class UIScene extends Phaser.Scene {
  private hpText!: Phaser.GameObjects.Text;
  private coinText!: Phaser.GameObjects.Text;

  constructor() {
    super("UIScene");
  }

  create(): void {
    const style = {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#ffffff",
      stroke: "#222034",
      strokeThickness: 3,
      resolution: 2
    };
    this.add.image(14, 14, "icon-heart").setDisplaySize(16, 16).setDepth(LAYERS.UI);
    this.hpText = this.add.text(26, 7, "", style).setDepth(LAYERS.UI);
    this.add.image(14, 34, "icon-coin").setDisplaySize(16, 16).setDepth(LAYERS.UI);
    this.coinText = this.add.text(26, 27, "", style).setDepth(LAYERS.UI);

    this.game.events.on(EVT.STATE_CHANGED, this.refresh, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(EVT.STATE_CHANGED, this.refresh, this);
    });
    const current = this.registry.get("state") as GameState | undefined;
    if (current) this.refresh(current);
  }

  private refresh(state: GameState): void {
    this.hpText.setText(`${state.hp}/${state.maxHp}`);
    this.coinText.setText(`${state.coins}`);
  }
}
