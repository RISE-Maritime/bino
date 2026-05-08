import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  compileScenario,
  buildScene,
  createLidarKernel,
  createLidarKernelWasm,
  decodeDepthToPoints,
  applyPoseUpdate,
  type LidarSensor,
} from "@bino/core";
import { createHeadlessRenderer } from "../src/headless-gl.js";

// ── Terrain generator matching v04_kiel complexity ──────────────
// v04_kiel GMRT grid: ~258×223 cells at 50m res → ~115K triangles.
const TERRAIN_GRID_W = 258;
const TERRAIN_GRID_H = 223;
const TERRAIN_SIZE_M = 12_000;

function buildSyntheticTerrain(): THREE.Group {
  const group = new THREE.Group();
  group.name = "terrain";
  const geom = new THREE.PlaneGeometry(
    TERRAIN_SIZE_M,
    TERRAIN_SIZE_M,
    TERRAIN_GRID_W - 1,
    TERRAIN_GRID_H - 1,
  );
  geom.rotateX(-Math.PI / 2);
  const positions = geom.attributes["position"]!.array as Float32Array;
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i]!;
    const z = positions[i + 2]!;
    positions[i + 1] =
      Math.sin(x * 0.002) * Math.cos(z * 0.003) * 15 +
      Math.sin(x * 0.01 + z * 0.008) * 3 -
      8;
  }
  geom.computeVertexNormals();
  const mesh = new THREE.Mesh(geom, new THREE.MeshStandardMaterial({ color: 0x808080 }));
  group.add(mesh);
  return group;
}

function triangleCount(group: THREE.Group): number {
  let count = 0;
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      const geom = obj.geometry as THREE.BufferGeometry;
      const idx = geom.index;
      count += idx ? idx.count / 3 : geom.attributes["position"]!.count / 3;
    }
  });
  return count;
}

// ── Scenario ────────────────────────────────────────────────────
const scenario = {
  name: "lidar-bench",
  anchor: { lat: 54.37, lon: 10.185, height: 0 },
  vessels: [
    {
      id: "ego",
      model: "tanker_120m",
      pose_source: { type: "zenoh", topic: "ego/pose" },
      sensors: [
        {
          id: "main_lidar",
          type: "lidar" as const,
          mount: { x: 0, y: 0, z: 18 },
          channels: 32,
          range_m: 200,
          rate_hz: 10,
        },
      ],
    },
    {
      id: "ferry",
      model: "ferry_60m",
      pose_source: { type: "zenoh", topic: "ferry/pose" },
      sensors: [],
    },
  ],
  modes: { rendering: "replace" as const, clock: "wall" as const, determinism: "relaxed" as const },
};

const lidarConfig = scenario.vessels[0]!.sensors[0]! as LidarSensor;

// ── Stats ───────────────────────────────────────────────────────
function percentile(sorted: number[], p: number): number {
  const i = Math.floor(sorted.length * p);
  return sorted[Math.min(i, sorted.length - 1)]!;
}

function collectStats(timings: number[]) {
  const sorted = [...timings].sort((a, b) => a - b);
  return {
    mean: timings.reduce((a, b) => a + b, 0) / timings.length,
    p50: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    min: sorted[0]!,
    max: sorted[sorted.length - 1]!,
  };
}

function fmtMs(v: number): string {
  return v.toFixed(3);
}

function printStats(label: string, s: ReturnType<typeof collectStats>, rays = 1024) {
  const raysPerSec = Math.round(rays / (s.mean / 1000));
  console.log(
    `  ${label.padEnd(28)} mean=${fmtMs(s.mean)}ms  p50=${fmtMs(s.p50)}ms  p95=${fmtMs(s.p95)}ms  [${fmtMs(s.min)}–${fmtMs(s.max)}]  ${(raysPerSec / 1000).toFixed(0)}K rays/s`,
  );
}

const WARMUP = 20;
const MEASURED = 200;

// ── GL availability ─────────────────────────────────────────────
const glAvailable = (() => {
  try {
    const handle = createHeadlessRenderer(8, 8);
    handle.dispose();
    return true;
  } catch {
    return false;
  }
})();
const itGl = glAvailable ? it : it.skip;

const RAYS = lidarConfig.channels * lidarConfig.channels;

