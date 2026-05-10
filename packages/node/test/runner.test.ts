import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { MemoryPoseStream, SteppedClock, WallClock } from "@bino/core";
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

describe("BinoRunner — per-sensor scheduling", () => {
  it("emits an event each time any sensor fires; tags outputs by sensorId", async () => {
    const { scene, entities } = makeFixture();
    const clock = new SteppedClock();
    const camera = makeKernel();
    const lidar = makeKernel();
    const runner = new BinoRunner({
      scene,
      entities,
      kernels: [
        { sensorId: "cam", rate_hz: 10, kernel: camera },
        { sensorId: "lid", rate_hz: 10, kernel: lidar },
      ],
      clock,
      tickHz: 1000,
    });
    const stream = new MemoryPoseStream();
    const gen = runner.frames(stream);

    // First tick at t=0 fires both (nextFireTime starts at 0).
    const ev0 = (await gen.next()).value!;
    expect(ev0.outputs.map((o) => o.sensorId).sort()).toEqual(["cam", "lid"]);
    expect(camera.stepMock).toHaveBeenCalledTimes(1);

    // Advance clock past the next 10 Hz period (0.1 s) — both fire again.
    clock.set(0.11);
    const ev1 = (await gen.next()).value!;
    expect(ev1.outputs).toHaveLength(2);
    expect(camera.stepMock).toHaveBeenCalledTimes(2);

    runner.stop();
    stream.close();
    await gen.return(undefined);
  });

  it("fires faster sensors more often than slower ones", async () => {
    const { scene, entities } = makeFixture();
    const clock = new SteppedClock();
    const fast = makeKernel();
    const slow = makeKernel();
    const runner = new BinoRunner({
      scene,
      entities,
      kernels: [
        { sensorId: "fast", rate_hz: 30, kernel: fast },
        { sensorId: "slow", rate_hz: 10, kernel: slow },
      ],
      clock,
      tickHz: 1000,
    });
    const stream = new MemoryPoseStream();
    const gen = runner.frames(stream);

    // Drain events while advancing clock to t=1.0s. Expect ~30 fast
    // fires, ~10 slow fires. Tolerance ±1 for boundary effects.
    let fastFires = 0;
    let slowFires = 0;
    let nextRead = 0;
    for (let i = 0; i < 60; i++) {
      clock.set((i + 1) * 0.034);
      void nextRead;
      const ev = (await gen.next()).value;
      if (!ev) break;
      for (const o of ev.outputs) {
        if (o.sensorId === "fast") fastFires += 1;
        if (o.sensorId === "slow") slowFires += 1;
      }
      if (clock.now() >= 1.0) break;
    }
    expect(fastFires).toBeGreaterThanOrEqual(28);
    expect(fastFires).toBeLessThanOrEqual(32);
    expect(slowFires).toBeGreaterThanOrEqual(9);
    expect(slowFires).toBeLessThanOrEqual(11);

    runner.stop();
    stream.close();
    await gen.return(undefined);
  });

  it("applies pose updates between ticks", async () => {
    const { scene, entities, ego } = makeFixture();
    const clock = new SteppedClock();
    const runner = new BinoRunner({
      scene,
      entities,
      kernels: [{ sensorId: "cam", rate_hz: 10, kernel: makeKernel() }],
      clock,
      tickHz: 1000,
    });
    const stream = new MemoryPoseStream();
    stream.push({
      entityId: "ego",
      pose: { position: [12, 0, 0], orientation: [0, 0, 0, 1] },
      time: 0,
    });

    const gen = runner.frames(stream);
    await new Promise((r) => setImmediate(r));
    await gen.next();

    expect(ego.position.x).toBe(12);

    runner.stop();
    stream.close();
    await gen.return(undefined);
  });

  it("frame.time uses clock.now() at fire time", async () => {
    const { scene, entities } = makeFixture();
    const clock = new SteppedClock();
    const camera = makeKernel();
    const runner = new BinoRunner({
      scene,
      entities,
      kernels: [{ sensorId: "cam", rate_hz: 10, kernel: camera }],
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

  it("stop() ends the generator", async () => {
    const { scene, entities } = makeFixture();
    const runner = new BinoRunner({
      scene,
      entities,
      kernels: [{ sensorId: "cam", rate_hz: 1000, kernel: makeKernel() }],
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

describe("BinoRunner — deterministic mode", () => {
  it("throws when deterministic mode is used with a non-SteppedClock", () => {
    const { scene, entities } = makeFixture();
    expect(
      () =>
        new BinoRunner({
          scene,
          entities,
          kernels: [{ sensorId: "cam", rate_hz: 10, kernel: makeKernel() }],
          clock: new WallClock(),
          deterministic: true,
        }),
    ).toThrow("deterministic mode requires a SteppedClock");
  });

  it("fires sensors at correct rates (10 Hz and 5 Hz)", async () => {
    const { scene, entities } = makeFixture();
    const clock = new SteppedClock();
    const fast = makeKernel(); // 10 Hz
    const slow = makeKernel(); // 5 Hz

    const runner = new BinoRunner({
      scene,
      entities,
      kernels: [
        { sensorId: "fast", rate_hz: 10, kernel: fast },
        { sensorId: "slow", rate_hz: 5, kernel: slow },
      ],
      clock,
      deterministic: true,
    });

    const stream = new MemoryPoseStream();
    const gen = runner.frames(stream);

    // baseDt: GCD of 100000us (10Hz) and 200000us (5Hz) = 100000us = 0.1s
    // fast fires every 1 tick, slow fires every 2 ticks.
    // Run for 10 ticks = 1 second.
    const events: Array<{ index: number; time: number; sensorIds: string[] }> =
      [];

    for (let i = 0; i < 10; i++) {
      const { value, done } = await gen.next();
      if (done) break;
      events.push({
        index: value!.index,
        time: value!.time,
        sensorIds: value!.outputs.map((o) => o.sensorId),
      });
    }

    runner.stop();
    stream.close();
    await gen.return(undefined);

    // Every tick should produce at least the fast sensor, so we expect 10 events.
    expect(events).toHaveLength(10);

    // Count fires per sensor.
    let fastFires = 0;
    let slowFires = 0;
    for (const ev of events) {
      if (ev.sensorIds.includes("fast")) fastFires++;
      if (ev.sensorIds.includes("slow")) slowFires++;
    }

    expect(fastFires).toBe(10);
    expect(slowFires).toBe(5);
  });

  it("fire order within a tick is sorted by sensorId", async () => {
    const { scene, entities } = makeFixture();
    const clock = new SteppedClock();

    // Provide kernels in non-sorted order to verify sorting.
    const runner = new BinoRunner({
      scene,
      entities,
      kernels: [
        { sensorId: "z-sensor", rate_hz: 10, kernel: makeKernel() },
        { sensorId: "a-sensor", rate_hz: 10, kernel: makeKernel() },
        { sensorId: "m-sensor", rate_hz: 10, kernel: makeKernel() },
      ],
      clock,
      deterministic: true,
    });

    const stream = new MemoryPoseStream();
    const gen = runner.frames(stream);

    const { value } = await gen.next();
    const sensorIds = value!.outputs.map((o) => o.sensorId);
    expect(sensorIds).toEqual(["a-sensor", "m-sensor", "z-sensor"]);

    runner.stop();
    stream.close();
    await gen.return(undefined);
  });

  it("clock time advances by baseDt each tick", async () => {
    const { scene, entities } = makeFixture();
    const clock = new SteppedClock();

    // Single sensor at 10 Hz => baseDt = 0.1s
    const runner = new BinoRunner({
      scene,
      entities,
      kernels: [
        { sensorId: "cam", rate_hz: 10, kernel: makeKernel() },
      ],
      clock,
      deterministic: true,
    });

    const stream = new MemoryPoseStream();
    const gen = runner.frames(stream);

    const times: number[] = [];
    for (let i = 0; i < 5; i++) {
      const { value } = await gen.next();
      times.push(value!.time);
    }

    runner.stop();
    stream.close();
    await gen.return(undefined);

    // Times should be 0.1, 0.2, 0.3, 0.4, 0.5
    for (let i = 0; i < times.length; i++) {
      expect(times[i]).toBeCloseTo((i + 1) * 0.1);
    }
  });

  it("drains pose updates before each tick", async () => {
    const { scene, entities, ego } = makeFixture();
    const clock = new SteppedClock();

    const kernel = makeKernel();
    const runner = new BinoRunner({
      scene,
      entities,
      kernels: [
        { sensorId: "cam", rate_hz: 10, kernel },
      ],
      clock,
      deterministic: true,
    });

    const stream = new MemoryPoseStream();

    // Push a pose update before starting the generator.
    stream.push({
      entityId: "ego",
      pose: { position: [42, 0, 0], orientation: [0, 0, 0, 1] },
      time: 0,
    });

    const gen = runner.frames(stream);

    // Let the pump start and the first tick run.
    await gen.next();

    expect(ego.position.x).toBe(42);

    runner.stop();
    stream.close();
    await gen.return(undefined);
  });

  it("frame index is the clock frameIndex (monotonically increasing)", async () => {
    const { scene, entities } = makeFixture();
    const clock = new SteppedClock();

    const runner = new BinoRunner({
      scene,
      entities,
      kernels: [
        { sensorId: "cam", rate_hz: 10, kernel: makeKernel() },
      ],
      clock,
      deterministic: true,
    });

    const stream = new MemoryPoseStream();
    const gen = runner.frames(stream);

    const indices: number[] = [];
    for (let i = 0; i < 5; i++) {
      const { value } = await gen.next();
      indices.push(value!.index);
    }

    runner.stop();
    stream.close();
    await gen.return(undefined);

    // Each tick increments the clock frameIndex; index = 1, 2, 3, 4, 5
    for (let i = 1; i < indices.length; i++) {
      expect(indices[i]).toBeGreaterThan(indices[i - 1]);
    }
  });
});
