import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { compileScenario } from "../src/compile.js";
import { buildScene } from "../src/scene.js";
import { applyPoseUpdate } from "../src/pose.js";
import { createRadarKernel } from "../src/radar.js";

const scenario = {
  name: "radar-test",
  anchor: { lat: 0, lon: 0, height: 0 },
  vessels: [
    {
      id: "ego",
      model: "tanker_120m",
      pose_source: { type: "zenoh", topic: "ego/pose" },
      sensors: [
        {
          id: "main_radar",
          type: "radar_marine",
          mount: { x: 0, y: 0, z: 35 },
          range_m: 200,
          rotation_rate_hz: 0.4,
          beam_width_deg: 1.0,
          spokes_per_rev: 36,
          range_bins: 100,
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

const radarConfig = scenario.vessels[0]!.sensors[0]! as Extract<
  (typeof scenario)["vessels"][0]["sensors"][0],
  { type: "radar_marine" }
>;

function getSensorNode() {
  const compiled = compileScenario(scenario);
  const built = buildScene(compiled);
  const sensorNode = built.entities.get("ego")!.getObjectByName("main_radar")!;
  return { ...built, sensorNode };
}

describe("createRadarKernel", () => {
  it("step() returns a sweep with config-shaped spokes and bins", () => {
    const { scene, sensorNode } = getSensorNode();
    const kernel = createRadarKernel({ scene, sensorNode, config: radarConfig });
    const frame = kernel.step(0);
    expect(frame.spokes.length).toBe(36);
    expect(frame.spokes[0]!.intensity.length).toBe(100);
    expect(frame.time).toBe(0);
  });

  it("lights a bin on the spoke pointing at the ferry", () => {
    const { scene, sensorNode, entities } = getSensorNode();
    // ego at world origin; place ferry due ahead at -Z (which is
    // forward in Three convention for an unrotated entity).
    applyPoseUpdate(entities, {
      entityId: "ferry",
      pose: { position: [0, 0, -80], orientation: [0, 0, 0, 1] },
      time: 0,
    });
    const kernel = createRadarKernel({ scene, sensorNode, config: radarConfig });
    const frame = kernel.step(0);
    const litCounts = frame.spokes.map((s) =>
      s.intensity.reduce((sum, v) => sum + (v > 0 ? 1 : 0), 0),
    );
    const totalLit = litCounts.reduce((a, b) => a + b, 0);
    expect(totalLit).toBeGreaterThan(0);
  });

  it("returns no hits when scene is empty of other vessels", () => {
    const { scene, sensorNode } = getSensorNode();
    // Move the ferry far away.
    const ferry = scene.children.find((c) => c.name === "ferry")!;
    ferry.position.set(10000, 0, 10000);
    ferry.updateMatrixWorld(true);
    const kernel = createRadarKernel({ scene, sensorNode, config: radarConfig });
    const frame = kernel.step(0);
    const total = frame.spokes.reduce(
      (sum, s) => sum + s.intensity.reduce((a, b) => a + (b > 0 ? 1 : 0), 0),
      0,
    );
    expect(total).toBe(0);
  });

  it("dispose() is callable and idempotent", () => {
    const { scene, sensorNode } = getSensorNode();
    const kernel = createRadarKernel({ scene, sensorNode, config: radarConfig });
    expect(() => {
      kernel.dispose();
      kernel.dispose();
    }).not.toThrow();
  });
});
