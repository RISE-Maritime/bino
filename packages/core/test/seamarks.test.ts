import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { buildSeamarksMesh } from "../src/seamarks.js";
import type { SeamarkData } from "../src/overpass.js";

const ANCHOR = { lat: 54.1, lon: 10.1, height: 0 };

describe("buildSeamarksMesh", () => {
  it("returns a named group", () => {
    const group = buildSeamarksMesh([], ANCHOR);
    expect(group).toBeInstanceOf(THREE.Group);
    expect(group.name).toBe("seamarks");
  });

  it("produces no children for empty input", () => {
    const group = buildSeamarksMesh([], ANCHOR);
    expect(group.children).toHaveLength(0);
  });

  it("creates a mesh for a buoy_lateral (port)", () => {
    const seamarks: SeamarkData[] = [
      {
        lat: 54.11,
        lon: 10.11,
        type: "buoy_lateral",
        tags: { "seamark:type": "buoy_lateral", "seamark:buoy_lateral:category": "port" },
      },
    ];
    const group = buildSeamarksMesh(seamarks, ANCHOR);
    expect(group.children).toHaveLength(1);
    const mesh = group.children[0] as THREE.Mesh;
    expect(mesh).toBeInstanceOf(THREE.Mesh);
    expect(mesh.name).toBe("seamark-buoy_lateral");
  });

  it("creates different geometry for a light vs buoy", () => {
    const buoy: SeamarkData = {
      lat: 54.11,
      lon: 10.11,
      type: "buoy_lateral",
      tags: { "seamark:type": "buoy_lateral" },
    };
    const light: SeamarkData = {
      lat: 54.12,
      lon: 10.12,
      type: "light_major",
      tags: { "seamark:type": "light_major" },
    };
    const buoyGroup = buildSeamarksMesh([buoy], ANCHOR);
    const lightGroup = buildSeamarksMesh([light], ANCHOR);
    const buoyMesh = buoyGroup.children[0] as THREE.Mesh;
    const lightMesh = lightGroup.children[0] as THREE.Mesh;
    // Light geometry is taller than buoy geometry
    buoyMesh.geometry.computeBoundingBox();
    lightMesh.geometry.computeBoundingBox();
    expect(lightMesh.geometry.boundingBox!.max.y).toBeGreaterThan(
      buoyMesh.geometry.boundingBox!.max.y,
    );
  });

  it("positions seamark at the correct ENU offset", () => {
    const sm: SeamarkData = {
      lat: 54.11,
      lon: 10.11,
      type: "buoy_safe_water",
      tags: { "seamark:type": "buoy_safe_water" },
    };
    const group = buildSeamarksMesh([sm], ANCHOR);
    const mesh = group.children[0] as THREE.Mesh;
    // Should not be at origin — offset from anchor
    expect(Math.abs(mesh.position.x) + Math.abs(mesh.position.z)).toBeGreaterThan(0);
  });

  it("falls back to marker geometry for unknown type", () => {
    const sm: SeamarkData = {
      lat: 54.11,
      lon: 10.11,
      type: "unknown_thing",
      tags: { "seamark:type": "unknown_thing" },
    };
    const group = buildSeamarksMesh([sm], ANCHOR);
    expect(group.children).toHaveLength(1);
    expect((group.children[0] as THREE.Mesh).name).toBe("seamark-unknown_thing");
  });

  it("handles multiple seamarks", () => {
    const seamarks: SeamarkData[] = [
      { lat: 54.11, lon: 10.11, type: "buoy_lateral", tags: {} },
      { lat: 54.12, lon: 10.12, type: "beacon_cardinal", tags: {} },
      { lat: 54.13, lon: 10.13, type: "light_minor", tags: {} },
    ];
    const group = buildSeamarksMesh(seamarks, ANCHOR);
    expect(group.children).toHaveLength(3);
  });
});
