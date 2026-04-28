import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { compileScenario } from "../src/compile.js";
import { buildScene } from "../src/scene.js";
import { MemoryPoseStream, applyPoseUpdate, type PoseUpdate } from "../src/pose.js";

const minimal = {
  name: "smoke",
  anchor: { lat: 54.3233, lon: 10.1394, height: 0 },
  vessels: [
    {
      id: "ego",
      model: "tanker_120m",
      pose_source: { type: "zenoh", topic: "ego/pose" },
      sensors: [],
    },
  ],
  modes: { rendering: "replace", clock: "wall", determinism: "relaxed" },
};

describe("MemoryPoseStream", () => {
  it("delivers pushed updates to an async iterator", async () => {
    const stream = new MemoryPoseStream();
    const seen: PoseUpdate[] = [];
    const consumer = (async () => {
      for await (const update of stream) {
        seen.push(update);
        if (seen.length === 2) break;
      }
    })();

    stream.push({
      entityId: "ego",
      pose: { position: [10, 0, 0], orientation: [0, 0, 0, 1] },
      time: 0.1,
    });
    stream.push({
      entityId: "ego",
      pose: { position: [11, 0, 0], orientation: [0, 0, 0, 1] },
      time: 0.2,
    });

    await consumer;
    expect(seen).toHaveLength(2);
    expect(seen[0]?.pose.position).toEqual([10, 0, 0]);
    expect(seen[1]?.time).toBe(0.2);
  });

  it("ends iteration when closed", async () => {
    const stream = new MemoryPoseStream();
    let count = 0;
    const consumer = (async () => {
      for await (const _ of stream) count += 1;
    })();
    stream.push({
      entityId: "ego",
      pose: { position: [0, 0, 0], orientation: [0, 0, 0, 1] },
      time: 0,
    });
    stream.close();
    await consumer;
    expect(count).toBe(1);
  });

  it("buffers updates pushed before iteration starts", async () => {
    const stream = new MemoryPoseStream();
    stream.push({
      entityId: "ego",
      pose: { position: [1, 2, 3], orientation: [0, 0, 0, 1] },
      time: 0,
    });
    stream.close();
    const seen: PoseUpdate[] = [];
    for await (const update of stream) seen.push(update);
    expect(seen).toHaveLength(1);
    expect(seen[0]?.pose.position).toEqual([1, 2, 3]);
  });
});

describe("applyPoseUpdate", () => {
  it("moves the entity to the pose position and orientation", () => {
    const { entities } = buildScene(compileScenario(minimal));
    applyPoseUpdate(entities, {
      entityId: "ego",
      pose: { position: [42, -3, 7], orientation: [0, 0, 0, 1] },
      time: 0,
    });
    const ego = entities.get("ego")!;
    expect(ego.position.toArray()).toEqual([42, -3, 7]);
    expect(ego.quaternion.toArray()).toEqual([0, 0, 0, 1]);
  });

  it("ignores updates for unknown entities", () => {
    const { entities } = buildScene(compileScenario(minimal));
    expect(() =>
      applyPoseUpdate(entities, {
        entityId: "ghost",
        pose: { position: [0, 0, 0], orientation: [0, 0, 0, 1] },
        time: 0,
      }),
    ).not.toThrow();
  });

  it("works with raw Three.js Object3D positions (sanity)", () => {
    const obj = new THREE.Object3D();
    const map = new Map([["x", obj]]);
    applyPoseUpdate(map, {
      entityId: "x",
      pose: { position: [1, 2, 3], orientation: [0, 0, 0, 1] },
      time: 0,
    });
    expect(obj.position.toArray()).toEqual([1, 2, 3]);
  });
});
