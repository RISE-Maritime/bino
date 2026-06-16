import * as THREE from "three";
import { radar_sweep } from "../wasm/radar.js";
import type { Environment, RadarSensor } from "./dsl.js";

export interface RadarSpoke {
  azimuth: number;
  intensity: Uint8Array;
  timestamp: number;
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
  /** Sweep duration for intra-sweep temporal interpolation.
   *  Defaults to 1 / config.rotation_rate_hz. */
  sweepDuration_s?: number;
  /** Environment for sea clutter + weather attenuation. When
   *  undefined, the kernel produces v0.3-compatible binary output. */
  environment?: Environment;
  /** Static obstacles (buildings, terrain features) included in every
   *  sweep. These have zero velocity and don't move between frames. */
  staticObstacles?: VesselBox[];
}

export interface VesselBox {
  position: [number, number, number];
  heading: number;
  half_extents: [number, number, number];
  velocity?: [number, number, number];
  angular_velocity_y?: number;
}

export const DEFAULT_HALF_EXTENTS: [number, number, number] = [10, 2, 3];

export function createRadarKernel(opts: RadarKernelOptions): RadarKernel {
  const { scene, sensorNode, config, environment } = opts;
  const tmpQuat = new THREE.Quaternion();
  const tmpEuler = new THREE.Euler();
  const tmpVec = new THREE.Vector3();
  const staticObs = opts.staticObstacles ?? [];

  let sweepIndex = 0;

  const envConfig = buildRadarEnvConfig(config, environment);

  return {
    step(time: number): RadarFrame {
      const vessels: VesselBox[] = [...staticObs];
      for (const child of scene.children) {
        if (!(child instanceof THREE.Group)) continue;
        if (child === sensorNode.parent) continue;
        if (!child.userData?.model) continue;
        child.getWorldPosition(tmpVec);
        child.getWorldQuaternion(tmpQuat);
        tmpEuler.setFromQuaternion(tmpQuat, "YXZ");
        vessels.push({
          position: [tmpVec.x, tmpVec.y, tmpVec.z],
          heading: tmpEuler.y,
          half_extents: DEFAULT_HALF_EXTENTS,
          velocity: child.userData.velocity ?? [0, 0, 0],
          angular_velocity_y: child.userData.angularVelocityY ?? 0,
        });
      }

      sensorNode.getWorldPosition(tmpVec);
      sensorNode.getWorldQuaternion(tmpQuat);
      tmpEuler.setFromQuaternion(tmpQuat, "YXZ");

      // Update sweep index for deterministic clutter seeding.
      const currentEnv = envConfig
        ? {
            ...envConfig,
            sea_clutter: envConfig.sea_clutter
              ? { ...envConfig.sea_clutter, sweep_index: sweepIndex }
              : undefined,
          }
        : undefined;
      sweepIndex++;

      let result: {
        spokes: Array<{ azimuth: number; intensity: number[] | Uint8Array; timestamp?: number }>;
      };
      try {
        result = radar_sweep(
          { vessels },
          {
            position: [tmpVec.x, tmpVec.y, tmpVec.z],
            heading: tmpEuler.y,
          },
          buildRadarWasmConfig(
            config,
            opts.sweepDuration_s !== undefined
              ? { sweepDuration_s: opts.sweepDuration_s }
              : undefined,
          ),
          currentEnv,
        ) as typeof result;
      } catch (err) {
        console.error("[bino] radar_sweep failed:", err);
        return { spokes: [], time };
      }

      const spokes: RadarSpoke[] = result.spokes.map((s) => ({
        azimuth: s.azimuth,
        intensity: s.intensity instanceof Uint8Array ? s.intensity : new Uint8Array(s.intensity),
        timestamp: s.timestamp ?? 0,
      }));
      return { spokes, time };
    },
    dispose() {},
  };
}

export interface RadarWasmConfig {
  range_m: number;
  spokes_per_rev: number;
  range_bins: number;
  sweep_duration_s: number;
}

export function buildRadarWasmConfig(
  config: RadarSensor,
  opts?: { sweepDuration_s?: number },
): RadarWasmConfig {
  return {
    range_m: config.range_m,
    spokes_per_rev: config.spokes_per_rev,
    range_bins: config.range_bins,
    sweep_duration_s: opts?.sweepDuration_s ?? 1 / config.rotation_rate_hz,
  };
}

export function buildRadarEnvConfig(config: RadarSensor, env?: Environment) {
  if (!env) return undefined;

  const seaState = env.sea_state;
  return {
    sea_clutter: seaState
      ? {
          hs: seaState.significant_wave_height,
          radar_height_m: config.mount.y,
          enabled: true,
          sweep_index: 0,
        }
      : undefined,
    antenna: {
      beam_width_deg: config.beam_width_deg,
    },
    weather:
      (env.rain_rate_mm_h ?? 0) > 0
        ? {
            rain_rate_mm_h: env.rain_rate_mm_h!,
            frequency_ghz: 9.4,
          }
        : undefined,
  };
}
