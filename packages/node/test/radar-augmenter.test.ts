import { describe, expect, it, vi } from "vitest";
import {
  encodeRadarSpoke,
  decodeRadarSpokeEnvelope,
  decodePoseEnvelope,
  type RadarFrame,
  type ZenohSessionLike,
  type ZenohSampleLike,
} from "@bino/core";
import { createRadarAugmenter, type RadarGeom } from "../src/radar-augmenter.js";

// --- fakes ----------------------------------------------------------------

class FakeChannel {
  private waiters: Array<(v: IteratorResult<ZenohSampleLike>) => void> = [];
  private buffer: ZenohSampleLike[] = [];
  private closed = false;
  push(bytes: Uint8Array): void {
    const sample: ZenohSampleLike = { payload: () => ({ toBytes: () => bytes }) };
    const w = this.waiters.shift();
    if (w) w({ value: sample, done: false });
    else this.buffer.push(sample);
  }
  close(): void {
    this.closed = true;
    while (this.waiters.length)
      this.waiters.shift()!({ value: undefined as unknown as ZenohSampleLike, done: true });
  }
  [Symbol.asyncIterator](): AsyncIterableIterator<ZenohSampleLike> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    return {
      next(): Promise<IteratorResult<ZenohSampleLike>> {
        const b = self.buffer.shift();
        if (b) return Promise.resolve({ value: b, done: false });
        if (self.closed)
          return Promise.resolve({ value: undefined as unknown as ZenohSampleLike, done: true });
        return new Promise((r) => self.waiters.push(r));
      },
      [Symbol.asyncIterator](): AsyncIterableIterator<ZenohSampleLike> {
        return this;
      },
    };
  }
}

function makeSession(): { session: ZenohSessionLike; channel: FakeChannel } {
  const channel = new FakeChannel();
  const session: ZenohSessionLike = {
    declareSubscriber: vi.fn(async () => ({
      receiver: () => channel,
      undeclare: async () => {},
    })),
  };
  return { session, channel };
}

function makePublish(): {
  put: (k: string, p: Uint8Array) => Promise<void>;
  sent: Array<{ key: string; bytes: Uint8Array }>;
} {
  const sent: Array<{ key: string; bytes: Uint8Array }> = [];
  return { put: async (key, bytes) => void sent.push({ key, bytes }), sent };
}

// Real spoke bytes on the wire, range/bins self-describing.
function realSpoke(azimuth: number, bins: number[], range_m: number, time: number): Uint8Array {
  return encodeRadarSpoke(
    { azimuth, intensity: new Uint8Array(bins), range_m, time, frameId: "real/radar" },
    "real/key",
  ).bytes;
}

// A synthetic revolution where every bin of every spoke holds `value`.
function synthFrame(time: number, spokes_per_rev: number, bins: number, value: number): RadarFrame {
  return {
    time,
    spokes: Array.from({ length: spokes_per_rev }, (_, i) => ({
      azimuth: (i / spokes_per_rev) * Math.PI * 2,
      intensity: new Uint8Array(bins).fill(value),
      timestamp: 0,
    })),
  };
}

const fallback: RadarGeom = { range_m: 1000, range_bins: 4, spokes_per_rev: 4 };

