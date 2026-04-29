# Spike S11: OSM coastline data source

## Why

v0.4a needs to render a recognizable coastline in the viewer. The
design vision specifies OSM as the source. v0.4 task #3 is a
`loadCoastline(bbox)` helper in `@bino/core/src/terrain.ts`. Before
committing to an implementation, settle:

- **Data source.** Overpass API (live query, rate-limited) vs
  pre-processed shoreline products (GSHHS, OpenStreetMap-Coastline)
  vs Geofabrik regional .pbf extracts.
- **Library/parser choice.** Direct `fetch` + `osm2geojson` vs full
  Turf.js vs hand-rolled.
- **Polygon assembly.** OSM coastline ways are open line segments
  with a "land on left" orientation convention; turning them into
  closed polygons that span a bbox is a real bit of geometry. How
  fiddly is it for typical harbour bboxes?
- **Caching shape.** Fetched at scenario-compile time? On-disk cache
  per bbox (hash of bounds)?

## Acceptance

- A working fetch against Overpass for the Kiel bbox
  (10.05, 54.28, 10.25, 54.38) — same one the design vision YAML
  uses.
- Counts of nodes / ways / coastline segments returned, plus
  size of the response.
- Verdict on assembly: can we get a closed land polygon out of it
  with reasonable code, or is this multi-day work?
- A visualization (SVG dump of the geometry projected to local ENU)
  for visual sanity.
- `results.md` with the verdict + concrete library recommendations
  for v0.4 task #3.

## Out of scope

- Tile streaming (v2 concern).
- Multi-bbox composition.
- High-res inland features (only coastline).
- Clipping the coastline polygons against the bbox edges to make
  truly closed shapes — note the trade-off but don't fully solve.

## Time box

Half a day.
