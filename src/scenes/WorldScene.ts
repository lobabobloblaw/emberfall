// The village. Render stack (bottom to top, all depths from src/config/layers.ts):
//   0 parallax vista -> 10 ground tiles -> 20 detail tiles -> 30 object bases ->
//   40+y/1000 y-sorted entities -> 60 canopies/roofs -> 70 fx tint -> UIScene above.
import Phaser from "phaser";
import { LAYERS, entityDepth } from "../config/layers";
import type { Facing, Manifest } from "../types";
import * as V from "../maps/village";
import { buildGround, buildDetail } from "../maps/autotile";
import { GameState, type GameStateData } from "../logic/state";
import type { DialogueEffect } from "../logic/dialogue";
import { saveGame } from "../logic/save";
import type { UIScene } from "./UIScene";

export const WORLD_EVT = {
  INTERACT: "world-interact",
  BATTLE_START: "world-battle-start",
  STATE_CHANGED: "state-changed"
} as const;

export interface InteractTarget {
  id: string;
  kind: "chest" | "sign" | "door" | "well" | "npc";
  dialogue: string;
  x: number;
  y: number;
}

const PLAYER_SPEED = 90;

export class WorldScene extends Phaser.Scene {
  state!: GameState;
  private manifest!: Manifest;
  private player!: Phaser.Physics.Arcade.Sprite;
  private facing: Facing = "up";
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<"W" | "A" | "S" | "D", Phaser.Input.Keyboard.Key>;
  private parallax!: Phaser.GameObjects.TileSprite;
  private fxTint!: Phaser.GameObjects.Rectangle;
  private npcSprites = new Map<string, Phaser.Physics.Arcade.Sprite>();
  private slimeSprites: Phaser.GameObjects.Sprite[] = [];
  private chestSprite!: Phaser.GameObjects.Image;
  private indicator!: Phaser.GameObjects.Text;
  private targets: InteractTarget[] = [];
  private currentTarget: InteractTarget | null = null;
  private inBattleZone = false;
  /** input suspended while dialogue/battle owns the keys */
  controlsLocked = false;

  constructor() {
    super("WorldScene");
  }

  init(data: { saved?: GameStateData | null }): void {
    this.state = data.saved ? GameState.from(data.saved) : GameState.fresh({ x: V.spawn.tx * V.TILE, y: (V.spawn.ty + 1) * V.TILE });
  }

