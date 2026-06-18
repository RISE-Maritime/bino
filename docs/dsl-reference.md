# Scenario DSL Reference

> Source of truth: Zod schemas in `packages/core/src/dsl.ts`. This
> document renders them human-readable; if a field is missing here,
> check the source.

## Top-level structure

```yaml
scenario:
  name: string # required
  anchor: Anchor # required
  vessels: [Vessel, ...] # at least one
  modes: Modes # required
  keelson: Keelson # required (key-identity cascade root; see Keelson identity)
  environment: Environment # optional (defaults shown below)
  terrain: Terrain # optional
```

## Anchor

WGS84 position defining the local ENU frame origin.

| Field    | Type   | Constraints        |
| -------- | ------ | ------------------ |
| `lat`    | number | -90 to 90          |
| `lon`    | number | -180 to 180        |
| `height` | number | metres above WGS84 |

## Environment

| Field            | Type     | Default   | Description                                                 |
| ---------------- | -------- | --------- | ----------------------------------------------------------- |
| `sea_state`      | SeaState | --        | Wave parameters (optional)                                  |
| `wind`           | Wind     | --        | Wind parameters (optional)                                  |
| `time_of_day`    | string   | `"12:00"` | HH:MM, 24-hour format                                       |
| `visibility_m`   | number   | 20000     | Meteorological visibility (m)                               |
| `rain_rate_mm_h` | number   | 0         | Precipitation rate (mm/h); drives radar weather attenuation |

### SeaState

| Field                     | Type   | Description                          |
| ------------------------- | ------ | ------------------------------------ |
| `significant_wave_height` | number | Hs in metres (>= 0)                  |
| `peak_period`             | number | Tp in seconds (> 0)                  |
| `direction_deg`           | number | Wave propagation direction (degrees) |
| `spectrum`                | string | `"pierson_moskowitz"` (only option)  |

### Wind

| Field           | Type   | Description                   |
| --------------- | ------ | ----------------------------- |
| `speed`         | number | m/s (>= 0)                    |
| `direction_deg` | number | Wind-from direction (degrees) |

## Terrain

When present, the scene compiler fetches coastline + bathymetry (and
optionally buildings/seamarks) for the bounding box. By default each layer
comes from the public OSM/GMRT sources; `sources` overrides per layer.

| Field       | Type           | Default | Description                                     |
| ----------- | -------------- | ------- | ----------------------------------------------- |
| `bbox`      | [W, S, E, N]   | --      | Bounding box in degrees (required)              |
| `landmask`  | boolean        | true    | Generate filled land polygons from coastline    |
| `buildings` | boolean        | true    | Include building footprints                     |
| `seamarks`  | boolean        | true    | Include seamark features                        |
| `sources`   | TerrainSources | --      | Per-layer source overrides (see below)          |
| `offline`   | boolean        | false   | Assert no layer touches the network (see below) |

### Terrain sources (ADR-005)

`terrain.sources` selects where each layer's data comes from. Any layer you
omit falls back to its default public source, so you override only what you
need. File paths resolve relative to the scenario file.

```yaml
terrain:
  bbox: [10.05, 54.28, 10.25, 54.38]
  sources:
    bathymetry: { type: geotiff, path: ./kiel.tif }
    coastline: { type: geojson, path: ./coast.geojson }
    buildings: { type: overpass, endpoint: http://my-overpass/api }
    seamarks: { type: none }
```

Each layer takes one source spec:

| `type`     | Fields            | Valid layers                      |
| ---------- | ----------------- | --------------------------------- |
| `overpass` | `endpoint?` (URL) | coastline, buildings, seamarks    |
| `gmrt`     | `endpoint?` (URL) | bathymetry                        |
| `geotiff`  | `path` (file)     | bathymetry                        |
| `geojson`  | `path` (file)     | coastline, buildings, seamarks    |
| `none`     | --                | any (skip; bathymetry → flat sea) |

Endpoints also have global env overrides (`BINO_OVERPASS_URL`,
`BINO_GMRT_URL`). An invalid layer/type pairing fails when the scene is built.

### Offline mode

`offline: true` asserts the scene needs no network: every layer that would
load (coastline + bathymetry always; buildings/seamarks when their flag is
true) must be a local (`geotiff`/`geojson`) or `none` source. Any network or
unspecified layer fails fast at build time — the way to guarantee an
air-gapped or reproducible run.

## Vessels

