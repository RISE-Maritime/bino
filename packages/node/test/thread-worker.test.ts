import { describe, expect, it } from "vitest";
import { Worker } from "node:worker_threads";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

// The worker entry must run as built JS (worker_threads can't execute the
// .ts source). Skip unless @bino/node has been built — run
// `pnpm --filter @bino/node build` first to exercise this path.
const workerUrl = new URL("../dist/sensor-thread-worker.js", import.meta.url);
const built = existsSync(fileURLToPath(workerUrl));
const itBuilt = built ? it : it.skip;

/** Post messages to a worker and resolve with the message whose `type`
 *  matches, rejecting on error/timeout. */
function once(worker: Worker, type: string, timeoutMs = 5000): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting for ${type}`)), timeoutMs);
    worker.on("message", (m: { type: string }) => {
      if (m.type === type) {
        clearTimeout(timer);
        resolve(m as Record<string, unknown>);
      } else if (m.type === "error") {
        clearTimeout(timer);
        reject(new Error(String((m as { message?: string }).message)));
      }
    });
    worker.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
  });
}

describe("sensor-thread-worker (real worker_thread)", () => {
  itBuilt("runs a lidar init → sweep round-trip", async () => {
    const worker = new Worker(fileURLToPath(workerUrl));
    try {
      const ready = once(worker, "ready");
      worker.postMessage({ type: "init-lidar", terrain: [], models: [] });
      await ready;

      const framePromise = once(worker, "frame-lidar");
      worker.postMessage({
        type: "sweep-lidar",
        scene: { vessels: [] },
        sensor: { origin: [0, 0, 0], rotation: [1, 0, 0, 0, 1, 0, 0, 0, 1] },
        config: {
          channels: 4,
          azimuths: 4,
          fov_v_deg: 90,
          fov_h_deg: 90,
          range_m: 100,
          sweep_duration_s: 0.1,
        },
        env: undefined,
      });
      const frame = await framePromise;
      expect(frame.count).toBe(0);
      expect(frame.points).toBeInstanceOf(Float32Array);
    } finally {
      await worker.terminate();
    }
  });

  itBuilt("runs a radar init → sweep round-trip", async () => {
    const worker = new Worker(fileURLToPath(workerUrl));
    try {
      const ready = once(worker, "ready");
      worker.postMessage({ type: "init-radar", staticObstacles: [] });
      await ready;

      const framePromise = once(worker, "frame-radar");
      worker.postMessage({
        type: "sweep-radar",
        scene: { vessels: [] },
        host: { position: [0, 0, 0], heading: 0 },
        config: { range_m: 200, spokes_per_rev: 12, range_bins: 50, sweep_duration_s: 1 },
        env: undefined,
      });
      const frame = (await framePromise) as { spokes: unknown[] };
      expect(Array.isArray(frame.spokes)).toBe(true);
      expect(frame.spokes.length).toBe(12);
    } finally {
      await worker.terminate();
    }
  });
});
