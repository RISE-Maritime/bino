# Spike S12: Bathymetry data source

## Why

v0.4a needs a 3D seabed. Design vision says EMODnet; in practice
several public bathymetry services produce GeoTIFFs for an arbitrary
bbox, and any of them could fill the v0.4a slot. Settle:

- **Service.** EMODnet vs GEBCO vs GMRT vs NOAA. EMODnet is the
  design-vision choice; GMRT (gmrt.org) is the easiest practical
  one because it serves an HTTP API for arbitrary bbox without
  authentication.
- **Library.** `geotiff.js` is the standard JS GeoTIFF reader.
  Verify it parses a real bathymetry tile and that we can sample
  to a regular grid.
- **Data shape.** Depth values, projection, NoData handling.
- **Resolution vs bbox size.** What does a 10 km × 10 km tile look
  like at high resolution? Useful for the wave-mesh density choice
  in #6.

## Acceptance

- A working fetch of a Kiel-area bathymetry tile.
- `geotiff.js` reads the tile and we extract a depth grid.
- Stats: dimensions, depth range, NoData count.
- A heightmap PPM dump for visual sanity.
- `results.md` with the verdict.

## Out of scope

- Multiple sources / fall-through.
- Higher-resolution products that require API keys.
- Coordinate-system transforms beyond what the service ships
  (EPSG:4326 is fine for v0.4a).

## Time box

Half a day.
