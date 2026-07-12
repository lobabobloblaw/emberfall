// Shape of public/assets/manifest.json — the game's only asset entry point.
export type Facing = "up" | "down" | "left" | "right";

export interface CharacterDef {
  file: string;
  frameWidth: number;
  frameHeight: number;
  columns: number;
  anims: Record<string, number[]>;
  idle: Record<string, number>;
  frameRate: number;
}

export interface ObjectDef {
  below: string;
  above?: string;
  width: number;
  height: number;
  splitY?: number;
}

export interface Manifest {
  version: number;
  tileSize: number;
  tileset: { file: string; columns: number; count: number; names: Record<string, number> };
  characters: Record<string, CharacterDef>;
  objects: Record<string, ObjectDef>;
  portraits: Record<string, string>;
  icons: Record<string, string>;
  scenes: Record<string, string>;
  battle: Record<string, string>;
  ui: Record<string, string>;
}
