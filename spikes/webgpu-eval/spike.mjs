// S15 — WebGPU re-evaluation against current Three (0.184+).
//
// Tries to instantiate WebGPURenderer in Node, render a small
// scene through MeshDepthMaterial(RGBADepthPacking), and verify
// the readback shape matches what our lidar kernel expects.

import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "out");
await mkdir(outDir, { recursive: true });

console.log("[node]", process.version);

// Polyfill globals Three's WebGPU pipeline needs in Node. Same
// pattern @bino/node uses for the WebGL renderer, plus a minimal
// `document.createElementNS` because the WebGPURenderer's default
// constructor calls `createCanvasElement()` even if you pass your
// own canvas in.
const g = globalThis;
if (typeof g.requestAnimationFrame !== "function") {
  g.requestAnimationFrame = (cb) => {
    setImmediate(() => cb(performance.now()));
    return 0;
  };
}
if (typeof g.cancelAnimationFrame !== "function") g.cancelAnimationFrame = () => {};
if (typeof g.self === "undefined") g.self = g;
if (typeof g.document === "undefined") {
  g.document = {
    createElementNS: (_ns, tag) => {
      // Three calls this for "canvas". Return a stub with the
      // surface-area its renderer expects.
      const el = {
        tagName: tag,
        width: 1,
        height: 1,
        style: {},
        addEventListener() {},
        removeEventListener() {},
        getContext() {
          return null;
        },
      };
      return el;
    },
  };
}

// Bring in webgpu (Dawn bindings) and stitch its `navigator.gpu`
// into globalThis the way the v0.1 spike did.
let webgpuOk = false;
try {
  const { create, globals } = await import("webgpu");
  Object.assign(globalThis, globals); // exposes GPUBufferUsage etc.
  const native = create([]);
  Object.defineProperty(globalThis.navigator, "gpu", {
    value: native,
    writable: false,
    configurable: false,
  });
  webgpuOk = true;
  console.log("[webgpu] native binding loaded");
} catch (err) {
  console.error("[webgpu] failed to load:", err.message ?? err);
}

if (!webgpuOk) {
  await writeFile(
    join(outDir, "summary.json"),
    JSON.stringify({ ok: false, reason: "webgpu npm package failed to load" }, null, 2),
  );
  process.exit(1);
}

const THREE = await import("three");
console.log("[three]", THREE.REVISION);

// WebGPURenderer in current three lives at three/webgpu (since
// ~r158). Try a couple of import paths.
let WebGPURenderer;
try {
  ({ WebGPURenderer } = await import("three/webgpu"));
} catch {
  try {
    ({ WebGPURenderer } = await import("three/build/three.webgpu.js"));
  } catch (err) {
    console.error("[three] no WebGPURenderer entry resolved:", err.message);
    await writeFile(
      join(outDir, "summary.json"),
      JSON.stringify({ ok: false, reason: "WebGPURenderer entry not found" }, null, 2),
    );
    process.exit(2);
  }
}
console.log("[three] WebGPURenderer resolved");

const W = 256;
const H = 192;
const renderer = new WebGPURenderer({ antialias: false });
renderer.setSize(W, H, false);
try {
  await renderer.init();
} catch (err) {
  console.error("[three] WebGPURenderer.init failed:", err.message ?? err);
  await writeFile(
    join(outDir, "summary.json"),
    JSON.stringify({ ok: false, reason: "renderer.init failed", error: String(err) }, null, 2),
  );
  process.exit(3);
}
console.log("[three] WebGPURenderer initialized");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x102030);
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
scene.add(new THREE.DirectionalLight(0xffffff, 1.0));

const torus = new THREE.Mesh(
  new THREE.TorusKnotGeometry(2, 0.6, 64, 12),
  new THREE.MeshStandardMaterial({ color: 0xff6644 }),
);
scene.add(torus);

const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 100);
camera.position.set(0, 3, 8);
camera.lookAt(0, 0, 0);

// === Test 1: plain colour render via render-target readback ===
const colorTarget = new THREE.WebGPURenderTarget(W, H);
let colorOk = false;
try {
  renderer.setRenderTarget(colorTarget);
  await renderer.renderAsync(scene, camera);
  const buf = new Uint8Array(W * H * 4);
  await renderer.readRenderTargetPixelsAsync(colorTarget, 0, 0, W, H, buf);
  const nonZero = buf.some((b) => b !== 0);
  console.log("[test1] colour render readback nonZero=", nonZero);
  colorOk = nonZero;
} catch (err) {
  console.error("[test1] colour render failed:", err.message ?? err);
}

// === Test 2: depth pass via MeshDepthMaterial(RGBADepthPacking) ===
let depthOk = false;
try {
  const depthOverride = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking,
    blending: THREE.NoBlending,
  });
  const depthTarget = new THREE.WebGPURenderTarget(W, H);
  scene.overrideMaterial = depthOverride;
  renderer.setRenderTarget(depthTarget);
  await renderer.renderAsync(scene, camera);
  const buf = new Uint8Array(W * H * 4);
  await renderer.readRenderTargetPixelsAsync(depthTarget, 0, 0, W, H, buf);
  scene.overrideMaterial = null;
  const nonZero = buf.some((b) => b !== 0);
  console.log("[test2] depth pass readback nonZero=", nonZero);
  depthOk = nonZero;
} catch (err) {
  console.error("[test2] depth pass failed:", err.message ?? err);
}

const summary = {
  three_revision: THREE.REVISION,
  node_version: process.version,
  color_render_ok: colorOk,
  depth_pass_ok: depthOk,
};
await writeFile(join(outDir, "summary.json"), JSON.stringify(summary, null, 2));
console.log("\n[summary]", summary);
