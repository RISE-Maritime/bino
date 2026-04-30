import { test } from "@playwright/test";

// Diagnostic — captures the viewer + preview panes for v0.4a finish.
// Excluded from the default e2e run via testIgnore.
test("capture preview-panes screenshot", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(
    () => {
      const txt = document.querySelector(".stats")?.textContent ?? "";
      const m = txt.match(/(\d+)\s+frames/);
      return m && Number(m[1]) > 30;
    },
    { timeout: 30_000 },
  );
  await page.waitForTimeout(800);
  await page.screenshot({ path: "test-results/v04a-finish.png", fullPage: false });
});