| Field         | Type             | Description                                                        |
| ------------- | ---------------- | ------------------------------------------------------------------ |
| `id`          | string           | Unique vessel identifier                                           |
| `model`       | string           | Asset registry name (see below)                                    |
| `pose_source` | PoseSource       | Where poses come from                                              |
| `sensors`     | Sensor[]         | List of sensors (default: [])                                      |
| `dimensions`  | VesselDimensions | Override model dimensions (optional)                               |
| `keelson`     | VesselKeelson    | Per-vessel key-identity overrides (optional; see Keelson identity) |

### PoseSource

Discriminated union on `type`:

**zenoh** -- a single `frame_transform` topic carrying a full pose in the
three.js scene frame. For local / FMI-synthetic sources that already produce
scene-frame coordinates.

| Field   | Type      | Description                              |
| ------- | --------- | ---------------------------------------- |
| `type`  | `"zenoh"` |                                          |
| `topic` | string    | Zenoh key expression for frame_transform |

**keelson_nav** -- decomposed navigation subjects, the shape a real
AIS/GNSS/MAVLink feed publishes. Bino subscribes to `location_fix` +
`heading_true_north_deg` (+ optional `pitch_deg`/`roll_deg`), fuses them
(latest-wins, position-triggered), and projects the fix through the scenario
`anchor` itself. Own-ship uses bare keys; observed traffic sets `target_id`
for keelson's `@target` extension.

| Field       | Type            | Description                                                                   |
| ----------- | --------------- | ----------------------------------------------------------------------------- |
| `type`      | `"keelson_nav"` |                                                                               |
| `base_path` | string          | optional — inherits the cascade (vessel → scenario) when unset                |
| `entity_id` | string          | optional — inherits the vessel id when unset; set to the receiver for traffic |
| `source_id` | string          | the source producing nav, e.g. `gnss_compass`, `ais` (may contain `/`)        |
| `target_id` | string          | optional — e.g. `mmsi_245060000` for observed traffic (`@target`)             |

