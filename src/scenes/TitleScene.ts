import Phaser from "phaser";
import { hasSave, loadGame } from "../logic/save";

export class TitleScene extends Phaser.Scene {
  private choice = 0;
  private options: Phaser.GameObjects.Text[] = [];
  private canContinue = false;

  constructor() {
    super("TitleScene");
  }

  create(): void {
    this.add.image(0, 0, "scene-title").setOrigin(0).setScale(2);
    this.add
      .text(320, 70, "EMBERFALL", {
        fontFamily: "Georgia, serif",
        fontSize: "52px",
        color: "#eec39a",
        stroke: "#222034",
        strokeThickness: 8,
        resolution: 2
      })
      .setOrigin(0.5);

    this.canContinue = hasSave(window.localStorage);
    this.choice = 0;
    this.options = [];
    const labels = this.canContinue ? ["Start New", "Continue"] : ["Start"];
    labels.forEach((label, i) => {
      this.options.push(
        this.add
          .text(320, 250 + i * 26, label, {
            fontFamily: "monospace",
            fontSize: "16px",
            color: "#cbdbfc",
            stroke: "#222034",
            strokeThickness: 4,
            resolution: 2
          })
          .setOrigin(0.5)
      );
    });
    this.highlight();

    const kb = this.input.keyboard!;
    kb.on("keydown-UP", () => this.move(-1));
    kb.on("keydown-DOWN", () => this.move(1));
    kb.on("keydown-ENTER", () => this.select());
    kb.on("keydown-SPACE", () => this.select());
  }

  private move(d: number): void {
    this.choice = Phaser.Math.Wrap(this.choice + d, 0, this.options.length);
    this.highlight();
  }

  private highlight(): void {
    this.options.forEach((o, i) => o.setColor(i === this.choice ? "#fbf236" : "#cbdbfc"));
  }

  private select(): void {
    const wantsContinue = this.canContinue && this.choice === 1;
    const saved = wantsContinue ? loadGame(window.localStorage) : null;
    this.cameras.main.fadeOut(300, 16, 18, 28);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start("WorldScene", { saved });
    });
  }
}
