import { test, expect } from "@playwright/test";

test("viewer renders frames in standalone scripted mode", async ({ page }) => {
  await page.goto("/");

  // Canvas must be in the DOM and sized.
  const canvas = page.locator("canvas.scene");
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  expect(box?.width).toBeGreaterThan(0);
  expect(box?.height).toBeGreaterThan(0);

  // Header should report scripted source after mount.
  await expect(page.locator("header")).toContainText(/src: scripted/);

  // Stats text should advance: capture frames N at t1, then again at t2.
  const statsLocator = page.locator(".stats");
  const readFrames = async (): Promise<number> => {
    const txt = (await statsLocator.textContent()) ?? "";
    const m = txt.match(/(\d+)\s+frames/);
    return m && m[1] ? Number.parseInt(m[1], 10) : 0;
  };

  // Wait for the stats line to populate (the onStats callback fires
  // every 500 ms).
  await expect.poll(readFrames, { timeout: 10_000 }).toBeGreaterThan(0);
  const before = await readFrames();
  await page.waitForTimeout(1500);
  const after = await readFrames();
  expect(after).toBeGreaterThan(before);
});
