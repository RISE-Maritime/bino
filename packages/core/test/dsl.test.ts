import { describe, expect, it } from "vitest";
import { Scenario } from "../src/dsl.js";

const validScenario = {
  name: "kiel_approach_2",
  anchor: { lat: 54.3233, lon: 10.1394, height: 0.0 },
  vessels: [
    {
      id: "ego",
      model: "tanker_120m",
      pose_source: { type: "zenoh", topic: "keelson/ego/nav/pose" },
      sensors: [
        {
          id: "bow_camera",
          type: "camera",
          mount: { x: 110, y: 0, z: 28, yaw_deg: 0 },
          fov_deg: 90,
          resolution: [1920, 1080],
          rate_hz: 10,
        },
        {
          id: "main_lidar",
          type: "lidar",
          mount: { x: 100, y: 0, z: 30 },
          channels: 64,
          range_m: 200,
          rate_hz: 10,
        },
      ],
    },
  ],
  modes: { rendering: "replace", clock: "external_fmi", determinism: "strict" },
};

describe("Scenario schema", () => {
  it("accepts the design-doc example", () => {
    const result = Scenario.parse(validScenario);
    expect(result.name).toBe("kiel_approach_2");
    expect(result.vessels[0]?.sensors).toHaveLength(2);
  });

  it("rejects out-of-range latitude", () => {
    const bad = { ...validScenario, anchor: { lat: 95, lon: 0, height: 0 } };
    expect(() => Scenario.parse(bad)).toThrow();
  });

  it("requires at least one vessel", () => {
    const bad = { ...validScenario, vessels: [] };
    expect(() => Scenario.parse(bad)).toThrow();
  });

  it("rejects an unknown sensor type", () => {
    const bad = structuredClone(validScenario);
    (bad.vessels[0]!.sensors[0] as { type: string }).type = "sonar";
    expect(() => Scenario.parse(bad)).toThrow();
  });
});
