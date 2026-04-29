import { test } from "@playwright/test";

// Diagnostic — captures a screenshot for visual sanity. Run with
// `pnpm exec playwright test e2e/screenshot.spec.ts --headed=false`
// and look at the artifact.
test("capture viewer screenshot", async ({ page }) => {
  await page.goto("/");
  // Wait for terrain fetch + scene mount.
  await page.waitForFunction(
    () => {
      const txt = document.querySelector(".stats")?.textContent ?? "";
      const m = txt.match(/(\d+)\s+frames/);
      return m && Number(m[1]) > 30;
    },
    { timeout: 20_000 },
  );
  await page.waitForTimeout(500);
  await page.screenshot({ path: "test-results/viewer.png", fullPage: false });
});
