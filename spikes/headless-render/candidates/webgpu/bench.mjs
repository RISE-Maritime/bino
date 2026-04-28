// Candidate 4: Node WebGPU via the `webgpu` (Dawn) npm package +
// Three.js WebGPURenderer.
//
// Per node-webgpu's README this package provides WebGPU but no canvas
// integration — rendering targets are GPUTextures, readback via
// readRenderTargetPixels. That matches what we want anyway.
//
// This is the exploratory candidate per PLAN.md. Three.js r160's
// WebGPURenderer is in examples/jsm/renderers/webgpu and is still
// labelled experimental; expect rough edges. If anything fails, we log
// it and move on — the PLAN explicitly says skip if 1-3 already give a
// clear answer.

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "..", "out");

// Dynamic import — the prebuilt Dawn binary may fail to dlopen on
// distros with older libstdc++; we want to record that as a verdict
// rather than crashing the run-all aggregator.
let create, globals;
try {
  ({ create, globals } = await import("webgpu"));
} catch (e) {
  writeFileSync(join(outDir, "webgpu.json"), JSON.stringify({
    candidate: "webgpu",
    ok: false,
    reason: `failed to load 'webgpu' module: ${e.message}`,
    errorCode: e.code,
    note: "Likely missing GLIBCXX_3.4.32 — Dawn prebuilt expects Ubuntu 24.04+ libstdc++.",
  }, null, 2));
  console.error(`[webgpu] FAILED to load: ${e.message}`);
  process.exit(2);
}

const WIDTH = parseInt(process.env.W || "1920", 10);
const HEIGHT = parseInt(process.env.H || "1080", 10);
const FRAMES = parseInt(process.env.FRAMES || "120", 10);

function writeVerdict(v) {
  writeFileSync(join(outDir, "webgpu.json"), JSON.stringify(v, null, 2));
}

