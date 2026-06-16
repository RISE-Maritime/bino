import { lidar_init_terrain, lidar_init_vessel_models, lidar_sweep } from "@bino/core/wasm/lidar";
import { radar_sweep } from "@bino/core/wasm/radar";

/** Pure WASM-compute core shared by the worker-thread entry and tests.
 *
 *  Each worker thread owns its own WASM instance (workers don't share
 *  memory), so the lidar kernel's global terrain/model registry is
 *  naturally isolated per sensor — no cross-talk between lidars. */

export interface LidarSweepOutput {
  points: Float32Array;
  count: number;
  timestamps: Float32Array;
}

export function initLidarWorker(terrain: unknown[], models: unknown[]): void {
  lidar_init_terrain(terrain);
  lidar_init_vessel_models(models);
}

export function runLidarSweep(
  scene: unknown,
  sensor: unknown,
  config: unknown,
  env: unknown,
): LidarSweepOutput {
  const r = lidar_sweep(scene, sensor, config, env ?? undefined) as {
    points: number[] | Float32Array;
    count: number;
    timestamps?: number[] | Float32Array;
  };
  const points = r.points instanceof Float32Array ? r.points : new Float32Array(r.points);
  const timestamps = r.timestamps
    ? r.timestamps instanceof Float32Array
      ? r.timestamps
      : new Float32Array(r.timestamps)
    : new Float32Array(0);
  return { points, count: r.count, timestamps };
}

export interface RadarSweepSpoke {
  azimuth: number;
  intensity: Uint8Array;
  timestamp: number;
}

/** Merge static obstacles ahead of moving vessels (same order as the
 *  in-process kernel and the viewer worker) and run the sweep. */
export function runRadarSweep(
  scene: { vessels: unknown[] },
  staticObstacles: unknown[],
  host: unknown,
  config: unknown,
  env: unknown,
): RadarSweepSpoke[] {
  const merged = { vessels: [...staticObstacles, ...scene.vessels] };
  const r = radar_sweep(merged, host, config, env ?? undefined) as {
    spokes: Array<{ azimuth: number; intensity: number[] | Uint8Array; timestamp?: number }>;
  };
  return r.spokes.map((s) => ({
    azimuth: s.azimuth,
    intensity: s.intensity instanceof Uint8Array ? s.intensity : new Uint8Array(s.intensity),
    timestamp: s.timestamp ?? 0,
  }));
}
