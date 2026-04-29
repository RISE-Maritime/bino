import { describe, expect, it } from "vitest";
import { compileScenario, MemoryPoseStream } from "@bino/core";
import { createNodeService } from "../src/service.js";
import { createHeadlessRenderer } from "../src/headless-gl.js";

// WSLg's X server doesn't accept connections from inside a devcontainer, so
// @kmamal/gl returns null. The Docker smoke test (plan #10) covers the
// real-GL path with Xvfb in entrypoint.sh.
const glAvailable = (() => {
  try {
    const handle = createHeadlessRenderer(8, 8);
    handle.dispose();
    return true;
  } catch {
    return false;
  }
})();
const itGl = glAvailable ? it : it.skip;

const scenario = {
  name: "service-smoke",
  anchor: { lat: 54.3233, lon: 10.1394, height: 0 },
  vessels: [
    {
      id: "ego",
      model: "tanker_120m",
      pose_source: { type: "zenoh", topic: "ego/pose" },
      sensors: [
        {
          id: "bow_camera",
          type: "camera",
          mount: { x: 0, y: 0, z: 5 },
          fov_deg: 90,
          resolution: [128, 96],
          rate_hz: 10,
        },
        {
          id: "main_lidar",
          type: "lidar",
          mount: { x: 0, y: 0, z: 5 },
          channels: 16,
          range_m: 100,
          rate_hz: 10,
        },
      ],
    },
  ],
  modes: { rendering: "replace", clock: "wall", determinism: "relaxed" },
};

describe("createNodeService", () => {
  itGl("renders frames end-to-end with a real @kmamal/gl context", async () => {
    const compiled = compileScenario(scenario);
    const service = createNodeService({ scenario: compiled, tickHz: 1000 });
    try {
      const stream = new MemoryPoseStream();
      const gen = service.runner.frames(stream);
      const events = [];
      for (let i = 0; i < 3; i++) {
        const { value } = await gen.next();
        events.push(value!);
      }
      service.runner.stop();
      stream.close();
      await gen.return(undefined);

      expect(events).toHaveLength(3);
      expect(events[0]!.outputs).toHaveLength(2); // camera + lidar
      const cameraOutput = events[0]!.outputs[0] as {
        pixels: Uint8Array;
        width: number;
        height: number;
      };
      expect(cameraOutput.width).toBe(128);
      expect(cameraOutput.height).toBe(96);
      expect(cameraOutput.pixels.length).toBe(128 * 96 * 4);
      // At least some pixels should be non-zero — proves the GL pipeline rendered.
      const nonZero = cameraOutput.pixels.some((b) => b !== 0);
      expect(nonZero).toBe(true);

      const lidarOutput = events[0]!.outputs[1] as { count: number };
      expect(lidarOutput.count).toBeGreaterThan(0);
    } finally {
      service.dispose();
    }
  });
});
