import { describe, expect, it } from "vitest";
import { compileScenario } from "../src/compile.js";

describe("compileScenario", () => {
  it("validates and returns a typed scene", () => {
    const scene = compileScenario({
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
    });
    expect(scene.name).toBe("minimal");
    expect(scene.vessels).toHaveLength(1);
  });

  it("throws on invalid input", () => {
    expect(() => compileScenario({ name: "broken" })).toThrow();
  });
});
