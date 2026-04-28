// Candidate 2: @kmamal/gl — maintained fork of headless-gl. Same API,
// newer prebuilt binaries (Node 22 friendly), tracks current Node ABI.
//
// Identical harness to candidate 1 — only the import target changes.

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
  console.log(`[kmamal-gl] requiring '@kmamal/gl'`);
  let createGL;
  try {
    createGL = require("@kmamal/gl");
  } catch (e) {
    console.error(`[kmamal-gl] FAILED to load '@kmamal/gl': ${e.message}`);
    writeVerdict({
      candidate: "kmamal-gl",
      ok: false,
      reason: `require('@kmamal/gl') threw: ${e.message}`,
    });
    process.exit(2);
  }

  console.log(`[kmamal-gl] creating ${WIDTH}x${HEIGHT} context`);
  // @kmamal/gl 9.x has a bug at src/javascript/node-index.js:39 — it
  // unconditionally reads `options.window.gl` without guarding for a
  // missing `window`. Pass an empty window stub to dodge the throw and
  // get a pure offscreen context (the constructor accepts undefined for
  // the trailing window arg, which gives offscreen rendering).
  const gl = createGL(WIDTH, HEIGHT, { preserveDrawingBuffer: true, window: {} });
  if (!gl) {
    console.error(`[kmamal-gl] gl() returned null`);
    writeVerdict({ candidate: "kmamal-gl", ok: false, reason: "gl() returned null" });
    process.exit(2);
  }
  console.log(`[kmamal-gl] gl version: ${gl.getParameter(gl.VERSION)}`);
  console.log(`[kmamal-gl] renderer:   ${gl.getParameter(gl.RENDERER)}`);
  console.log(`[kmamal-gl] vendor:     ${gl.getParameter(gl.VENDOR)}`);

  const renderer = makeRenderer(gl, WIDTH, HEIGHT);
  const { colorTarget, depthRGBATarget } = makeTargets(WIDTH, HEIGHT);
  const depthOverride = makeDepthOverride();

  const { scene, camera, animate } = buildScene({ width: WIDTH, height: HEIGHT });

  const colorBuf = new Uint8Array(WIDTH * HEIGHT * 4);
  const depthBuf = new Uint8Array(WIDTH * HEIGHT * 4);

  const result = await runBench({
    name: "kmamal-gl",
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

  const cy = (HEIGHT >> 1) * WIDTH * 4;
  const depthStrip = [];
  for (let x = 0; x < WIDTH; x += WIDTH >> 4) {
    depthStrip.push(+decodeRGBADepthSample(depthBuf, cy + x * 4).toFixed(4));
  }
  console.log(`  depthStrip: ${JSON.stringify(depthStrip)}`);

  writePPM(join(outDir, "kmamal-gl-color.ppm"), colorBuf, WIDTH, HEIGHT, { flipY: true });

  writeVerdict({
    candidate: "kmamal-gl",
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
  writeFileSync(join(outDir, "kmamal-gl.json"), JSON.stringify(v, null, 2));
}

main().catch((e) => {
  console.error(`[kmamal-gl] crashed: ${e.stack || e.message || e}`);
  writeVerdict({
    candidate: "kmamal-gl",
    ok: false,
    reason: e.message || String(e),
    stack: e.stack,
  });
  process.exit(1);
});
