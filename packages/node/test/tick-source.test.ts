import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import {
  MemoryPoseStream,
  SteppedClock,
  encodeTickAckEnvelope,
  encodeTickFenceEnvelope,
  type TickFence,
  type ZenohSampleLike,
} from "@bino/core";
import { BinoRunner, type SensorKernelLike } from "../src/runner.js";
import { BarrierTickSource, type BarrierSession } from "../src/tick-source.js";

const FENCE_KEY = "rise/@v0/slipway-ted/pubsub/scenario_status/truth";
const ACK_KEY = "rise/@v0/render-bino/pubsub/scenario_tick_ack/bino";
const WALL = new Date(Date.UTC(2026, 10, 5, 9, 30));
const EPOCH_MS = Date.UTC(2026, 10, 5, 12, 0, 0);

const fence = (tick: number, runId = "run-1", stepUs = 100_000): TickFence => ({
  runId,
  tick,
  stepUs,
  simulationTime: new Date(EPOCH_MS + (tick * stepUs) / 1000),
});

/** A session that records every put, in order, with whatever else the test
 *  logs into the same list — so "ack before frame" is a question of order. */
function fakeSession(log: string[] = []) {
  const puts: Array<{ key: string; bytes: Uint8Array }> = [];
  const hooks: { afterPut?: () => void } = {};
  let push: ((s: ZenohSampleLike | null) => void) | undefined;
  const queue: ZenohSampleLike[] = [];
  const session: BarrierSession = {
    declareSubscriber: async () => ({
      receiver: () => ({
        async *[Symbol.asyncIterator]() {
          for (;;) {
            const next =
              queue.shift() ?? (await new Promise<ZenohSampleLike | null>((r) => (push = r)));
            // Undeclaring ends the receiver, as zenoh's does.
            if (!next) return;
            yield next;
          }
        },
      }),
      undeclare: async () => push?.(null),
    }),
    put: async (key, bytes) => {
      puts.push({ key, bytes });
      log.push(`ack ${key}`);
      hooks.afterPut?.();
    },
  };
  const send = (bytes: Uint8Array) => {
    const s: ZenohSampleLike = { payload: () => ({ toBytes: () => bytes }) };
    if (push) {
      const p = push;
      push = undefined;
      p(s);
    } else queue.push(s);
  };
  return { session, puts, send, log, hooks };
}

function makeKernel(): SensorKernelLike & { stepMock: ReturnType<typeof vi.fn> } {
  const stepMock = vi.fn((t: number) => ({ time: t }));
  return { step: stepMock, dispose: vi.fn(), stepMock };
}

function barrierRunner(rates: Record<string, number>, onWarning = vi.fn()) {
  const { session, puts, log, hooks } = fakeSession();
  const source = new BarrierTickSource({
    session,
    fenceKey: FENCE_KEY,
    ackKey: ACK_KEY,
    now: () => WALL,
  });
  const kernels = Object.entries(rates).map(([sensorId, rate_hz]) => ({
    sensorId,
    rate_hz,
    kernel: makeKernel(),
  }));
  const onTick = vi.fn();
  const scene = new THREE.Scene();
  const runner = new BinoRunner({
    scene,
    entities: new Map(),
    kernels,
    clock: new SteppedClock(),
    deterministic: true,
    tickSource: source,
    onTick,
    onWarning,
  });
  const stream = new MemoryPoseStream();
  /** Stand in for a kernel holding a blocking participant: tick 1 now, and
   *  each later tick only once the one before it has been acknowledged. */
  const kernelTicks = (last: number, runId = "run-1", stepUs = 100_000) => {
    let next = 2;
    hooks.afterPut = () => {
      if (next <= last) source.offer(fence(next++, runId, stepUs));
    };
    source.offer(fence(1, runId, stepUs));
  };
  return {
    runner,
    source,
    puts,
    log,
    kernels,
    onTick,
    stream,
    kernelTicks,
    gen: runner.frames(stream),
  };
}

