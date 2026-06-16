import { lidar_init_terrain, lidar_init_vessel_models, lidar_sweep } from "@bino/core/wasm/lidar";

export interface LidarWorkerInit {
  type: "init";
  terrain: unknown[];
  models: unknown[][];
}

export interface LidarWorkerSweep {
  type: "sweep";
  scene: unknown;
  sensor: unknown;
  config: unknown;
  env?: unknown;
}

export type LidarWorkerMsg = LidarWorkerInit | LidarWorkerSweep;

export interface LidarWorkerResult {
  type: "frame";
  points: Float32Array;
  count: number;
  timestamps: Float32Array;
}

self.onmessage = (e: MessageEvent<LidarWorkerMsg>) => {
  const msg = e.data;
  if (msg.type === "init") {
    lidar_init_terrain(msg.terrain);
    lidar_init_vessel_models(msg.models);
    (self as unknown as Worker).postMessage({ type: "ready" });
  } else if (msg.type === "sweep") {
    try {
      const result = lidar_sweep(msg.scene, msg.sensor, msg.config, msg.env ?? null) as {
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
        : new Float32Array(0);
      (self as unknown as Worker).postMessage(
        { type: "frame", points, count: result.count, timestamps } satisfies LidarWorkerResult,
        { transfer: [points.buffer, timestamps.buffer] },
      );
    } catch (err) {
      console.error("[bino] lidar worker sweep failed:", err);
      (self as unknown as Worker).postMessage({ type: "error" });
    }
  }
};

(self as unknown as Worker).postMessage({ type: "loaded" });
