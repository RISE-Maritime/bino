import { describe, expect, it, vi } from "vitest";
import {
  decodePointCloudEnvelope,
  decodePointCloudPayload,
  encodePointCloudPayload,
  type LidarFrame,
  type PointCloudField,
  type ZenohSampleLike,
  type ZenohSessionLike,
} from "@bino/core";
import { createLidarAugmenter } from "../src/lidar-augmenter.js";

class FakeChannel {
  private buffer: ZenohSampleLike[] = [];
  push(bytes: Uint8Array): void {
    this.buffer.push({ payload: () => ({ toBytes: () => bytes }) });
  }
  close(): void {}
  [Symbol.asyncIterator](): AsyncIterableIterator<ZenohSampleLike> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    return {
      next(): Promise<IteratorResult<ZenohSampleLike>> {
        const b = self.buffer.shift();
        if (b) return Promise.resolve({ value: b, done: false });
        return Promise.resolve({ value: undefined as unknown as ZenohSampleLike, done: true });
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
    declareSubscriber: vi.fn(async () => ({ receiver: () => channel, undeclare: async () => {} })),
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

const F32 = 7; // PackedElementField_NumericType.FLOAT32
const xyziFields: PointCloudField[] = [
  { name: "x", offset: 0, type: F32 },
  { name: "y", offset: 4, type: F32 },
  { name: "z", offset: 8, type: F32 },
  { name: "intensity", offset: 12, type: 1 /* UINT8 */ },
];

// A real cloud (stride 16) with one point at (1,2,3) and intensity 200.
function realCloud(time: number, fields = xyziFields, stride = 16): Uint8Array {
  const data = new Uint8Array(stride);
  const v = new DataView(data.buffer);
  v.setFloat32(0, 1, true);
  v.setFloat32(4, 2, true);
  if (stride >= 12) v.setFloat32(8, 3, true);
  if (stride >= 16) v.setUint8(12, 200);
  return encodePointCloudPayload(
    { data, pointStride: stride, fields, frameId: "real/lidar", time },
    "real/key",
  ).bytes;
}

function synthFrame(time: number, pts: number[]): LidarFrame {
  return { points: new Float32Array(pts), count: pts.length / 3, time };
}

describe("createLidarAugmenter", () => {
  it("concatenates synthetic points into the real cloud, preserving real fields", async () => {
    const { session, channel } = makeSession();
    const publish = makePublish();
    const aug = createLidarAugmenter({
      session,
      publish,
      realTopic: "real/key",
      publishTopic: "aug/key",
      renderFrame: (t) => synthFrame(t, [10, 11, 12, 20, 21, 22]),
    });
    channel.push(realCloud(2.5));
    channel.close();
    await aug.run();

    expect(publish.sent).toHaveLength(1);
    expect(publish.sent[0]!.key).toBe("aug/key");
    const raw = decodePointCloudPayload(publish.sent[0]!.bytes)!;
    expect(raw.frameId).toBe("real/lidar"); // merged stream keeps the real frame
    expect(raw.time).toBeCloseTo(2.5);
    expect(raw.pointStride).toBe(16); // real layout preserved
    // real intensity survives at the first point
    expect(new DataView(raw.data.buffer, raw.data.byteOffset).getUint8(12)).toBe(200);

    const xyz = decodePointCloudEnvelope(publish.sent[0]!.bytes)!;
    expect(xyz.count).toBe(3); // 1 real + 2 synthetic
    expect([...xyz.points.slice(0, 3)]).toEqual([1, 2, 3]);
    expect([...xyz.points.slice(3, 9)]).toEqual([10, 11, 12, 20, 21, 22]);
    expect(aug.stats.augmented).toBe(1);
    expect(aug.stats.forwarded).toBe(0);
  });

  it("forwards the real cloud unchanged when the renderer throws", async () => {
    const { session, channel } = makeSession();
    const publish = makePublish();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const aug = createLidarAugmenter({
      session,
      publish,
      realTopic: "real/key",
      publishTopic: "aug/key",
      renderFrame: () => {
        throw new Error("gl context lost");
      },
    });
    channel.push(realCloud(1));
    channel.close();
    await aug.run();

    const xyz = decodePointCloudEnvelope(publish.sent[0]!.bytes)!;
    expect(xyz.count).toBe(1); // real only
    expect(aug.stats.forwarded).toBe(1);
    warn.mockRestore();
  });

  it("forwards (does not render) when the real cloud has no float32 xyz", async () => {
    const { session, channel } = makeSession();
    const publish = makePublish();
    const render = vi.fn(() => synthFrame(0, [9, 9, 9]));
    const aug = createLidarAugmenter({
      session,
      publish,
      realTopic: "real/key",
      publishTopic: "aug/key",
      renderFrame: render,
    });
    // fields lack 'z' → cannot pack synthetic points safely
    const badFields: PointCloudField[] = [
      { name: "x", offset: 0, type: F32 },
      { name: "y", offset: 4, type: F32 },
    ];
    channel.push(realCloud(1, badFields, 8));
    channel.close();
    await aug.run();

    expect(render).not.toHaveBeenCalled(); // offset check fails before render
    expect(aug.stats.forwarded).toBe(1);
    expect(aug.stats.augmented).toBe(0);
  });
});
