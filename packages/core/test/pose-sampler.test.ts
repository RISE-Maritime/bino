import { describe, expect, it } from "vitest";
import { PoseSampler } from "../src/pose-sampler.js";
import type { Pose } from "../src/sensor.js";

const pose = (x: number, q: [number, number, number, number] = [0, 0, 0, 1]): Pose => ({
  position: [x, 0, 0],
  orientation: q,
});

describe("PoseSampler", () => {
  it("returns undefined for an unknown entity", () => {
    expect(new PoseSampler().sample("ego", 0)).toBeUndefined();
  });

  it("returns the single sample regardless of time", () => {
    const s = new PoseSampler();
    s.record("ego", pose(5), 10);
    expect(s.sample("ego", 0)!.position[0]).toBe(5);
    expect(s.sample("ego", 99)!.position[0]).toBe(5);
  });

  it("interpolates position linearly at the requested time", () => {
    const s = new PoseSampler();
    s.record("ego", pose(0), 0);
    s.record("ego", pose(10), 1);
    expect(s.sample("ego", 0.25)!.position[0]).toBeCloseTo(2.5);
    expect(s.sample("ego", 0.5)!.position[0]).toBeCloseTo(5);
  });

  it("holds at the ends instead of extrapolating", () => {
    const s = new PoseSampler();
    s.record("ego", pose(0), 0);
    s.record("ego", pose(10), 1);
    expect(s.sample("ego", -5)!.position[0]).toBe(0);
    expect(s.sample("ego", 5)!.position[0]).toBe(10);
  });

  it("slerps orientation between samples", () => {
    const s = new PoseSampler();
    // identity → 90° about Z
    const half = Math.SQRT1_2;
    s.record("ego", pose(0, [0, 0, 0, 1]), 0);
    s.record("ego", pose(0, [0, 0, half, half]), 1);
    const mid = s.sample("ego", 0.5)!.orientation;
    // halfway is 45° about Z → (0,0,sin22.5,cos22.5)
    expect(mid[2]).toBeCloseTo(Math.sin(Math.PI / 8));
    expect(mid[3]).toBeCloseTo(Math.cos(Math.PI / 8));
  });

  it("samples the right bracket among many", () => {
    const s = new PoseSampler({ horizon_s: 100 });
    for (let i = 0; i <= 10; i++) s.record("ego", pose(i * 10), i);
    expect(s.sample("ego", 3.5)!.position[0]).toBeCloseTo(35);
    expect(s.sample("ego", 7.2)!.position[0]).toBeCloseTo(72);
  });

  it("inserts out-of-order arrivals in time order", () => {
    const s = new PoseSampler();
    s.record("ego", pose(0), 0);
    s.record("ego", pose(20), 2);
    s.record("ego", pose(10), 1); // arrives late
    expect(s.sample("ego", 1.5)!.position[0]).toBeCloseTo(15);
  });

  it("trims history beyond the horizon", () => {
    const s = new PoseSampler({ horizon_s: 2 });
    for (let i = 0; i <= 10; i++) s.record("ego", pose(i), i);
    // Newest is t=10, horizon 2 → cutoff 8. Old samples are trimmed; one sample
    // just before the cutoff is kept so interpolation across it still works.
    // Sampling at t=0 holds at the oldest retained sample (≈7), not pose(0).
    const old = s.sample("ego", 0)!.position[0];
    expect(old).toBeGreaterThanOrEqual(7);
    expect(old).toBeLessThan(9);
  });
});
