# Spike S12: Bathymetry — verdict

**Spike date:** 2026-04-29
**Time spent:** ~30 min (well under the half-day box)
**Bbox tested:** Kiel approach `(10.05, 54.28, 10.25, 54.38)`.

## Headline

**`gmrt.org/services/GridServer` + `geotiff.js` is the right v0.4a
path.** No API key, no authentication, public HTTP. Returns a 35
m/px GeoTIFF for the Kiel bbox in ~1 s. `geotiff.js` parses it
cleanly; sampling to a 50 m grid gives ~58k vertices for the seabed
mesh — well within the perf budget of the v0.4a sea-shader work.

**EMODnet is the design-vision choice but blocked on portal
flow** — their high-resolution data products typically require
account / portal navigation rather than a single HTTP fetch. GMRT
is a strict superset for v0.4a coverage and a strict subset for
authentication friction. Use GMRT now; revisit EMODnet for v1.0
when European-bias data quality matters more than dev-loop speed.

## Numbers

```
fetched_bytes:        459310   (1 s first request, cached after)
raster:               365 × 314 px (1 sample/px, 32-bit float)
bbox (geotiff):       [10.0495, 54.2795, 10.2505, 54.3804]
depth range:          [-16.6 m, +62.0 m]   (negative = below sea level)
mean elevation:       +18.6 m              (Kiel bbox is mostly land)
valid pixels:         114245 / 114610      (365 NoData ≈ 0.3%)
resolution:           ~35 m/px lat, ~36 m/px lon
50 m grid sample:     260 × 223 = 57,980 vertices
```

PPM heightmap dump at `spikes/bathymetry/out/kiel-bathymetry.ppm` —
brown for land, blue ramp for sea (deeper = darker), magenta for
NoData. Visually unmistakable as Kiel.

## Why GMRT, not EMODnet (for now)

The design vision says "EMODnet (or equivalent regional source)" —
the equivalence clause already anticipates this pivot.

- **GMRT** ([gmrt.org](https://www.gmrt.org/services/GridServer.html))
  is the Global Multi-Resolution Topography from Lamont-Doherty.
  It's a public HTTP service: GET request with bbox + resolution,
  returns GeoTIFF / netCDF / png. No auth, no account, no rate
  limit advertised.
- **EMODnet** has equally good (better, in EU waters) data but its
  download portal is interactive — user picks region, format,
  product version, then downloads. Scriptable but a bit of work.
  Their WMS/WCS services exist but the public endpoints have less
  friendly bbox-arbitrary semantics.
- **GEBCO** is fine globally but coarser (~450 m at equator,
  ~250 m at lat 54° → noticeably blocky on a 10 km bbox).
- For v0.4a's "recognizable Kiel" acceptance bar, GMRT's 35 m/px is
  more than enough.

The data shape is identical across all four (single-channel float
depth, EPSG:4326), so swapping the source later is a one-line
change in `loadBathymetry`.

## Library decisions for v0.4a #4 (`@bino/core/src/terrain.ts`)

- **GeoTIFF reader: `geotiff` (npm).** ~150 KB, no native deps,
  works in Node and browser. `fromArrayBuffer(buf).getImage().readRasters()`
  is the entire API surface we need.
- **Fetch: Node 22 built-in.**
- **NoData handling.** `image.getFileDirectory().GDAL_NODATA` is
  the marker; in our test tile, NaN was used instead (the TIFF
  encodes NaN explicitly for ocean-clipped pixels). Handle both.

## Sampling-to-grid logic

```ts
function sampleToGrid(
  raster: Float32Array,
  rasterW: number,
  rasterH: number,
  bbox: BBox,
  gridResM: number,
): { heights: Float32Array; gridW: number; gridH: number } {
  const widthM = (bbox.east - bbox.west) * 111_320 * Math.cos(midLatRad(bbox));
  const heightM = (bbox.north - bbox.south) * 111_320;
  const gridW = Math.round(widthM / gridResM);
  const gridH = Math.round(heightM / gridResM);
  const heights = new Float32Array(gridW * gridH);
  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      const sx = Math.floor((gx / gridW) * rasterW);
      const sy = Math.floor((gy / gridH) * rasterH);
      heights[gy * gridW + gx] = raster[sy * rasterW + sx];
    }
  }
  return { heights, gridW, gridH };
}
```

Nearest-neighbour sampling is fine for v0.4a (raster is finer than
target grid); v0.5+ might want bilinear if grid resolution
approaches raster resolution.

## What surprised me

- **GMRT's response was ~35 m/px even though we asked for "high"
  resolution.** That's better than expected for a global service.
  EMODnet's higher-tier products are ~115 m, GEBCO ~450 m at this
  latitude, so GMRT is not actually a step down for our bbox.
- **The NaN encoding for NoData rather than the TIFF
  `GDAL_NODATA` tag.** Our test tile had no `GDAL_NODATA` set; NaN
  did the work. Either-or handling is a 2-line fix.
- **Land elevations in the Kiel bbox go up to +62 m.** I was set
  up to expect "all values negative" since this is a maritime
  emulator focused on sea. The bathymetry tile straddles
  sea/coast/land — the same single grid covers both regimes.
  v0.4a #5 (composing terrain mesh from coastline + bathymetry)
  should treat positive heights as land + negative as seabed and
  use the OSM coastline as the boundary marker — bathymetry's own
  zero-crossing is a fine fall-through if OSM coastline is missing.

## Acceptance vs the spike plan

| criterion                        | result                        |
| -------------------------------- | ----------------------------- |
| Working fetch of Kiel bathymetry | ✓ — GMRT                      |
| `geotiff.js` reads it            | ✓                             |
| Stats reported                   | ✓                             |
| PPM dump for visual sanity       | ✓ — `out/kiel-bathymetry.ppm` |
