import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { decodeTerrain, encodeTerrain, type TerrainCache, type TerrainData } from "@bino/core";

/** On-disk terrain cache for the node service. Each prepared location is
 *  stored as one binary file (ADR-005 `terrain-codec`) under `dir`, so
 *  repeated runs of the same scenario fetch Overpass + GMRT only once (and
 *  work offline thereafter). The binary form is smaller and far faster to
 *  parse than the previous JSON; pre-existing `.json` entries are simply not
 *  found (a miss → one refetch). */
export function createFileTerrainCache(dir: string): TerrainCache {
  const pathFor = (key: string): string => join(dir, `${key}.bin`);

  return {
    async get(key: string): Promise<TerrainData | undefined> {
      let bytes: Buffer;
      try {
        bytes = await readFile(pathFor(key));
      } catch {
        return undefined; // cache miss
      }
      try {
        return decodeTerrain(new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength));
      } catch {
        return undefined; // corrupt / stale-format entry → treat as a miss
      }
    },

    async set(key: string, data: TerrainData): Promise<void> {
      await mkdir(dir, { recursive: true });
      await writeFile(pathFor(key), encodeTerrain(data));
    },
  };
}
