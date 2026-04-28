// Candidate 3: Headless Chromium via Playwright.
//
// Approach:
//   - Tiny static HTTP server serves three.module.js + the shared
//     scene.mjs + a benchmark HTML page.
//   - Playwright launches Chromium with --headless=new and an explicit
//     GL backend choice. We try a sequence of backends in order and
//     pick the first one that gives a non-software renderer (or fall
//     back to SwiftShader if no GPU passthrough is available).
//   - Bench loop runs entirely inside the page (window.__bench). We
//     ferry only the scalar metrics + a small depth strip back through
//     CDP — keeping the giant pixel buffers off the JSON wire.
//   - For visual sanity, after the timed loop we screenshot the canvas
//     and write a PNG.

import { createServer } from "node:http";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const outDir = join(root, "out");

const WIDTH = parseInt(process.env.W || "1920", 10);
const HEIGHT = parseInt(process.env.H || "1080", 10);
const FRAMES = parseInt(process.env.FRAMES || "120", 10);

const STATIC_FILES = {
  "/": { path: join(here, "bench-page.html"), type: "text/html" },
  "/three.module.js": {
    path: join(root, "node_modules/three/build/three.module.js"),
    type: "text/javascript",
  },
  "/scene.mjs": {
    path: join(root, "shared/scene.mjs"),
    type: "text/javascript",
  },
};

function startServer() {
  const server = createServer((req, res) => {
    const f = STATIC_FILES[req.url];
    if (!f) { res.writeHead(404).end("not found"); return; }
    try {
      const body = readFileSync(f.path);
      res.writeHead(200, { "content-type": f.type, "content-length": body.length });
      res.end(body);
    } catch (e) {
      res.writeHead(500).end(String(e));
    }
  });
  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

async function main() {
  const server = await startServer();
  const port = server.address().port;
  console.log(`[chromium] static server on 127.0.0.1:${port}`);

  // Chromium GPU strategy. Try ANGLE Vulkan first (real GPU on systems
  // where the NVIDIA Vulkan ICD is wired up); fall back to SwiftShader
  // (software, always works). With WSL2 + missing graphics caps we
  // expect SwiftShader.
  const launchArgs = [
    "--headless=new",
    "--no-sandbox",
    "--enable-unsafe-swiftshader",
    "--disable-dev-shm-usage",
    `--window-size=${WIDTH},${HEIGHT}`,
    "--use-angle=vulkan",
    "--use-gl=angle",
    "--enable-features=Vulkan,UseSkiaRenderer",
    "--ignore-gpu-blocklist",
  ];

  console.log(`[chromium] launching with args: ${launchArgs.join(" ")}`);
  const browser = await chromium.launch({
    headless: true,
    args: launchArgs,
  });

  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  page.on("console", (msg) => console.log(`[chromium:page:${msg.type()}] ${msg.text()}`));
  page.on("pageerror", (err) => console.log(`[chromium:page:error] ${err.message}`));

  await page.goto(`http://127.0.0.1:${port}/`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 30_000 });

  // Read GPU info from chrome://gpu via page.evaluate is messy; fetch
  // it from inside the bench. Run the benchmark.
  console.log(`[chromium] running bench: ${WIDTH}x${HEIGHT} ${FRAMES} frames`);
  const result = await page.evaluate(
    ([w, h, f]) => window.__bench(w, h, f),
    [WIDTH, HEIGHT, FRAMES],
  );

  console.log(`\n=== chromium :: ${result.width}x${result.height} ===`);
  console.log(`  frames=${result.frames}  total=${result.totalMs.toFixed(1)}ms  fps=${result.fps.toFixed(2)}  per-frame=${result.perFrameMs.toFixed(2)}ms`);
  for (const k of ["step", "render", "readColor", "readDepth"]) {
    const s = result.stage[k];
    console.log(`  ${k.padEnd(10)} avg=${s.avg.toFixed(2)}ms  p50=${s.p50.toFixed(2)}  p95=${s.p95.toFixed(2)}`);
  }
  console.log(`  glVersion=${result.glVersion}`);
  console.log(`  glRenderer=${result.glRenderer}`);
  console.log(`  glVendor=${result.glVendor}`);
  console.log(`  sanity colorBytes=${result.sanity.colorBytes}  hash=${result.sanity.colorHash}  nonZero=${result.sanity.colorNonZero}`);
  console.log(`  depthStrip: ${JSON.stringify(result.depthStrip)}`);

  // Screenshot the canvas as a sanity image.
  const pngPath = join(outDir, "chromium-color.png");
  await page.locator("#canvas").screenshot({ path: pngPath });
  console.log(`[chromium] wrote ${pngPath}`);

  writeFileSync(join(outDir, "chromium.json"), JSON.stringify({
    candidate: "chromium",
    ok: true,
    ...result,
    launchArgs,
  }, null, 2));

  await browser.close();
  server.close();
}

main().catch((e) => {
  console.error(`[chromium] crashed: ${e.stack || e.message || e}`);
  writeFileSync(join(outDir, "chromium.json"), JSON.stringify({
    candidate: "chromium",
    ok: false,
    reason: e.message || String(e),
    stack: e.stack,
  }, null, 2));
  process.exit(1);
});