describe("createRadarAugmenter", () => {
  it("merges synthetic returns into real spokes and republishes on the augmented topic", async () => {
    const { session, channel } = makeSession();
    const publish = makePublish();
    const aug = createRadarAugmenter({
      session,
      publish,
      realTopic: "real/key",
      publishTopic: "aug/key",
      fallbackGeom: fallback,
      renderRevolution: () => synthFrame(0, 4, 4, 100),
    });

    // One revolution of 4 spokes; real bins are low so the merge shows synth=100.
    for (let i = 0; i < 4; i++) {
      channel.push(realSpoke((i / 4) * Math.PI * 2, [0, 0, 200, 0], 1000, i * 0.1));
    }
    channel.close();
    await aug.run();

    expect(publish.sent).toHaveLength(4);
    expect(publish.sent.every((s) => s.key === "aug/key")).toBe(true);
    const first = decodeRadarSpokeEnvelope(publish.sent[0]!.bytes)!;
    // bin-wise max(real=[0,0,200,0], synth=[100,100,100,100]) = [100,100,200,100]
    expect([...first.intensity]).toEqual([100, 100, 200, 100]);
    // carries the real spoke's frame_id and range
    expect(first.frameId).toBe("real/radar");
    expect(first.range).toBe(1000);
    expect(aug.stats.augmented).toBe(4);
    expect(aug.stats.forwarded).toBe(0);
  });

  it("re-renders once per revolution and derives spokes_per_rev + geometry from the stream", async () => {
    const { session, channel } = makeSession();
    const publish = makePublish();
    const renderRevolution = vi.fn((_t: number, _g: RadarGeom) => synthFrame(0, 4, 4, 10));
    const aug = createRadarAugmenter({
      session,
      publish,
      realTopic: "real/key",
      publishTopic: "aug/key",
      fallbackGeom: fallback,
      renderRevolution,
    });

    // Two full revolutions of 3 spokes each, real range 2000 / 4 bins.
    for (let rev = 0; rev < 2; rev++) {
      for (let i = 0; i < 3; i++) {
        channel.push(realSpoke((i / 3) * Math.PI * 2, [1, 1, 1, 1], 2000, rev + i * 0.1));
      }
    }
    channel.close();
    await aug.run();

    // One render per revolution (wrap detected at the start of each).
    expect(renderRevolution).toHaveBeenCalledTimes(2);
    // First rev uses fallback spokes_per_rev; geometry derived from the stream.
    expect(renderRevolution.mock.calls[0]![1]).toEqual({
      range_m: 2000,
      range_bins: 4,
      spokes_per_rev: 4,
    });
    // Second rev's spokes_per_rev is derived from the first completed rev (3).
    expect(renderRevolution.mock.calls[1]![1]!.spokes_per_rev).toBe(3);
  });

  it("co-publishes ground truth once per revolution on its own topic", async () => {
    const { session, channel } = makeSession();
    const publish = makePublish();
    const aug = createRadarAugmenter({
      session,
      publish,
      realTopic: "real/key",
      publishTopic: "aug/key",
      fallbackGeom: fallback,
      renderRevolution: () => synthFrame(0, 4, 4, 10),
      groundTruth: {
        topic: "gt/key",
        render: () => [{ id: "ghost", range_m: 500, azimuth: 0, height_m: 0 }],
      },
    });

    // Two revolutions of two spokes each (az 0 then π) → two wraps.
    for (let rev = 0; rev < 2; rev++) {
      channel.push(realSpoke(0, [1, 1, 1, 1], 1000, rev));
      channel.push(realSpoke(Math.PI, [1, 1, 1, 1], 1000, rev + 0.1));
    }
    channel.close();
    await aug.run();

    const gt = publish.sent.filter((s) => s.key === "gt/key");
    expect(gt).toHaveLength(2); // once per revolution, not per spoke
    const d = decodePoseEnvelope(gt[0]!.bytes)!;
    expect(d.entityId).toBe("ghost");
    expect(d.pose.position[0]).toBeCloseTo(500); // azimuth 0 → x = range
    expect(aug.stats.groundTruth).toBe(2);
    // spokes still go to the augmented topic, separately
    expect(publish.sent.filter((s) => s.key === "aug/key")).toHaveLength(4);
  });

  it("forwards real spokes unchanged when no synthetic data is available (keep-up fallback)", async () => {
    const { session, channel } = makeSession();
    const publish = makePublish();
    const aug = createRadarAugmenter({
      session,
      publish,
      realTopic: "real/key",
      publishTopic: "aug/key",
      fallbackGeom: fallback,
      renderRevolution: () => ({ time: 0, spokes: [] }), // empty → no synth spoke
    });

    channel.push(realSpoke(0, [7, 7, 7, 7], 1000, 0));
    channel.close();
    await aug.run();

    expect(publish.sent).toHaveLength(1);
    const out = decodeRadarSpokeEnvelope(publish.sent[0]!.bytes)!;
    expect([...out.intensity]).toEqual([7, 7, 7, 7]); // unchanged
    expect(aug.stats.augmented).toBe(0);
    expect(aug.stats.forwarded).toBe(1);
  });

  it("falls back to real-only when the renderer throws", async () => {
    const { session, channel } = makeSession();
    const publish = makePublish();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const aug = createRadarAugmenter({
      session,
      publish,
      realTopic: "real/key",
      publishTopic: "aug/key",
      fallbackGeom: fallback,
      renderRevolution: () => {
        throw new Error("gl context lost");
      },
    });

    channel.push(realSpoke(0, [3, 3, 3, 3], 1000, 0));
    channel.close();
    await aug.run();

    const out = decodeRadarSpokeEnvelope(publish.sent[0]!.bytes)!;
    expect([...out.intensity]).toEqual([3, 3, 3, 3]);
    expect(aug.stats.forwarded).toBe(1);
    warn.mockRestore();
  });
});
