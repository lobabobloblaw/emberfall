// The render stack. Every drawable in the game maps to exactly one of these depths.
// NEVER hardcode depth numbers elsewhere — import from here (see CLAUDE.md).
export const LAYERS = {
  /** far-forest strip, scrollFactor 0.3 */
  PARALLAX: 0,
  /** grass/dirt/water tilemap layer A */
  GROUND: 10,
  /** flowers, grass variants — tilemap layer B */
  GROUND_DETAIL: 20,
  /** trunks, walls, props (collidable, always behind entities) */
  OBJECTS_BELOW: 30,
  /** hero, NPCs, slimes — y-sorted inside [40, 41) */
  ENTITIES: 40,
  /** canopies, roofs — the walk-behind layer */
  OBJECTS_ABOVE: 60,
  /** ambient tint, transitions */
  FX: 70,
  /** dialogue, HUD, menus (separate UIScene, camera-independent) */
  UI: 100
} as const;

/** y-sort entities inside the ENTITIES band; world is 960px tall so y/1000 < 1 */
export function entityDepth(y: number): number {
  return LAYERS.ENTITIES + y / 1000;
}
