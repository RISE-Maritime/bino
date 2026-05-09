import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  compileScenario,
  buildScene,
  createLidarKernel,
  createLidarKernelWasm,
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

type Stats = ReturnType<typeof collectStats>;

function fmtMs(v: number): string {
  return v.toFixed(3);
}

function printRow(label: string, s: Stats, rays: number) {
  const raysPerSec = Math.round(rays / (s.mean / 1000));
  console.log(
    `  ${label.padEnd(28)} mean=${fmtMs(s.mean)}ms  p50=${fmtMs(s.p50)}ms  p95=${fmtMs(s.p95)}ms  ${(raysPerSec / 1000).toFixed(0)}K rays/s`,
  );
}

const WARMUP = 10;
const MEASURED = 50;

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

// ── Benchmark helpers ───────────────────────────────────────────

const terrain = buildSyntheticTerrain();
const triCount = triangleCount(terrain);

function setupScene() {
  const compiled = compileScenario(scenario);
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

function benchWasm(channels: number, azimuths: number, fovH: number): Stats {
  const cfg = { ...lidarConfig, channels };
  const { scene, sensorNode, terrain: tg } = setupScene();
  const kernel = createLidarKernelWasm({
    scene,
    sensorNode,
    config: cfg,
    terrain: tg,
    azimuths,
    fov_deg: 45,
    fov_h_deg: fovH,
  });
  kernel.step(0);
  for (let i = 0; i < WARMUP; i++) kernel.step(i * 0.1);
  const timings: number[] = [];
  for (let i = 0; i < MEASURED; i++) {
    const t0 = performance.now();
    kernel.step(i * 0.1);
    timings.push(performance.now() - t0);
  }
  kernel.dispose();
  return collectStats(timings);
}

// GL 360° benchmark: render N cubemap faces per sweep, each covering
// 90° horizontal × 45° vertical FOV. Total pixel count per sweep =
// faces × (azimuths/faces) × channels.
function benchGl(channels: number, azimuths: number): Stats {
  const cfg = { ...lidarConfig, channels };
  const { scene, sensorNode } = setupScene();
  const faceWidth = Math.ceil(azimuths / GL_CUBEMAP_FACES);
  const handle = createHeadlessRenderer(faceWidth, channels);
  try {
    const kernels: ReturnType<typeof createLidarKernel>[] = [];
    for (let f = 0; f < GL_CUBEMAP_FACES; f++) {
      const faceNode = new THREE.Object3D();
      faceNode.name = `lidar_face_${f}`;
      faceNode.rotation.y = (f * Math.PI) / 2;
      sensorNode.add(faceNode);
      kernels.push(
        createLidarKernel({
          renderer: handle.renderer,
          scene,
          sensorNode: faceNode,
          config: cfg,
          fov_deg: 45,
          width: faceWidth,
        }),
      );
    }
    scene.updateMatrixWorld(true);
    for (let i = 0; i < WARMUP; i++) {
      for (const k of kernels) k.step(i * 0.1);
    }
    const timings: number[] = [];
    for (let i = 0; i < MEASURED; i++) {
      const t0 = performance.now();
      for (const k of kernels) k.step(i * 0.1);
      timings.push(performance.now() - t0);
    }
    for (const k of kernels) k.dispose();
    return collectStats(timings);
  } finally {
    handle.dispose();
  }
}

// ── Tests ───────────────────────────────────────────────────────

// Realistic configs: channels (vertical) × azimuths (horizontal).
// Full-360° sweep — matches Keelson PointCloud (one complete revolution).
// GL can't do 360° in one perspective render; needs N cubemap faces.
const CONFIGS = [
  { channels: 32, azimuths: 360, fovH: 360, label: "32×360 (11.5K, 360°)" },
  { channels: 128, azimuths: 512, fovH: 360, label: "OS2-512 (65K, 360°)" },
  { channels: 128, azimuths: 1024, fovH: 360, label: "OS2-1024 (131K, 360°)" },
  { channels: 128, azimuths: 2048, fovH: 360, label: "OS2-2048 (262K, 360°)" },
];

// GL needs a cubemap for 360°: 4 faces at 90° each (no top/bottom needed
// for a lidar with narrow vertical FOV). Each face renders the full scene.
const GL_CUBEMAP_FACES = 4;

describe("lidar benchmark: GL depth-pass vs Rust ray-cast", () => {
  const wasmResults: Record<string, Stats> = {};
  const glResults: Record<string, Stats> = {};

  it(`WASM ray-cast scaling (${triCount} terrain tris)`, () => {
    console.log(`\n── Lidar benchmark (${triCount} terrain tris, 1 vessel, 360° sweep) ──`);
    console.log("  WASM ray-cast:");
    for (const cfg of CONFIGS) {
      const rays = cfg.channels * cfg.azimuths;
      wasmResults[cfg.label] = benchWasm(cfg.channels, cfg.azimuths, cfg.fovH);
      printRow(`    ${cfg.label}`, wasmResults[cfg.label], rays);
    }
    expect(wasmResults[CONFIGS[0]!.label]!.p95).toBeLessThan(100);
  });

  itGl(`GL depth-pass scaling (${triCount} terrain tris)`, () => {
    console.log("  GL depth-pass:");
    for (const cfg of CONFIGS) {
      const rays = cfg.channels * cfg.azimuths;
      glResults[cfg.label] = benchGl(cfg.channels, cfg.azimuths);
      printRow(`    ${cfg.label}`, glResults[cfg.label], rays);
    }
    expect(glResults[CONFIGS[0]!.label]!.p95).toBeLessThan(200);
  });

  it("summary", () => {
    console.log("\n── Summary ──");
    const hasGl = CONFIGS.every((cfg) => glResults[cfg.label]);
    if (hasGl) {
      console.log("  config                          WASM p50    GL p50     WASM speedup");
      console.log("  ──────────────────────────────  ─────────   ─────────  ────────────");
      for (const cfg of CONFIGS) {
        const w = wasmResults[cfg.label]!;
        const g = glResults[cfg.label]!;
        const speedup = g.p50 / w.p50;
        console.log(
          `  ${cfg.label.padEnd(32)}  ${fmtMs(w.p50).padStart(7)}ms   ${fmtMs(g.p50).padStart(7)}ms  ${speedup.toFixed(1)}×`,
        );
      }
      const last = CONFIGS[CONFIGS.length - 1]!;
      const topSpeedup = glResults[last.label]!.p50 / wasmResults[last.label]!.p50;
      if (topSpeedup > 1.5) {
        console.log(
          `\n  ✓ Rust ray-cast ${topSpeedup.toFixed(1)}× faster at ${last.label} — architecture validated.\n`,
        );
      } else {
        console.log(
          `\n  At ${last.label} Rust is ${topSpeedup.toFixed(1)}× vs GL.` +
            "\n  See p95 and scaling trend for the full picture.\n",
        );
      }
    } else {
      const first = CONFIGS[0]!;
      const w = wasmResults[first.label];
      if (w) {
        console.log(
          `  WASM ray-cast ${first.label}: p50=${fmtMs(w.p50)}ms  p95=${fmtMs(w.p95)}ms`,
        );
      }
      console.log(
        "  GL depth-pass: skipped (no GL context)." +
          "\n  Rebuild @kmamal/gl or run in Docker for the full comparison.\n",
      );
    }
    expect(true).toBe(true);
  });
});