// ── Benchmark ───────────────────────────────────────────────────
describe("lidar benchmark: GL depth-pass vs Rust ray-cast", () => {
  const compiled = compileScenario(scenario);
  const terrain = buildSyntheticTerrain();
  const triCount = triangleCount(terrain);
  const results: Record<string, ReturnType<typeof collectStats>> = {};

  function setupScene() {
    const built = buildScene(compiled, { sky: false, sea: false });
    built.scene.add(terrain.clone(true));
    const terrainInScene = built.scene.getObjectByName("terrain") as THREE.Group;
    built.terrain = terrainInScene;
    applyPoseUpdate(built.entities, {
      entityId: "ferry",
      pose: { position: [0, 0, -120], orientation: [0, 0, 0, 1] },
      time: 0,
    });
    built.scene.updateMatrixWorld(true);
    const sensorNode = built.entities.get("ego")!.getObjectByName("main_lidar")!;
    return { ...built, sensorNode };
  }

  it(`Rust WASM ray-cast (${RAYS} rays, ${triCount} terrain triangles)`, () => {
    const { scene, sensorNode, terrain: terrainGroup } = setupScene();
    const kernel = createLidarKernelWasm({
      scene,
      sensorNode,
      config: lidarConfig,
      terrain: terrainGroup,
    });

    const sanity = kernel.step(0);
    expect(sanity.count).toBeGreaterThan(0);

    for (let i = 0; i < WARMUP; i++) kernel.step(i * 0.1);

    const timings: number[] = [];
    for (let i = 0; i < MEASURED; i++) {
      const t0 = performance.now();
      kernel.step(i * 0.1);
      timings.push(performance.now() - t0);
    }

    results.wasm = collectStats(timings);
    console.log(`\n── Lidar benchmark (${triCount} terrain tris, 1 vessel, ${RAYS} rays) ──`);
    printStats("WASM ray-cast (full sweep)", results.wasm, RAYS);

    expect(results.wasm.p95).toBeLessThan(100);
    kernel.dispose();
  });

  it("GL decode-only baseline (32×32 depth buffer)", () => {
    const channels = lidarConfig.channels;
    const camera = new THREE.PerspectiveCamera(90, 1, 0.1, lidarConfig.range_m);

    const buf = new Uint8Array(channels * channels * 4);
    for (let i = 0; i < channels * channels; i++) {
      const depth01 = 0.1 + Math.random() * 0.7;
      buf[i * 4 + 3] = Math.floor(depth01 * 256) & 0xff;
      buf[i * 4 + 2] = Math.floor(depth01 * 65536) & 0xff;
    }

    for (let i = 0; i < WARMUP; i++) {
      decodeDepthToPoints(buf, channels, channels, camera, lidarConfig.range_m);
    }

    const timings: number[] = [];
    for (let i = 0; i < MEASURED; i++) {
      const t0 = performance.now();
      decodeDepthToPoints(buf, channels, channels, camera, lidarConfig.range_m);
      timings.push(performance.now() - t0);
    }

    results.glDecode = collectStats(timings);
    printStats("GL decode-only (CPU)", results.glDecode, RAYS);
    expect(results.glDecode.p95).toBeLessThan(10);
  });

  itGl(`GL full depth-pass (32×32, ${triCount} terrain triangles)`, () => {
    const { scene, sensorNode } = setupScene();
    const handle = createHeadlessRenderer(lidarConfig.channels, lidarConfig.channels);
    try {
      const kernel = createLidarKernel({
        renderer: handle.renderer,
        scene,
        sensorNode,
        config: lidarConfig,
      });

      const sanity = kernel.step(0);
      expect(sanity.count).toBeGreaterThan(0);

      for (let i = 0; i < WARMUP; i++) kernel.step(i * 0.1);

      const timings: number[] = [];
      for (let i = 0; i < MEASURED; i++) {
        const t0 = performance.now();
        kernel.step(i * 0.1);
        timings.push(performance.now() - t0);
      }

      results.glFull = collectStats(timings);
      printStats("GL full depth-pass", results.glFull, RAYS);
      expect(results.glFull.p95).toBeLessThan(200);
      kernel.dispose();
    } finally {
      handle.dispose();
    }
  });

  it("summary", () => {
    console.log("\n── Summary ──");
    if (results.wasm && results.glFull) {
      const speedup = results.glFull.p50 / results.wasm.p50;
      console.log(
        `  Rust WASM is ${speedup.toFixed(1)}× faster than GL depth-pass at p50` +
          ` (${fmtMs(results.wasm.p50)}ms vs ${fmtMs(results.glFull.p50)}ms)`,
      );
      if (speedup > 1.5) {
        console.log("  ✓ Rust ray-cast decisively faster — architecture validated.\n");
      } else {
        console.log("  ✗ Rust ray-cast NOT decisively faster — review architecture.\n");
      }
    } else if (results.wasm) {
      console.log(
        `  WASM ray-cast: p50=${fmtMs(results.wasm.p50)}ms  p95=${fmtMs(results.wasm.p95)}ms` +
          `  (${Math.round(RAYS / (results.wasm.p50 / 1000) / 1000)}K rays/s)`,
      );
      console.log(
        "  GL depth-pass: skipped (no GL context)." +
          "\n  Run in Docker (Xvfb) or rebuild @kmamal/gl for the full comparison.\n",
      );
    }
    expect(true).toBe(true);
  });
});
