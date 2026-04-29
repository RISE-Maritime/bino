import { describe, expect, it } from "vitest";
import { Scenario, type Environment } from "../src/dsl.js";
import { compileScenario } from "../src/compile.js";
import { makeEnvironmentSnapshot } from "../src/env.js";

const baseScenario = {
  name: "env-test",
  anchor: { lat: 54.32, lon: 10.14, height: 0 },
  vessels: [
    {
      id: "ego",
      model: "tanker_120m",
      pose_source: { type: "zenoh" as const, topic: "ego/pose" },
      sensors: [],
    },
  ],
  modes: { rendering: "replace", clock: "wall", determinism: "relaxed" },
};

describe("DSL environment block", () => {
  it("accepts the design-vision environment example", () => {
    const result = Scenario.parse({
      ...baseScenario,
      environment: {
        sea_state: {
          significant_wave_height: 1.2,
          peak_period: 6.5,
          direction_deg: 215,
          spectrum: "pierson_moskowitz",
        },
        wind: { speed: 8.5, direction_deg: 220 },
        time_of_day: "20:30",
        visibility_m: 8000,
      },
    });
    expect(result.environment.sea_state?.significant_wave_height).toBe(1.2);
    expect(result.environment.wind?.speed).toBe(8.5);
    expect(result.environment.time_of_day).toBe("20:30");
    expect(result.environment.visibility_m).toBe(8000);
  });

  it("backwards-compat: scenarios without environment validate with defaults", () => {
    const result = Scenario.parse(baseScenario);
    expect(result.environment).toBeDefined();
    expect(result.environment.time_of_day).toBe("12:00");
    expect(result.environment.visibility_m).toBeGreaterThan(0);
    // sea_state and wind are optional within environment — undefined when omitted.
    expect(result.environment.sea_state).toBeUndefined();
    expect(result.environment.wind).toBeUndefined();
  });

  it("sea_state.spectrum defaults to 'pierson_moskowitz'", () => {
    const result = Scenario.parse({
      ...baseScenario,
      environment: {
        sea_state: { significant_wave_height: 0.5, peak_period: 4, direction_deg: 0 },
      },
    });
    expect(result.environment.sea_state?.spectrum).toBe("pierson_moskowitz");
  });

  it("rejects invalid time_of_day format", () => {
    expect(() =>
      Scenario.parse({ ...baseScenario, environment: { time_of_day: "not-a-time" } }),
    ).toThrow();
  });

  it("rejects negative wave height", () => {
    expect(() =>
      Scenario.parse({
        ...baseScenario,
        environment: {
          sea_state: { significant_wave_height: -1, peak_period: 4, direction_deg: 0 },
        },
      }),
    ).toThrow();
  });
});

describe("compileScenario environment passthrough", () => {
  it("CompiledScene exposes the parsed environment", () => {
    const compiled = compileScenario({
      ...baseScenario,
      environment: { time_of_day: "08:00", visibility_m: 5000 },
    });
    expect(compiled.environment.time_of_day).toBe("08:00");
    expect(compiled.environment.visibility_m).toBe(5000);
  });
});

describe("EnvironmentSnapshot", () => {
  it("wraps a static environment + scene time", () => {
    const env: Environment = {
      time_of_day: "12:00",
      visibility_m: 20000,
    };
    const snap = makeEnvironmentSnapshot(env, 42.5);
    expect(snap.time).toBe(42.5);
    expect(snap.environment).toBe(env);
  });
});
