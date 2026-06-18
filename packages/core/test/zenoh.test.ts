import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { createZenohPoseStream, type ZenohSessionLike } from "../src/zenoh.js";
import { encodePoseUpdate, navTopicKeys } from "../src/keelson.js";
import { encodePayloadFromTypeName, enclose, Envelope } from "../src/keelson-sdk.js";
import type { PoseUpdate } from "../src/pose.js";
import type { Anchor } from "../src/dsl.js";

interface FakeSample {
  payload: () => { toBytes: () => Uint8Array };
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
    while (this.waiters.length)
      this.waiters.shift()!({ value: undefined as unknown as FakeSample, done: true });
  }
  [Symbol.asyncIterator](): AsyncIterableIterator<FakeSample> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    return {
      next(): Promise<IteratorResult<FakeSample>> {
        const buffered = self.buffer.shift();
        if (buffered) return Promise.resolve({ value: buffered, done: false });
        if (self.closed)
          return Promise.resolve({ value: undefined as unknown as FakeSample, done: true });
        return new Promise((r) => self.waiters.push(r));
      },
      [Symbol.asyncIterator](): AsyncIterableIterator<FakeSample> {
        return this;
      },
    };
  }
}

function makeSession(): {
  session: ZenohSessionLike;
  channels: Map<string, FakeChannel>;
  undeclared: string[];
} {
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

function bytesPayload(bytes: Uint8Array): FakeSample {
  return { payload: () => ({ toBytes: () => bytes }) };
}

function poseEnvelope(update: PoseUpdate): Uint8Array {
  return encodePoseUpdate(update).bytes;
}

describe("createZenohPoseStream", () => {
  it("yields PoseUpdates from a single subscriber", async () => {
    const { session, channels } = makeSession();
    const stream = await createZenohPoseStream({
      session,
      vessels: [{ vesselId: "ego", topic: "bino/@v0/ego/pubsub/frame_transform/sim" }],
    });

    channels.get("bino/@v0/ego/pubsub/frame_transform/sim")!.push(
      bytesPayload(
        poseEnvelope({
          entityId: "ego",
          pose: { position: [1, 2, 3], orientation: [0, 0, 0, 1] },
          time: 0.1,
        }),
      ),
    );

    const seen: PoseUpdate[] = [];
    const consumer = (async () => {
      for await (const u of stream) {
        seen.push(u);
        if (seen.length === 1) break;
      }
    })();
    await consumer;

    expect(seen).toHaveLength(1);
    expect(seen[0]!.entityId).toBe("ego");
    expect(seen[0]!.pose.position[0]).toBeCloseTo(1);
    expect(seen[0]!.pose.position[1]).toBeCloseTo(2);
    expect(seen[0]!.pose.position[2]).toBeCloseTo(3);
    expect(seen[0]!.time).toBeCloseTo(0.1, 3);
    stream.close();
  });

  it("merges multiple subscribers and tags by topic-side vesselId", async () => {
    const { session, channels } = makeSession();
    const stream = await createZenohPoseStream({
      session,
      vessels: [
        { vesselId: "ego", topic: "bino/@v0/ego/pubsub/frame_transform/sim" },
        { vesselId: "ferry", topic: "bino/@v0/ferry/pubsub/frame_transform/sim" },
      ],
    });

    channels.get("bino/@v0/ferry/pubsub/frame_transform/sim")!.push(
      bytesPayload(
        poseEnvelope({
          entityId: "ferry",
          pose: { position: [10, 0, 0], orientation: [0, 0, 0, 1] },
          time: 1,
        }),
      ),
    );
    channels.get("bino/@v0/ego/pubsub/frame_transform/sim")!.push(
      bytesPayload(
        poseEnvelope({
          entityId: "ego",
          pose: { position: [0, 0, 0], orientation: [0, 0, 0, 1] },
          time: 1,
        }),
      ),
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

  it("overrides decoded entityId with the topic-side vesselId", async () => {
    // Even if a misconfigured publisher writes child_frame_id="other"
    // into a topic for vessel "ego", the subscriber tags by topic.
    const { session, channels } = makeSession();
    const stream = await createZenohPoseStream({
      session,
      vessels: [{ vesselId: "ego", topic: "bino/@v0/ego/pubsub/frame_transform/sim" }],
    });
    channels.get("bino/@v0/ego/pubsub/frame_transform/sim")!.push(
      bytesPayload(
        poseEnvelope({
          entityId: "WRONG_FRAME_ID",
          pose: { position: [1, 2, 3], orientation: [0, 0, 0, 1] },
          time: 0,
        }),
      ),
    );

    const seen: PoseUpdate[] = [];
    const consumer = (async () => {
      for await (const u of stream) {
        seen.push(u);
        break;
      }
    })();
    await consumer;
    expect(seen[0]!.entityId).toBe("ego");
    stream.close();
  });

  it("silently drops malformed payloads", async () => {
    const { session, channels } = makeSession();
    const stream = await createZenohPoseStream({
      session,
      vessels: [{ vesselId: "ego", topic: "bino/@v0/ego/pubsub/frame_transform/sim" }],
    });

    channels
      .get("bino/@v0/ego/pubsub/frame_transform/sim")!
      .push(bytesPayload(new Uint8Array([1, 2, 3]))); // garbage
    channels.get("bino/@v0/ego/pubsub/frame_transform/sim")!.push(
      bytesPayload(
        poseEnvelope({
          entityId: "ego",
          pose: { position: [1, 2, 3], orientation: [0, 0, 0, 1] },
          time: 0,
        }),
      ),
    );

    const seen: PoseUpdate[] = [];
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
        { vesselId: "ego", topic: "bino/@v0/ego/pubsub/frame_transform/sim" },
        { vesselId: "ferry", topic: "bino/@v0/ferry/pubsub/frame_transform/sim" },
      ],
    });
    stream.close();
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));
    expect(undeclared.sort()).toEqual([
      "bino/@v0/ego/pubsub/frame_transform/sim",
      "bino/@v0/ferry/pubsub/frame_transform/sim",
    ]);
  });
});

