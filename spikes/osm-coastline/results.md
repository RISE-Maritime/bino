# Spike S11: OSM coastline — verdict

**Spike date:** 2026-04-29
**Time spent:** ~30 min (well under the half-day box)
**Bbox tested:** Kiel approach `(10.05, 54.28, 10.25, 54.38)` — same
as the design vision YAML example.

## Headline

**Overpass API + plain `fetch` works fine for v0.4. No third-party
JS library needed for ingest.** Minimal-dep path:

1. `fetch` POST to `https://overpass-api.de/api/interpreter` with
   `data=<Overpass QL>` form-encoded.
2. Parse the JSON response; `elements` contains `node` records and
   `way` records.
3. Build a `Map<id, node>`, then expand each way's `nodes: number[]`
   into `[lon, lat][]`.
4. Stitch ways that share endpoints into longer chains
   (~30 LOC; coastline ways are typically split at tile boundaries
   upstream).

For the Kiel bbox the result is a **single chain of 1474 points**
(9 input ways, 1473 segments, all stitched into one continuous
coastline). Render as `THREE.Line` / `LineSegments` and you have
the coastline outline.

## Numbers

```
fetched_bytes:        147068   (1127 ms first request, cached after)
nodes:                  1474
ways:                      9
segments:               1473
chains after stitching:    1   (open: extends past bbox edges)
longest chain points:   1474
```

SVG visualization at `spikes/osm-coastline/out/kiel-coastline.svg` —
shows the Kiel coastline traced cleanly across the bbox.

## What we don't have (and what to do about it)

The single chain is **open** — it enters and exits the bbox at the
edges. That's expected: OSM coastline ways are oriented "land on
left" but they don't form closed polygons by themselves; closing
requires _clipping against the bbox edges_ and then stitching the
edge-walks into the coastline endpoints to form a sea-vs-land
boundary.

For v0.4a's first cut, we have two options:

1. **Outline-only rendering.** Draw the chain as a polyline at z=0
   (sea level). Visually distinguishes coast from sea but doesn't
   fill the landmass — the seabed (from EMODnet, S12) shows through
   the "land" area. Cheap, looks somewhat like a map. **5 LOC of
   work in `buildScene`.**
2. **Filled landmass.** Clip the chain against the bbox to make a
   closed land polygon, then `earcut` (~10 KB dep) to triangulate
   for `THREE.Mesh` rendering. Visually correct (land sits above
   bathymetry, ocean is its own surface). Maybe **half a day** of
   geometry — bbox-edge stitching is fiddly because you have to
   trace along the bbox between the points where the coastline
   exits and re-enters, and the "land on left" convention determines
   direction.

**Recommendation for v0.4a #3:** ship option 1 first (outline only) so
the demo is recognizable. Add option 2 as a follow-up if the
flat-seabed-under-where-land-should-be looks visually wrong; defer
to v0.5 if it doesn't bite. The v0.4a acceptance ("recognizable Kiel
coastline geometry") is met by option 1 — the user will see Kiel-
shaped lines on the water, not a weirdly-flat continent.

## Library decisions for v0.4a #3 (`@bino/core/src/terrain.ts`)

- **Fetch:** Node 22 built-in `fetch`. **No HTTP client library
  needed.** Overpass requires `Content-Type:
application/x-www-form-urlencoded` + an explicit `Accept` header
  (their server returns 406 if Accept is missing or doesn't match —
  this took two attempts to figure out). User-Agent is courteous,
  not strictly required.
- **OSM parser:** None. The JSON shape is trivial; the ~30-LOC
  parser/stitcher in this spike is the entire implementation.
- **GeoJSON conversion:** **Skip.** `osm2geojson` is a real library
  but adds 20+ KB of deps for a transformation we can do inline
  with the parser/stitcher.
- **Triangulation:** `earcut` (Mapbox, ~10 KB, well-maintained, no
  deps). Only needed if we go with filled-polygon rendering — defer
  the dep until then.
- **Clipping:** `polygon-clipping` (~30 KB) for the bbox-clip dance
  if/when we need closed polygons. Same deferral.

## Caching

In-memory + on-disk JSON. The Overpass response for Kiel is 147 KB;
caching is a courtesy to the public Overpass instance (rate-limited)
and a dev-loop speed-up (1.1 s → ~5 ms).

For v0.4a #3, cache key = `sha256(bbox).hex` or the simple
`{south}_{west}_{north}_{east}` shape this spike uses. Cache dir
`~/.cache/bino/osm/`.

## What surprised me

- **Overpass's 406 behaviour.** No Accept header → 406 Not
  Acceptable. curl works because it sends `Accept: */*` by default;
  Node fetch is stricter. Documented now in the spike script.
- **One single chain across the whole bbox.** Expected multiple
  chains (Kiel canal entry, peninsulas, etc.). The fact that the
  upstream coastline ways stitch together into one chain is helpful
  — the assembly logic is simpler than feared.
- **No need for any OSM-specific JS library** for this scope. The
  Overpass JSON is plain enough that our 30 LOC parses it.

## Acceptance vs the spike plan

| criterion                       | result                                       |
| ------------------------------- | -------------------------------------------- |
| Working Overpass fetch for Kiel | ✓                                            |
| Counts & response size          | ✓ — 1474/9/147 KB                            |
| Verdict on assembly             | ✓ — outline-first for v0.4a, filled deferred |
| SVG visualization               | ✓ — `out/kiel-coastline.svg`                 |

## What v0.4a #3 looks like in code

Pseudocode, ~80 LOC total:

```ts
async function loadCoastline(bbox: BBox): Promise<LineString[]> {
  const cached = await readCache(bbox);
  if (cached) return cached;

  const data = await fetchOverpass(coastlineQuery(bbox));
  const lineStrings = parseElements(data);
  const chains = stitch(lineStrings);

  await writeCache(bbox, chains);
  return chains;
}
```

Each `LineString` is `[lon, lat][]`. Conversion to local ENU happens
in `buildScene` via the existing `geodeticToEnu` helper.
