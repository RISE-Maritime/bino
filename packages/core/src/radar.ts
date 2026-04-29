import * as THREE from "three";
import { radar_sweep } from "../wasm/radar.js";
import type { RadarSensor } from "./dsl.js";

export interface RadarSpoke {
  azimuth: number;
  intensity: Uint8Array;
}

export interface RadarFrame {
  spokes: RadarSpoke[];
  time: number;
}

export interface RadarKernel {
  step(time: number): RadarFrame;
  dispose(): void;
}

export interface RadarKernelOptions {
  scene: THREE.Scene;
  sensorNode: THREE.Object3D;
  config: RadarSensor;
}

interface VesselBox {
  position: [number, number, number];
  heading: number;
  half_extents: [number, number, number];
}

const DEFAULT_HALF_EXTENTS: [number, number, number] = [10, 2, 3];

export function createRadarKernel(opts: RadarKernelOptions): RadarKernel {
  const { scene, sensorNode, config } = opts;
  const tmpQuat = new THREE.Quaternion();
  const tmpEuler = new THREE.Euler();
  const tmpVec = new THREE.Vector3();

  return {
    step(time: number): RadarFrame {
      // Fresh scene snapshot each frame — radar's per-tick payload is
      // ~150 KB worst case (S8 plan); copy is fine.
      const vessels: VesselBox[] = [];
      for (const child of scene.children) {
        if (!(child instanceof THREE.Group)) continue;
        if (child === sensorNode.parent) continue; // skip host vessel
        child.getWorldPosition(tmpVec);
        child.getWorldQuaternion(tmpQuat);
        tmpEuler.setFromQuaternion(tmpQuat, "YXZ");
        // Three has Y up by default; the radar plane is XZ. Heading
        // is rotation about Y. The kernel's heading is CCW from +x
        // in the XZ plane — same as Three's Euler.y under YXZ.
        vessels.push({
          position: [tmpVec.x, tmpVec.y, tmpVec.z],
          heading: tmpEuler.y,
          half_extents: DEFAULT_HALF_EXTENTS,
        });
      }

      sensorNode.getWorldPosition(tmpVec);
      sensorNode.getWorldQuaternion(tmpQuat);
      tmpEuler.setFromQuaternion(tmpQuat, "YXZ");

      const result = radar_sweep(
        { vessels },
        {
          position: [tmpVec.x, tmpVec.y, tmpVec.z],
          heading: tmpEuler.y,
        },
        {
          range_m: config.range_m,
          spokes_per_rev: config.spokes_per_rev,
          range_bins: config.range_bins,
        },
      ) as { spokes: Array<{ azimuth: number; intensity: number[] | Uint8Array }> };

      const spokes: RadarSpoke[] = result.spokes.map((s) => ({
        azimuth: s.azimuth,
        intensity:
          s.intensity instanceof Uint8Array
            ? s.intensity
            : new Uint8Array(s.intensity),
      }));
      return { spokes, time };
    },
    dispose() {
      // No GL or DOM resources to free; the WASM module instance is
      // module-scoped and shared across kernels.
    },
  };
}
