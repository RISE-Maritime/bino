import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { compileScenario } from "../src/compile.js";
import { buildScene } from "../src/scene.js";
import { applyPoseUpdate } from "../src/pose.js";
import { createLidarKernelWasm } from "../src/lidar-wasm.js";

const scenario = {
  name: "lidar-wasm-test",
  anchor: { lat: 0, lon: 0, height: 0 },
  vessels: [
    {
      id: "ego",
      model: "tanker_120m",
      pose_source: { type: "zenoh", topic: "ego/pose" },
      sensors: [
        {
          id: "main_lidar",
          type: "lidar",
          mount: { x: 0, y: 0, z: 5 },
          channels: 16,
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

const lidarConfig = scenario.vessels[0]!.sensors[0]! as Extract<
  (typeof scenario)["vessels"][0]["sensors"][0],
  { type: "lidar" }
>;

function setup() {
  const compiled = compileScenario(scenario);
  const built = buildScene(compiled);
  const sensorNode = built.entities.get("ego")!.getObjectByName("main_lidar")!;
  return { ...built, sensorNode, compiled };
}

describe("createLidarKernelWasm", () => {
  it("returns zero points when no geometry is in range", () => {
    const { scene, sensorNode, entities } = setup();
    applyPoseUpdate(entities, {
      entityId: "ferry",
      pose: { position: [10000, 0, 10000], orientation: [0, 0, 0, 1] },
      time: 0,
    });
    scene.updateMatrixWorld(true);
    const kernel = createLidarKernelWasm({ scene, sensorNode, config: lidarConfig });
    const frame = kernel.step(0);
    expect(frame.count).toBe(0);
    expect(frame.points).toBeInstanceOf(Float32Array);
    expect(frame.time).toBe(0);
  });

  it("detects a vessel directly ahead", () => {
    const { scene, sensorNode, entities } = setup();
    applyPoseUpdate(entities, {
      entityId: "ferry",
      pose: { position: [0, 0, -80], orientation: [0, 0, 0, 1] },
      time: 0,
    });
    scene.updateMatrixWorld(true);
    const kernel = createLidarKernelWasm({ scene, sensorNode, config: lidarConfig });
    const frame = kernel.step(1.5);
    expect(frame.count).toBeGreaterThan(0);
    expect(frame.time).toBe(1.5);
    const nearZ = frame.points
      .filter((_: number, i: number) => i % 3 === 2)
      .reduce((min: number, z: number) => Math.min(min, Math.abs(z)), Infinity);
    expect(nearZ).toBeLessThan(100);
  });

  it("detects terrain triangles", () => {
    const { scene, sensorNode, entities } = setup();
    applyPoseUpdate(entities, {
      entityId: "ferry",
      pose: { position: [10000, 0, 10000], orientation: [0, 0, 0, 1] },
      time: 0,
    });
    const terrainGroup = new THREE.Group();
    terrainGroup.name = "terrain";
    const geom = new THREE.PlaneGeometry(400, 400, 1, 1);
    geom.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial();
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(0, -10, 0);
    terrainGroup.add(mesh);
    scene.add(terrainGroup);
    scene.updateMatrixWorld(true);

    const kernel = createLidarKernelWasm({
      scene,
      sensorNode,
      config: { ...lidarConfig, channels: 8 },
      terrain: terrainGroup,
      fov_deg: 120,
    });
    const frame = kernel.step(0);
    expect(frame.count).toBeGreaterThan(0);
  });

  it("vessel occludes terrain behind it", () => {
    const { scene, sensorNode, entities } = setup();
    const terrainGroup = new THREE.Group();
    terrainGroup.name = "terrain";
    const geom = new THREE.PlaneGeometry(2000, 2000, 1, 1);
    geom.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geom, new THREE.MeshBasicMaterial());
    mesh.position.set(0, -10, 0);
    terrainGroup.add(mesh);
    scene.add(terrainGroup);
    applyPoseUpdate(entities, {
      entityId: "ferry",
      pose: { position: [0, 0, -50], orientation: [0, 0, 0, 1] },
      time: 0,
    });
    scene.updateMatrixWorld(true);

    const kernel = createLidarKernelWasm({
      scene,
      sensorNode,
      config: { ...lidarConfig, channels: 8 },
      terrain: terrainGroup,
      fov_deg: 30,
    });
    const frame = kernel.step(0);
    expect(frame.count).toBeGreaterThan(0);
    const distances = [];
    for (let i = 0; i < frame.count; i++) {
      const x = frame.points[i * 3]!;
      const y = frame.points[i * 3 + 1]!;
      const z = frame.points[i * 3 + 2]!;
      distances.push(Math.sqrt(x * x + y * y + z * z));
    }
    const minDist = Math.min(...distances);
    expect(minDist).toBeLessThan(55);
  });

  it("dispose is callable and idempotent", () => {
    const { scene, sensorNode } = setup();
    const kernel = createLidarKernelWasm({ scene, sensorNode, config: lidarConfig });
    expect(() => {
      kernel.dispose();
      kernel.dispose();
    }).not.toThrow();
  });
});
