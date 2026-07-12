import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { TitleScene } from "./scenes/TitleScene";
import { WorldScene } from "./scenes/WorldScene";
import { UIScene } from "./scenes/UIScene";
import { BattleScene } from "./scenes/BattleScene";

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "app",
  width: 640,
  height: 360,
  zoom: 2,
  pixelArt: true,
  backgroundColor: "#10121c",
  physics: { default: "arcade", arcade: { debug: false } },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  audio: { noAudio: true },
  scene: [BootScene, TitleScene, WorldScene, UIScene, BattleScene]
});

if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__game = game;
}