describe("createZenohPoseStream — decomposed nav", () => {
  const anchor: Anchor = { lat: 54.32, lon: 10.14, height: 0 };
  const keys = navTopicKeys({ base_path: "keelson", entity_id: "vessel", source_id: "gnss" });

  function navEnvelope(typeName: string, payload: object, t: number): Uint8Array {
    const at = new Date(t * 1000);
    const payloadBytes = encodePayloadFromTypeName(typeName, { ...payload, timestamp: at })!;
    return Envelope.encode(enclose(payloadBytes, at)).finish();
  }
  const locFix = (lat: number, lon: number, alt: number, t: number): FakeSample =>
    bytesPayload(
      navEnvelope(
        "foxglove.LocationFix",
        { frameId: "gnss", latitude: lat, longitude: lon, altitude: alt },
        t,
      ),
    );
  const floatVal = (value: number, t: number): FakeSample =>
    bytesPayload(navEnvelope("keelson.TimestampedFloat", { value }, t));

  const tick = (): Promise<void> => new Promise((r) => setImmediate(r));

  it("subscribes to all four nav subjects and projects location_fix into a pose", async () => {
    const { session, channels } = makeSession();
    const stream = await createZenohPoseStream({
      session,
      nav: [{ vesselId: "ego", keys }],
      anchor,
    });

    // All four subject keys were declared.
    for (const k of [keys.locationFix, keys.heading, keys.pitch, keys.roll]) {
      expect(channels.has(k)).toBe(true);
    }

    // ~100 m north of the anchor → −Z, default heading (North) before any heading.
    channels.get(keys.locationFix)!.push(locFix(54.32 + 100 / 111_320, 10.14, 0, 5));
    const consumer = (async () => {
      for await (const u of stream) return u;
    })();
    const u = (await consumer)!;
    expect(u.entityId).toBe("ego");
    expect(u.time).toBeCloseTo(5, 3);
    expect(u.pose.position[2]).toBeLessThan(0); // north → −Z
    stream.close();
  });

  it("fuses the latest heading into the pose (location_fix triggers)", async () => {
    const { session, channels } = makeSession();
    const stream = await createZenohPoseStream({
      session,
      nav: [{ vesselId: "ego", keys }],
      anchor,
    });

    channels.get(keys.heading)!.push(floatVal(90, 0.9)); // heading East
    await tick();
    await tick(); // let the heading pump apply setHeading before the fix
    channels.get(keys.locationFix)!.push(locFix(54.32, 10.14, 0, 1));

    const consumer = (async () => {
      for await (const u of stream) return u;
    })();
    const u = (await consumer)!;
    const bow = new THREE.Vector3(1, 0, 0).applyQuaternion(
      new THREE.Quaternion(...(u.pose.orientation as [number, number, number, number])),
    );
    expect(bow.x).toBeCloseTo(1, 3); // bow points East
    stream.close();
  });
});