  create(): void {
    this.manifest = this.registry.get("manifest") as Manifest;
    const names = this.manifest.tileset.names;

    // 0 — parallax vista (visible through the untiled top rows)
    this.parallax = this.add
      .tileSprite(0, 0, 1024, 80, "scene-parallax-forest")
      .setOrigin(0, 0)
      .setScrollFactor(0.3, 1)
      .setDepth(LAYERS.PARALLAX);

    // 10/20 — ground + detail tile layers
    const map = this.make.tilemap({ tileWidth: V.TILE, tileHeight: V.TILE, width: V.MAP_W, height: V.MAP_H });
    const tiles = map.addTilesetImage("tiles", "tileset", V.TILE, V.TILE, 0, 0);
    if (!tiles) throw new Error("tileset missing");
    const ground = map.createBlankLayer("ground", tiles, 0, 0);
    const detail = map.createBlankLayer("detail", tiles, 0, 0);
    if (!ground || !detail) throw new Error("tilemap layer creation failed");
    ground.setDepth(LAYERS.GROUND);
    detail.setDepth(LAYERS.GROUND_DETAIL);
    buildGround(V.paint, names).forEach((row, y) =>
      row.forEach((t, x) => {
        if (t !== null && t !== undefined) ground.putTileAt(t, x, y);
      })
    );
    buildDetail(V.paint, names).forEach((row, y) =>
      row.forEach((t, x) => {
        if (t !== null && t !== undefined) detail.putTileAt(t, x, y);
      })
    );

    // 30/60 — objects (bases + walk-behind tops)
    for (const obj of V.objects) {
      this.placeObject(obj);
    }

    // 40 — player
    const heroDef = this.manifest.characters.hero;
    this.player = this.physics.add.sprite(this.state.pos.x, this.state.pos.y, "char-hero", heroDef.idle[this.state.facing]);
    this.player.setOrigin(0.5, 1);
    this.player.body!.setSize(14, 10);
    this.player.body!.setOffset(17, 36);
    this.facing = this.state.facing;

    // 40 — NPCs
    for (const npc of V.npcs) {
      const def = this.manifest.characters[npc.char];
      const sprite = this.physics.add.sprite(npc.tx * V.TILE, (npc.ty + 1) * V.TILE, `char-${npc.char}`, def.idle[npc.facing]);
      sprite.setOrigin(0.5, 1);
      sprite.body!.setSize(16, 10);
      sprite.body!.setOffset(16, 36);
      (sprite.body as Phaser.Physics.Arcade.Body).setImmovable(true);
      sprite.setDepth(entityDepth(sprite.y));
      this.npcSprites.set(npc.id, sprite);
      this.physics.add.collider(this.player, sprite);
    }

    // 40 — overworld slimes (battle telegraphs; despawn once the fight is won)
    if (!this.state.flags.has("battle_won")) {
      for (const s of V.slimes) {
        const sprite = this.add.sprite(s.tx * V.TILE, (s.ty + 1) * V.TILE, "char-slime", 0);
        sprite.setOrigin(0.5, 1);
        sprite.play("slime-idle");
        sprite.setDepth(entityDepth(sprite.y));
        this.slimeSprites.push(sprite);
      }
    }

    // collision — merged static rects from the map grid
    const solids: Phaser.GameObjects.Zone[] = [];
    for (const r of V.collisionRects(V.buildCollision())) {
      const zone = this.add.zone(r.x + r.w / 2, r.y + r.h / 2, r.w, r.h);
      this.physics.add.existing(zone, true);
      solids.push(zone);
    }
    this.physics.add.collider(this.player, solids);

    // 70 — fx tint layer (day-tint toggle proves the layer; T key)
    this.fxTint = this.add
      .rectangle(0, 0, V.MAP_W * V.TILE, V.MAP_H * V.TILE, 0x1a2f6e, 0)
      .setOrigin(0)
      .setDepth(LAYERS.FX);

    // interact indicator (world-space, above canopies)
    this.indicator = this.add
      .text(0, 0, "!", { fontFamily: "monospace", fontSize: "14px", color: "#fbf236", stroke: "#222034", strokeThickness: 4, resolution: 2 })
      .setOrigin(0.5, 1)
      .setDepth(LAYERS.FX)
      .setVisible(false);

    this.buildTargets();

    // camera
    this.cameras.main.setBounds(0, 0, V.MAP_W * V.TILE, V.MAP_H * V.TILE);
    this.cameras.main.startFollow(this.player, true);
    this.cameras.main.fadeIn(300, 16, 18, 28);

    // input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys("W,A,S,D") as WorldScene["wasd"];
    this.input.keyboard!.on("keydown-E", () => this.tryInteract());
    this.input.keyboard!.on("keydown-SPACE", () => this.tryInteract());
    this.input.keyboard!.on("keydown-T", () => {
      this.fxTint.setFillStyle(0x1a2f6e, this.fxTint.fillAlpha > 0 ? 0 : 0.28);
    });

    if (!this.scene.isActive("UIScene")) this.scene.launch("UIScene");
    this.emitState();

    if (import.meta.env.DEV) this.installTestHook();
  }

  private placeObject(obj: V.MapObject): void {
    const def = this.manifest.objects[obj.type];
    const info = V.OBJECT_INFO[obj.type];
    const x = obj.tx * V.TILE;
    const baseY = (obj.ty + 1) * V.TILE;
    const scale = info.display ? info.display / def.width : 1;
    if (def.above) {
      const below = this.add.image(x, baseY, `obj-${obj.type}-below`).setOrigin(0.5, 1).setScale(scale).setDepth(LAYERS.OBJECTS_BELOW);
      this.add
        .image(x, baseY - below.displayHeight, `obj-${obj.type}-above`)
        .setOrigin(0.5, 1)
        .setScale(scale)
        .setDepth(LAYERS.OBJECTS_ABOVE);
    } else {
      const img = this.add.image(x, baseY, `obj-${obj.type}`).setOrigin(0.5, 1).setScale(scale).setDepth(LAYERS.OBJECTS_BELOW);
      if (obj.type === "chest-closed") {
        this.chestSprite = img;
        if (this.state.flags.has("chest_opened")) img.setTexture("obj-chest-open");
      }
    }
  }

