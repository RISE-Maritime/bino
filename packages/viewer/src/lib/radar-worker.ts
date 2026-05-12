import { radar_sweep } from "@bino/core/wasm/radar";

export interface RadarWorkerSweep {
  type: "sweep";
  scene: unknown;
  host: unknown;
  config: unknown;
  envConfig: unknown;
}

export interface RadarWorkerResult {
  type: "frame";
  spokes: Array<{ azimuth: number; intensity: Uint8Array; timestamp: number }>;
}

self.onmessage = (e: MessageEvent<RadarWorkerSweep>) => {
  const msg = e.data;
  if (msg.type === "sweep") {
    const result = radar_sweep(msg.scene, msg.host, msg.config, msg.envConfig) as {
      spokes: Array<{ azimuth: number; intensity: number[] | Uint8Array; timestamp?: number }>;
    };
    const spokes = result.spokes.map((s) => ({
      azimuth: s.azimuth,
      intensity: s.intensity instanceof Uint8Array ? s.intensity : new Uint8Array(s.intensity),
      timestamp: s.timestamp ?? 0,
    }));
    (self as unknown as Worker).postMessage({ type: "frame", spokes } satisfies RadarWorkerResult);
  }
};
