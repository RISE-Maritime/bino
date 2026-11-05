import { describe, expect, it } from "vitest";
import { compileScenario } from "../src/compile.js";
import {
  decodeTickFenceEnvelope,
  encodeTickAckEnvelope,
  encodeTickFenceEnvelope,
  type TickFence,
} from "../src/keelson.js";
import { decodePayloadFromTypeName, uncover } from "../src/keelson-sdk.js";

const FENCE_KEY = "rise/@v0/slipway-ted/pubsub/scenario_status/truth";
const ACK_KEY = "rise/@v0/render-bino/pubsub/scenario_tick_ack/bino";

const scene = (modes: Record<string, string>, extra: Record<string, unknown> = {}) => ({
  name: "barrier",
  anchor: { lat: 57.7, lon: 11.9, height: 0 },
  vessels: [
    {
      id: "ego",
      model: "tanker_120m",
      pose_source: { type: "zenoh", topic: "ego/pose" },
      sensors: [],
    },
  ],
  modes: { rendering: "replace", ...modes },
  keelson: { base_path: "rise" },
  ...extra,
});

describe("the tick fence and its acknowledgement", () => {
  const fence: TickFence = {
    runId: "run-1",
    tick: 42,
    stepUs: 100_000,
    simulationTime: new Date(Date.UTC(2026, 10, 5, 12, 0, 4, 200)),
  };

  it("a fence survives the wire", () => {
    expect(decodeTickFenceEnvelope(encodeTickFenceEnvelope(fence))).toEqual(fence);
  });

  it("a status with no run or no step is not a fence", () => {
    expect(decodeTickFenceEnvelope(encodeTickFenceEnvelope({ ...fence, runId: "" }))).toBeNull();
    expect(decodeTickFenceEnvelope(encodeTickFenceEnvelope({ ...fence, stepUs: 0 }))).toBeNull();
    expect(decodeTickFenceEnvelope(new Uint8Array([1, 2, 3]))).toBeNull();
  });

  it("the ack is Slipway's: COMPLETED, wall-stamped, enclosed at the tick's instant", () => {
    const wall = new Date(Date.UTC(2026, 10, 5, 9, 30));
    const [, enclosedAt, payload] = uncover(encodeTickAckEnvelope(fence, wall))!;
    expect(enclosedAt).toEqual(fence.simulationTime);
    const ack = decodePayloadFromTypeName("keelson.ScenarioTickAck", payload) as unknown as {
      runId: string;
      tick: number;
      disposition: number;
      timestamp: Date;
    };
    expect(ack.runId).toBe("run-1");
    expect(ack.tick).toBe(42);
    // Slipway's barrier.ACK_COMPLETED, held to the enum there too.
    expect(ack.disposition).toBe(1);
    expect(ack.timestamp).toEqual(wall);
  });
});

describe("a barrier clock in the scene", () => {
  const barrier = { fence_key: FENCE_KEY, ack_key: ACK_KEY };

  it("compiles strict, and carries its keys through", () => {
    const compiled = compileScenario(
      scene({ clock: "barrier", determinism: "strict" }, { barrier }),
    );
    expect(compiled.barrier).toEqual(barrier);
  });

  it("is refused without its keys", () => {
    expect(() => compileScenario(scene({ clock: "barrier", determinism: "strict" }))).toThrow(
      /barrier: \{ fence_key, ack_key \}/,
    );
  });

  it("keys on any other clock are refused, not ignored", () => {
    expect(() =>
      compileScenario(scene({ clock: "wall", determinism: "relaxed" }, { barrier })),
    ).toThrow(/only read by the 'barrier' clock/);
  });

  it("strict still refuses a wall clock", () => {
    expect(() => compileScenario(scene({ clock: "wall", determinism: "strict" }))).toThrow(
      /stepped or barrier clock/,
    );
  });
});
