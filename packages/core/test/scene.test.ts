import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { compileScenario } from "../src/compile.js";
import { buildScene } from "../src/scene.js";

const minimal = {
  name: "smoke",
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
    {
      id: "ferry",
      model: "ferry_60m",
      pose_source: { type: "zenoh", topic: "ferry/pose" },
      sensors: [],
    },
  ],
  modes: { rendering: "replace", clock: "wall", determinism: "relaxed" },
};

describe("buildScene", () => {
  it("returns a Scene plus an entity Map keyed by vessel id", () => {
    const compiled = compileScenario(minimal);
    const { scene, entities } = buildScene(compiled);
    expect(scene).toBeInstanceOf(THREE.Scene);
    expect(entities.size).toBe(2);
    expect(entities.get("ego")).toBeInstanceOf(THREE.Object3D);
    expect(entities.get("ferry")).toBeInstanceOf(THREE.Object3D);
  });

  it("places each vessel at ENU origin until a pose arrives", () => {
    const { entities } = buildScene(compileScenario(minimal));
    const ego = entities.get("ego")!;
    expect(ego.position.x).toBe(0);
    expect(ego.position.y).toBe(0);
    expect(ego.position.z).toBe(0);
  });

  it("attaches sensors as children of the vessel at their mount offset", () => {
    const { entities } = buildScene(compileScenario(minimal));
    const ego = entities.get("ego")!;
    const camera = ego.getObjectByName("bow_camera");
    const lidar = ego.getObjectByName("main_lidar");
    expect(camera).toBeDefined();
    expect(lidar).toBeDefined();
    expect(camera!.position.toArray()).toEqual([110, 0, 28]);
    expect(lidar!.position.toArray()).toEqual([100, 0, 30]);
  });

  it("includes ambient and directional lighting", () => {
    const { scene } = buildScene(compileScenario(minimal));
    const lights = scene.children.filter((c) => c instanceof THREE.Light);
    const hasAmbient = lights.some((l) => l instanceof THREE.AmbientLight);
    const hasDirectional = lights.some((l) => l instanceof THREE.DirectionalLight);
    expect(hasAmbient).toBe(true);
    expect(hasDirectional).toBe(true);
  });

  it("adds each vessel group to the scene", () => {
    const { scene, entities } = buildScene(compileScenario(minimal));
    expect(scene.children).toContain(entities.get("ego"));
    expect(scene.children).toContain(entities.get("ferry"));
  });
});
