import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  FAMILIES,
  familyNames,
  getRegistry,
  loadModel,
  lookupDimensions,
  parametricHull,
} from "../src/assets.js";

describe("getRegistry", () => {
  it("contains tanker_120m, ferry_60m, cargo_90m", () => {
    const reg = getRegistry();
    expect(reg["tanker_120m"]).toBeDefined();
    expect(reg["ferry_60m"]).toBeDefined();
    expect(reg["cargo_90m"]).toBeDefined();
  });
});

describe("lookupDimensions", () => {
  it("returns known dimensions for a registered model", () => {
    const dims = lookupDimensions("tanker_120m");
    expect(dims.length).toBe(120);
    expect(dims.beam).toBe(20);
    expect(dims.draft).toBe(6);
  });

  it("returns fallback dimensions for an unknown model", () => {
    const dims = lookupDimensions("unknown_vessel");
    expect(dims.length).toBe(80);
    expect(dims.beam).toBe(14);
  });
});

describe("parametricHull", () => {
  it("returns a group named parametric_hull", () => {
    const group = parametricHull({ length: 100, beam: 16, draft: 5 });
    expect(group).toBeInstanceOf(THREE.Group);
    expect(group.name).toBe("parametric_hull");
  });

  it("contains a hull mesh child", () => {
    const group = parametricHull({ length: 100, beam: 16, draft: 5 });
    const hull = group.getObjectByName("hull");
    expect(hull).toBeDefined();
    expect(hull).toBeInstanceOf(THREE.Mesh);
  });

  it("hull bounding box is roughly the right size", () => {
    const group = parametricHull({ length: 100, beam: 16, draft: 5 });
    const hull = group.getObjectByName("hull") as THREE.Mesh;
    hull.geometry.computeBoundingBox();
    const box = hull.geometry.boundingBox!;
    const size = new THREE.Vector3();
    box.getSize(size);
    expect(size.x).toBeGreaterThan(80);
    expect(size.x).toBeLessThan(120);
    expect(size.z).toBeGreaterThan(0);
    expect(size.z).toBeLessThan(20);
  });

  it("adds a superstructure when specified", () => {
    const group = parametricHull(
      { length: 100, beam: 16, draft: 5 },
      { length: 15, height: 12, offset: 30 },
    );
    const ss = group.getObjectByName("superstructure");
    expect(ss).toBeDefined();
    expect(ss).toBeInstanceOf(THREE.Mesh);
  });
});

describe("loadModel", () => {
  it("returns a group for a registered model with superstructure", () => {
    const group = loadModel("tanker_120m");
    expect(group).toBeInstanceOf(THREE.Group);
    expect(group.getObjectByName("hull")).toBeDefined();
    expect(group.getObjectByName("superstructure")).toBeDefined();
  });

  it("returns a group for an unknown model (fallback dimensions)", () => {
    const group = loadModel("mystery_boat");
    expect(group).toBeInstanceOf(THREE.Group);
    expect(group.getObjectByName("hull")).toBeDefined();
  });

  it("honors a dimensions override (e.g. a 3 m skiff)", () => {
    const hull = loadModel("skiff", { length: 3, beam: 1.3, draft: 0.5 }).getObjectByName(
      "hull",
    ) as THREE.Mesh;
    hull.geometry.computeBoundingBox();
    const size = new THREE.Vector3();
    hull.geometry.boundingBox!.getSize(size);
    // ~3 m long, not the 80 m unknown-model fallback.
    expect(size.x).toBeGreaterThan(2);
    expect(size.x).toBeLessThan(4);
    expect(size.z).toBeLessThan(2);
  });
});

describe("ship families", () => {
  const dims = { length: 120, beam: 20, draft: 6 };

  it("names twenty families", () => {
    expect(familyNames()).toHaveLength(20);
    expect(familyNames()).toContain("sailboat");
  });

  it.each(Object.keys(FAMILIES))("%s builds a hull and a superstructure", (name) => {
    const group = loadModel(name, dims);
    expect(group.getObjectByName("hull")).toBeInstanceOf(THREE.Mesh);
    expect(group.getObjectByName("superstructure")).toBeInstanceOf(THREE.Mesh);
  });

  it.each(Object.keys(FAMILIES))("%s stays within her length and beam", (name) => {
    const group = loadModel(name, dims);
    group.updateMatrixWorld(true);
    for (const child of group.children) {
      if (child.name === "hull" || child.name === "hull_underwater") continue;
      const bounds = new THREE.Box3().setFromObject(child);
      expect(bounds.min.x, child.name).toBeGreaterThanOrEqual(-dims.length / 2 - 1e-6);
      expect(bounds.max.x, child.name).toBeLessThanOrEqual(dims.length / 2 + 1e-6);
      expect(Math.abs(bounds.min.z), child.name).toBeLessThanOrEqual(dims.beam / 2 + 1e-6);
      expect(Math.abs(bounds.max.z), child.name).toBeLessThanOrEqual(dims.beam / 2 + 1e-6);
    }
  });

  it("scales with her dimensions", () => {
    const top = (group: THREE.Group) => new THREE.Box3().setFromObject(group).max.y;
    expect(top(loadModel("tanker", { length: 240, beam: 40, draft: 12 }))).toBeCloseTo(
      2 * top(loadModel("tanker", dims)),
      5,
    );
  });

  it("leaves the stock ships and the unknown fallback as they were", () => {
    expect(loadModel("tanker_120m").getObjectByName("superstructure")).toBeDefined();
    expect(loadModel("no_such_family", dims).getObjectByName("superstructure")).toBeUndefined();
  });

  it("rigs a sailboat with a mast and two sails", () => {
    const group = loadModel("sailboat", { length: 10, beam: 3.5, draft: 1.8 });
    for (const part of ["mast", "mainsail", "jib"]) {
      expect(group.getObjectByName(part), part).toBeDefined();
    }
  });
});
