import { describe, expect, it } from "vitest";
import { compileScenario, MemoryPoseStream } from "@bino/core";
import { createNodeService } from "../src/service.js";
import { createHeadlessRenderer } from "../src/headless-gl.js";

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
  name: "v01-smoke",
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
          mount: { x: 65, y: 20, z: 0 },
          fov_deg: 90,
          resolution: [128, 96],
          rate_hz: 10,
        },
        {
          id: "main_lidar",
          type: "lidar",
          mount: { x: 65, y: 20, z: 0 },
          channels: 32,
          range_m: 200,
          rate_hz: 10,
        },
      ],
    },
    {
      id: "ferry",
      model: "ferry_60m",
      pose_source: { type: "zenoh", topic: "ferry/pose" },
      sensors: [],
    },
  ],
  modes: { rendering: "replace", clock: "wall", determinism: "relaxed" },
};

function fnv1a(buf: Uint8Array): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < buf.length; i++) {
    h ^= buf[i]!;
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

describe("v0.1 smoke: pose updates change camera frames", () => {
  itGl("renders, hashes change as ferry moves through the camera FOV", async () => {
    const compiled = compileScenario(scenario);
    const service = createNodeService({ scenario: compiled, tickHz: 1000 });
    try {
      const stream = new MemoryPoseStream();
      const gen = service.runner.frames(stream);

      const sample = async (): Promise<{ camHash: number; lidarCount: number }> => {
        await new Promise((r) => setImmediate(r));
        const { value } = await gen.next();
        const cam = value!.outputs.find((o) => o.sensorId.endsWith("bow_camera"))!.output as {
          pixels: Uint8Array;
        };
        const lid = value!.outputs.find((o) => o.sensorId.endsWith("main_lidar"))!.output as {
          count: number;
        };
        return { camHash: fnv1a(cam.pixels), lidarCount: lid.count };
      };

      // Place ferry directly in front of the bow camera (which sits at
      // world (20, 0, 8) given ego at origin) at 50m further forward.
      stream.push({
        entityId: "ferry",
        pose: { position: [20, 0, -50], orientation: [0, 0, 0, 1] },
        time: 0.1,
      });
      const a = await sample();

      // Move ferry well off-axis — camera content should now differ.
      stream.push({
        entityId: "ferry",
        pose: { position: [200, 0, -50], orientation: [0, 0, 0, 1] },
        time: 0.2,
      });
      const b = await sample();

      service.runner.stop();
      stream.close();
      await gen.return(undefined);

      expect(a.camHash).not.toBe(b.camHash);
      expect(a.lidarCount).toBeGreaterThan(0);
    } finally {
      service.dispose();
    }
  });
});