Keys built as `{base_path}/@v0/{entity_id}/pubsub/{subject}/{source_id}` (with
`/@target/{target_id}` appended when set), for each of the four subjects. The
`base_path` and `entity_id` segments resolve through the cascade in
[Keelson identity](#keelson-identity-key-cascade); compilation **warns** when a
feed sets `target_id` (observed traffic) but leaves `entity_id` resolving to the
vessel itself, since the receiving platform was likely meant to be named.

### VesselDimensions

Optional override for the asset registry defaults.

| Field    | Type   | Description     |
| -------- | ------ | --------------- |
| `length` | number | LOA in metres   |
| `beam`   | number | Beam in metres  |
| `draft`  | number | Draft in metres |

## Sensor types

Discriminated union on `type`. All sensors share a common `mount` block.

### Mount

Sensor placement in the vessel's body frame.

| Field       | Type   | Default | Description                                  |
| ----------- | ------ | ------- | -------------------------------------------- |
| `x`         | number | --      | Longitudinal offset from amidships (m, +fwd) |
| `y`         | number | --      | Vertical offset from waterline (m, +up)      |
| `z`         | number | --      | Lateral offset from centreline (m, +stbd)    |
| `yaw_deg`   | number | 0       | Pan about up (+Y); 0 = over the bow          |
| `pitch_deg` | number | 0       | Elevation about starboard (+Z)               |
| `roll_deg`  | number | 0       | Roll about the bow (+X)                      |

Body frame: **X-forward, Y-up, Z-starboard** (ADR-003). For the camera, the
`−Z` look axis is aimed at the bow, so `yaw = 0` looks over the bow; lidar and
radar are 360°-native and emit in the body frame regardless of mount yaw.

### Camera (`type: "camera"`)

| Field                    | Type            | Default | Constraints                                              |
| ------------------------ | --------------- | ------- | -------------------------------------------------------- |
| `id`                     | string          | --      |                                                          |
| `fov_deg`                | number          | --      | (0, 180]                                                 |
| `resolution`             | [width, height] | --      | positive integers                                        |
| `rate_hz`                | number          | --      | > 0                                                      |
| `phase_offset_s`         | number          | 0       | scheduling offset                                        |
| `exposure_time_s`        | number          | 0       | exposure interval (s)                                    |
| `publish_topic_override` | string          | --      | override Keelson topic (bypasses identity resolution)    |
| `frame_id`               | string          | --      | override payload frame_id (default `{vessel}/{sensor}`)  |
| `keelson`                | SensorKeelson   | --      | per-sensor key-identity overrides (see Keelson identity) |

### Lidar (`type: "lidar"`)

| Field                    | Type          | Default    | Constraints                                              |
| ------------------------ | ------------- | ---------- | -------------------------------------------------------- |
| `id`                     | string        | --         |                                                          |
| `channels`               | int           | --         | > 0                                                      |
| `range_m`                | number        | --         | > 0                                                      |
| `rate_hz`                | number        | --         | > 0                                                      |
| `phase_offset_s`         | number        | 0          | scheduling offset                                        |
| `fov_h_deg`              | number        | 360        | (0, 360]                                                 |
| `azimuths`               | int           | = channels | horizontal samples                                       |
| `publish_topic_override` | string        | --         | override Keelson topic (bypasses identity resolution)    |
| `frame_id`               | string        | --         | override payload frame_id (default `{vessel}/{sensor}`)  |
| `keelson`                | SensorKeelson | --         | per-sensor key-identity overrides (see Keelson identity) |

### Marine Radar (`type: "radar_marine"`)

| Field                    | Type          | Default | Constraints                                              |
| ------------------------ | ------------- | ------- | -------------------------------------------------------- |
| `id`                     | string        | --      |                                                          |
| `range_m`                | number        | --      | > 0                                                      |
| `rotation_rate_hz`       | number        | --      | > 0                                                      |
| `phase_offset_s`         | number        | 0       | scheduling offset                                        |
| `beam_width_deg`         | number        | --      | (0, 360]                                                 |
| `spokes_per_rev`         | int           | --      | > 0                                                      |
| `range_bins`             | int           | --      | > 0                                                      |
| `publish_topic_override` | string        | --      | override Keelson topic (bypasses identity resolution)    |
| `frame_id`               | string        | --      | override payload frame_id (default `{vessel}/{sensor}`)  |
| `keelson`                | SensorKeelson | --      | per-sensor key-identity overrides (see Keelson identity) |

## Modes

| Field         | Values                            | Description           |
| ------------- | --------------------------------- | --------------------- |
| `rendering`   | `replace`, `inject`, `inject_all` | V&V rendering mode    |
| `clock`       | `wall`, `stepped`, `external_fmi` | Time source           |
| `determinism` | `strict`, `relaxed`               | Reproducibility level |

**`replace`** -- Fully synthetic world. All entities and terrain rendered.

**`inject`** -- Synthetic objects only. Terrain and sea suppressed. For
overlaying ghost targets on real sensor feeds.

**`inject_all`** -- Like replace, but with external clock and strict
determinism. For SIL/HIL/BIL setups.

## Compile-time validation

- `strict` determinism requires `stepped` clock. Other combinations
  raise a compile error.
- `inject` mode with `relaxed` determinism emits a warning (inject
  typically requires tight time-sync).
- Sensor `id` values must be unique within each vessel (duplicates
  raise a parse error).
- Vessel `id` values must be unique across the scenario.

## Asset registry

Built-in named models with default dimensions:

| Model         | Length | Beam | Draft | Superstructure                        |
| ------------- | ------ | ---- | ----- | ------------------------------------- |
| `tanker_120m` | 120 m  | 20 m | 6 m   | 18 m long, 14 m high, offset 40 m aft |
| `ferry_60m`   | 60 m   | 14 m | 3.5 m | 25 m long, 10 m high, offset 5 m aft  |
| `cargo_90m`   | 90 m   | 16 m | 5 m   | 14 m long, 12 m high, offset 30 m aft |

Unknown model names fall back to 80 m x 14 m x 4 m with no
superstructure.

## Keelson identity (key cascade)

Every key Bino touches has the shape
`{base_path}/@v0/{entity_id}/pubsub/{subject}/{source_id}[/@target/{target_id}]`.
The four **identity** segments resolve through one cascade — the same rules for
sensor **output** and pose **input** (ADR-004). `subject` and the `@v0` version
are always derived, never set.

| Segment     | Resolution                                                         | Default               |
| ----------- | ------------------------------------------------------------------ | --------------------- |
| `base_path` | sensor/pose → vessel → **scenario** (`scenario.keelson.base_path`) | none — **mandatory**  |
| `entity_id` | sensor/pose → vessel (`vessel.keelson.entity_id`)                  | the vessel id         |
| `source_id` | sensor (`sensor.keelson.source_id`) / pose source (explicit)       | output: the sensor id |
| `target_id` | pose source only (observed traffic `@target`)                      | none — not on output  |

- **`scenario.keelson`** — `{ base_path: string }`. Mandatory, no default: Bino
  emits onto a shared bus, so the realm must be declared explicitly.
- **`vessel.keelson`** — `{ base_path?, entity_id? }`. Optional overrides for one
  vessel; inherited by its pose subscription and all its sensors.
- **`sensor.keelson`** — `{ base_path?, entity_id?, source_id? }`. Optional
  per-sensor overrides.

Resolved **output** keys must be unique scenario-wide — compilation fails on a
collision. `publish_topic_override` bypasses resolution entirely and is the only
way to emit a deliberately non-keelson key.

## Topic conventions

Default Keelson output key per sensor (entity = vessel id, source = sensor id):

```
{base_path}/@v0/{vessel_id}/pubsub/{subject}/{sensor_id}
```

Subjects by sensor type:

| Sensor       | Subject       | Payload schema      |
| ------------ | ------------- | ------------------- |
| camera       | `image_raw`   | foxglove.RawImage   |
| lidar        | `point_cloud` | foxglove.PointCloud |
| radar_marine | `radar_sweep` | keelson.RadarSweep  |

Pose input (frame_transform source):
`{base}/@v0/{vessel_id}/pubsub/frame_transform/{source_id}`

Pose input (keelson_nav source): the four decomposed subjects
`location_fix`, `heading_true_north_deg`, `pitch_deg`, `roll_deg` under
`{base_path}/@v0/{entity_id}/pubsub/{subject}/{source_id}`, with
`/@target/{target_id}` appended for observed traffic. `base_path` and
`entity_id` resolve through the same [cascade](#keelson-identity-key-cascade) as
output keys. Bino owns the geodetic→scene projection (via `anchor`) and the
heading→orientation conversion; the renderer never sees keelson frames.

Use `publish_topic_override` per sensor to bypass the Keelson key
construction. This is useful for non-Keelson consumers but loses
interoperability with standard Keelson tooling.

Use `frame_id` per sensor to override the in-payload frame id
(default `{vessel_id}/{sensor_id}`), independently of the topic key.
This is the hook for **inject mode**: stamp the real platform's
`child_frame_id` on the synthetic return so it merges into the real
sensor's frame downstream.

## Sensor-data frame conventions

Bino publishes **no transforms** (no `world→vessel`, no static
`vessel→sensor`). Every sensor payload is therefore expressed in its own
**sensor-local** frame and tagged only with a `frame_id`; the consumer
resolves where that frame sits from the sensor mounting it already knows
(shared scenario config in replace/inject_all, or the real `platform`
connector in inject mode). The conventions below are the implicit
contract — they are what a consumer receives.

**Lidar (`point_cloud`).** XYZ points in the **sensor-node frame**, which for
a neutral mount is the **vessel body frame: +X bow, +Y up, +Z starboard** (a
point off the bow is at `+X`). Packed densely as `float32` x/y/z,
`point_stride = 12`. No pose is set on the PointCloud.

**Radar (`radar_sweep`).** One `RadarSpoke` per azimuth. `azimuth` is in
radians, **vessel-relative**: **0 = bow** (the vessel body forward, local
**+X**), increasing **clockwise** viewed from above, one full revolution
(`0 … 2π`) per sweep. A target straight off the bow reads azimuth 0
regardless of vessel heading. Each spoke carries `range_bins` intensity
bytes (`uint8`), uniform from `0` to `range_m` (bin `j` centred at
`(j + 0.5) · range_m / range_bins`). Per-spoke `timestamp` reflects the
intra-sweep acquisition time. No pose is set on the spokes.

**Camera (`image_raw`).** `rgba8`, `step = width · 4`. Rows follow the GL
read-back order — **origin bottom-left** (first row is the bottom of the
image), so top-left-origin viewers must flip vertically. A pinhole camera at
`fov_deg`; at mount `yaw = 0` it looks **over the bow (+X)** (its three.js −Z
look axis is aimed at the bow — see ADR-003).

All three live in the one **vessel body frame** (X-forward/Y-up/Z-starboard,
ADR-003): lidar points are body-frame, radar azimuth 0 is the bow, and the
camera is aimed along the bow. None is placed in a shared frame on the wire —
each is sensor-local and the consumer resolves it via the known sensor
mounting.
