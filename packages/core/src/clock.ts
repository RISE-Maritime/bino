import type { Modes } from "./dsl.js";

export interface Clock {
  now(): number;
}

export class WallClock implements Clock {
  private readonly start: number;
  constructor() {
    this.start = performance.now();
  }
  now(): number {
    return (performance.now() - this.start) / 1000;
  }
}

export class SteppedClock implements Clock {
  private t = 0;
  now(): number {
    return this.t;
  }
  step(dt: number): void {
    this.t += dt;
  }
  set(t: number): void {
    this.t = t;
  }
}

export function createClock(kind: Modes["clock"]): Clock {
  switch (kind) {
    case "wall":
      return new WallClock();
    case "stepped":
      return new SteppedClock();
    case "external_fmi":
      throw new Error(
        "external_fmi clock not yet supported (v0.1); use 'wall' or 'stepped'",
      );
  }
}
