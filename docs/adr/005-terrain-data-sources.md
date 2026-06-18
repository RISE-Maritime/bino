# ADR-005: Pluggable terrain data sources — any location, custom & offline

**Status:** Accepted — complete 2026-06-18 (streamed cosmetic layers intentionally not pursued; see backlog)
**Date:** 2026-06-18
**Context:** Make Bino usable for "any" modelled location: generalize the
terrain pipeline beyond the two hardcoded public APIs, let users supply
custom and **local/offline** data sources, and cut first-load time.

## Problem

Today the terrain pipeline (`prepareTerrain`, `terrain.ts` / `overpass.ts`)
fetches four layers from two hardcoded public services:

| Layer      | Source       | Endpoint (hardcoded)              |
| ---------- | ------------ | --------------------------------- |
| coastline  | OSM Overpass | `overpass-api.de/api/interpreter` |
| buildings  | OSM Overpass | same                              |
| seamarks   | OSM Overpass | same                              |
| bathymetry | GMRT         | `gmrt.org/services/GridServer`    |

Three structural limitations block "any location":

1. **No source abstraction.** URLs and Overpass QL are inlined in
   `fetch()` calls; the only pluggable seam is `TerrainCache`. There is no
   way to point at a self-hosted Overpass, swap bathymetry providers, or
   feed local data.
2. **No offline / bring-your-own-data path.** Classified, proprietary, or
   air-gapped areas cannot run at all (the only "offline" trick is
   hand-populating the JSON cache — brittle and undocumented). Offline is
   a **must-have**.
3. **Fragile + slow first load.** `coastline` and `bathymetry` failures
   are _not_ caught (`terrain.ts:248`), so a transient public-API 5xx
   hard-fails the whole scenario; there is no retry. The browser viewer
   passes no cache (`viewer.ts:94`), so every page load refetches.

Coverage also degrades **silently**: OSM seamark/building density and GMRT
bathymetry resolution vary wildly by region, with no signal to the user.

The one strong asset: the in-memory contract (`TerrainData`,
`CoastlineChain`, `BathymetryGrid`, `BuildingData`, `SeamarkData`) is
already source-agnostic and decoupled from the renderer. The design builds
on it rather than changing it.

## Decision

### 1. Per-layer `TerrainProvider` interface (the composition seam)

Layers are independent, so the seam is per-layer — a user can override one
(custom high-res bathymetry) and keep the OSM defaults for the rest.

```ts
interface TerrainProvider {
  coastline?(bbox: Bbox): Promise<CoastlineChain[]>;
  bathymetry?(bbox: Bbox): Promise<BathymetryGrid>;
  buildings?(bbox: Bbox): Promise<BuildingData[]>;
  seamarks?(bbox: Bbox): Promise<SeamarkData[]>;
}
```

`prepareTerrain` resolves each layer from a **provider chain** (scenario-
specified → default OSM/GMRT), composing the four into `TerrainData`. The
default provider preserves today's behavior exactly, so existing scenarios
are unchanged.

### 2. Core stays environment-agnostic; hosts realize sources

Mirroring the existing `TerrainCache` split (interface in `core`, fs impl
in `@bino/node`):

- **core** owns the `TerrainProvider` interface, the data shapes, and
  **pure parsers** — `parseGeoTiff(ArrayBuffer) → BathymetryGrid`,
  `parseGeoJson(object) → CoastlineChain[] | BuildingData[]`,
  `parseSeamarks(object) → SeamarkData[]` — plus the network providers
  (Overpass/GMRT) which only need `fetch`.
- **@bino/node** owns the **file-backed provider** (reads local paths via
  `fs`, resolving paths relative to the scenario file) and the existing
  file cache.
- **viewer** can realize local sources as `fetch(url)` against bundled
  assets.

A per-host **provider factory** interprets the DSL `sources` block (below)
into a `TerrainProvider`: the node factory reads files; the viewer factory
fetches URLs. Path/`fs` concerns never leak into core.

