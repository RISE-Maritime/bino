import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { compileScenario } from "../src/compile.js";
import { buildScene } from "../src/scene.js";
import { applyPoseUpdate } from "../src/pose.js";
import {
  marshalLidarVessels,
  marshalLidarSensorPose,
  marshalRadarVessels,
  marshalRadarSensorPose,
  colMajorToRowMajor3x3,
  DEFAULT_HALF_EXTENTS,
} from "../src/scene-marshal.js";
import { createLidarKernelWasm, buildLidarWasmConfig } from "../src/lidar-wasm.js";
import { lidar_sweep } from "../wasm/lidar.js";

const scenario = {
  name: "marshal-test",
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
  return { ...built, sensorNode };
}

/** First-seen model-index resolver — matches the order in which the node
 *  kernel pre-registers models (scene.children iteration order). */
function orderedResolver() {
  const order = new Map<string, number>();
  return (name: string) => {
    if (!order.has(name)) order.set(name, order.size);
    return order.get(name)!;
  };
}

describe("marshalLidarVessels", () => {
  it("excludes the ego hull the sensor is mounted on", () => {
    const { scene, sensorNode, entities } = setup();
    applyPoseUpdate(entities, {
      entityId: "ferry",
      pose: { position: [0, 0, -80], orientation: [0, 0, 0, 1] },
      time: 0,
    });
    scene.updateMatrixWorld(true);
    const vessels = marshalLidarVessels(scene, sensorNode, orderedResolver());
    // ego is the sensor's parent → excluded; only the ferry remains.
    expect(vessels.length).toBe(1);
    expect(vessels[0]!.center[2]).toBeCloseTo(-80, 3);
  });

  it("emits world position, row-major rotation, and motion defaults", () => {
    const { scene, sensorNode, entities } = setup();
    applyPoseUpdate(entities, {
      entityId: "ferry",
      pose: { position: [10, 0, -50], orientation: [0, 0, 0, 1] },
      time: 0,
    });
    scene.updateMatrixWorld(true);
    const ferry = scene.children.find((c) => c.name === "ferry")!;
    const vessels = marshalLidarVessels(scene, sensorNode, orderedResolver());
    expect(vessels[0]!.center).toEqual([ferry.position.x, ferry.position.y, ferry.position.z]);
    expect(vessels[0]!.rotation).toEqual(colMajorToRowMajor3x3(ferry.matrixWorld.elements));
    expect(vessels[0]!.velocity).toEqual([0, 0, 0]);
    expect(vessels[0]!.angular_velocity_y).toBe(0);
  });

  it("passes through userData velocity/angularVelocity", () => {
    const { scene, sensorNode } = setup();
    const ferry = scene.children.find((c) => c.name === "ferry")!;
    ferry.userData.velocity = [1, 2, 3];
    ferry.userData.angularVelocityY = 0.5;
    scene.updateMatrixWorld(true);
    const vessels = marshalLidarVessels(scene, sensorNode, orderedResolver());
    expect(vessels[0]!.velocity).toEqual([1, 2, 3]);
    expect(vessels[0]!.angular_velocity_y).toBe(0.5);
  });
});

describe("marshalRadarVessels", () => {
  it("excludes ego, derives bow X–Z bearing from world quaternion, uses default extents", () => {
    const { scene, sensorNode, entities } = setup();
    // Identity orientation: bow is local −Z → X–Z bearing atan2(−1, 0) = −π/2.
    applyPoseUpdate(entities, {
      entityId: "ferry",
      pose: { position: [0, 0, -40], orientation: [0, 0, 0, 1] },
      time: 0,
    });
    scene.updateMatrixWorld(true);
    let vessels = marshalRadarVessels(scene, sensorNode);
    expect(vessels.length).toBe(1);
    expect(vessels[0]!.heading).toBeCloseTo(-Math.PI / 2, 3);
    expect(vessels[0]!.half_extents).toEqual(DEFAULT_HALF_EXTENTS);

    // Yaw 90° about +Y rotates the bow to −X → bearing atan2(0, −1) = ±π.
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0, "YXZ"));
    applyPoseUpdate(entities, {
      entityId: "ferry",
      pose: { position: [0, 0, -40], orientation: [q.x, q.y, q.z, q.w] },
      time: 0,
    });
    scene.updateMatrixWorld(true);
    vessels = marshalRadarVessels(scene, sensorNode);
    expect(Math.abs(vessels[0]!.heading)).toBeCloseTo(Math.PI, 3);
  });

  it("does NOT include static obstacles (callers prepend them)", () => {
    const { scene, sensorNode } = setup();
    scene.updateMatrixWorld(true);
    const vessels = marshalRadarVessels(scene, sensorNode);
    // Only the ferry; no buildings injected here.
    expect(vessels.every((v) => v.half_extents === DEFAULT_HALF_EXTENTS)).toBe(true);
  });
});

describe("sensor pose marshalling", () => {
  it("lidar pose carries origin and 9-element rotation", () => {
    const { sensorNode } = setup();
    const pose = marshalLidarSensorPose(sensorNode);
    expect(pose.origin).toHaveLength(3);
    expect(pose.rotation).toHaveLength(9);
  });

  it("radar pose carries position and scalar heading", () => {
    const { sensorNode } = setup();
    const pose = marshalRadarSensorPose(sensorNode);
    expect(pose.position).toHaveLength(3);
    expect(typeof pose.heading).toBe("number");
  });
});

describe("node/viewer lidar parity", () => {
  it("node kernel and a direct worker-style sweep produce identical points", () => {
    const { scene, sensorNode, entities } = setup();
    applyPoseUpdate(entities, {
      entityId: "ferry",
      pose: { position: [0, 0, -60], orientation: [0, 0, 0, 1] },
      time: 0,
    });
    // A terrain plane so the comparison covers terrain hits too.
    const terrainGroup = new THREE.Group();
    terrainGroup.name = "terrain";
    const geom = new THREE.PlaneGeometry(2000, 2000, 1, 1);
    geom.rotateX(-Math.PI / 2);
    terrainGroup.add(new THREE.Mesh(geom, new THREE.MeshBasicMaterial()));
    terrainGroup.children[0]!.position.set(0, -10, 0);
    scene.add(terrainGroup);
    scene.updateMatrixWorld(true);

    // Node path: the in-process kernel. Creating it also initialises the
    // WASM terrain + model registry that the direct sweep below relies on.
    const kernel = createLidarKernelWasm({
      scene,
      sensorNode,
      config: lidarConfig,
      terrain: terrainGroup,
      waterLevelY: 0,
    });
    const frameNode = kernel.step(0);

    // Viewer path: exactly what the Web Worker feeder posts — the shared
    // marshalling output fed straight to lidar_sweep with the same config.
    const wasmConfig = buildLidarWasmConfig(lidarConfig, { waterLevelY: 0 });
    const vessels = marshalLidarVessels(scene, sensorNode, orderedResolver());
    const sensor = marshalLidarSensorPose(sensorNode);
    const direct = lidar_sweep({ vessels }, sensor, wasmConfig, undefined) as {
      points: number[] | Float32Array;
      count: number;
    };
    const directPoints =
      direct.points instanceof Float32Array ? direct.points : new Float32Array(direct.points);

    expect(frameNode.count).toBeGreaterThan(0);
    expect(direct.count).toBe(frameNode.count);
    expect(Array.from(directPoints)).toEqual(Array.from(frameNode.points));
  });
});
