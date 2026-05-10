import * as THREE from "three";
import { lidar_init_terrain, lidar_sweep } from "../wasm/lidar.js";
import type { LidarSensor } from "./dsl.js";
import type { LidarFrame } from "./lidar.js";

const DEFAULT_FOV_DEG = 90;
const PLACEHOLDER_HALF_EXTENTS: [number, number, number] = [40, 6, 7];

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
}

export function createLidarKernelWasm(opts: LidarKernelWasmOptions) {
  const { scene, sensorNode, config } = opts;
  const fov = opts.fov_deg ?? DEFAULT_FOV_DEG;

  lidar_init_terrain(opts.terrain ? extractTriangles(opts.terrain) : []);

  const wasmConfig = {
    channels: config.channels,
    azimuths: opts.azimuths ?? config.channels,
    fov_v_deg: fov,
    fov_h_deg: opts.fov_h_deg ?? fov,
    range_m: config.range_m,
    sweep_duration_s: opts.sweepDuration_s ?? (1 / config.rate_hz),
  };

  const tmpVec = new THREE.Vector3();

  return {
    step(time: number): LidarFrame {
      const vessels: VesselObb[] = [];
      for (const child of scene.children) {
        if (!(child instanceof THREE.Group)) continue;
        if (!child.userData?.model) continue;
        if (child === sensorNode.parent) continue;
        child.getWorldPosition(tmpVec);
        const m = child.matrixWorld.elements;
        vessels.push({
          center: [tmpVec.x, tmpVec.y, tmpVec.z],
          rotation: colMajorToRowMajor3x3(m),
          half_extents: [...PLACEHOLDER_HALF_EXTENTS],
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
      ) as { points: number[] | Float32Array; count: number; timestamps?: number[] | Float32Array };

      const points =
        result.points instanceof Float32Array
          ? result.points
          : new Float32Array(result.points);
      const timestamps = result.timestamps
        ? (result.timestamps instanceof Float32Array ? result.timestamps : new Float32Array(result.timestamps))
        : undefined;
      return { points, count: result.count, time, ...(timestamps ? { timestamps } : {}) };
    },
    dispose() {},
  };
}

interface VesselObb {
  center: [number, number, number];
  rotation: number[];
  half_extents: [number, number, number];
  velocity?: [number, number, number];
  angular_velocity_y?: number;
}

function colMajorToRowMajor3x3(m: ArrayLike<number>): number[] {
  return [m[0]!, m[4]!, m[8]!, m[1]!, m[5]!, m[9]!, m[2]!, m[6]!, m[10]!];
}

function extractTriangles(
  group: THREE.Group,
): Array<{ v: [[number, number, number], [number, number, number], [number, number, number]] }> {
  const out: Array<{
    v: [[number, number, number], [number, number, number], [number, number, number]];
  }> = [];
  const v = new THREE.Vector3();

  group.updateMatrixWorld(true);
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
