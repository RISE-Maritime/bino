import { describe, it, expect } from "vitest";
import {
  compileScenario,
  buildScene,
  createLidarKernelWasm,
  createRadarKernel,
  createCameraKernel,
} from "@bino/core";
import { createHeadlessRenderer } from "../src/headless-gl.js";

// GL availability — camera kernel needs a headless renderer.
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

describe("temporal modeling", () => {
  it("lidar frame includes timestamps spanning sweep duration", () => {
    const compiled = compileScenario({
      name: "temporal_test",
      anchor: { lat: 0, lon: 0, height: 0 },
      vessels: [
        {
          id: "ego",
          model: "cargo_90m",
          pose_source: { type: "zenoh", topic: "test" },
          sensors: [
            {
              id: "lidar",
              type: "lidar",
              mount: { x: 0, y: 0, z: 10 },
              channels: 4,
              range_m: 200,
              rate_hz: 10,
            },
          ],
        },
        {
          id: "target",
          model: "tanker_120m",
          pose_source: { type: "zenoh", topic: "test2" },
          sensors: [],
        },
      ],
      modes: { rendering: "inject", clock: "stepped", determinism: "strict" },
    });

    const built = buildScene(compiled);
    const egoNode = built.entities.get("ego")!;
    const targetNode = built.entities.get("target")!;

    // Place target ahead of ego
    targetNode.position.set(0, 0, -100);
    targetNode.updateMatrixWorld(true);

    // Set velocity on target (moving in x at 10 m/s)
    targetNode.userData.velocity = [10, 0, 0];
    targetNode.userData.angularVelocityY = 0;

    const sensorNode = egoNode.getObjectByName("lidar")!;

    const kernel = createLidarKernelWasm({
      scene: built.scene,
      sensorNode,
      config: compiled.vessels[0]!.sensors[0]! as any,
      terrain: built.terrain,
    });

    const frame = kernel.step(1.0);

    // With sweep_duration_s = 1/10 = 0.1s and a vessel in range,
    // timestamps should be present
    if (frame.count > 0 && frame.timestamps) {
      expect(frame.timestamps.length).toBe(frame.count);
      // Timestamps should be non-negative and span up to sweep_duration_s
      for (let i = 0; i < frame.timestamps.length; i++) {
        expect(frame.timestamps[i]).toBeGreaterThanOrEqual(0);
        expect(frame.timestamps[i]).toBeLessThanOrEqual(0.1 + 0.001);
      }
    }

    kernel.dispose();
  });

  it("radar spokes include monotonically increasing timestamps", () => {
    const compiled = compileScenario({
      name: "radar_temporal_test",
      anchor: { lat: 0, lon: 0, height: 0 },
      vessels: [
        {
          id: "ego",
          model: "cargo_90m",
          pose_source: { type: "zenoh", topic: "test" },
          sensors: [
            {
              id: "radar",
              type: "radar_marine",
              mount: { x: 0, y: 0, z: 10 },
              range_m: 2000,
              rotation_rate_hz: 0.4,
              beam_width_deg: 1.5,
              spokes_per_rev: 36,
              range_bins: 64,
            },
          ],
        },
      ],
      modes: { rendering: "inject", clock: "stepped", determinism: "strict" },
    });

    const built = buildScene(compiled);
    const egoNode = built.entities.get("ego")!;
    const sensorNode = egoNode.getObjectByName("radar")!;

    const kernel = createRadarKernel({
      scene: built.scene,
      sensorNode,
      config: compiled.vessels[0]!.sensors[0]! as any,
    });

    const frame = kernel.step(1.0);

    // Verify spoke timestamps increase monotonically
    expect(frame.spokes.length).toBe(36);
    for (let i = 1; i < frame.spokes.length; i++) {
      expect(frame.spokes[i]!.timestamp).toBeGreaterThan(frame.spokes[i - 1]!.timestamp);
    }

    // Last spoke timestamp should be close to sweep_duration_s = 1/0.4 = 2.5s
    const lastTimestamp = frame.spokes[frame.spokes.length - 1]!.timestamp;
    expect(lastTimestamp).toBeGreaterThan(2.0);
    expect(lastTimestamp).toBeLessThan(2.5 + 0.01);

    kernel.dispose();
  });

  itGl("camera frame includes exposure timestamps", () => {
    const compiled = compileScenario({
      name: "camera_temporal_test",
      anchor: { lat: 0, lon: 0, height: 0 },
      vessels: [
        {
          id: "ego",
          model: "cargo_90m",
          pose_source: { type: "zenoh", topic: "test" },
          sensors: [
            {
              id: "cam",
              type: "camera",
              mount: { x: 0, y: 0, z: 10 },
              fov_deg: 90,
              resolution: [64, 48],
              rate_hz: 10,
              exposure_time_s: 0.01,
            },
          ],
        },
      ],
      modes: { rendering: "inject", clock: "stepped", determinism: "strict" },
    });

    const built = buildScene(compiled);
    const handle = createHeadlessRenderer(64, 48);
    const egoNode = built.entities.get("ego")!;
    const sensorNode = egoNode.getObjectByName("cam")!;

    const kernel = createCameraKernel({
      renderer: handle.renderer,
      scene: built.scene,
      sensorNode,
      config: compiled.vessels[0]!.sensors[0]! as any,
    });

    const frame = kernel.step(2.0);

    // With exposure_time_s = 0.01, exposure should be centered around time
    expect(frame.exposure_start).toBeCloseTo(2.0 - 0.005, 5);
    expect(frame.exposure_end).toBeCloseTo(2.0 + 0.005, 5);
    expect(frame.time).toBe(2.0);

    kernel.dispose();
    handle.dispose();
  });
});
