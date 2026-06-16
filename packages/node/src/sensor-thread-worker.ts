import { parentPort } from "node:worker_threads";
import {
  initLidarWorker,
  runLidarSweep,
  runRadarSweep,
  type RadarSweepSpoke,
} from "./sensor-worker-core.js";

/** worker_threads entry for one sensor. A lidar worker receives
 *  init-lidar then repeated sweep-lidar messages; radar likewise. Each
 *  worker is dedicated to a single sensor, so the lidar WASM globals are
 *  not shared. Thin by design — the compute lives in sensor-worker-core. */

type Msg =
  | { type: "init-lidar"; terrain: unknown[]; models: unknown[] }
  | { type: "sweep-lidar"; scene: unknown; sensor: unknown; config: unknown; env: unknown }
  | { type: "init-radar"; staticObstacles: unknown[] }
  | {
      type: "sweep-radar";
      scene: { vessels: unknown[] };
      host: unknown;
      config: unknown;
      env: unknown;
    };

if (!parentPort) {
  throw new Error("sensor-thread-worker must run as a worker_threads worker");
}
const port = parentPort;

let staticObstacles: unknown[] = [];

port.on("message", (msg: Msg) => {
  try {
    if (msg.type === "init-lidar") {
      initLidarWorker(msg.terrain, msg.models);
      port.postMessage({ type: "ready" });
    } else if (msg.type === "sweep-lidar") {
      const { points, count, timestamps } = runLidarSweep(
        msg.scene,
        msg.sensor,
        msg.config,
        msg.env,
      );
      // Transfer (not copy) the buffers; they're freshly allocated per sweep.
      port.postMessage({ type: "frame-lidar", points, count, timestamps }, [
        points.buffer as ArrayBuffer,
        timestamps.buffer as ArrayBuffer,
      ]);
    } else if (msg.type === "init-radar") {
      staticObstacles = msg.staticObstacles;
      port.postMessage({ type: "ready" });
    } else if (msg.type === "sweep-radar") {
      const spokes: RadarSweepSpoke[] = runRadarSweep(
        msg.scene,
        staticObstacles,
        msg.host,
        msg.config,
        msg.env,
      );
      port.postMessage({ type: "frame-radar", spokes });
    }
  } catch (err) {
    port.postMessage({ type: "error", message: err instanceof Error ? err.message : String(err) });
  }
});
