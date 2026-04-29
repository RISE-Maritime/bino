import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { MemoryPoseStream, SteppedClock } from "@bino/core";
import { BinoRunner, type SensorKernelLike } from "../src/runner.js";

function makeKernel(): SensorKernelLike & { stepMock: ReturnType<typeof vi.fn> } {
  const stepMock = vi.fn((t: number) => ({ time: t }));
  return {
    step: stepMock,
    dispose: vi.fn(),
    stepMock,
  };
}

function makeFixture() {
  const scene = new THREE.Scene();
  const ego = new THREE.Object3D();
  ego.name = "ego";
  scene.add(ego);
  const entities = new Map<string, THREE.Object3D>([["ego", ego]]);
  return { scene, entities, ego };
}

describe("BinoRunner", () => {
  it("ticks each kernel and emits a FrameEvent per tick", async () => {
    const { scene, entities } = makeFixture();
    const camera = makeKernel();
    const lidar = makeKernel();
    const runner = new BinoRunner({
      scene,
      entities,
      kernels: [camera, lidar],
      clock: new SteppedClock(),
      tickHz: 1000,
    });
    const stream = new MemoryPoseStream();
    const gen = runner.frames(stream);

    const events = [];
    for (let i = 0; i < 3; i++) {
      const { value } = await gen.next();
      events.push(value!);
    }
    runner.stop();
    stream.close();
    await gen.return(undefined);

    expect(events).toHaveLength(3);
    expect(camera.stepMock).toHaveBeenCalledTimes(3);
    expect(lidar.stepMock).toHaveBeenCalledTimes(3);
    expect(events[0]!.index).toBe(0);
    expect(events[2]!.index).toBe(2);
    expect(events[0]!.outputs).toHaveLength(2);
  });

  it("applies pose updates from the stream to entity transforms", async () => {
    const { scene, entities, ego } = makeFixture();
    const runner = new BinoRunner({
      scene,
      entities,
      kernels: [makeKernel()],
      clock: new SteppedClock(),
      tickHz: 1000,
    });
    const stream = new MemoryPoseStream();
    stream.push({
      entityId: "ego",
      pose: { position: [12, 0, 0], orientation: [0, 0, 0, 1] },
      time: 0,
    });

    const gen = runner.frames(stream);
    // Allow the pose pump a microtask to drain.
    await new Promise((r) => setImmediate(r));
    await gen.next();

    expect(ego.position.x).toBe(12);

    runner.stop();
    stream.close();
    await gen.return(undefined);
  });

  it("uses the clock for frame time", async () => {
    const { scene, entities } = makeFixture();
    const clock = new SteppedClock();
    const camera = makeKernel();
    const runner = new BinoRunner({
      scene,
      entities,
      kernels: [camera],
      clock,
      tickHz: 1000,
    });
    const stream = new MemoryPoseStream();
    const gen = runner.frames(stream);

    clock.set(5.5);
    const { value } = await gen.next();
    expect(value!.time).toBe(5.5);
    expect(camera.stepMock).toHaveBeenCalledWith(5.5);

    runner.stop();
    stream.close();
    await gen.return(undefined);
  });

  it("stop() ends the generator after the current frame", async () => {
    const { scene, entities } = makeFixture();
    const runner = new BinoRunner({
      scene,
      entities,
      kernels: [makeKernel()],
      clock: new SteppedClock(),
      tickHz: 1000,
    });
    const stream = new MemoryPoseStream();
    const gen = runner.frames(stream);

    await gen.next();
    runner.stop();

    const next = await gen.next();
    expect(next.done).toBe(true);
    stream.close();
  });
});
