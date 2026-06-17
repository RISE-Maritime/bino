import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { compileScenario } from "../src/compile.js";
import { buildScene } from "../src/scene.js";
import { applyPoseUpdate } from "../src/pose.js";
import { createRadarKernel, buildRadarEnvConfig, buildRadarWasmConfig } from "../src/radar.js";
import type { RadarSensor } from "../src/dsl.js";

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

  it("places a dead-ahead target at azimuth 0, stable under vessel heading", () => {
    // A target dead-ahead of the ego should land on azimuth ≈ 0 (bow-relative
    // bearing) regardless of which way the ego points. spokes_per_rev=36 →
    // 10° spacing, so allow one spoke of tolerance (and wrap-around at 2π).
    const tol = (2 * Math.PI) / 36;
    const distFromZero = (az: number): number => Math.min(az, 2 * Math.PI - az);
    const brightestAzimuth = (scene: THREE.Scene, sensorNode: THREE.Object3D): number => {
      const kernel = createRadarKernel({ scene, sensorNode, config: radarConfig });
      const frame = kernel.step(0);
      let best = 0;
      let bestSum = 0;
      frame.spokes.forEach((s, i) => {
        const sum = s.intensity.reduce((a, b) => a + b, 0);
        if (sum > bestSum) {
          bestSum = sum;
          best = i;
        }
      });
      kernel.dispose();
      expect(bestSum).toBeGreaterThan(0);
      return frame.spokes[best]!.azimuth;
    };

    // Ego at identity (bow = −Z = North); target due ahead (North).
    {
      const { scene, sensorNode, entities } = getSensorNode();
      applyPoseUpdate(entities, {
        entityId: "ferry",
        pose: { position: [0, 0, -80], orientation: [0, 0, 0, 1] },
        time: 0,
      });
      scene.updateMatrixWorld(true);
      expect(distFromZero(brightestAzimuth(scene, sensorNode))).toBeLessThan(tol);
    }

    // Ego yawed 90° so the bow points East (+X); target placed due East.
    // A dead-ahead target must still read azimuth ≈ 0.
    {
      const { scene, sensorNode, entities } = getSensorNode();
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -Math.PI / 2, 0, "YXZ"));
      applyPoseUpdate(entities, {
        entityId: "ego",
        pose: { position: [0, 0, 0], orientation: [q.x, q.y, q.z, q.w] },
        time: 0,
      });
      applyPoseUpdate(entities, {
        entityId: "ferry",
        pose: { position: [80, 0, 0], orientation: [0, 0, 0, 1] },
        time: 0,
      });
      scene.updateMatrixWorld(true);
      expect(distFromZero(brightestAzimuth(scene, sensorNode))).toBeLessThan(tol);
    }
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

  it("staticObstacles produce returns at obstacle bearing", () => {
    const { scene, sensorNode } = getSensorNode();
    const ferry = scene.children.find((c) => c.name === "ferry")!;
    ferry.position.set(10000, 0, 10000);
    ferry.updateMatrixWorld(true);

    const kernel = createRadarKernel({
      scene,
      sensorNode,
      config: radarConfig,
      staticObstacles: [{ position: [0, 5, -60], heading: 0, half_extents: [10, 5, 10] }],
    });
    const frame = kernel.step(0);
    const totalLit = frame.spokes.reduce(
      (sum, s) => sum + s.intensity.reduce((a, b) => a + (b > 0 ? 1 : 0), 0),
      0,
    );
    expect(totalLit).toBeGreaterThan(0);
  });
});

describe("buildRadarEnvConfig", () => {
  const compiled = compileScenario(scenario);
  const parsedConfig = compiled.vessels[0]!.sensors[0]! as RadarSensor;

  it("returns undefined when no environment", () => {
    expect(buildRadarEnvConfig(parsedConfig)).toBeUndefined();
  });

  it("includes sea clutter when sea state is present", () => {
    const env = {
      visibility_m: 20000,
      rain_rate_mm_h: 0,
      time_of_day: "12:00",
      sea_state: {
        significant_wave_height: 2,
        peak_period_s: 8,
        direction_deg: 180,
        spectrum: "pierson_moskowitz" as const,
      },
    };
    const cfg = buildRadarEnvConfig(parsedConfig, env);
    expect(cfg).toBeDefined();
    expect(cfg!.sea_clutter).toBeDefined();
    expect(cfg!.sea_clutter!.hs).toBe(2);
  });

  it("includes weather when rain rate > 0", () => {
    const env = { visibility_m: 10000, rain_rate_mm_h: 15, time_of_day: "12:00" };
    const cfg = buildRadarEnvConfig(parsedConfig, env);
    expect(cfg!.weather).toBeDefined();
    expect(cfg!.weather!.rain_rate_mm_h).toBe(15);
  });
});

describe("buildRadarWasmConfig", () => {
  const compiled = compileScenario(scenario);
  const parsedConfig = compiled.vessels[0]!.sensors[0]! as RadarSensor;

  it("produces correct config shape from RadarSensor", () => {
    const cfg = buildRadarWasmConfig(parsedConfig);
    expect(cfg.range_m).toBe(200);
    expect(cfg.spokes_per_rev).toBe(36);
    expect(cfg.range_bins).toBe(100);
    expect(cfg.sweep_duration_s).toBeCloseTo(1 / 0.4);
  });
});
