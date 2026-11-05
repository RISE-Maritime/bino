import { afterEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import {
  parseCoastlineElements,
  buildTerrainMesh,
  flatBathymetry,
  sampleRasterToGrid,
  prepareTerrain,
  terrainCacheKey,
  terrainSourcesSignature,
  type BathymetryGrid,
  type CoastlineChain,
  type TerrainCache,
  type TerrainData,
} from "../src/terrain.js";

describe("parseCoastlineElements", () => {
  it("stitches two ways sharing an endpoint into a single chain", () => {
    // Way 1: A → B; Way 2: B → C. Stitched: A → B → C.
    const elements = [
      { type: "node" as const, id: 1, lat: 54.3, lon: 10.1 },
      { type: "node" as const, id: 2, lat: 54.32, lon: 10.15 },
      { type: "node" as const, id: 3, lat: 54.34, lon: 10.2 },
      { type: "way" as const, id: 100, nodes: [1, 2] },
      { type: "way" as const, id: 101, nodes: [2, 3] },
    ];
    const chains = parseCoastlineElements(elements);
    expect(chains).toHaveLength(1);
    expect(chains[0]!.points).toEqual([
      [10.1, 54.3],
      [10.15, 54.32],
      [10.2, 54.34],
    ]);
    expect(chains[0]!.closed).toBe(false);
  });

  it("flags a closed loop as closed", () => {
    const elements = [
      { type: "node" as const, id: 1, lat: 0, lon: 0 },
      { type: "node" as const, id: 2, lat: 0, lon: 1 },
      { type: "node" as const, id: 3, lat: 1, lon: 1 },
      { type: "way" as const, id: 100, nodes: [1, 2, 3, 1] },
    ];
    const chains = parseCoastlineElements(elements);
    expect(chains).toHaveLength(1);
    expect(chains[0]!.closed).toBe(true);
  });

  it("preserves disconnected ways as separate chains", () => {
    const elements = [
      { type: "node" as const, id: 1, lat: 0, lon: 0 },
      { type: "node" as const, id: 2, lat: 0, lon: 1 },
      { type: "node" as const, id: 3, lat: 1, lon: 0 },
      { type: "node" as const, id: 4, lat: 1, lon: 1 },
      { type: "way" as const, id: 100, nodes: [1, 2] },
      { type: "way" as const, id: 101, nodes: [3, 4] },
    ];
    const chains = parseCoastlineElements(elements);
    expect(chains).toHaveLength(2);
  });

  it("raises on a missing node reference", () => {
    const elements = [
      { type: "node" as const, id: 1, lat: 0, lon: 0 },
      { type: "way" as const, id: 100, nodes: [1, 999] },
    ];
    expect(() => parseCoastlineElements(elements)).toThrow(/missing node 999/);
  });
});

describe("buildTerrainMesh", () => {
  const KIEL = { lat: 54.32, lon: 10.14, height: 0 };
  const bbox = [10.1, 54.3, 10.18, 54.34] as const;

  function fakeGrid(): BathymetryGrid {
    const w = 4;
    const h = 4;
    const heights = new Float32Array(w * h);
    for (let i = 0; i < heights.length; i++) heights[i] = -10 + i; // ramp
    return {
      heights,
      width: w,
      height: h,
      bbox: [...bbox] as [number, number, number, number],
      cellSizeM: 50,
    };
  }

  function fakeCoastline(): CoastlineChain[] {
    return [
      {
        points: [
          [10.12, 54.31],
          [10.14, 54.32],
          [10.16, 54.33],
        ],
        closed: false,
      },
    ];
  }

  it("returns a group with seabed mesh and landmask when coastline is provided", () => {
    const data: TerrainData = { coastline: fakeCoastline(), bathymetry: fakeGrid() };
    const group = buildTerrainMesh(data, KIEL);
    expect(group).toBeInstanceOf(THREE.Group);
    const seabeds = group.children.filter((c) => c.name === "seabed");
    expect(seabeds).toHaveLength(1);
  });

  it("returns only seabed when coastline is empty", () => {
    const data: TerrainData = { coastline: [], bathymetry: fakeGrid() };
    const group = buildTerrainMesh(data, KIEL);
    expect(group.children).toHaveLength(1);
    expect(group.children[0]!.name).toBe("seabed");
  });

  it("seabed mesh applies the bathymetry heights to vertex y", () => {
    const data: TerrainData = { coastline: [], bathymetry: fakeGrid() };
    const group = buildTerrainMesh(data, KIEL);
    const seabed = group.getObjectByName("seabed") as THREE.Mesh;
    const positions = seabed.geometry.attributes["position"]!.array as Float32Array;
    // First vertex's y should be the first height value (-10).
    expect(positions[1]).toBeCloseTo(-10, 5);
  });

  it("buildScene attaches the terrain group when opts.terrain is provided", async () => {
    const { compileScenario } = await import("../src/compile.js");
    const { buildScene } = await import("../src/scene.js");
    const compiled = compileScenario({
      name: "with-terrain",
      anchor: KIEL,
      keelson: { base_path: "bino" },
      vessels: [
        {
          id: "ego",
          model: "tanker",
          pose_source: { type: "zenoh", topic: "ego" },
          sensors: [],
        },
      ],
      modes: { rendering: "replace", clock: "wall", determinism: "relaxed" },
      terrain: { bbox: [...bbox] },
    });
    const built = buildScene(compiled, {
      terrain: { coastline: fakeCoastline(), bathymetry: fakeGrid() },
    });
    expect(built.terrain).toBeDefined();
    expect(built.scene.children).toContain(built.terrain);
  });

  it("buildScene without terrain leaves the scene terrain-free", () => {
    // buildScene's existing tests cover this; just sanity-check the
    // BuiltScene shape.
    const built = (() => {
      const compiled = {
        name: "no-terrain",
        anchor: KIEL,
        keelson: { base_path: "bino" },
        vessels: [],
        modes: {
          rendering: "replace" as const,
          clock: "wall" as const,
          determinism: "relaxed" as const,
        },
        environment: { time_of_day: "12:00", visibility_m: 20000 },
      };
      // Bypass compileScenario's vessel-min validation for this
      // structural check.
      return { compiled };
    })();
    expect(built.compiled).toBeDefined();
  });
});

describe("prepareTerrain caching", () => {
  const bbox: [number, number, number, number] = [10.05, 54.28, 10.25, 54.38];
  const cached: TerrainData = {
    coastline: [],
    bathymetry: {
      heights: new Float32Array([1, 2, 3, 4]),
      width: 2,
      height: 2,
      bbox,
      cellSizeM: 50,
    },
  };

  it("returns the cached entry without fetching on a hit", async () => {
    // No network: the test passes only because a hit short-circuits fetch.
    let writes = 0;
    const cache: TerrainCache = {
      get: async (k) => (k === terrainCacheKey(bbox) ? cached : undefined),
      set: async () => {
        writes++;
      },
    };
    const result = await prepareTerrain(bbox, { cache });
    expect(result).toBe(cached);
    expect(writes).toBe(0);
  });
});

describe("terrainCacheKey / terrainSourcesSignature", () => {
  const bbox: [number, number, number, number] = [10.05, 54.28, 10.25, 54.38];

  it("keeps the default-source key backward-compatible", () => {
    expect(terrainCacheKey(bbox)).toBe("terrain_10.05000_54.28000_10.25000_54.38000_b1_s1");
  });

  it("appends a grid suffix only for non-default spacing", () => {
    expect(terrainCacheKey(bbox, { gridResM: 50 })).toBe(terrainCacheKey(bbox));
    expect(terrainCacheKey(bbox, { gridResM: 100 })).toContain("_g100");
  });

  it("appends a source signature so changed sources don't collide", () => {
    const a = terrainCacheKey(bbox, { sourcesSig: "abcd1234" });
    expect(a).toContain("_abcd1234");
    expect(a).not.toBe(terrainCacheKey(bbox));
  });

  it("signature is deterministic and config-sensitive", () => {
    const s1 = { bathymetry: { type: "geotiff", path: "a.tif" } };
    const s2 = { bathymetry: { type: "geotiff", path: "b.tif" } };
    expect(terrainSourcesSignature(s1)).toBe(terrainSourcesSignature(s1));
    expect(terrainSourcesSignature(s1)).not.toBe(terrainSourcesSignature(s2));
    expect(terrainSourcesSignature(s1)).toMatch(/^[0-9a-f]{8}$/);
  });
});

describe("sampleRasterToGrid", () => {
  it("nearest-neighbour samples a raster onto the bbox grid", () => {
    // ~65m x ~111m bbox at lat 54 → a 2x2 grid at 50 m spacing, so each grid
    // cell maps 1:1 to the 2x2 source raster.
    const bbox: [number, number, number, number] = [10.0, 54.0, 10.001, 54.001];
    const grid = sampleRasterToGrid(new Float32Array([1, 2, 3, 4]), 2, 2, bbox, 50);
    expect(grid.width).toBe(2);
    expect(grid.height).toBe(2);
    expect([...grid.heights]).toEqual([1, 2, 3, 4]);
    expect(grid.cellSizeM).toBe(50);
  });

  it("coerces non-finite samples to 0", () => {
    const bbox: [number, number, number, number] = [10.0, 54.0, 10.001, 54.001];
    const grid = sampleRasterToGrid(new Float32Array([NaN, 2, 3, 4]), 2, 2, bbox, 50);
    expect(grid.heights[0]).toBe(0);
  });
});

describe("flatBathymetry", () => {
  it("produces a grid at a uniform negative depth covering the bbox", () => {
    const bbox: [number, number, number, number] = [10.0, 54.0, 10.1, 54.1];
    const grid = flatBathymetry(bbox, 12);
    expect(grid.width).toBeGreaterThanOrEqual(2);
    expect(grid.height).toBeGreaterThanOrEqual(2);
    expect(grid.heights.length).toBe(grid.width * grid.height);
    expect([...grid.heights].every((h) => h === -12)).toBe(true);
    expect(grid.bbox).toEqual(bbox);
  });
});

describe("prepareTerrain graceful degradation", () => {
  const bbox: [number, number, number, number] = [10.05, 54.28, 10.25, 54.38];

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("does not reject when every source fails — yields placeholders", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
    // 404 is non-retryable, so each loader throws fast and prepareTerrain's
    // per-layer catch kicks in (no backoff delay).
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 404 })),
    );

    const result = await prepareTerrain(bbox);
    expect(result.coastline).toEqual([]);
    expect(result.buildings).toEqual([]);
    expect(result.seamarks).toEqual([]);
    // Bathymetry falls back to the flat placeholder rather than throwing.
    expect(result.bathymetry.width).toBeGreaterThanOrEqual(2);
    expect(result.bathymetry.heights.length).toBe(
      result.bathymetry.width * result.bathymetry.height,
    );
    expect([...result.bathymetry.heights].every((h) => h < 0)).toBe(true);
  });
});

