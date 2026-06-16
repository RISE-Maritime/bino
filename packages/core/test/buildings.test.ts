import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { buildBuildingsMesh, buildingsToObstacles } from "../src/buildings.js";
import type { BuildingData } from "../src/overpass.js";

const ANCHOR = { lat: 54.1, lon: 10.1, height: 0 };

function fakeBuilding(levels = 3): BuildingData {
  return {
    polygon: [
      [10.1, 54.1],
      [10.101, 54.1],
      [10.101, 54.101],
      [10.1, 54.101],
      [10.1, 54.1],
    ],
    heightM: levels * 3,
    tags: { building: "yes", "building:levels": String(levels) },
  };
}

describe("buildBuildingsMesh", () => {
  it("returns a named group", () => {
    const group = buildBuildingsMesh([], ANCHOR);
    expect(group).toBeInstanceOf(THREE.Group);
    expect(group.name).toBe("buildings");
  });

  it("produces no children for empty input", () => {
    const group = buildBuildingsMesh([], ANCHOR);
    expect(group.children).toHaveLength(0);
  });

  it("produces a merged mesh for one building", () => {
    const group = buildBuildingsMesh([fakeBuilding()], ANCHOR);
    expect(group.children).toHaveLength(1);
    const mesh = group.children[0] as THREE.Mesh;
    expect(mesh).toBeInstanceOf(THREE.Mesh);
    expect(mesh.name).toBe("buildings-merged");
  });

  it("merged mesh has extruded geometry (more vertices than the footprint)", () => {
    const group = buildBuildingsMesh([fakeBuilding(5)], ANCHOR);
    const mesh = group.children[0] as THREE.Mesh;
    const vertCount = mesh.geometry.attributes["position"]!.count;
    expect(vertCount).toBeGreaterThan(5);
  });

  it("merges multiple buildings into a single mesh", () => {
    const b1 = fakeBuilding(3);
    const b2: BuildingData = {
      polygon: [
        [10.105, 54.105],
        [10.106, 54.105],
        [10.106, 54.106],
        [10.105, 54.106],
        [10.105, 54.105],
      ],
      heightM: 12,
      tags: { building: "yes" },
    };
    const group = buildBuildingsMesh([b1, b2], ANCHOR);
    expect(group.children).toHaveLength(1);
    const mesh = group.children[0] as THREE.Mesh;
    const singleGroup = buildBuildingsMesh([b1], ANCHOR);
    const singleVerts = (singleGroup.children[0] as THREE.Mesh).geometry.attributes["position"]!
      .count;
    const mergedVerts = mesh.geometry.attributes["position"]!.count;
    expect(mergedVerts).toBeGreaterThan(singleVerts);
  });

  it("positions building mesh above sea level", () => {
    const group = buildBuildingsMesh([fakeBuilding()], ANCHOR);
    const mesh = group.children[0] as THREE.Mesh;
    expect(mesh.position.y).toBeGreaterThan(0);
  });
});

describe("buildingsToObstacles", () => {
  it("returns empty array for empty input", () => {
    expect(buildingsToObstacles([], ANCHOR)).toEqual([]);
  });

  it("converts a building to a VesselBox with correct extents", () => {
    const obs = buildingsToObstacles([fakeBuilding(4)], ANCHOR);
    expect(obs).toHaveLength(1);
    const box = obs[0]!;
    expect(box.heading).toBe(0);
    expect(box.half_extents[1]).toBeCloseTo((4 * 3) / 2);
    expect(box.half_extents[0]).toBeGreaterThan(0);
    expect(box.half_extents[2]).toBeGreaterThan(0);
  });

  it("Y position includes BUILDING_Y offset plus half height", () => {
    const obs = buildingsToObstacles([fakeBuilding(2)], ANCHOR);
    const box = obs[0]!;
    const halfY = (2 * 3) / 2;
    expect(box.position[1]).toBeCloseTo(0.5 + halfY);
  });

  it("produces one obstacle per building", () => {
    const obs = buildingsToObstacles([fakeBuilding(3), fakeBuilding(5)], ANCHOR);
    expect(obs).toHaveLength(2);
  });
});
