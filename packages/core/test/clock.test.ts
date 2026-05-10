import { describe, expect, it } from "vitest";
import { WallClock, SteppedClock, createClock } from "../src/clock.js";

describe("WallClock", () => {
  it("returns ~0 right after construction", () => {
    const clock = new WallClock();
    expect(clock.now()).toBeGreaterThanOrEqual(0);
    expect(clock.now()).toBeLessThan(0.05);
  });

  it("advances over a small delay", async () => {
    const clock = new WallClock();
    const t0 = clock.now();
    await new Promise((r) => setTimeout(r, 20));
    expect(clock.now()).toBeGreaterThan(t0);
  });
});

describe("SteppedClock", () => {
  it("starts at 0", () => {
    expect(new SteppedClock().now()).toBe(0);
  });

  it("step(dt) advances time", () => {
    const clock = new SteppedClock();
    clock.step(0.1);
    clock.step(0.2);
    expect(clock.now()).toBeCloseTo(0.3);
  });

  it("set(t) overrides time", () => {
    const clock = new SteppedClock();
    clock.step(5);
    clock.set(100);
    expect(clock.now()).toBe(100);
  });

  it("frameIndex increments with step()", () => {
    const clock = new SteppedClock();
    clock.step(0.1);
    clock.step(0.1);
    clock.step(0.1);
    expect(clock.frameIndex).toBe(3);
  });

  it("frameIndex does not increment with set()", () => {
    const clock = new SteppedClock();
    clock.step(0.1);
    clock.set(5.0);
    expect(clock.frameIndex).toBe(1);
  });

  it("reset() zeroes both time and frameIndex", () => {
    const clock = new SteppedClock();
    clock.step(0.1);
    clock.step(0.2);
    clock.reset();
    expect(clock.now()).toBe(0);
    expect(clock.frameIndex).toBe(0);
  });
});

describe("createClock", () => {
  it("returns a WallClock for 'wall'", () => {
    expect(createClock("wall")).toBeInstanceOf(WallClock);
  });

  it("returns a SteppedClock for 'stepped'", () => {
    expect(createClock("stepped")).toBeInstanceOf(SteppedClock);
  });

  it("throws for 'external_fmi' (v0.1 not supported)", () => {
    expect(() => createClock("external_fmi")).toThrow(/external_fmi/);
  });
});
