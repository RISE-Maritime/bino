import { radar_sweep } from "@bino/core/wasm/radar";

export interface RadarWorkerInit {
  type: "init";
  staticObstacles: unknown[];
}

export interface RadarWorkerSweep {
  type: "sweep";
  scene: unknown;
  host: unknown;
  config: unknown;
  envConfig: unknown;
}

export type RadarWorkerMsg = RadarWorkerInit | RadarWorkerSweep;

export interface RadarWorkerResult {
  type: "frame";
  spokes: Array<{ azimuth: number; intensity: Uint8Array; timestamp: number }>;
}

let cachedObstacles: unknown[] = [];

self.onmessage = (e: MessageEvent<RadarWorkerMsg>) => {
  const msg = e.data;
  if (msg.type === "init") {
    cachedObstacles = msg.staticObstacles;
    (self as unknown as Worker).postMessage({ type: "ready" });
  } else if (msg.type === "sweep") {
    try {
      const scene = msg.scene as { vessels: unknown[] };
      scene.vessels = [...cachedObstacles, ...scene.vessels];
      const result = radar_sweep(scene, msg.host, msg.config, msg.envConfig) as {
        spokes: Array<{ azimuth: number; intensity: number[] | Uint8Array; timestamp?: number }>;
      };
      const spokes = result.spokes.map((s) => ({
        azimuth: s.azimuth,
        intensity: s.intensity instanceof Uint8Array ? s.intensity : new Uint8Array(s.intensity),
        timestamp: s.timestamp ?? 0,
      }));
      (self as unknown as Worker).postMessage({
        type: "frame",
        spokes,
      } satisfies RadarWorkerResult);
    } catch (err) {
      console.error("[bino] radar worker sweep failed:", err);
      (self as unknown as Worker).postMessage({ type: "error" });
    }
  }
};

(self as unknown as Worker).postMessage({ type: "loaded" });
