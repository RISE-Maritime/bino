import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { terrainCacheKey, type TerrainData } from "@bino/core";
import { createFileTerrainCache } from "../src/terrain-cache.js";

const sampleTerrain = (): TerrainData => ({
  coastline: [{ points: [[10.1, 54.3] as [number, number]], closed: false }],
  bathymetry: {
    heights: new Float32Array([0, -5.5, 12.25, -1]),
    width: 2,
    height: 2,
    bbox: [10.05, 54.28, 10.25, 54.38],
    cellSizeM: 50,
  },
  buildings: [],
  seamarks: [],
});

describe("terrainCacheKey", () => {
  it("is stable for the same bbox + options", () => {
    const bbox: [number, number, number, number] = [10.05, 54.28, 10.25, 54.38];
    expect(terrainCacheKey(bbox)).toBe(terrainCacheKey(bbox));
  });

  it("rounds trivially-different floats to the same key", () => {
    expect(terrainCacheKey([10.05, 54.28, 10.25, 54.38])).toBe(
      terrainCacheKey([10.050000001, 54.28, 10.25, 54.38]),
    );
  });

  it("distinguishes buildings/seamarks options", () => {
    const bbox: [number, number, number, number] = [10.05, 54.28, 10.25, 54.38];
    expect(terrainCacheKey(bbox, { buildings: false })).not.toBe(terrainCacheKey(bbox));
  });
});

describe("createFileTerrainCache", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "bino-terrain-cache-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("returns undefined on a miss", async () => {
    const cache = createFileTerrainCache(dir);
    expect(await cache.get("nope")).toBeUndefined();
  });

  it("round-trips terrain, rehydrating heights as a Float32Array", async () => {
    const cache = createFileTerrainCache(dir);
    const data = sampleTerrain();
    await cache.set("k", data);
    const got = await cache.get("k");
    expect(got).toBeDefined();
    expect(got!.bathymetry.heights).toBeInstanceOf(Float32Array);
    expect(Array.from(got!.bathymetry.heights)).toEqual([0, -5.5, 12.25, -1]);
    expect(got!.bathymetry.bbox).toEqual(data.bathymetry.bbox);
    expect(got!.coastline).toEqual(data.coastline);
  });

  it("creates the cache directory on write", async () => {
    const nested = join(dir, "a", "b");
    const cache = createFileTerrainCache(nested);
    await cache.set("k", sampleTerrain());
    expect(await cache.get("k")).toBeDefined();
  });
});