### 3. DSL `terrain.sources` block (declarative, the ease-of-use surface)

```yaml
terrain:
  bbox: [west, south, east, north]
  sources:
    bathymetry: { type: geotiff, path: ./kiel.tif }
    coastline: { type: geojson, path: ./coast.geojson }
    buildings: { type: overpass, endpoint: http://my-overpass/api }
    seamarks: { type: none }
```

Per-layer source kinds: `overpass` (optional `endpoint`), `gmrt` (optional
`endpoint`), `geotiff` (bathymetry; `path`), `geojson` (coastline/buildings;
`path`), `csv`/`geojson` (seamarks; `path`), `none` (skip). Omitting
`sources` (or a layer) falls back to the current OSM/GMRT default. GeoTIFF
ingestion reuses the `geotiff.js` dependency already present for GMRT.

### 4. Offline-first (must-have)

- **Local loaders** make local files a _first-class input_, not a cache
  hack — the primary offline story.
- **Endpoint overrides** via DSL `endpoint` and env (`BINO_OVERPASS_URL`,
  `BINO_GMRT_URL`) allow a self-hosted Overpass / mirror.
- **A `terrain.offline: true` (or `--offline`) assertion** fails fast if
  any resolved layer would touch the network — so an air-gapped run can't
  silently depend on a public API.

### 5. Robustness (so "any location" never hard-crashes)

- Network providers get **bounded retry + backoff**.
- **All four layers degrade gracefully**: a failed `coastline`/`bathymetry`
  no longer rejects `prepareTerrain` — it logs a clear warning and yields a
  placeholder (flat seabed / empty coastline), matching how buildings /
  seamarks already behave.
- **Data-thinness signals**: `prepareTerrain` logs when a layer comes back
  empty or coarse (e.g. "0 seamarks in bbox", "bathymetry ≈ GEBCO 500 m")
  so silent quality cliffs become visible.

### 6. Load time

- **Viewer IndexedDB cache** — implement the `TerrainCache` the interface
  comment already anticipates; wire it into `viewer.ts` (today: no cache).
- **Prebuilt terrain bundles** — a `prefetch:scenarios` step (CI / Docker)
  fetches each scenario's terrain once and ships the serialized result
  beside it; first load becomes a static/CDN fetch that also sidesteps
  public-API fragility. This is the strongest "fast + robust + easy" move
  for distributed scenarios.
- **Binary cache format** — store `bathymetry.heights` as the raw
  `Float32Array` buffer instead of JSON `number[]` (smaller, faster
  (de)serialize).
- **Stream cosmetic layers** — build the scene once `coastline` +
  `bathymetry` resolve; add buildings/seamarks asynchronously.
- **Expose `gridResM`** (today hardcoded 50 m) to trade fidelity for speed.

## Phasing

1. **Robustness & endpoints** (small, unblocks "works anywhere today"):
   env-var endpoint overrides; retry/backoff; graceful degradation of
   coastline/bathymetry; thinness warnings.
2. **Custom + offline sources** (the architectural core; offline must-have):
   `TerrainProvider` interface + provider chain in `prepareTerrain`; DSL
   `sources` block + per-host provider factory; core parsers
   (GeoTIFF/GeoJSON/seamarks) + node file provider; `offline` assertion.
3. **Load time**: viewer IndexedDB cache; `prefetch:scenarios` + bundle
   shipping; binary cache; streamed cosmetic layers; `gridResM` knob.

Phases are largely independent and ship incrementally; 1 and 3 don't block
on 2.

## Consequences

- **DSL grows but stays backward-compatible.** `terrain.sources` is
  optional; absent → today's OSM/GMRT behavior. Existing 15 scenarios +
  templates are untouched.
- **New parser surface in core** (GeoTIFF/GeoJSON) — pure and unit-testable
  without network or fs; the host file/URL realization is the only
  environment-specific part.
- **Graceful degradation changes failure semantics**: a scenario that
  previously hard-failed on a flaky API now renders a degraded scene with a
  warning. Strict-offline / CI runs that want hard failure use the
  `offline` assertion or a future `--strict-terrain` flag.
