import { Worker } from "node:worker_threads";
import { fileURLToPath } from "node:url";
import * as THREE from "three";
import {
  buildLidarEnvConfig,
  buildLidarWasmConfig,
  buildRadarEnvConfig,
  buildRadarWasmConfig,
  extractTriangles,
  loadModel,
  marshalLidarVessels,
  marshalLidarSensorPose,
  marshalRadarVessels,
  marshalRadarSensorPose,
  type Environment,
  type LidarFrame,
  type LidarSensor,
  type RadarFrame,
  type RadarSensor,
  type RadarSpoke,
  type VesselBox,
} from "@bino/core";

/** Worker-thread-backed sensor kernels. They mirror the viewer's Web
 *  Worker feeders: the main thread marshals the scene (via the shared
 *  scene-marshal helpers) and posts it to a dedicated worker that runs
 *  the WASM sweep, so multiple sensors compute in parallel instead of
 *  serially on the main thread.
 *
 *  step() returns the most recently completed frame and drops sweeps
 *  while one is in flight — so this is for relaxed (non-strict) timing,
 *  not deterministic runs. */

const WORKER_URL = new URL("./sensor-thread-worker.js", import.meta.url);

type TriangleData = ReturnType<typeof extractTriangles>;

export interface LidarThreadKernelOptions {
  scene: THREE.Scene;
  sensorNode: THREE.Object3D;
  config: LidarSensor;
  terrain?: THREE.Group | undefined;
  waterLevelY?: number | undefined;
  environment?: Environment | undefined;
}

export function createLidarThreadKernel(opts: LidarThreadKernelOptions) {
  const { scene, sensorNode, config } = opts;
  const worker = new Worker(fileURLToPath(WORKER_URL));
  worker.on("error", (e) => console.error("[bino] lidar worker error:", e.message));

  const terrainTris: TriangleData = opts.terrain ? extractTriangles(opts.terrain) : [];
  const modelRegistry = new Map<string, number>();
  const modelTriangles: TriangleData[] = [];

  const resolveModelIndex = (name: string): number => {
    let idx = modelRegistry.get(name);
    if (idx === undefined) {
      idx = modelTriangles.length;
      modelRegistry.set(name, idx);
      const g = loadModel(name);
      g.updateMatrixWorld(true);
      modelTriangles.push(extractTriangles(g));
      worker.postMessage({ type: "init-lidar", terrain: terrainTris, models: modelTriangles });
    }
    return idx;
  };

  // Pre-register models present at startup, then init the worker once.
  for (const child of scene.children) {
    if (!(child instanceof THREE.Group)) continue;
    if (!child.userData?.model) continue;
    if (child === sensorNode.parent) continue;
    resolveModelIndex(child.userData.model as string);
  }
  worker.postMessage({ type: "init-lidar", terrain: terrainTris, models: modelTriangles });

  const wasmConfig = buildLidarWasmConfig(
    config,
    opts.waterLevelY !== undefined ? { waterLevelY: opts.waterLevelY } : {},
  );
  const envConfig = buildLidarEnvConfig(opts.environment);

  let latest: LidarFrame = { points: new Float32Array(0), count: 0, time: 0 };
  let sweepInFlight = false;
  let ready = false;

  worker.on(
    "message",
    (m: { type: string; points?: Float32Array; count?: number; timestamps?: Float32Array }) => {
      if (m.type === "ready") {
        ready = true;
      } else if (m.type === "frame-lidar") {
        const ts = m.timestamps && m.timestamps.length > 0 ? m.timestamps : undefined;
        latest = {
          points: m.points ?? new Float32Array(0),
          count: m.count ?? 0,
          time: latest.time,
          ...(ts ? { timestamps: ts } : {}),
        };
        sweepInFlight = false;
      } else if (m.type === "error") {
        sweepInFlight = false;
      }
    },
  );

  return {
    step(time: number): LidarFrame {
      if (ready && !sweepInFlight) {
        sweepInFlight = true;
        worker.postMessage({
          type: "sweep-lidar",
          scene: { vessels: marshalLidarVessels(scene, sensorNode, resolveModelIndex) },
          sensor: marshalLidarSensorPose(sensorNode),
          config: wasmConfig,
          env: envConfig,
        });
      }
      latest.time = time;
      return latest;
    },
    dispose() {
      void worker.terminate();
    },
  };
}

export interface RadarThreadKernelOptions {
  scene: THREE.Scene;
  sensorNode: THREE.Object3D;
  config: RadarSensor;
  environment?: Environment | undefined;
  staticObstacles?: VesselBox[];
}

export function createRadarThreadKernel(opts: RadarThreadKernelOptions) {
  const { scene, sensorNode, config } = opts;
  const worker = new Worker(fileURLToPath(WORKER_URL));
  worker.on("error", (e) => console.error("[bino] radar worker error:", e.message));

  worker.postMessage({ type: "init-radar", staticObstacles: opts.staticObstacles ?? [] });

  const wasmConfig = buildRadarWasmConfig(config);
  const baseEnvConfig = buildRadarEnvConfig(config, opts.environment);

  let latest: RadarFrame = { spokes: [], time: 0 };
  let sweepInFlight = false;
  let ready = false;
  let sweepIndex = 0;

  worker.on("message", (m: { type: string; spokes?: RadarSpoke[] }) => {
    if (m.type === "ready") {
      ready = true;
    } else if (m.type === "frame-radar") {
      latest = { spokes: m.spokes ?? [], time: latest.time };
      sweepInFlight = false;
    } else if (m.type === "error") {
      sweepInFlight = false;
    }
  });

  return {
    step(time: number): RadarFrame {
      if (ready && !sweepInFlight) {
        sweepInFlight = true;
        const env = baseEnvConfig
          ? {
              ...baseEnvConfig,
              sea_clutter: baseEnvConfig.sea_clutter
                ? { ...baseEnvConfig.sea_clutter, sweep_index: sweepIndex }
                : undefined,
            }
          : undefined;
        sweepIndex++;
        worker.postMessage({
          type: "sweep-radar",
          scene: { vessels: marshalRadarVessels(scene, sensorNode) },
          host: marshalRadarSensorPose(sensorNode),
          config: wasmConfig,
          env,
        });
      }
      latest.time = time;
      return latest;
    },
    dispose() {
      void worker.terminate();
    },
  };
}