  private buildTargets(): void {
    this.targets = [];
    for (const i of V.interactables) {
      this.targets.push({ id: i.id, kind: i.kind, dialogue: i.dialogue, x: i.tx * V.TILE, y: (i.ty + 1) * V.TILE });
    }
    for (const n of V.npcs) {
      this.targets.push({ id: n.id, kind: "npc", dialogue: n.dialogue, x: n.tx * V.TILE, y: (n.ty + 1) * V.TILE });
    }
  }

  private facingVector(): { x: number; y: number } {
    switch (this.facing) {
      case "up":
        return { x: 0, y: -1 };
      case "down":
        return { x: 0, y: 1 };
      case "left":
        return { x: -1, y: 0 };
      default:
        return { x: 1, y: 0 };
    }
  }

  private findTarget(): InteractTarget | null {
    const f = this.facingVector();
    let best: InteractTarget | null = null;
    let bestDist = 48;
    for (const t of this.targets) {
      const npcSprite = t.kind === "npc" ? this.npcSprites.get(t.id) : null;
      const tx = npcSprite ? npcSprite.x : t.x;
      const ty = npcSprite ? npcSprite.y : t.y;
      const dx = tx - this.player.x;
      const dy = ty - this.player.y - 5; // player anchor is at the feet
      const dist = Math.hypot(dx, dy);
      if (dist > 48) continue;
      const toward = (dx * f.x + dy * f.y) / Math.max(dist, 1);
      if (dist > 20 && toward < 0.25) continue;
      if (dist < bestDist) {
        bestDist = dist;
        best = t;
      }
    }
    return best;
  }

  private tryInteract(): void {
    if (this.controlsLocked || !this.currentTarget) return;
    this.game.events.emit(WORLD_EVT.INTERACT, this.currentTarget, this);
  }

  /** Phase 3 hooks — chest swap + state broadcast */
  openChest(): void {
    this.state.flags.add("chest_opened");
    this.chestSprite.setTexture("obj-chest-open");
    this.emitState();
  }

  emitState(): void {
    this.registry.set("state", this.state);
    this.game.events.emit(WORLD_EVT.STATE_CHANGED, this.state);
  }

  private updateMovement(): void {
    const left = this.cursors.left.isDown || this.wasd.A.isDown;
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    const up = this.cursors.up.isDown || this.wasd.W.isDown;
    const down = this.cursors.down.isDown || this.wasd.S.isDown;
    let vx = left ? -PLAYER_SPEED : right ? PLAYER_SPEED : 0;
    let vy = up ? -PLAYER_SPEED : down ? PLAYER_SPEED : 0;
    if (this.controlsLocked) {
      vx = 0;
      vy = 0;
    }
    if (vx !== 0 && vy !== 0) {
      vx *= Math.SQRT1_2;
      vy *= Math.SQRT1_2;
    }
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(vx, vy);
    if (vx !== 0) this.facing = vx < 0 ? "left" : "right";
    else if (vy !== 0) this.facing = vy < 0 ? "up" : "down";
    if (vx !== 0 || vy !== 0) {
      this.player.anims.play(`hero-${this.facing}`, true);
    } else {
      this.player.anims.stop();
      this.player.setFrame(this.manifest.characters.hero.idle[this.facing]);
    }
    this.state.pos = { x: this.player.x, y: this.player.y };
    this.state.facing = this.facing;
  }

  private updateNpcs(): void {
    for (const npc of V.npcs) {
      const sprite = this.npcSprites.get(npc.id);
      if (!sprite || !npc.patrol) continue;
      const body = sprite.body as Phaser.Physics.Arcade.Body;
      const minX = npc.patrol.minTx * V.TILE;
      const maxX = npc.patrol.maxTx * V.TILE;
      if (body.velocity.x === 0) body.setVelocityX(npc.patrol.speed);
      if (sprite.x <= minX && body.velocity.x < 0) body.setVelocityX(npc.patrol.speed);
      if (sprite.x >= maxX && body.velocity.x > 0) body.setVelocityX(-npc.patrol.speed);
      sprite.anims.play(`${npc.char}-${body.velocity.x < 0 ? "left" : "right"}`, true);
      sprite.setDepth(entityDepth(sprite.y));
    }
  }

