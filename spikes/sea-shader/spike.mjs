// S13 — render the Gerstner sea shader to a small PPM with
// @kmamal/gl, validate it compiles + runs + produces non-flat
// output, dump diagnostics for the verdict.

import { createRequire } from "node:module";
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as THREE from "three";
import { buildSeaMaterial, componentsFor, setSeaTime } from "./sea.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "out");
await mkdir(outDir, { recursive: true });

const require = createRequire(import.meta.url);
const createGL = require("@kmamal/gl");

const W = 512;
const H = 384;

const gl = createGL(W, H, { preserveDrawingBuffer: true, window: {} });
if (!gl) throw new Error("@kmamal/gl: createGL returned null (no display?)");

// Three needs the global self for WebGLAnimation. Dodge that the
// way @bino/node does (see headless-gl.ts).
const g = globalThis;
if (typeof g.requestAnimationFrame !== "function") {
  g.requestAnimationFrame = (cb) => {
    setImmediate(() => cb(performance.now()));
    return 0;
  };
}
if (typeof g.cancelAnimationFrame !== "function") g.cancelAnimationFrame = () => {};
if (typeof g.self === "undefined") g.self = g;

const canvas = {
  width: W,
  height: H,
  clientWidth: W,
  clientHeight: H,
  style: {},
  addEventListener() {},
  removeEventListener() {},
  getContext() {
    return gl;
  },
  getBoundingClientRect() {
    return { left: 0, top: 0, width: W, height: H };
  },
};
const renderer = new THREE.WebGLRenderer({
  canvas,
  context: gl,
  antialias: false,
  preserveDrawingBuffer: true,
});
renderer.setSize(W, H, false);
renderer.setPixelRatio(1);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb6d4e8);

const target = new THREE.WebGLRenderTarget(W, H, {
  format: THREE.RGBAFormat,
  type: THREE.UnsignedByteType,
});

const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 2000);
// Lower camera angle — waves visible against the horizon.
camera.position.set(0, 4, 60);
camera.lookAt(0, 0, 0);

// Render a sequence covering calm → moderate → heavy sea so we can
// verify the shader is sensitive to the configured sea state.
const cases = [
  { label: "calm", state: { significant_wave_height: 0.3, peak_period: 4, direction_deg: 0 } },
  { label: "moderate", state: { significant_wave_height: 1.5, peak_period: 6, direction_deg: 30 } },
  { label: "heavy", state: { significant_wave_height: 3.5, peak_period: 9, direction_deg: 60 } },
];
const buf = new Uint8Array(W * H * 4);
const allStats = {};

for (const { label, state } of cases) {
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400, 256, 256),
    buildSeaMaterial(componentsFor(state)),
  );
  sea.rotation.x = -Math.PI / 2;
  scene.add(sea);

  setSeaTime(sea.material, 5.0);
  const t0 = performance.now();
  renderer.setRenderTarget(target);
  renderer.render(scene, camera);
  const renderMs = performance.now() - t0;
  renderer.readRenderTargetPixels(target, 0, 0, W, H, buf);
  const s = analyse(buf, W, H);
  s.render_ms = +renderMs.toFixed(2);
  s.state = state;
  allStats[label] = s;

  // PPM dump per case
  const ppmHeader = `P6\n${W} ${H}\n255\n`;
  const ppmPixels = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const srcIdx = ((H - 1 - y) * W + x) * 4;
      const dstIdx = (y * W + x) * 3;
      ppmPixels[dstIdx + 0] = buf[srcIdx + 0];
      ppmPixels[dstIdx + 1] = buf[srcIdx + 1];
      ppmPixels[dstIdx + 2] = buf[srcIdx + 2];
    }
  }
  await writeFile(
    join(outDir, `sea-${label}.ppm`),
    Buffer.concat([Buffer.from(ppmHeader), ppmPixels]),
  );

  scene.remove(sea);
  sea.geometry.dispose();
  sea.material.dispose();
}

await writeFile(join(outDir, "summary.json"), JSON.stringify(allStats, null, 2));
console.log("\nrender stats per sea state:");
for (const [k, v] of Object.entries(allStats)) {
  console.log(
    `  ${k.padEnd(10)} render=${v.render_ms.toFixed(1)} ms  unique_colours=${v.unique_colours}  Hs=${v.state.significant_wave_height} m`,
  );
}
// Sensitivity check: non-calm sea states should produce more unique
// colours than calm. (Moderate vs Heavy isn't strictly monotonic
// because at higher amplitudes wave crests cover more pixels with
// similar shading; "calm has less variation than the others" is the
// meaningful invariant.)
const ok =
  allStats.moderate.unique_colours > 2 * allStats.calm.unique_colours &&
  allStats.heavy.unique_colours > 2 * allStats.calm.unique_colours;
console.log(
  ok
    ? "[ok] shader sensitive to sea state — non-calm produces ≥2× the colour variation of calm"
    : "[fail] sea-state sensitivity check failed",
);
if (!ok) process.exit(2);

function analyse(b, w, h) {
  const seen = new Set();
  let minR = 255,
    maxR = 0,
    minG = 255,
    maxG = 0,
    minB = 255,
    maxB = 0;
  let sumR = 0,
    sumG = 0,
    sumB = 0;
  const n = w * h;
  for (let i = 0; i < n; i++) {
    const r = b[i * 4],
      g = b[i * 4 + 1],
      bl = b[i * 4 + 2];
    seen.add((r << 16) | (g << 8) | bl);
    if (r < minR) minR = r;
    if (r > maxR) maxR = r;
    if (g < minG) minG = g;
    if (g > maxG) maxG = g;
    if (bl < minB) minB = bl;
    if (bl > maxB) maxB = bl;
    sumR += r;
    sumG += g;
    sumB += bl;
  }
  return {
    unique_colours: seen.size,
    R: { min: minR, max: maxR, mean: +(sumR / n).toFixed(1) },
    G: { min: minG, max: maxG, mean: +(sumG / n).toFixed(1) },
    B: { min: minB, max: maxB, mean: +(sumB / n).toFixed(1) },
  };
}
