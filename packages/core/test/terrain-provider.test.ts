import { describe, expect, it, vi } from "vitest";
import { terrainProviderFromSources, type TerrainSourceReaders } from "../src/terrain-provider.js";
import type { TerrainSources } from "../src/dsl.js";

const bbox: [number, number, number, number] = [10.0, 54.0, 10.1, 54.1];

const coastGeoJson = JSON.stringify({
  type: "LineString",
  coordinates: [
    [10.0, 54.0],
    [10.05, 54.05],
  ],
});

function readers(text = coastGeoJson): TerrainSourceReaders {
  return {
    readText: vi.fn(async () => text),
    readBinary: vi.fn(async () => new ArrayBuffer(0)),
  };
}

describe("terrainProviderFromSources", () => {
  it("leaves unnamed layers undefined (so they fall back to defaults)", () => {
    const sources: TerrainSources = { coastline: { type: "geojson", path: "c.geojson" } };
    const p = terrainProviderFromSources(sources, readers());
    expect(p.coastline).toBeTypeOf("function");
    expect(p.bathymetry).toBeUndefined();
    expect(p.buildings).toBeUndefined();
    expect(p.seamarks).toBeUndefined();
  });

  it("reads a geojson coastline source through the injected reader", async () => {
    const r = readers();
    const p = terrainProviderFromSources({ coastline: { type: "geojson", path: "c.geojson" } }, r);
    const chains = await p.coastline!(bbox);
    expect(r.readText).toHaveBeenCalledOnce();
    expect(chains).toHaveLength(1);
    expect(chains[0]!.points).toEqual([
      [10.0, 54.0],
      [10.05, 54.05],
    ]);
  });

  it("a `none` bathymetry source yields a flat placeholder", async () => {
    const p = terrainProviderFromSources({ bathymetry: { type: "none" } }, readers());
    const grid = await p.bathymetry!(bbox);
    expect(grid.heights.length).toBe(grid.width * grid.height);
    expect([...grid.heights].every((h) => h < 0)).toBe(true);
  });

  it("threads gridResM into the bathymetry source (coarser → smaller grid)", async () => {
    const fine = await terrainProviderFromSources({ bathymetry: { type: "none" } }, readers(), {
      gridResM: 50,
    }).bathymetry!(bbox);
    const coarse = await terrainProviderFromSources({ bathymetry: { type: "none" } }, readers(), {
      gridResM: 500,
    }).bathymetry!(bbox);
    expect(coarse.cellSizeM).toBe(500);
    expect(coarse.width).toBeLessThan(fine.width);
  });

  it("rejects a source type that is invalid for the layer", () => {
    expect(() => terrainProviderFromSources({ coastline: { type: "gmrt" } }, readers())).toThrow(
      /not valid for layer 'coastline'/,
    );
    expect(() =>
      terrainProviderFromSources({ bathymetry: { type: "overpass" } }, readers()),
    ).toThrow(/not valid for layer 'bathymetry'/);
  });

  describe("offline", () => {
    it("throws when a required layer has no source", () => {
      expect(() =>
        terrainProviderFromSources(
          { coastline: { type: "none" }, bathymetry: { type: "none" } },
          readers(),
          { offline: true, buildings: true, seamarks: true },
        ),
      ).toThrow(/offline terrain: layer 'buildings' has no source/);
    });

    it("throws when a required layer uses a network source", () => {
      expect(() =>
        terrainProviderFromSources(
          {
            coastline: { type: "overpass" },
            bathymetry: { type: "none" },
            buildings: { type: "none" },
            seamarks: { type: "none" },
          },
          readers(),
          { offline: true },
        ),
      ).toThrow(/offline terrain: layer 'coastline' uses network source 'overpass'/);
    });

    it("passes when every loaded layer is local/none", () => {
      expect(() =>
        terrainProviderFromSources(
          {
            coastline: { type: "geojson", path: "c.geojson" },
            bathymetry: { type: "geotiff", path: "b.tif" },
            buildings: { type: "none" },
            seamarks: { type: "none" },
          },
          readers(),
          { offline: true },
        ),
      ).not.toThrow();
    });

    it("does not require sources for layers disabled by their flag", () => {
      expect(() =>
        terrainProviderFromSources(
          { coastline: { type: "none" }, bathymetry: { type: "none" } },
          readers(),
          { offline: true, buildings: false, seamarks: false },
        ),
      ).not.toThrow();
    });
  });
});
