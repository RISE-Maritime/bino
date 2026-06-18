#!/usr/bin/env node
// Warm the terrain file-cache for every scenario that declares terrain
// (ADR-005, phase 3). Fetching each location once up front means later runs —
// and a Docker image that ships the cache dir — start fast and offline,
// without each first run paying the Overpass/GMRT round-trip.
//
//   pnpm build               # packages must be built first
//   pnpm prefetch:scenarios [scenariosDir]      # default: ./scenarios
//   BINO_TERRAIN_CACHE=/cache pnpm prefetch:scenarios
//
// Network tool — not run in CI. Cache keys match the @bino/node CLI exactly
// (shared terrainSourcesSignature), so a warmed entry is read on the next
// `bino-node <scenario>`. Imports the built dist by relative path so it runs
// from the repo root without the workspace packages being hoisted there.

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { argv, env, exit } from "node:process";
import { globSync } from "node:fs";
import {
  prepareTerrain,
  terrainProviderFromSources,
  terrainSourcesSignature,
} from "../packages/core/dist/index.js";
import {
  loadScenario,
  createFileTerrainCache,
  createFileSourceReaders,
} from "../packages/node/dist/index.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = resolve(argv[2] ?? resolve(repoRoot, "scenarios"));
const cacheDir = env.BINO_TERRAIN_CACHE || resolve(repoRoot, ".bino-cache/terrain");
const cache = createFileTerrainCache(cacheDir);
const files = globSync("**/*.yaml", { cwd: root }).sort();

let cached = 0;
let skipped = 0;
let failed = 0;

for (const f of files) {
  const path = resolve(root, f);
  let scene;
  try {
    scene = await loadScenario(path);
  } catch (e) {
    console.error(`✗ ${f}: ${e instanceof Error ? e.message : e}`);
    failed++;
    continue;
  }
  if (!scene.terrain) {
    skipped++;
    continue;
  }

  const t = scene.terrain;
  const readers = createFileSourceReaders(dirname(path));
  const provider = terrainProviderFromSources(t.sources, readers, {
    offline: t.offline,
    buildings: t.buildings,
    seamarks: t.seamarks,
    gridResM: t.grid_res_m,
  });
  const t0 = Date.now();
  try {
    await prepareTerrain(t.bbox, {
      cache,
      buildings: t.buildings,
      seamarks: t.seamarks,
      gridResM: t.grid_res_m,
      provider,
      ...(t.sources ? { sourcesSig: terrainSourcesSignature(t.sources) } : {}),
    });
    console.log(`✓ ${f}  (${Date.now() - t0} ms)`);
    cached++;
  } catch (e) {
    console.error(`✗ ${f}: ${e instanceof Error ? e.message : e}`);
    failed++;
  }
}

console.log(
  `\nprefetch: ${cached} cached, ${skipped} without terrain, ${failed} failed → ${cacheDir}`,
);
exit(failed ? 1 : 0);
