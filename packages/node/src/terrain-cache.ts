import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { TerrainCache, TerrainData } from "@bino/core";

/** On-disk terrain cache for the node service. Each prepared location is
 *  stored as one JSON file under `dir`, so repeated runs of the same
 *  scenario fetch Overpass + GMRT only once (and work offline thereafter).
 *
 *  `bathymetry.heights` is a Float32Array, which JSON can't round-trip, so
 *  it's stored as a plain number array and rehydrated on read. */
export function createFileTerrainCache(dir: string): TerrainCache {
  const pathFor = (key: string) => join(dir, `${key}.json`);

  return {
    async get(key: string): Promise<TerrainData | undefined> {
      let text: string;
      try {
        text = await readFile(pathFor(key), "utf8");
      } catch {
        return undefined; // cache miss
      }
      const raw = JSON.parse(text) as TerrainData & {
        bathymetry: { heights: number[] };
      };
      return {
        ...raw,
        bathymetry: {
          ...raw.bathymetry,
          heights: new Float32Array(raw.bathymetry.heights),
        },
      };
    },

    async set(key: string, data: TerrainData): Promise<void> {
      await mkdir(dir, { recursive: true });
      const serializable = {
        ...data,
        bathymetry: {
          ...data.bathymetry,
          heights: Array.from(data.bathymetry.heights),
        },
      };
      await writeFile(pathFor(key), JSON.stringify(serializable));
    },
  };
}