  private checkBattleZone(): void {
    const tx = Math.floor(this.player.x / V.TILE);
    const ty = Math.floor((this.player.y - 5) / V.TILE);
    const z = V.battleZone;
    const inside = tx >= z.x1 && tx <= z.x2 && ty >= z.y1 && ty <= z.y2;
    if (inside && !this.inBattleZone && !this.state.flags.has("battle_won") && !this.controlsLocked) {
      this.inBattleZone = true;
      this.startBattle();
    }
    if (!inside) this.inBattleZone = false;
  }

  private startBattle(): void {
    this.controlsLocked = true;
    (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.game.events.emit(WORLD_EVT.BATTLE_START);
    this.cameras.main.fadeOut(350, 16, 18, 28);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.pause();
      this.scene.launch("BattleScene");
    });
  }

  /** BattleScene hands control back here after its own fade-out */
  onBattleEnd(outcome: "won" | "lost" | "fled"): void {
    this.scene.resume();
    if (outcome === "won") this.onBattleWon();
    if (outcome === "lost") {
      this.state.hp = 1;
      this.player.setPosition(V.defeatRespawn.x, V.defeatRespawn.y);
      this.facing = "down";
      this.emitState();
    }
    this.cameras.main.fadeIn(350, 16, 18, 28);
    this.controlsLocked = false;
    if (outcome === "lost") {
      const ui = this.scene.get("UIScene") as UIScene;
      ui.openDialogue("defeat", this);
    }
  }

  /** apply dialogue effects (called by UIScene when a dialogue closes) */
  applyEffects(effects: DialogueEffect[]): void {
    for (const e of effects) {
      switch (e.type) {
        case "set-flag":
          this.state.flags.add(e.flag);
          break;
        case "give-item":
          this.state.inventory.add(e.id, e.name, e.qty);
          break;
        case "give-coins":
          this.state.coins += e.amount;
          break;
        case "open-chest":
          this.openChest();
          break;
        case "save-heal":
          this.state.hp = this.state.maxHp;
          this.state.pos = { x: this.player.x, y: this.player.y };
          this.state.facing = this.facing;
          saveGame(this.state.toJSON(), window.localStorage);
          break;
      }
    }
    if (effects.length > 0) this.emitState();
  }

  /** battle victory cleanup */
  onBattleWon(): void {
    this.state.flags.add("battle_won");
    for (const s of this.slimeSprites) s.destroy();
    this.slimeSprites = [];
    this.emitState();
  }

  update(): void {
    this.updateMovement();
    this.updateNpcs();
    this.player.setDepth(entityDepth(this.player.y));

    this.currentTarget = this.controlsLocked ? null : this.findTarget();
    if (this.currentTarget) {
      const npcSprite = this.currentTarget.kind === "npc" ? this.npcSprites.get(this.currentTarget.id) : null;
      const tx = npcSprite ? npcSprite.x : this.currentTarget.x;
      const ty = npcSprite ? npcSprite.y : this.currentTarget.y;
      const targetHeight = this.currentTarget.kind === "npc" ? 40 : 28;
      this.indicator.setPosition(tx, ty - targetHeight).setVisible(true);
    } else {
      this.indicator.setVisible(false);
    }

    this.checkBattleZone();
  }

  private installTestHook(): void {
    (window as unknown as Record<string, unknown>).__test = {
      scene: this,
      getPlayer: () => ({
        x: this.player.x,
        y: this.player.y,
        depth: this.player.depth,
        facing: this.facing,
        anim: this.player.anims.isPlaying ? (this.player.anims.currentAnim?.key ?? null) : null
      }),
      setPlayerPos: (x: number, y: number) => {
        this.player.setPosition(x, y);
        this.cameras.main.centerOn(x, y);
      },
      getCamera: () => ({ scrollX: this.cameras.main.scrollX, scrollY: this.cameras.main.scrollY }),
      getParallax: () => ({ scrollFactorX: this.parallax.scrollFactorX, x: this.parallax.x }),
      getDepths: () => ({
        player: this.player.depth,
        objectsBelow: LAYERS.OBJECTS_BELOW,
        objectsAbove: LAYERS.OBJECTS_ABOVE,
        fx: LAYERS.FX
      }),
      getFlags: () => [...this.state.flags],
      getState: () => this.state.toJSON(),
      getTarget: () => this.currentTarget,
      fxAlpha: () => this.fxTint.fillAlpha,
      getUI: () => (this.scene.get("UIScene") as UIScene).debugState()
    };
  }
}