- **Cache format change** is breaking for on-disk caches — bump a cache
  version segment in the key so stale JSON entries are ignored, not
  mis-read.

## Alternatives considered

1. **Single monolithic `TerrainProvider.fetchAll(bbox)`.** Rejected:
   forces all-or-nothing source substitution; can't override one layer.
2. **Cache-only offline (document the JSON cache as the BYO path).**
   Rejected: offline is must-have and the cache format is an internal
   detail, not a stable input contract; local files must be first-class.
3. **Generic GDAL/OGR dependency for arbitrary formats.** Rejected for now:
   heavy native dep; GeoTIFF (already vendored) + GeoJSON cover the dominant
   maritime cases. Revisit if NetCDF/S57 demand appears.
4. **Per-layer independent bboxes.** Deferred: local files define their own
   extent and the scenario bbox already clips; revisit if mixed-extent
   sources prove necessary.

## Backlog

(Phase 1 — ✅ done) endpoint env vars (`BINO_OVERPASS_URL` / `BINO_GMRT_URL`);
`fetchWithRetry` with bounded backoff; coastline/bathymetry graceful
degradation (`flatBathymetry` placeholder); empty-layer thinness warnings.
(Phase 2 — ✅ done) per-layer `TerrainProvider` + default fallback in
`prepareTerrain`; DSL `terrain.sources` + `offline`; `terrainProviderFromSources`
factory with layer/type validation + offline assertion; core parsers
(`parseGeoTiffBathymetry`/`sampleRasterToGrid`, GeoJSON coastline/buildings/
seamarks); per-source `endpoint` overrides; node fs readers + CLI wiring;
source-signature cache key. Deferred within phase 2: CSV seamark loader and
the browser (fetch-backed) file provider — GeoJSON + node cover the
must-have offline path; both are additive later.
(Phase 3 — ✅ core delivered) `gridResM` knob (`terrain.grid_res_m`, threaded
through prepareTerrain/provider/CLI + cache key); viewer IndexedDB
`TerrainCache` wired into `viewer.ts`; `prefetch:scenarios` script warming the
file cache (shippable in Docker), with a shared `terrainSourcesSignature` so
warmed keys match the CLI. **Not pursued** (ADR closed): streamed cosmetic
layers — it touches the well-tested scene-build flow for only a modest
perceived-latency gain, and the cache/bundle work already covers the dominant
load-time cost. Revisit if first-paint latency becomes a real complaint.
(Phase 3 follow-up — ✅ done) browser static-bundle first-load fetch:
`createStaticBundleCache` (read-only `fetch` of `{BASE_URL}terrain/<key>.bin`)
composed in front of the IndexedDB cache by `createViewerTerrainCache` —
IndexedDB → bundle (warming IndexedDB) → network. `pnpm viewer:prefetch`
populates `packages/viewer/static/terrain/` (gitignored); a 404 is a normal
miss that falls back to the network.
(Phase 3 follow-up — ✅ done) binary cache format (`terrain-codec`):
magic+versioned JSON manifest + typed-array sections (Float32 heights, Float64
coords); the node file cache and viewer bundles are now `.bin` (old `.json`
entries are simply missed → refetched once). **Honest result, measured:** the
win is **parse speed and uncompressed footprint**, not a blanket size cut.
Heights pack ~2× smaller (4 B vs decimal text); coords as Float64 are only ~1.3×
smaller than short JSON numbers and can be _larger_ for low-precision values —
and gzipped coordinate _text_ compresses better than gzipped float bytes, so on
a gzip-enabled host JSON transfer was competitive. Binary's durable advantages:
no `JSON.parse` of a multi-MB string (a real main-thread stall for big viewer
bundles) and smaller at-rest disk/Docker. The full-Kiel bundle (~21 MB before)
is dominated by OSM building/coastline vertices; `grid_res_m`, per-layer `none`,
or a smaller bbox remain the real levers for raw size.
