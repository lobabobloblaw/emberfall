// localStorage save slot with injectable storage for unit tests.
import type { GameStateData } from "./state";

export const SAVE_KEY = "emberfall-save-v1";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function saveGame(data: GameStateData, storage: StorageLike): void {
  storage.setItem(SAVE_KEY, JSON.stringify(data));
}

export function loadGame(storage: StorageLike): GameStateData | null {
  const raw = storage.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    const d = JSON.parse(raw) as GameStateData;
    if (typeof d?.hp !== "number" || !d?.pos || !Array.isArray(d?.flags)) return null;
    return d;
  } catch {
    return null;
  }
}

export function clearSave(storage: StorageLike): void {
  storage.removeItem(SAVE_KEY);
}

export function hasSave(storage: StorageLike): boolean {
  return loadGame(storage) !== null;
}
