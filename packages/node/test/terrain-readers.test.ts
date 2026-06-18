import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { terrainProviderFromSources } from "@bino/core";
import { createFileSourceReaders } from "../src/terrain-readers.js";

const dirs: string[] = [];
async function tempDir(): Promise<string> {
  const d = await mkdtemp(join(tmpdir(), "bino-readers-"));
  dirs.push(d);
  return d;
}
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

const bbox: [number, number, number, number] = [10.0, 54.0, 10.1, 54.1];

describe("createFileSourceReaders + provider", () => {
  it("reads a local geojson coastline by path relative to the scenario dir", async () => {
    const dir = await tempDir();
    await writeFile(
      join(dir, "coast.geojson"),
      JSON.stringify({
        type: "LineString",
        coordinates: [
          [10.0, 54.0],
          [10.05, 54.05],
        ],
      }),
    );

    const readers = createFileSourceReaders(dir);
    const provider = terrainProviderFromSources(
      { coastline: { type: "geojson", path: "coast.geojson" } },
      readers,
    );
    const chains = await provider.coastline!(bbox);
    expect(chains).toHaveLength(1);
    expect(chains[0]!.points[0]).toEqual([10.0, 54.0]);
  });

  it("surfaces a clear error when a local file is missing", async () => {
    const dir = await tempDir();
    const readers = createFileSourceReaders(dir);
    const provider = terrainProviderFromSources(
      { coastline: { type: "geojson", path: "nope.geojson" } },
      readers,
    );
    await expect(provider.coastline!(bbox)).rejects.toThrow(/nope\.geojson/);
  });
});
