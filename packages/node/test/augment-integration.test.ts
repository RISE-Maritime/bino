import { describe, expect, it } from "vitest";
import {
  MemoryPoseStream,
  PoseSampler,
  decodePoseEnvelope,
  decodeRadarSpokeEnvelope,
  encodeRadarSpoke,
  groundTruthTargets,
  teePoseStream,
  type Pose,
  type RadarFrame,
  type ZenohSampleLike,
  type ZenohSessionLike,
} from "@bino/core";
import { createRadarAugmenter } from "../src/radar-augmenter.js";

// End-to-end wiring of the inject-augment path WITHOUT GL: the real Three.js
// raycast is replaced by a fake renderRevolution that, like the real service
// closure, samples the shared PoseSampler at the revolution time. Everything
// else is the production code — teePoseStream feeding the sampler, the augmenter
// subscribing to a "real" radar_spoke stream, sample-at-spoke-time, per-rev
// render + azimuth index, merge, and republish. This is what proves the glue
// from cli.ts/service.ts holds together; the GL raycast itself is covered by the
// Docker/Xvfb smoke test.

// --- fakes mirroring the zenoh session surface the augmenter uses -------------

class FakeChannel {
  private buffer: ZenohSampleLike[] = [];
  private closed = false;
  push(bytes: Uint8Array): void {
    this.buffer.push({ payload: () => ({ toBytes: () => bytes }) });
  }
  close(): void {
    this.closed = true;
  }
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

const RANGE_M = 4000;
const BINS = 4;

const pose = (x: number): Pose => ({ position: [x, 0, 0], orientation: [0, 0, 0, 1] });

// Synthetic revolution of 2 spokes (az 0, az π); bin 0 carries `value`.
function synthFrame(time: number, value: number): RadarFrame {
  return {
    time,
    spokes: [0, Math.PI].map((azimuth) => ({
      azimuth,
      intensity: new Uint8Array([value, 0, 0, 0]),
      timestamp: 0,
    })),
  };
}

function realSpoke(azimuth: number, time: number): Uint8Array {
  return encodeRadarSpoke(
    { azimuth, intensity: new Uint8Array(BINS), range_m: RANGE_M, time, frameId: "real/radar" },
    "real/key",
  ).bytes;
}

describe("inject-augment integration (no GL)", () => {
  it("samples the ghost pose at each spoke's revolution time and merges it in", async () => {
    const sampler = new PoseSampler({ horizon_s: 100 });

    // Pose stream → tee → one branch feeds the sampler (exactly as cli.ts does).
    const source = new MemoryPoseStream();
    const [, samplerBranch] = teePoseStream(source);
    const samplerPump = (async () => {
      for await (const u of samplerBranch) sampler.record(u.entityId, u.pose, u.time);
    })();
    // Ego (radar host) sits at the origin; ghost moves along +X: x = 100 at t=0,
    // x = 200 at t=1 (so x = 100·(1+t)).
    source.push({ entityId: "ego", pose: pose(0), time: 0 });
    source.push({ entityId: "ego", pose: pose(0), time: 1 });
    source.push({ entityId: "ghost_target", pose: pose(100), time: 0 });
    source.push({ entityId: "ghost_target", pose: pose(200), time: 1 });
    source.close();
    await samplerPump; // sampler fully populated before spokes arrive

    // renderRevolution mirrors the service closure: sample the ghost at `time`
    // and turn its position into the synthetic return (bin 0 = round(x) mod 256).
    const renderTimes: number[] = [];
    const renderRevolution = (time: number): RadarFrame => {
      renderTimes.push(time);
      const gp = sampler.sample("ghost_target", time);
      const value = gp ? Math.round(gp.position[0]) % 256 : 0;
      return synthFrame(time, value);
    };

    const channel = new FakeChannel();
    const session: ZenohSessionLike = {
      declareSubscriber: async () => ({ receiver: () => channel, undeclare: async () => {} }),
    };
    const sent: Array<{ key: string; bytes: Uint8Array }> = [];
    // Ground truth mirrors the service closure: ego is the host, ghost is the
    // injected target; reduce to bow-relative range/bearing at the spoke time.
    const renderGroundTruth = (time: number) => {
      const ego = sampler.sample("ego", time);
      const ghost = sampler.sample("ghost_target", time);
      const host = { position: ego ? ego.position : ([0, 0, 0] as const), heading: 0 };
      const targets = ghost ? [{ id: "ghost_target", position: ghost.position }] : [];
      return groundTruthTargets(host, targets, RANGE_M);
    };
    const aug = createRadarAugmenter({
      session,
      publish: { put: async (key, bytes) => void sent.push({ key, bytes }) },
      realTopic: "real/key",
      publishTopic: "aug/key",
      fallbackGeom: { range_m: RANGE_M, range_bins: BINS, spokes_per_rev: 2 },
      renderRevolution,
      groundTruth: { topic: "gt/key", render: renderGroundTruth },
    });

    // Two revolutions, each two spokes (az 0 then π). A new rev starts when
    // azimuth wraps (0 < π), so each pair re-renders at its first spoke's time.
    // Rev 1 at t=0.5 → ghost x=150; rev 2 at t=0.8 → ghost x=180.
    channel.push(realSpoke(0, 0.5));
    channel.push(realSpoke(Math.PI, 0.55));
    channel.push(realSpoke(0, 0.8));
    channel.push(realSpoke(Math.PI, 0.85));
    channel.close();
    await aug.run();

    // Rendered once per revolution, at each rev's first-spoke time.
    expect(renderTimes).toEqual([0.5, 0.8]);

    const out = sent
      .filter((s) => s.key === "aug/key")
      .map((s) => decodeRadarSpokeEnvelope(s.bytes)!);
    expect(out).toHaveLength(4);
    // Rev 1 spokes carry the ghost sampled at t=0.5 (x=150); rev 2 at t=0.8 (x=180).
    expect(out[0]!.intensity[0]).toBe(150);
    expect(out[1]!.intensity[0]).toBe(150);
    expect(out[2]!.intensity[0]).toBe(180);
    expect(out[3]!.intensity[0]).toBe(180);
    // Merged spokes carry the real spoke's identity, not Bino's.
    expect(out[0]!.frameId).toBe("real/radar");
    expect(out[0]!.range).toBe(RANGE_M);
    expect(aug.stats.augmented).toBe(4);
    expect(aug.stats.forwarded).toBe(0);

    // Ground truth: one per revolution, the injected ghost at its true range
    // sampled at the SAME revolution time as the merged spokes (x = range, az 0).
    const gt = sent.filter((s) => s.key === "gt/key").map((s) => decodePoseEnvelope(s.bytes)!);
    expect(gt).toHaveLength(2);
    expect(gt[0]!.entityId).toBe("ghost_target");
    expect(gt[0]!.pose.position[0]).toBeCloseTo(150); // ghost x at t=0.5
    expect(gt[1]!.pose.position[0]).toBeCloseTo(180); // ghost x at t=0.8
    expect(aug.stats.groundTruth).toBe(2);
  });
});
