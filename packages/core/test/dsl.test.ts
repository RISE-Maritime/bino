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

  it("accepts terrain with landmask/buildings/seamarks flags", () => {
    const withTerrain = {
      ...validScenario,
      terrain: { bbox: [10.0, 54.0, 10.2, 54.2], landmask: true, buildings: false, seamarks: true },
    };
    const result = Scenario.parse(withTerrain);
    expect(result.terrain!.buildings).toBe(false);
    expect(result.terrain!.seamarks).toBe(true);
    expect(result.terrain!.landmask).toBe(true);
  });

  it("defaults terrain flags to true", () => {
    const withTerrain = { ...validScenario, terrain: { bbox: [10.0, 54.0, 10.2, 54.2] } };
    const result = Scenario.parse(withTerrain);
    expect(result.terrain!.buildings).toBe(true);
    expect(result.terrain!.seamarks).toBe(true);
    expect(result.terrain!.landmask).toBe(true);
  });

  it("accepts vessel with dimensions override", () => {
    const withDims = structuredClone(validScenario);
    withDims.vessels[0]!.dimensions = { length: 130, beam: 22, draft: 7 };
    const result = Scenario.parse(withDims);
    expect(result.vessels[0]!.dimensions!.length).toBe(130);
  });

  it("accepts lidar with fov_h_deg and azimuths", () => {
    const withFov = structuredClone(validScenario);
    const lidar = withFov.vessels[0]!.sensors[1]! as Record<string, unknown>;
    lidar.fov_h_deg = 360;
    lidar.azimuths = 512;
    const result = Scenario.parse(withFov);
    const parsedLidar = result.vessels[0]!.sensors[1]!;
    expect(parsedLidar.type).toBe("lidar");
    if (parsedLidar.type === "lidar") {
      expect(parsedLidar.fov_h_deg).toBe(360);
      expect(parsedLidar.azimuths).toBe(512);
    }
  });

  it("defaults lidar fov_h_deg to 360", () => {
    const result = Scenario.parse(validScenario);
    const lidar = result.vessels[0]!.sensors[1]!;
    if (lidar.type === "lidar") {
      expect(lidar.fov_h_deg).toBe(360);
    }
  });

  it("defaults phase_offset_s to 0 for all sensor types", () => {
    const result = Scenario.parse(validScenario);
    const camera = result.vessels[0]!.sensors[0]!;
    const lidar = result.vessels[0]!.sensors[1]!;
    expect(camera.type).toBe("camera");
    expect(lidar.type).toBe("lidar");
    if (camera.type === "camera") {
      expect(camera.phase_offset_s).toBe(0);
    }
    if (lidar.type === "lidar") {
      expect(lidar.phase_offset_s).toBe(0);
    }
  });

  it("parses phase_offset_s when specified", () => {
    const withOffset = structuredClone(validScenario);
    (withOffset.vessels[0]!.sensors[0]! as Record<string, unknown>).phase_offset_s = 0.05;
    (withOffset.vessels[0]!.sensors[1]! as Record<string, unknown>).phase_offset_s = 0.1;
    const result = Scenario.parse(withOffset);
    const camera = result.vessels[0]!.sensors[0]!;
    const lidar = result.vessels[0]!.sensors[1]!;
    if (camera.type === "camera") {
      expect(camera.phase_offset_s).toBe(0.05);
    }
    if (lidar.type === "lidar") {
      expect(lidar.phase_offset_s).toBe(0.1);
    }
  });

  it("defaults exposure_time_s to 0 for camera", () => {
    const result = Scenario.parse(validScenario);
    const camera = result.vessels[0]!.sensors[0]!;
    if (camera.type === "camera") {
      expect(camera.exposure_time_s).toBe(0);
    }
  });

  it("parses exposure_time_s when specified", () => {
    const withExposure = structuredClone(validScenario);
    (withExposure.vessels[0]!.sensors[0]! as Record<string, unknown>).exposure_time_s = 0.001;
    const result = Scenario.parse(withExposure);
    const camera = result.vessels[0]!.sensors[0]!;
    if (camera.type === "camera") {
      expect(camera.exposure_time_s).toBe(0.001);
    }
  });

  it("rejects negative exposure_time_s", () => {
    const bad = structuredClone(validScenario);
    (bad.vessels[0]!.sensors[0]! as Record<string, unknown>).exposure_time_s = -0.001;
    expect(() => Scenario.parse(bad)).toThrow();
  });

  it("rejects duplicate sensor ids within a vessel", () => {
    const bad = structuredClone(validScenario);
    bad.vessels[0]!.sensors[1] = {
      ...bad.vessels[0]!.sensors[0]!,
      type: "lidar",
      channels: 32,
      range_m: 200,
      rate_hz: 10,
    };
    (bad.vessels[0]!.sensors[1] as Record<string, unknown>).id = bad.vessels[0]!.sensors[0]!.id;
    expect(() => Scenario.parse(bad)).toThrow(/duplicate sensor id/);
  });

  it("rejects duplicate vessel ids", () => {
    const bad = structuredClone(validScenario);
    bad.vessels.push({ ...bad.vessels[0]! });
    expect(() => Scenario.parse(bad)).toThrow(/duplicate vessel id/);
  });

  it("allows same sensor id on different vessels", () => {
    const multi = structuredClone(validScenario);
    multi.vessels.push({
      id: "target",
      model: "cargo_90m",
      pose_source: { type: "zenoh", topic: "target/pose" },
      sensors: [
        {
          id: "bow_camera",
          type: "camera",
          mount: { x: 40, y: 0, z: 14 },
          fov_deg: 90,
          resolution: [1920, 1080],
          rate_hz: 10,
        },
      ],
    });
    const result = Scenario.parse(multi);
    expect(result.vessels).toHaveLength(2);
  });
});
