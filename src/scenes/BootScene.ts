// Loads manifest.json, then every asset it references, then builds animations.
// The manifest is the ONLY place asset paths live (see CLAUDE.md).
import Phaser from "phaser";
import type { Manifest } from "../types";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload(): void {
    this.load.json("manifest", "assets/manifest.json");
  }

  create(): void {
    const m = this.cache.json.get("manifest") as Manifest;
    this.registry.set("manifest", m);

    this.load.image("tileset", `assets/${m.tileset.file}`);
    for (const [name, c] of Object.entries(m.characters)) {
      this.load.spritesheet(`char-${name}`, `assets/${c.file}`, {
        frameWidth: c.frameWidth,
        frameHeight: c.frameHeight
      });
    }
    for (const [name, o] of Object.entries(m.objects)) {
      if (o.above) {
        this.load.image(`obj-${name}-below`, `assets/${o.below}`);
        this.load.image(`obj-${name}-above`, `assets/${o.above}`);
      } else {
        this.load.image(`obj-${name}`, `assets/${o.below}`);
      }
    }
    const flat: [string, Record<string, string>][] = [
      ["portrait", m.portraits],
      ["icon", m.icons],
      ["scene", m.scenes],
      ["battle", m.battle],
      ["ui", m.ui]
    ];
    for (const [prefix, group] of flat) {
      for (const [name, file] of Object.entries(group)) {
        this.load.image(`${prefix}-${name}`, `assets/${file}`);
      }
    }

    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      this.createAnims(m);
      this.scene.start("TitleScene");
    });
    this.load.start();
  }

  private createAnims(m: Manifest): void {
    for (const [name, c] of Object.entries(m.characters)) {
      for (const [animName, frames] of Object.entries(c.anims)) {
        this.anims.create({
          key: `${name}-${animName}`,
          frames: this.anims.generateFrameNumbers(`char-${name}`, { frames }),
          frameRate: c.frameRate,
          repeat: -1
        });
      }
    }
  }
}
