import { expect, type Page } from "@playwright/test";

declare global {
  interface Window {
    __game: unknown;
    __test: {
      getPlayer(): { x: number; y: number; depth: number; facing: string; anim: string | null };
      setPlayerPos(x: number, y: number): void;
      getCamera(): { scrollX: number; scrollY: number };
      getParallax(): { scrollFactorX: number; x: number };
      getDepths(): { player: number; objectsBelow: number; objectsAbove: number; fx: number };
      getFlags(): string[];
      getState(): unknown;
      getTarget(): { id: string; kind: string } | null;
      fxAlpha(): number;
      getUI(): { dialogueOpen: boolean; speaker: string; text: string; inventoryOpen: boolean };
    };
  }
}

export interface BootHandle {
  errors: string[];
}

/** Boot the game to the village world. Collects console/page errors for later assertion. */
export async function bootToWorld(page: Page): Promise<BootHandle> {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(String(err)));
  // wipe the save on the FIRST load only — reloads within a test must keep it
  await page.addInitScript(() => {
    if (!window.sessionStorage.getItem("e2e-booted")) {
      window.localStorage.clear();
      window.sessionStorage.setItem("e2e-booted", "1");
    }
  });
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game, undefined, { timeout: 15_000 });
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => !!window.__test, undefined, { timeout: 10_000 });
  await page.waitForTimeout(600); // fade-in settle
  return { errors };
}

export async function player(page: Page) {
  return page.evaluate(() => window.__test.getPlayer());
}

export function expectNoErrors(handle: BootHandle): void {
  expect(handle.errors, `console errors:\n${handle.errors.join("\n")}`).toHaveLength(0);
}
