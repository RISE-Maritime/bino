import { readFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import type { TerrainSourceReaders } from "@bino/core";

/** Filesystem-backed terrain source readers for local `geotiff`/`geojson`
 *  sources (ADR-005). Relative paths resolve against `baseDir` — the
 *  directory of the scenario file — so a scenario can reference data sitting
 *  next to it. */
export function createFileSourceReaders(baseDir: string): TerrainSourceReaders {
  const resolvePath = (p: string): string => (isAbsolute(p) ? p : resolve(baseDir, p));
  return {
    async readBinary(path: string): Promise<ArrayBuffer> {
      const buf = await readFile(resolvePath(path));
      // Slice to a standalone ArrayBuffer (the Buffer may be a view into a
      // larger pooled allocation).
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    },
    async readText(path: string): Promise<string> {
      return readFile(resolvePath(path), "utf8");
    },
  };
}
