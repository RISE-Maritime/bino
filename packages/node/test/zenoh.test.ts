import { describe, expect, it, vi } from "vitest";
import { createZenohPoseStream, type ZenohSessionLike } from "../src/zenoh.js";

interface FakeSample {
  payload: () => { toString: () => string };
}

class FakeChannel {
  private waiters: Array<(v: IteratorResult<FakeSample>) => void> = [];
  private buffer: FakeSample[] = [];
  private closed = false;

  push(sample: FakeSample): void {
    const w = this.waiters.shift();
    if (w) w({ value: sample, done: false });
    else this.buffer.push(sample);
  }
  close(): void {
    this.closed = true;
    while (this.waiters.length) this.waiters.shift()!({ value: undefined as unknown as FakeSample, done: true });
  }
  [Symbol.asyncIterator](): AsyncIterableIterator<FakeSample> {
    const self = this;
    return {
      next(): Promise<IteratorResult<FakeSample>> {
        const buffered = self.buffer.shift();
        if (buffered) return Promise.resolve({ value: buffered, done: false });
        if (self.closed) return Promise.resolve({ value: undefined as unknown as FakeSample, done: true });
        return new Promise((r) => self.waiters.push(r));
      },
      [Symbol.asyncIterator](): AsyncIterableIterator<FakeSample> {
        return this;
      },
    };
  }
}

function makeSession(): { session: ZenohSessionLike; channels: Map<string, FakeChannel>; undeclared: string[] } {
  const channels = new Map<string, FakeChannel>();
  const undeclared: string[] = [];
  const session: ZenohSessionLike = {
    declareSubscriber: vi.fn(async (keyExpr: string) => {
      const ch = new FakeChannel();
      channels.set(keyExpr, ch);
      return {
        receiver: () => ch,
        undeclare: async () => {
          undeclared.push(keyExpr);
          ch.close();
        },
      };
    }),
  };
  return { session, channels, undeclared };
}

function payload(text: string): FakeSample {
  return { payload: () => ({ toString: () => text }) };
}

describe("createZenohPoseStream", () => {
  it("yields PoseUpdates from a single subscriber", async () => {
    const { session, channels } = makeSession();
    const stream = await createZenohPoseStream({
      session,
      vessels: [{ vesselId: "ego", topic: "ego/pose" }],
    });

    channels.get("ego/pose")!.push(
      payload(JSON.stringify({ position: [1, 2, 3], orientation: [0, 0, 0, 1], time: 0.1 })),
    );

    const seen: unknown[] = [];
    const consumer = (async () => {
      for await (const u of stream) {
        seen.push(u);
        if (seen.length === 1) break;
      }
    })();
    await consumer;

    expect(seen).toEqual([
      { entityId: "ego", pose: { position: [1, 2, 3], orientation: [0, 0, 0, 1] }, time: 0.1 },
    ]);
    stream.close();
  });

  it("merges multiple subscribers with the right entityId tagging", async () => {
    const { session, channels } = makeSession();
    const stream = await createZenohPoseStream({
      session,
      vessels: [
        { vesselId: "ego", topic: "ego/pose" },
        { vesselId: "ferry", topic: "ferry/pose" },
      ],
    });

    channels.get("ferry/pose")!.push(
      payload(JSON.stringify({ position: [10, 0, 0], orientation: [0, 0, 0, 1], time: 1 })),
    );
    channels.get("ego/pose")!.push(
      payload(JSON.stringify({ position: [0, 0, 0], orientation: [0, 0, 0, 1], time: 1 })),
    );

    const ids = new Set<string>();
    const consumer = (async () => {
      for await (const u of stream) {
        ids.add(u.entityId);
        if (ids.size === 2) break;
      }
    })();
    await consumer;
    expect(ids).toEqual(new Set(["ego", "ferry"]));
    stream.close();
  });

  it("silently drops malformed payloads", async () => {
    const { session, channels } = makeSession();
    const stream = await createZenohPoseStream({
      session,
      vessels: [{ vesselId: "ego", topic: "ego/pose" }],
    });

    channels.get("ego/pose")!.push(payload("not json"));
    channels.get("ego/pose")!.push(payload(JSON.stringify({ position: [1, 2] })));
    channels.get("ego/pose")!.push(
      payload(JSON.stringify({ position: [1, 2, 3], orientation: [0, 0, 0, 1], time: 0 })),
    );

    const seen: unknown[] = [];
    const consumer = (async () => {
      for await (const u of stream) {
        seen.push(u);
        break;
      }
    })();
    await consumer;
    expect(seen).toHaveLength(1);
    stream.close();
  });

  it("close() undeclares all subscribers", async () => {
    const { session, undeclared } = makeSession();
    const stream = await createZenohPoseStream({
      session,
      vessels: [
        { vesselId: "ego", topic: "ego/pose" },
        { vesselId: "ferry", topic: "ferry/pose" },
      ],
    });
    stream.close();
    // close() fires undeclare in the background; give it a tick.
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));
    expect(undeclared.sort()).toEqual(["ego/pose", "ferry/pose"]);
  });
});
