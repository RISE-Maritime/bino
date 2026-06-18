import { describe, expect, it } from "vitest";
import { encodeTerrain, decodeTerrain } from "../src/terrain-codec.js";
import type { TerrainData } from "../src/terrain.js";

const sample: TerrainData = {
  coastline: [
    {
      points: [
        [10.1, 54.3],
        [10.15, 54.32],
        [10.2, 54.34],
      ],
      closed: false,
    },
    {
      points: [
        [0, 0],
        [0, 1],
        [1, 1],
        [0, 0],
      ],
      closed: true,
    },
  ],
  bathymetry: {
    heights: new Float32Array([-1.5, -2.25, 3.0, 0, -10.125, 42.5]),
    width: 3,
    height: 2,
    bbox: [10.05, 54.28, 10.25, 54.38],
    cellSizeM: 50,
  },
  buildings: [
    {
      polygon: [
        [10.1, 54.3],
        [10.101, 54.3],
        [10.101, 54.301],
        [10.1, 54.3],
      ],
      heightM: 12,
      tags: { building: "yes", "building:levels": "4" },
    },
  ],
  seamarks: [
    { lon: 10.12, lat: 54.31, type: "buoy_lateral", tags: { "seamark:type": "buoy_lateral" } },
  ],
};

describe("terrain-codec", () => {
  it("round-trips a full TerrainData exactly", () => {
    const decoded = decodeTerrain(encodeTerrain(sample));

    expect(decoded.coastline).toEqual(sample.coastline);
    expect(decoded.buildings).toEqual(sample.buildings);
    expect(decoded.seamarks).toEqual(sample.seamarks);
    expect(decoded.bathymetry.width).toBe(3);
    expect(decoded.bathymetry.height).toBe(2);
    expect(decoded.bathymetry.bbox).toEqual(sample.bathymetry.bbox);
    expect(decoded.bathymetry.cellSizeM).toBe(50);
    // Heights come back as a Float32Array with identical values.
    expect(decoded.bathymetry.heights).toBeInstanceOf(Float32Array);
    expect([...decoded.bathymetry.heights]).toEqual([...sample.bathymetry.heights]);
  });

  it("round-trips empty optional layers", () => {
    const minimal: TerrainData = {
      coastline: [],
      bathymetry: {
        heights: new Float32Array([0, 0, 0, 0]),
        width: 2,
        height: 2,
        bbox: [0, 0, 1, 1],
        cellSizeM: 100,
      },
    };
    const decoded = decodeTerrain(encodeTerrain(minimal));
    expect(decoded.coastline).toEqual([]);
    expect(decoded.buildings).toEqual([]);
    expect(decoded.seamarks).toEqual([]);
    expect([...decoded.bathymetry.heights]).toEqual([0, 0, 0, 0]);
  });

  it("preserves full coordinate precision (Float64)", () => {
    const decoded = decodeTerrain(encodeTerrain(sample));
    expect(decoded.coastline[0]!.points[1]).toEqual([10.15, 54.32]);
  });

  it("rejects a blob without the magic header", () => {
    expect(() => decodeTerrain(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]))).toThrow(/BTR1/);
  });

  it("packs bathymetry heights far smaller than JSON number[]", () => {
    // Heights are the codec's clearest win: 4 bytes/value vs a long decimal
    // string each. (Coords are Float64, so for low-precision data the size
    // edge is smaller — parse speed is the broader win.)
    const n = 64 * 64;
    const heights = new Float32Array(n);
    for (let i = 0; i < n; i++) heights[i] = -i * 0.123456;
    const data: TerrainData = {
      coastline: [],
      bathymetry: { heights, width: 64, height: 64, bbox: [0, 0, 1, 1], cellSizeM: 50 },
    };
    const bin = encodeTerrain(data).byteLength;
    const json = new TextEncoder().encode(
      JSON.stringify({ ...data, bathymetry: { ...data.bathymetry, heights: [...heights] } }),
    ).byteLength;
    expect(bin).toBeLessThan(json);
  });
});
