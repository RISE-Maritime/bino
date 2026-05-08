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
  fov_deg?: number | undefined;
}

export function createLidarKernelWasm(opts: LidarKernelWasmOptions) {
  const { scene, sensorNode, config } = opts;
  const fov = opts.fov_deg ?? DEFAULT_FOV_DEG;

  lidar_init_terrain(opts.terrain ? extractTriangles(opts.terrain) : []);

  const wasmConfig = {
    channels: config.channels,
    azimuths: config.channels,
    fov_v_deg: fov,
    fov_h_deg: fov,
    range_m: config.range_m,
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
        });
      }

      sensorNode.getWorldPosition(tmpVec);
      const sm = sensorNode.matrixWorld.elements;

      const result = lidar_sweep(
        { vessels },
        { origin: [tmpVec.x, tmpVec.y, tmpVec.z], rotation: colMajorToRowMajor3x3(sm) },
        wasmConfig,
      ) as { points: number[] | Float32Array; count: number };

      const points =
        result.points instanceof Float32Array
          ? result.points
          : new Float32Array(result.points);
      return { points, count: result.count, time };
    },
    dispose() {},
  };
}

interface VesselObb {
  center: [number, number, number];
  rotation: number[];
  half_extents: [number, number, number];
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