describe("BarrierTickSource — the protocol", () => {
  it("acknowledges a tick only once its frame has been consumed", async () => {
    const { source, puts, log, gen } = barrierRunner({ cam: 10 });
    source.offer(fence(1));
    const first = await gen.next();
    log.push(`frame ${first.value!.index}`);
    // The frame for tick 1 is out, and still nobody has said it exists.
    expect(puts).toHaveLength(0);

    source.offer(fence(2));
    const second = await gen.next();
    log.push(`frame ${second.value!.index}`);
    // Asking for tick 2 is what answered tick 1 — after its frame, before 2's.
    expect(log).toEqual(["frame 1", `ack ${ACK_KEY}`, "frame 2"]);
    expect(puts[0]!.bytes).toEqual(encodeTickAckEnvelope(fence(1), WALL));
    await gen.return(undefined);
  });

  it("acknowledges a tick on which nothing fired, without yielding", async () => {
    const { puts, gen, kernelTicks } = barrierRunner({ slow: 2 });
    kernelTicks(6);
    // 2 Hz on a 0.1 s tick: slot 0 at t=0.1 … next slot at t=0.5 (tick 5).
    expect((await gen.next()).value!.index).toBe(1);
    expect((await gen.next()).value!.index).toBe(5);
    // Ticks 1-4 answered on the way, whether or not anything rendered.
    expect(puts).toHaveLength(4);
    await gen.return(undefined);
  });

  it("a repeated status is a heartbeat, not a tick", async () => {
    const { source, puts, gen } = barrierRunner({ cam: 10 });
    source.offer(fence(1));
    await gen.next();
    source.offer(fence(1));
    source.offer(fence(1));
    source.offer(fence(0));
    source.offer(fence(2));
    expect((await gen.next()).value!.index).toBe(2);
    expect(puts).toHaveLength(1);
    expect(source.stats.skipped).toBe(0);
    await gen.return(undefined);
  });

  it("tick 0 is the loaded state, and nobody waits on it", async () => {
    const { source, gen } = barrierRunner({ cam: 10 });
    source.offer(fence(0));
    source.offer(fence(1));
    expect((await gen.next()).value!.index).toBe(1);
    await gen.return(undefined);
  });

  it("a new run starts over, and owes the old one nothing", async () => {
    const { source, puts, gen, kernels } = barrierRunner({ cam: 10 });
    source.offer(fence(7, "run-1"));
    await gen.next();
    source.offer(fence(1, "run-2"));
    const ev = (await gen.next()).value!;
    expect(ev.index).toBe(1);
    expect(puts).toHaveLength(0);
    // The sensor fires again from the new run's first tick.
    expect(kernels[0]!.kernel.step).toHaveBeenCalledTimes(2);
    await gen.return(undefined);
  });

  it("when fences pile up the latest wins, and the rest are counted", async () => {
    const { source, gen } = barrierRunner({ cam: 10 });
    source.offer(fence(1));
    source.offer(fence(2));
    source.offer(fence(3));
    expect((await gen.next()).value!.index).toBe(3);
    expect(source.stats.skipped).toBe(2);
    await gen.return(undefined);
  });

  it("stop() ends a loop that is waiting for a fence", async () => {
    const { runner, gen } = barrierRunner({ cam: 10 });
    const pending = gen.next();
    runner.stop();
    expect((await pending).done).toBe(true);
  });

  it("hears its fences on the session, as envelopes", async () => {
    const { session, send, puts } = fakeSession();
    const source = new BarrierTickSource({ session, fenceKey: FENCE_KEY, ackKey: ACK_KEY });
    await source.start();
    send(encodeTickFenceEnvelope(fence(3)));
    const tick = (await source.next())!;
    expect(tick).toEqual({
      index: 3,
      timeS: 0.3,
      stampS: (EPOCH_MS + 300) / 1000,
      runId: "run-1",
    });
    send(encodeTickFenceEnvelope(fence(4)));
    await source.next();
    expect(puts.map((p) => p.key)).toEqual([ACK_KEY]);
    source.close();
    await source.stopped();
  });
});

describe("BinoRunner — on an external tick", () => {
  it("stamps frames with the kernel's instant and drives the scene from run time", async () => {
    const { source, gen, kernels, onTick } = barrierRunner({ cam: 10 });
    source.offer(fence(12));
    const ev = (await gen.next()).value!;
    const stamp = (EPOCH_MS + 1200) / 1000;
    expect(ev.time).toBe(stamp);
    expect(kernels[0]!.kernel.step).toHaveBeenCalledWith(stamp);
    // The sea's uTime is float32 on the GPU: it gets seconds since the start.
    expect(onTick).toHaveBeenCalledWith(1.2);
    await gen.return(undefined);
  });

  it("a sensor fires once in each of its periods, whatever the step", async () => {
    // A 0.04 s kernel step against a 10 Hz camera: no tick lands on 0.1 s.
    const { gen, kernelTicks, source } = barrierRunner({ cam: 10 });
    const fired: number[] = [];
    kernelTicks(10, "run-1", 40_000);
    for (let i = 0; i < 4; i++) fired.push((await gen.next()).value!.index);
    // t = 0.04 (slot 0), 0.12 (1), 0.20 (2), 0.32 (3)
    expect(fired).toEqual([1, 3, 5, 8]);
    expect(source.stats.skipped).toBe(0);
    await gen.return(undefined);
  });

  it("a sensor faster than the tick fires on every tick, and says so once", async () => {
    const onWarning = vi.fn();
    const { gen, kernelTicks } = barrierRunner({ fast: 20 }, onWarning);
    kernelTicks(3);
    for (let i = 0; i < 3; i++) await gen.next();
    expect(onWarning).toHaveBeenCalledTimes(1);
    expect(onWarning.mock.calls[0]![0]).toMatch(/'fast' at 20 Hz is faster than the external tick/);
    await gen.return(undefined);
  });

  it("refuses a tick source outside the deterministic loop", () => {
    const { session } = fakeSession();
    expect(
      () =>
        new BinoRunner({
          scene: new THREE.Scene(),
          entities: new Map(),
          kernels: [],
          clock: new SteppedClock(),
          tickSource: new BarrierTickSource({ session, fenceKey: FENCE_KEY, ackKey: ACK_KEY }),
        }),
    ).toThrow(/set deterministic: true/);
  });
});
