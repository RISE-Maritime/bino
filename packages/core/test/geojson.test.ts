import { describe, expect, it } from "vitest";
import {
  parseGeoJsonCoastline,
  parseGeoJsonBuildings,
  parseGeoJsonSeamarks,
} from "../src/geojson.js";

describe("parseGeoJsonCoastline", () => {
  it("reads a LineString feature as an open chain", () => {
    const gj = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [
              [10.1, 54.3],
              [10.15, 54.32],
            ],
          },
        },
      ],
    };
    const chains = parseGeoJsonCoastline(gj);
    expect(chains).toHaveLength(1);
    expect(chains[0]!.points).toEqual([
      [10.1, 54.3],
      [10.15, 54.32],
    ]);
    expect(chains[0]!.closed).toBe(false);
  });

  it("reads a Polygon ring as a closed chain", () => {
    const gj = {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [0, 1],
          [1, 1],
          [0, 0],
        ],
      ],
    };
    const chains = parseGeoJsonCoastline(gj);
    expect(chains).toHaveLength(1);
    expect(chains[0]!.closed).toBe(true);
  });

  it("throws on a non-object root", () => {
    expect(() => parseGeoJsonCoastline("nope")).toThrow(/geojson/);
  });
});

describe("parseGeoJsonBuildings", () => {
  it("extrudes a polygon, taking height from the `height` property", () => {
    const gj = {
      type: "Feature",
      properties: { height: 24 },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [10.1, 54.3],
            [10.101, 54.3],
            [10.101, 54.301],
            [10.1, 54.3],
          ],
        ],
      },
    };
    const buildings = parseGeoJsonBuildings(gj);
    expect(buildings).toHaveLength(1);
    expect(buildings[0]!.heightM).toBe(24);
    expect(buildings[0]!.polygon.length).toBeGreaterThanOrEqual(3);
  });

  it("falls back to building:levels * 3 (default 3 levels)", () => {
    const base = (props: Record<string, unknown>) => ({
      type: "Feature" as const,
      properties: props,
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [0, 1],
            [1, 1],
            [0, 0],
          ],
        ],
      },
    });
    expect(parseGeoJsonBuildings(base({ "building:levels": 5 }))[0]!.heightM).toBe(15);
    expect(parseGeoJsonBuildings(base({}))[0]!.heightM).toBe(9);
  });
});

describe("parseGeoJsonSeamarks", () => {
  it("reads Point features with seamark:type", () => {
    const gj = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { "seamark:type": "buoy_lateral" },
          geometry: { type: "Point", coordinates: [10.12, 54.31] },
        },
        // Non-point geometries are ignored.
        {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: [[0, 0]] },
        },
      ],
    };
    const seamarks = parseGeoJsonSeamarks(gj);
    expect(seamarks).toHaveLength(1);
    expect(seamarks[0]).toMatchObject({ lon: 10.12, lat: 54.31, type: "buoy_lateral" });
  });
});
