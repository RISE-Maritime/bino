# Environment models

## Sea surface

Animated Gerstner wave synthesis via a custom GLSL ShaderMaterial. Based on GPU Gems 1, Chapter 1 (Finch, "Effective Water Simulation from Physical Models").

### Wave components

Four superimposed Gerstner waves derived from `environment.sea_state`:

- Peak wavelength: `L_peak = g * T^2 / (2*pi)` where T = peak_period, g = 9.81 m/s^2
- Amplitude: `A = Hs / 4` (significant wave height ~ 4\*sigma in standard ocean engineering convention)
- Four components at wavelengths L, 0.5L, 0.25L, 0.7L with decreasing amplitudes (1.0, 0.6, 0.4, 0.3 x A) and increasing directional spread

### Vertex displacement (GLSL)

Per vertex, per wave component:

```
k = 2*pi / L
w = sqrt(g * k)
phase = k * dot(D, pos.xz) - w * t

displaced.x += Q * A * D.x * cos(phase)
displaced.z += Q * A * D.z * cos(phase)
displaced.y += A * sin(phase)
```

where Q = steepness parameter (0.2--0.5), D = wave direction unit vector.

Surface normal derived analytically from tangent/binormal cross product (no finite differences).

### Mesh parameters

Default: 4 km x 4 km plane, 384 segments per side (~10 m per segment). Peak wavelengths in normal seas (30--100 m) resolve at 3--10 segments per crest.

### Future work

Pierson-Moskowitz spectral sampling for wave component selection (currently manual tuning). The shader itself does not change.

## Terrain data sources

### OSM coastline

- Source: Overpass API query for `natural=coastline` within the scenario bbox
- Processing: Way stitching into continuous chains, coordinate transform to local ENU frame
- Cache: Per-bbox at `~/.cache/bino/osm/`
- Output: `TerrainData.coastline` -- array of [x, z] chains in local frame

### Landmask

When `terrain.landmask: true`, coastline chains are closed into filled polygons and triangulated (earcut). Extruded to a small height above sea level. Used for land/sea discrimination in the scene.

Note: Open coastline chains that exit the bbox require proper edge-clipping. This is implemented but edge cases exist with chains far past the bbox boundary.

### GMRT bathymetry

- Source: GMRT GridServer (Marine Geoscience Data System)
- Format: GeoTIFF parsed via geotiff.js
- Resolution: ~35 m/pixel at typical scenario bboxes
- Processing: Vertex grid to mesh, depth-tinted material (shallow to deep colour ramp)
- Cache: Per-bbox at `~/.cache/bino/gmrt/`

### Buildings

When `terrain.buildings: true`: OSM building footprints queried via Overpass API, extruded to `building:levels * 3 m` height. Simple box geometry per building.

### Seamarks

When `terrain.seamarks: true`: OSM seamark features queried via Overpass API. Placeholder geometry per `seamark:type` (buoys, beacons, lights).

### Endpoints and reliability (ADR-005, phase 1)

- **Endpoint overrides.** The Overpass and GMRT endpoints default to the public
  instances but can be redirected — e.g. to a self-hosted Overpass — via the
  `BINO_OVERPASS_URL` and `BINO_GMRT_URL` environment variables. This is the
  cheapest way to escape the public instances' rate limits.
- **Retry/backoff.** Network fetches retry transient failures (network errors
  and HTTP 408/425/429/5xx) with bounded exponential backoff before giving up.
- **Graceful degradation.** A layer that still fails after retries no longer
  aborts the scenario: coastline/buildings/seamarks fall back to empty and
  bathymetry to a flat placeholder seabed, each with a logged warning. A
  successfully-fetched but empty layer is logged at info level, since it usually
  means the region is poorly mapped rather than genuinely featureless.
- Forthcoming (ADR-005 phases 2-3): custom/local data sources (GeoTIFF/GeoJSON),
  a strict-offline assertion, and prebuilt terrain bundles.

## Sky and lighting

Three.js Preetham sky model (`three/examples/jsm/objects/Sky.js`) driven by `environment.time_of_day`.

### Solar position

Simplified astronomical model:

- Day of year fixed to summer solstice (172)
- Declination: 23.4 degrees
- Hour angle: `(hours - 12) * 15` degrees
- Elevation: `sin(el) = sin(lat)*sin(decl) + cos(lat)*cos(decl)*cos(HA)`
- Azimuth: `atan2(sin(HA), cos(HA)*sin(lat) - tan(decl)*cos(lat))`

Adequate for "sun in roughly the right place for the time of day." Not adequate for shadow-casting validation.

### Lighting

- DirectionalLight at sun position, intensity = `0.2 + 0.9 * max(0, sin(elevation))`
- AmbientLight at `0.15 + 0.25 * max(0, sin(elevation))`
- Below-horizon sun clamped to minimum ambient (twilight glow, not pitch-black)

## Geo-registration

WGS84 anchor defines the local ENU (East-North-Up) frame origin.

- Entities positioned in either local ENU coordinates or lat/lon (the scene compiler converts)
- Terrain data fetched for the anchor's bbox
- Required for inject-mode mixed-reality: synthetic objects at a specific lat/lon must appear correctly relative to real sensor data
