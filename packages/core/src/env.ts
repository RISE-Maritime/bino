import type { Environment } from "./dsl.js";

/**
 * Per-tick payload that the runner produces from the scenario's
 * static `environment` block plus any time-varying state. v0.4a
 * holds environment static across the run; v0.5+ may animate
 * (wind picks up over a scenario, sea state escalates, etc.).
 *
 * Sensor kernels that care about environment grow an
 * `EnvironmentSnapshot` argument alongside the existing scene
 * snapshot. v0.4a kernels don't yet read it; v1.0's radar
 * sea-clutter model is the first concrete consumer (see the
 * env-modelling cross-cutting thread in docs/plan.md).
 */
export interface EnvironmentSnapshot {
  /** Scene time in seconds at the moment the snapshot was produced. */
  time: number;
  /** Static environment config from the scenario. Held by reference;
   *  v0.4a doesn't mutate. */
  environment: Environment;
}

export function makeEnvironmentSnapshot(
  environment: Environment,
  time: number,
): EnvironmentSnapshot {
  return { time, environment };
}