async function main() {
  console.log(`[webgpu] installing globals + navigator.gpu`);
  Object.assign(globalThis, globals);
  const gpu = create([
    "enable-dawn-features=allow_unsafe_apis",
  ]);
  // Node 22 ships a read-only `navigator` getter on globalThis. Plain
  // assignment throws ("only a getter"). Redefine via defineProperty
  // and copy any existing navigator properties so we don't lose them.
  const existing = globalThis.navigator;
  Object.defineProperty(globalThis, "navigator", {
    value: { ...(existing ?? {}), gpu },
    writable: true,
    configurable: true,
  });

  console.log(`[webgpu] requesting adapter`);
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
  if (!adapter) {
    writeVerdict({ candidate: "webgpu", ok: false, reason: "no GPU adapter (Dawn could not pick a backend)" });
    process.exit(2);
  }
  const info = adapter.info ?? {};
  console.log(`[webgpu] adapter info: vendor=${info.vendor} arch=${info.architecture} device=${info.device} desc=${info.description}`);

  const device = await adapter.requestDevice();
  console.log(`[webgpu] got device`);

  // Three's WebGPU bootstrap (capabilities/WebGPU.js) references the
  // browser `window` global. In Node we polyfill it minimally — just
  // enough that the feature-detection paths return false rather than
  // throwing. Same trick for `self` (Three uses it for worker checks).
  if (typeof globalThis.window === "undefined") globalThis.window = globalThis;
  if (typeof globalThis.self === "undefined") globalThis.self = globalThis;
  if (typeof globalThis.requestAnimationFrame === "undefined") {
    globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16);
    globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
  }

  // Now bring in Three.js. WebGPURenderer expects navigator.gpu globally.
  const THREE = await import("three");
  let WebGPURenderer;
  try {
    const mod = await import("three/examples/jsm/renderers/webgpu/WebGPURenderer.js");
    WebGPURenderer = mod.default ?? mod.WebGPURenderer;
  } catch (e) {
    writeVerdict({ candidate: "webgpu", ok: false, reason: `failed to import three WebGPURenderer: ${e.message}`, stack: e.stack });
    console.error(e);
    process.exit(2);
  }

  // Three's WebGPURenderer expects a real canvas with a webgpu context
  // (it calls canvas.getContext("webgpu").configure() during init).
  // node-webgpu has no canvas integration so we hand it a stub context
  // — configure becomes a no-op, getCurrentTexture is never called
  // because we always render to an explicit render-target (never to
  // the swapchain).
  const fakeWebGPUContext = {
    configure() {},
    unconfigure() {},
    getCurrentTexture() {
      throw new Error("[webgpu] swapchain getCurrentTexture called — should never happen with explicit render targets");
    },
  };
  const fakeCanvas = {
    width: WIDTH, height: HEIGHT,
    clientWidth: WIDTH, clientHeight: HEIGHT,
    style: {},
    addEventListener() {}, removeEventListener() {},
    getContext(type) {
      return type === "webgpu" ? fakeWebGPUContext : null;
    },
    getBoundingClientRect() { return { left: 0, top: 0, width: WIDTH, height: HEIGHT }; },
  };

  let renderer;
  try {
    renderer = new WebGPURenderer({
      canvas: fakeCanvas,
      device,
      antialias: false,
      forceWebGL: false,
    });
    await renderer.init();
  } catch (e) {
    writeVerdict({ candidate: "webgpu", ok: false, reason: `WebGPURenderer init failed: ${e.message}`, stack: e.stack });
    console.error(e);
    process.exit(2);
  }
  renderer.setSize(WIDTH, HEIGHT, false);
  renderer.setPixelRatio(1);
  console.log(`[webgpu] WebGPURenderer initialized`);

  const { buildScene } = await import("../../shared/scene.mjs");
  const { runBench, fnv1a, printResult } = await import("../../shared/bench.mjs");

  const colorTarget = new THREE.WebGLRenderTarget(WIDTH, HEIGHT, {
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat, type: THREE.UnsignedByteType,
    depthBuffer: true, stencilBuffer: false,
  });
  const depthTarget = new THREE.WebGLRenderTarget(WIDTH, HEIGHT, {
    minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat, type: THREE.UnsignedByteType,
    depthBuffer: true, stencilBuffer: false,
  });
  const depthOverride = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking,
    blending: THREE.NoBlending,
  });

  const { scene, camera, animate } = buildScene({ width: WIDTH, height: HEIGHT });

  const colorBuf = new Uint8Array(WIDTH * HEIGHT * 4);
  const depthBuf = new Uint8Array(WIDTH * HEIGHT * 4);

  // Three's common Renderer API for WebGPU:
  //   await renderer.render(scene, camera)
  //   await renderer.readRenderTargetPixelsAsync(rt, x, y, w, h) -> buffer
  // Returns a fresh buffer each call (different shape from WebGL's
  // version which copies into a preallocated Uint8Array).
  let lastColor = null, lastDepth = null;

  const result = await runBench({
    name: "webgpu",
    width: WIDTH, height: HEIGHT,
    frames: FRAMES, warmup: 10,
    step: (t) => animate(t),
    render: async () => {
      renderer.setRenderTarget(colorTarget);
      await renderer.render(scene, camera);
      // Depth pass is omitted: Three r160 WebGPURenderer's NodeMaterial
      // pipeline cannot consume a classic MeshDepthMaterial. The
      // workaround is to write a TSL-based depth-out node, or use
      // r170+ where MeshDepthNodeMaterial exists. Out of scope for
      // this exploratory candidate — see results.md.
    },
    readColor: async () => {
      lastColor = await renderer.readRenderTargetPixelsAsync(colorTarget, 0, 0, WIDTH, HEIGHT);
      return lastColor;
    },
    readDepth: null,
    hash: fnv1a,
  });

  printResult(result);

  writeVerdict({
    candidate: "webgpu",
    ok: true,
    width: WIDTH, height: HEIGHT, frames: FRAMES,
    fps: result.fps,
    perFrameMs: result.perFrameMs,
    stage: result.stage,
    sanity: result.sanity,
    adapter: info,
  });

  // Release Dawn cleanly so Node can exit.
  delete globalThis.navigator;
}

main().catch((e) => {
  console.error(`[webgpu] crashed: ${e.stack || e.message || e}`);
  writeVerdict({ candidate: "webgpu", ok: false, reason: e.message || String(e), stack: e.stack });
  process.exit(1);
});
