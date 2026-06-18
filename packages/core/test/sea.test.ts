import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { componentsFor, createSeaSurface } from "../src/sea.js";
import type { Environment } from "../src/dsl.js";

describe("componentsFor", () => {
  it("returns four components for any sea_state", () => {
    const c = componentsFor({
      significant_wave_height: 1.5,
      peak_period: 6,
      direction_deg: 0,
      spectrum: "pierson_moskowitz",
    });
    expect(c).toHaveLength(4);
  });

  it("scales amplitudes with significant_wave_height", () => {
    const calm = componentsFor({
      significant_wave_height: 0.5,
      peak_period: 5,
      direction_deg: 0,
      spectrum: "pierson_moskowitz",
    });
    const heavy = componentsFor({
      significant_wave_height: 4.0,
      peak_period: 5,
      direction_deg: 0,
      spectrum: "pierson_moskowitz",
    });
    expect(heavy[0]!.amplitude).toBeGreaterThan(calm[0]!.amplitude);
    expect(heavy[0]!.amplitude / calm[0]!.amplitude).toBeCloseTo(8, 1);
  });

  it("orients first component along direction_deg", () => {
    const c = componentsFor({
      significant_wave_height: 1,
      peak_period: 5,
      direction_deg: 90, // along +y in maths convention; in our xz plane → +z
      spectrum: "pierson_moskowitz",
    });
    expect(c[0]!.dirX).toBeCloseTo(0, 5);
    expect(c[0]!.dirZ).toBeCloseTo(1, 5);
  });

  it("zero amplitude when sea_state is undefined", () => {
    const c = componentsFor(undefined);
    for (const cmp of c) expect(cmp.amplitude).toBe(0);
  });
});

describe("createSeaSurface", () => {
  const env: Environment = {
    sea_state: {
      significant_wave_height: 1.5,
      peak_period: 6,
      direction_deg: 30,
      spectrum: "pierson_moskowitz",
    },
    time_of_day: "12:00",
    visibility_m: 20000,
  };

  it("returns a Mesh with a ShaderMaterial and a default segment density", () => {
    const handle = createSeaSurface(env);
    expect(handle.mesh).toBeInstanceOf(THREE.Mesh);
    expect(handle.material).toBeInstanceOf(THREE.ShaderMaterial);
    // Default 384 segments → 385² ≈ 148k verts. Just check the
    // vertex count is plausible without pinning to one default.
    const verts = handle.mesh.geometry.attributes["position"]!.count;
    expect(verts).toBeGreaterThan(60_000);
    handle.dispose();
  });

  it("setTime() updates the uTime uniform", () => {
    const handle = createSeaSurface(env);
    handle.setTime(5.5);
    expect(handle.material.uniforms["uTime"]!.value).toBe(5.5);
    handle.dispose();
  });

  it("setSeaState() refreshes the wave components", () => {
    const handle = createSeaSurface(env);
    const ampBefore = (handle.material.uniforms["uAmplitude"]!.value as Float32Array)[0];
    handle.setSeaState({
      significant_wave_height: 4.0,
      peak_period: 9,
      direction_deg: 0,
      spectrum: "pierson_moskowitz",
    });
    const ampAfter = (handle.material.uniforms["uAmplitude"]!.value as Float32Array)[0];
    expect(ampAfter).toBeGreaterThan(ampBefore!);
    handle.dispose();
  });

  it("buildScene attaches a sea surface by default; opts.sea=false suppresses", async () => {
    const { compileScenario } = await import("../src/compile.js");
    const { buildScene } = await import("../src/scene.js");
    const compiled = compileScenario({
      name: "sea-test",
      anchor: { lat: 54, lon: 10, height: 0 },
      keelson: { base_path: "bino" },
      vessels: [{ id: "ego", model: "x", pose_source: { type: "zenoh", topic: "x" }, sensors: [] }],
      modes: { rendering: "replace", clock: "wall", determinism: "relaxed" },
    });
    const withSea = buildScene(compiled);
    expect(withSea.sea).toBeDefined();
    expect(withSea.scene.children).toContain(withSea.sea!.mesh);

    const without = buildScene(compiled, { sea: false });
    expect(without.sea).toBeUndefined();
  });
});
