import { test, expect, type Page } from "@playwright/test";
import { bootToWorld, expectNoErrors } from "./helpers";

const ui = (page: Page) => page.evaluate(() => window.__test.getUI());
const flags = (page: Page) => page.evaluate(() => window.__test.getFlags());
const state = (page: Page) => page.evaluate(() => window.__test.getState() as { hp: number; coins: number; xp: number; inventory: { id: string; qty: number }[]; pos: { x: number; y: number } });
const battleActive = (page: Page) =>
  page.evaluate(() => (window.__game as { scene: { isActive(k: string): boolean } }).scene.isActive("BattleScene"));

/** press E until the dialogue closes (each press either completes the typewriter or advances) */
async function finishDialogue(page: Page): Promise<void> {
  for (let i = 0; i < 24; i++) {
    if (!(await ui(page)).dialogueOpen) return;
    await page.keyboard.press("e");
    await page.waitForTimeout(140);
  }
  throw new Error("dialogue never closed");
}

test("talking to the elder starts the quest (portrait dialogue, flag set)", async ({ page }) => {
  const handle = await bootToWorld(page);
  // stand just south of Elder Rowan (17.5, 12) and face up
  await page.evaluate(() => window.__test.setPlayerPos(560, 452));
  await page.keyboard.press("ArrowUp");
  await page.waitForTimeout(150);
  await page.keyboard.press("e");
  await page.waitForTimeout(250);
  const open = await ui(page);
  expect(open.dialogueOpen).toBe(true);
  expect(open.speaker).toBe("Elder Rowan");
  await finishDialogue(page);
  expect(await flags(page)).toContain("quest_started");
  // movement locked during dialogue must be released after
  const before = await page.evaluate(() => window.__test.getPlayer().x);
  await page.keyboard.down("ArrowLeft");
  await page.waitForTimeout(200);
  await page.keyboard.up("ArrowLeft");
  const after = await page.evaluate(() => window.__test.getPlayer().x);
  expect(before - after).toBeGreaterThan(5);
  expectNoErrors(handle);
});

test("opening the chest grants the sword and potions, once", async ({ page }) => {
  const handle = await bootToWorld(page);
  await page.evaluate(() => window.__test.setPlayerPos(176, 608));
  await page.keyboard.press("ArrowUp");
  await page.waitForTimeout(150);
  await page.keyboard.press("e");
  await page.waitForTimeout(250);
  expect((await ui(page)).dialogueOpen).toBe(true);
  await finishDialogue(page);
  const s = await state(page);
  expect(await flags(page)).toContain("chest_opened");
  expect(s.inventory).toContainEqual(expect.objectContaining({ id: "sword", qty: 1 }));
  expect(s.inventory).toContainEqual(expect.objectContaining({ id: "potion", qty: 2 }));
  // second open: empty, no duplicate loot
  await page.keyboard.press("e");
  await page.waitForTimeout(250);
  await finishDialogue(page);
  const s2 = await state(page);
  expect(s2.inventory.find((i) => i.id === "potion")?.qty).toBe(2);
  expectNoErrors(handle);
});

test("inventory panel toggles with I", async ({ page }) => {
  const handle = await bootToWorld(page);
  expect((await ui(page)).inventoryOpen).toBe(false);
  await page.keyboard.press("i");
  await page.waitForTimeout(120);
  expect((await ui(page)).inventoryOpen).toBe(true);
  await page.keyboard.press("i");
  await page.waitForTimeout(120);
  expect((await ui(page)).inventoryOpen).toBe(false);
  expectNoErrors(handle);
});

test("entering the east meadow triggers the battle; attacking wins it", async ({ page }) => {
  const handle = await bootToWorld(page);
  await page.evaluate(() => window.__test.setPlayerPos(860, 700)); // inside battle zone
  await page.waitForFunction(() => (window.__game as { scene: { isActive(k: string): boolean } }).scene.isActive("BattleScene"), undefined, { timeout: 5000 });
  await page.waitForTimeout(1000); // fade-in + menu unlock
  for (let i = 0; i < 12 && (await battleActive(page)); i++) {
    await page.keyboard.press("Enter"); // Attack
    await page.waitForTimeout(1900);
  }
  expect(await battleActive(page)).toBe(false);
  const s = await state(page);
  expect(await flags(page)).toContain("battle_won");
  expect(s.coins).toBeGreaterThanOrEqual(12);
  expect(s.xp).toBeGreaterThanOrEqual(20);
  expect(s.hp).toBeGreaterThanOrEqual(1);
  expect(s.hp).toBeLessThan(20);
  expectNoErrors(handle);
});

test("well saves; Continue restores position, flags and inventory", async ({ page }) => {
  const handle = await bootToWorld(page);
  // loot the chest first so the save has real content
  await page.evaluate(() => window.__test.setPlayerPos(176, 608));
  await page.keyboard.press("ArrowUp");
  await page.waitForTimeout(150); // let update() compute the interact target
  await page.keyboard.press("e");
  await page.waitForTimeout(250);
  expect((await ui(page)).dialogueOpen).toBe(true);
  await finishDialogue(page);
  // drink at the well (save point)
  await page.evaluate(() => window.__test.setPlayerPos(640, 474));
  await page.keyboard.press("ArrowUp");
  await page.waitForTimeout(150);
  await page.keyboard.press("e");
  await page.waitForTimeout(250);
  expect((await ui(page)).dialogueOpen).toBe(true);
  await finishDialogue(page);
  const saved = await state(page);
  expect(saved.hp).toBe(20); // healed
  const rawSave = await page.evaluate(() => window.localStorage.getItem("emberfall-save-v1"));
  expect(rawSave, "save must be written to localStorage").toBeTruthy();
  expect(JSON.parse(rawSave!).flags).toContain("chest_opened");

  await page.reload();
  await page.waitForFunction(() => !!window.__game, undefined, { timeout: 15_000 });
  await page.waitForTimeout(400);
  await page.keyboard.press("ArrowDown"); // select Continue
  await page.waitForTimeout(150);
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => !!window.__test, undefined, { timeout: 10_000 });
  await page.waitForTimeout(600);

  const restored = await state(page);
  expect(await flags(page)).toContain("chest_opened");
  expect(restored.inventory).toContainEqual(expect.objectContaining({ id: "sword" }));
  expect(restored.hp).toBe(20);
  expect(Math.abs(restored.pos.x - saved.pos.x)).toBeLessThan(2);
  expect(Math.abs(restored.pos.y - saved.pos.y)).toBeLessThan(2);
  expectNoErrors(handle);
});
