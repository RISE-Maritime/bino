import { describe, expect, it } from "vitest";
import {
  groundTruthTargets,
  mergeSpokeIntensity,
  nearestSpokeByAzimuth,
} from "../src/radar-augment.js";
import { encodeGroundTruth, decodePoseEnvelope } from "../src/keelson.js";
import type { RadarFrame, RadarSpoke } from "../src/radar.js";

const grid = (intensity: number[], range_m: number) => ({
  intensity: new Uint8Array(intensity),
  range_m,
});

describe("mergeSpokeIntensity", () => {
  it("element-wise max on identical grids", () => {
    const out = mergeSpokeIntensity(grid([10, 0, 200, 5], 100), grid([0, 50, 100, 5], 100));
    expect([...out]).toEqual([10, 50, 200, 5]);
  });

  it("leaves real untouched when synthetic is empty", () => {
    const out = mergeSpokeIntensity(grid([1, 2, 3], 100), grid([], 100));
    expect([...out]).toEqual([1, 2, 3]);
  });

  it("does not mutate the real input buffer", () => {
    const real = grid([0, 0, 0], 100);
    mergeSpokeIntensity(real, grid([9, 9, 9], 100));
    expect([...real.intensity]).toEqual([0, 0, 0]);
  });

  it("resamples synthetic onto a finer real grid by range", () => {
    // synthetic: 2 bins over 100 m → bin0=[0,50), bin1=[50,100)
    // real: 4 bins over 100 m → centres 12.5, 37.5, 62.5, 87.5 m
    const out = mergeSpokeIntensity(grid([0, 0, 0, 0], 100), grid([80, 200], 100));
    // first two real bins fall in synth bin0 (80), last two in synth bin1 (200)
    expect([...out]).toEqual([80, 80, 200, 200]);
  });

  it("gives no synthetic contribution beyond synthetic max range", () => {
    // real spans 200 m, synthetic only 100 m → real bins past 100 m stay real-only
    const out = mergeSpokeIntensity(grid([1, 1, 1, 1], 200), grid([255, 255], 100));
    // real bin centres: 25, 75, 125, 175 m. Only first two within synth range.
    expect([...out]).toEqual([255, 255, 1, 1]);
  });
});

describe("nearestSpokeByAzimuth", () => {
  const mkFrame = (n: number): RadarFrame => ({
    time: 0,
    spokes: Array.from(
      { length: n },
      (_, i): RadarSpoke => ({
        azimuth: (i / n) * Math.PI * 2,
        intensity: new Uint8Array([i]),
        timestamp: 0,
      }),
    ),
  });

  it("returns undefined for an empty frame", () => {
    expect(nearestSpokeByAzimuth({ time: 0, spokes: [] }, 1)).toBeUndefined();
  });

  it("indexes the evenly-spaced spoke nearest an azimuth", () => {
    const f = mkFrame(360);
    expect(nearestSpokeByAzimuth(f, 0)!.intensity[0]).toBe(0);
    // azimuth for index 90 is 90/360*2π = π/2
    expect(nearestSpokeByAzimuth(f, Math.PI / 2)!.intensity[0]).toBe(90);
    // nearest-rounds to the closest index
    expect(nearestSpokeByAzimuth(f, (90.4 / 360) * Math.PI * 2)!.intensity[0]).toBe(90);
    expect(nearestSpokeByAzimuth(f, (90.6 / 360) * Math.PI * 2)!.intensity[0]).toBe(91);
  });

  it("wraps negative and >2π azimuths", () => {
    const f = mkFrame(360);
    expect(nearestSpokeByAzimuth(f, -Math.PI * 2)!.intensity[0]).toBe(0);
    expect(nearestSpokeByAzimuth(f, Math.PI * 2)!.intensity[0]).toBe(0);
    expect(nearestSpokeByAzimuth(f, Math.PI * 2 + Math.PI / 2)!.intensity[0]).toBe(90);
  });
});

describe("groundTruthTargets", () => {
  const host0 = { position: [0, 0, 0] as const, heading: 0 };

  it("computes range, bow-relative bearing and height in the kernel's convention", () => {
    const out = groundTruthTargets(
      host0,
      [
        { id: "ahead", position: [100, 5, 0] }, // +x → azimuth 0
        { id: "starboard", position: [0, 0, 100] }, // +z → azimuth π/2
      ],
      4000,
    );
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ id: "ahead", range_m: 100, azimuth: 0, height_m: 5 });
    expect(out[1]!.range_m).toBeCloseTo(100);
    expect(out[1]!.azimuth).toBeCloseTo(Math.PI / 2);
  });

  it("subtracts host heading so bearing is bow-relative", () => {
    // Host pointing +z (heading π/2); a target on +z is dead ahead → azimuth 0.
    const out = groundTruthTargets(
      { position: [0, 0, 0], heading: Math.PI / 2 },
      [{ id: "t", position: [0, 0, 100] }],
      4000,
    );
    expect(out[0]!.azimuth).toBeCloseTo(0);
  });

  it("drops targets beyond max range", () => {
    const out = groundTruthTargets(host0, [{ id: "far", position: [5000, 0, 0] }], 4000);
    expect(out).toHaveLength(0);
  });
});

describe("encodeGroundTruth", () => {
  it("encodes one FrameTransform per target with bow-relative cartesian position", () => {
    const topics = encodeGroundTruth(
      [
        { id: "ghost", range_m: 100, azimuth: 0, height_m: 5 },
        { id: "ghost2", range_m: 200, azimuth: Math.PI / 2, height_m: 0 },
      ],
      12.5,
      "real/sensor",
      "gt/key",
    );
    expect(topics).toHaveLength(2);
    expect(topics.every((t) => t.keyExpr === "gt/key")).toBe(true);

    const a = decodePoseEnvelope(topics[0]!.bytes)!;
    expect(a.entityId).toBe("ghost");
    expect(a.time).toBeCloseTo(12.5);
    // azimuth 0 → x=range, y=0; height in z
    expect(a.pose.position[0]).toBeCloseTo(100);
    expect(a.pose.position[1]).toBeCloseTo(0);
    expect(a.pose.position[2]).toBeCloseTo(5);

    const b = decodePoseEnvelope(topics[1]!.bytes)!;
    expect(b.entityId).toBe("ghost2");
    // azimuth π/2 → x≈0, y=range
    expect(b.pose.position[0]).toBeCloseTo(0);
    expect(b.pose.position[1]).toBeCloseTo(200);
  });
});
