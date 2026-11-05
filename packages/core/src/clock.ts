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
  private _frameIndex = 0;

  now(): number {
    return this.t;
  }

  get frameIndex(): number {
    return this._frameIndex;
  }

  step(dt: number): void {
    this.t += dt;
    this._frameIndex++;
  }

  set(t: number): void {
    this.t = t;
  }

  reset(): void {
    this.t = 0;
    this._frameIndex = 0;
  }
}

export function createClock(kind: Modes["clock"]): Clock {
  switch (kind) {
    case "wall":
      return new WallClock();
    case "stepped":
    case "barrier":
      // A barrier clock is a stepped clock someone else steps: the runner
      // sets it to each fence's instant (ADR-0033).
      return new SteppedClock();
    case "external_fmi":
      throw new Error("external_fmi clock not yet supported (v0.1); use 'wall' or 'stepped'");
  }
}
