import * as THREE from "three";
import { lidar_init_terrain, lidar_init_vessel_models, lidar_sweep } from "../wasm/lidar.js";
import type { LidarSensor } from "./dsl.js";
import { loadModel } from "./assets.js";

export interface LidarFrame {
  points: Float32Array;
  count: number;
  time: number;
  /** Per-point intra-sweep timestamps (seconds). Present when the
   *  kernel supports temporal interpolation. */
  timestamps?: Float32Array;
}

const DEFAULT_FOV_DEG = 90;

export interface LidarKernelWasmOptions {
  scene: THREE.Scene;
  sensorNode: THREE.Object3D;
  config: LidarSensor;
  terrain?: THREE.Group | undefined;
  /** Vertical FOV in degrees. Defaults to 90. */
  fov_deg?: number | undefined;
  /** Horizontal FOV in degrees. Defaults to fov_deg. For 360° sweep
   *  lidars (OS2-style), set to 360. */
  fov_h_deg?: number | undefined;
  /** Horizontal sample count. Defaults to config.channels (square grid). */
  azimuths?: number | undefined;
  /** Sweep duration for intra-sweep temporal interpolation.
   *  Defaults to 1 / config.rate_hz. */
  sweepDuration_s?: number | undefined;
  /** Water surface Y-coordinate. Rays crossing this plane from above
   *  are absorbed (no sub-water hits). Undefined disables the test. */
  waterLevelY?: number | undefined;
}

/** Registry of model name → model index for the WASM kernel.
 *  Built lazily; shared across all lidar kernel instances. */
const modelRegistry = new Map<string, number>();
let modelsInitialized = false;

function ensureModelRegistered(modelName: string): number {
  const existing = modelRegistry.get(modelName);
  if (existing !== undefined) return existing;

  const hullGroup = loadModel(modelName);
  hullGroup.updateMatrixWorld(true);
  const triangles = extractTriangles(hullGroup);

  const index = modelRegistry.size;
  modelRegistry.set(modelName, index);

  // Re-initialize all models (WASM expects the full array each time)
  const allModels: Array<
    Array<{ v: [[number, number, number], [number, number, number], [number, number, number]] }>
  > = [];
  const sortedEntries = [...modelRegistry.entries()].sort((a, b) => a[1] - b[1]);
  for (const [name] of sortedEntries) {
    if (name === modelName) {
      allModels.push(triangles);
    } else {
      const g = loadModel(name);
      g.updateMatrixWorld(true);
      allModels.push(extractTriangles(g));
    }
  }
  lidar_init_vessel_models(allModels);
  modelsInitialized = true;

  return index;
}

export function createLidarKernelWasm(opts: LidarKernelWasmOptions) {
  const { scene, sensorNode, config } = opts;
  const fov = opts.fov_deg ?? DEFAULT_FOV_DEG;

  lidar_init_terrain(opts.terrain ? extractTriangles(opts.terrain) : []);

  // Discover all vessel models in the scene and register them
  const vesselModelMap = new Map<THREE.Object3D, number>();
  for (const child of scene.children) {
    if (!(child instanceof THREE.Group)) continue;
    if (!child.userData?.model) continue;
    if (child === sensorNode.parent) continue;
    const modelName = child.userData.model as string;
    const modelIndex = ensureModelRegistered(modelName);
    vesselModelMap.set(child, modelIndex);
  }

  const wasmConfig = {
    channels: config.channels,
    azimuths: opts.azimuths ?? config.channels,
    fov_v_deg: fov,
    fov_h_deg: opts.fov_h_deg ?? fov,
    range_m: config.range_m,
    sweep_duration_s: opts.sweepDuration_s ?? 1 / config.rate_hz,
    ...(opts.waterLevelY !== undefined ? { water_level_y: opts.waterLevelY } : {}),
  };

  const tmpVec = new THREE.Vector3();
  const sweepInterval = 1 / config.rate_hz;
  let lastSweepTime = -Infinity;
  let cachedFrame: LidarFrame = { points: new Float32Array(0), count: 0, time: 0 };

  return {
    step(time: number): LidarFrame {
      if (time - lastSweepTime < sweepInterval) {
        return { ...cachedFrame, time };
      }
      lastSweepTime = time;

      const vessels: VesselInstance[] = [];
      for (const child of scene.children) {
        if (!(child instanceof THREE.Group)) continue;
        if (!child.userData?.model) continue;
        if (child === sensorNode.parent) continue;

        let modelIndex = vesselModelMap.get(child);
        if (modelIndex === undefined) {
          modelIndex = ensureModelRegistered(child.userData.model as string);
          vesselModelMap.set(child, modelIndex);
        }

        child.getWorldPosition(tmpVec);
        const m = child.matrixWorld.elements;
        vessels.push({
          model_index: modelIndex,
          center: [tmpVec.x, tmpVec.y, tmpVec.z],
          rotation: colMajorToRowMajor3x3(m),
          velocity: child.userData.velocity ?? [0, 0, 0],
          angular_velocity_y: child.userData.angularVelocityY ?? 0,
        });
      }

      sensorNode.getWorldPosition(tmpVec);
      const sm = sensorNode.matrixWorld.elements;

      const result = lidar_sweep(
        { vessels },
        { origin: [tmpVec.x, tmpVec.y, tmpVec.z], rotation: colMajorToRowMajor3x3(sm) },
        wasmConfig,
      ) as {
        points: number[] | Float32Array;
        count: number;
        timestamps?: number[] | Float32Array;
      };

      const points =
        result.points instanceof Float32Array ? result.points : new Float32Array(result.points);
      const timestamps = result.timestamps
        ? result.timestamps instanceof Float32Array
          ? result.timestamps
          : new Float32Array(result.timestamps)
        : undefined;
      cachedFrame = { points, count: result.count, time, ...(timestamps ? { timestamps } : {}) };
      return cachedFrame;
    },
    dispose() {},
  };
}

interface VesselInstance {
  model_index: number;
  center: [number, number, number];
  rotation: number[];
  velocity?: [number, number, number];
  angular_velocity_y?: number;
}

export function colMajorToRowMajor3x3(m: ArrayLike<number>): number[] {
  return [m[0]!, m[4]!, m[8]!, m[1]!, m[5]!, m[9]!, m[2]!, m[6]!, m[10]!];
}

export function extractTriangles(
  group: THREE.Group | THREE.Object3D,
): Array<{ v: [[number, number, number], [number, number, number], [number, number, number]] }> {
  const out: Array<{
    v: [[number, number, number], [number, number, number], [number, number, number]];
  }> = [];
  const v = new THREE.Vector3();

  if ("updateMatrixWorld" in group) group.updateMatrixWorld(true);
  group.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const geom = obj.geometry as THREE.BufferGeometry;
    const posAttr = geom.getAttribute("position");
    if (!posAttr) return;
    const pos = posAttr.array as Float32Array;
    const wm = obj.matrixWorld;

    const vertex = (i: number): [number, number, number] => {
      v.set(pos[i * 3]!, pos[i * 3 + 1]!, pos[i * 3 + 2]!);
      v.applyMatrix4(wm);
      return [v.x, v.y, v.z];
    };

    const index = geom.index;
    if (index) {
      const idx = index.array;
      for (let i = 0; i < idx.length; i += 3) {
        out.push({ v: [vertex(idx[i]!), vertex(idx[i + 1]!), vertex(idx[i + 2]!)] });
      }
    } else {
      for (let i = 0; i < posAttr.count; i += 3) {
        out.push({ v: [vertex(i), vertex(i + 1), vertex(i + 2)] });
      }
    }
  });
  return out;
}
