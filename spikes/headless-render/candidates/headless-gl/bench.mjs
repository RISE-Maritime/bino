// Candidate 1: headless-gl (the `gl` npm package, WebGL1, ANGLE-based).
//
// Approach:
//   - Create a raw WebGL1 context with `gl(width, height)`.
//   - Wrap it in a fake DOM canvas; hand it to Three.js WebGLRenderer.
//   - Render the shared test scene to a color WebGLRenderTarget.
//   - Read back RGBA via renderer.readRenderTargetPixels.
//   - Run a second render with MeshDepthMaterial + RGBADepthPacking to
//     a depth target; read those bytes back too. That's our lidar
//     readback path on WebGL1 — float-depth FBOs aren't reliably
//     portable in WebGL1 / headless-gl.

import { createRequire } from "node:module";
import * as THREE from "three";
import { buildScene } from "../../shared/scene.mjs";
import { runBench, fnv1a, printResult } from "../../shared/bench.mjs";
import {
  makeRenderer,
  makeTargets,
  makeDepthOverride,
  decodeRGBADepthSample,
} from "../../shared/three-headless.mjs";
import { writePPM } from "../../shared/ppm.mjs";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "..", "out");

const require = createRequire(import.meta.url);

const WIDTH = parseInt(process.env.W || "1920", 10);
const HEIGHT = parseInt(process.env.H || "1080", 10);
const FRAMES = parseInt(process.env.FRAMES || "120", 10);

async function main() {
  console.log(`[headless-gl] requiring 'gl'`);
  let createGL;
  try {
    createGL = require("gl");
  } catch (e) {
    console.error(`[headless-gl] FAILED to load 'gl' package: ${e.message}`);
    writeVerdict({
      candidate: "headless-gl",
      ok: false,
      reason: `require('gl') threw: ${e.message}`,
    });
    process.exit(2);
  }

  console.log(`[headless-gl] creating ${WIDTH}x${HEIGHT} context`);
  const gl = createGL(WIDTH, HEIGHT, { preserveDrawingBuffer: true });
  if (!gl) {
    console.error(`[headless-gl] gl() returned null — context creation failed`);
    writeVerdict({
      candidate: "headless-gl",
      ok: false,
      reason: "gl() returned null (no GLES backend on this host)",
    });
    process.exit(2);
  }
  console.log(`[headless-gl] gl version: ${gl.getParameter(gl.VERSION)}`);
  console.log(`[headless-gl] renderer:   ${gl.getParameter(gl.RENDERER)}`);
  console.log(`[headless-gl] vendor:     ${gl.getParameter(gl.VENDOR)}`);

  const renderer = makeRenderer(gl, WIDTH, HEIGHT);
  const { colorTarget, depthRGBATarget } = makeTargets(WIDTH, HEIGHT);
  const depthOverride = makeDepthOverride();

  const { scene, camera, animate } = buildScene({ width: WIDTH, height: HEIGHT });

  const colorBuf = new Uint8Array(WIDTH * HEIGHT * 4);
  const depthBuf = new Uint8Array(WIDTH * HEIGHT * 4);

  const result = await runBench({
    name: "headless-gl",
    width: WIDTH,
    height: HEIGHT,
    frames: FRAMES,
    warmup: 20,
    step: (t) => animate(t),
    render: () => {
      renderer.setRenderTarget(colorTarget);
      renderer.clear(true, true, false);
      renderer.render(scene, camera);

      const prevOverride = scene.overrideMaterial;
      scene.overrideMaterial = depthOverride;
      renderer.setRenderTarget(depthRGBATarget);
      renderer.clear(true, true, false);
      renderer.render(scene, camera);
      scene.overrideMaterial = prevOverride;
    },
    readColor: () => {
      renderer.readRenderTargetPixels(colorTarget, 0, 0, WIDTH, HEIGHT, colorBuf);
      return colorBuf;
    },
    readDepth: () => {
      renderer.readRenderTargetPixels(depthRGBATarget, 0, 0, WIDTH, HEIGHT, depthBuf);
      return depthBuf;
    },
    hash: fnv1a,
  });

  printResult(result);

  // Decode a strip of depth samples through the center scanline so we
  // can confirm depth is real, not garbage.
  const cy = (HEIGHT >> 1) * WIDTH * 4;
  const depthStrip = [];
  for (let x = 0; x < WIDTH; x += WIDTH >> 4) {
    depthStrip.push(+decodeRGBADepthSample(depthBuf, cy + x * 4).toFixed(4));
  }
  console.log(`  depthStrip(center scanline, 16 samples): ${JSON.stringify(depthStrip)}`);

  // Dump frame 0 PPMs for visual sanity.
  writePPM(join(outDir, "headless-gl-color.ppm"), colorBuf, WIDTH, HEIGHT, { flipY: true });
  // Depth PPM — rebuild grayscale from packed RGBA.
  const depthGray = new Uint8Array(WIDTH * HEIGHT * 4);
  for (let i = 0; i < WIDTH * HEIGHT; i++) {
    const d = decodeRGBADepthSample(depthBuf, i * 4);
    const v = Math.max(0, Math.min(255, Math.round(d * 255)));
    depthGray[i * 4 + 0] = v;
    depthGray[i * 4 + 1] = v;
    depthGray[i * 4 + 2] = v;
    depthGray[i * 4 + 3] = 255;
  }
  writePPM(join(outDir, "headless-gl-depth.ppm"), depthGray, WIDTH, HEIGHT, { flipY: true });

  writeVerdict({
    candidate: "headless-gl",
    ok: true,
    width: WIDTH,
    height: HEIGHT,
    frames: FRAMES,
    fps: result.fps,
    perFrameMs: result.perFrameMs,
    stage: result.stage,
    sanity: result.sanity,
    glVersion: gl.getParameter(gl.VERSION),
    glRenderer: gl.getParameter(gl.RENDERER),
    glVendor: gl.getParameter(gl.VENDOR),
    depthStrip,
  });
}

function writeVerdict(v) {
  writeFileSync(join(outDir, "headless-gl.json"), JSON.stringify(v, null, 2));
}

main().catch((e) => {
  console.error(`[headless-gl] crashed: ${e.stack || e.message || e}`);
  writeVerdict({
    candidate: "headless-gl",
    ok: false,
    reason: e.message || String(e),
    stack: e.stack,
  });
  process.exit(1);
});