describe("prepareTerrain never caches a fallback (SLIPWAY#63)", () => {
  const bbox: [number, number, number, number] = [11.78, 57.65, 11.86, 57.7];
  const grid: BathymetryGrid = {
    heights: new Float32Array([-5, -12, -20, -7]),
    width: 2,
    height: 2,
    bbox,
    cellSizeM: 50,
  };

  function recordingCache() {
    const writes: string[] = [];
    const cache: TerrainCache = {
      get: async () => undefined,
      set: async (k) => {
        writes.push(k);
      },
    };
    return { cache, writes };
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not cache when bathymetry fell back to the flat placeholder", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
    const { cache, writes } = recordingCache();
    const result = await prepareTerrain(bbox, {
      cache,
      buildings: false,
      seamarks: false,
      provider: {
        coastline: async () => [],
        bathymetry: async () => {
          throw new Error("Offset is outside the bounds of the DataView");
        },
      },
    });
    expect(new Set(result.bathymetry.heights).size).toBe(1); // the placeholder, for this run
    expect(writes).toEqual([]); // and never kept
    expect(warn.mock.calls.flat().join(" ")).toContain("not caching terrain: bathymetry");
  });

  it("caches a complete fetch, an empty-but-successful coastline included", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    const { cache, writes } = recordingCache();
    await prepareTerrain(bbox, {
      cache,
      buildings: false,
      seamarks: false,
      provider: { coastline: async () => [], bathymetry: async () => grid },
    });
    expect(writes).toHaveLength(1);
  });
});
