import { test, expect } from "@playwright/test";
import { bootToWorld, expectNoErrors, player } from "./helpers";

test("boots to the village with zero console errors", async ({ page }) => {
  const handle = await bootToWorld(page);
  await expect(page.locator("canvas")).toBeVisible();
  const p = await player(page);
  expect(p.x).toBeGreaterThan(0);
  expectNoErrors(handle);
});

test("arrow keys move the hero with the right walk animation", async ({ page }) => {
  const handle = await bootToWorld(page);
  const before = await player(page);
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(250);
  const during = await player(page);
  expect(during.anim).toBe("hero-right");
  expect(during.facing).toBe("right");
  await page.waitForTimeout(250);
  await page.keyboard.up("ArrowRight");
  await page.waitForTimeout(150); // let the next update() tick see the key release
  const after = await player(page);
  expect(after.x - before.x).toBeGreaterThan(20);
  expect(after.anim).toBeNull();
  expectNoErrors(handle);
});

test("collision stops the hero at the village border", async ({ page }) => {
  const handle = await bootToWorld(page);
  await page.keyboard.down("ArrowDown");
  await page.waitForTimeout(1500);
  const atWall = await player(page);
  await page.waitForTimeout(400);
  const still = await player(page);
  await page.keyboard.up("ArrowDown");
  // rows >= 28 are solid; feet must stop at the wall and stay there
  expect(atWall.y).toBeLessThanOrEqual(28 * 32 + 4);
  expect(Math.abs(still.y - atWall.y)).toBeLessThan(2);
  expectNoErrors(handle);
});

test("hero renders behind tree canopy but in front of trunks (fully layered)", async ({ page }) => {
  const handle = await bootToWorld(page);
  // grove oak at tile (5.5, 15): trunk base y = 512, canopy spans y 416-474.
  // Stand so the canopy hides the torso while head sliver + feet stay visible.
  await page.evaluate(() => window.__test.setPlayerPos(180, 494));
  await page.waitForTimeout(250);
  const depths = await page.evaluate(() => window.__test.getDepths());
  expect(depths.player).toBeGreaterThan(depths.objectsBelow);
  expect(depths.player).toBeLessThan(depths.objectsAbove);
  await expect(page.locator("canvas")).toHaveScreenshot("hero-behind-canopy.png", {
    maxDiffPixelRatio: 0.02
  });
  expectNoErrors(handle);
});

test("parallax backdrop scrolls slower than the camera", async ({ page }) => {
  const handle = await bootToWorld(page);
  const factor = await page.evaluate(() => window.__test.getParallax().scrollFactorX);
  expect(factor).toBeCloseTo(0.3, 5);
  const camBefore = await page.evaluate(() => window.__test.getCamera());
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(700);
  await page.keyboard.up("ArrowRight");
  const camAfter = await page.evaluate(() => window.__test.getCamera());
  expect(camAfter.scrollX).toBeGreaterThan(camBefore.scrollX + 10);
  expectNoErrors(handle);
});
