import { describe, expect, it, vi } from "vitest";
import { compileScenario } from "../src/compile.js";
import { Keelson } from "../src/dsl.js";

const minimal = (overrides: Record<string, unknown> = {}) => ({
  name: "minimal",
  anchor: { lat: 54.3233, lon: 10.1394, height: 0 },
  vessels: [
    {
      id: "ego",
      model: "tanker_120m",
      pose_source: { type: "zenoh", topic: "ego/pose" },
      sensors: [],
    },
  ],
  modes: { rendering: "replace", clock: "wall", determinism: "relaxed" },
  keelson: { base_path: "bino" },
  ...overrides,
});

describe("compileScenario", () => {
  it("validates and returns a typed scene", () => {
    const scene = compileScenario(minimal());
    expect(scene.name).toBe("minimal");
    expect(scene.vessels).toHaveLength(1);
  });

  it("throws on invalid input", () => {
    expect(() => compileScenario({ name: "broken" })).toThrow();
  });

  it("requires a keelson base_path — no default (ADR-004)", () => {
    expect(() => Keelson.parse({})).toThrow();
    const noKeelson = minimal();
    delete (noKeelson as Record<string, unknown>).keelson;
    expect(() => compileScenario(noKeelson)).toThrow();
  });

  it("carries the keelson base_path through to the compiled scene", () => {
    const scene = compileScenario(minimal({ keelson: { base_path: "myorg" } }));
    expect(scene.keelson.base_path).toBe("myorg");
  });

  it("throws when strict determinism is combined with wall clock", () => {
    expect(() =>
      compileScenario(
        minimal({ modes: { rendering: "replace", clock: "wall", determinism: "strict" } }),
      ),
    ).toThrow("strict determinism requires stepped clock (got 'wall')");
  });

  it("throws when strict determinism is combined with external_fmi clock", () => {
    expect(() =>
      compileScenario(
        minimal({ modes: { rendering: "replace", clock: "external_fmi", determinism: "strict" } }),
      ),
    ).toThrow("strict determinism requires stepped clock (got 'external_fmi')");
  });

  it("accepts strict determinism with stepped clock", () => {
    const scene = compileScenario(
      minimal({ modes: { rendering: "replace", clock: "stepped", determinism: "strict" } }),
    );
    expect(scene.modes.determinism).toBe("strict");
    expect(scene.modes.clock).toBe("stepped");
  });

  it("warns when inject mode is used without strict determinism", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      compileScenario(
        minimal({ modes: { rendering: "inject", clock: "wall", determinism: "relaxed" } }),
      );
      expect(warnSpy).toHaveBeenCalledWith(
        "[bino] inject mode without strict determinism is unusual — inject typically requires tight time-sync",
      );
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("does not warn for inject mode with strict determinism", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      compileScenario(
        minimal({ modes: { rendering: "inject", clock: "stepped", determinism: "strict" } }),
      );
      expect(warnSpy).not.toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });
});
