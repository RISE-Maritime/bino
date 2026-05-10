# Scenario DSL Reference

> Source of truth: Zod schemas in `packages/core/src/dsl.ts`. This
> document renders them human-readable; if a field is missing here,
> check the source.

## Top-level structure

```yaml
scenario:
  name: string                  # required
  anchor: Anchor                # required
  vessels: [Vessel, ...]        # at least one
  modes: Modes                  # required
  environment: Environment      # optional (defaults shown below)
  terrain: Terrain              # optional
```

## Anchor

WGS84 position defining the local ENU frame origin.

| Field    | Type   | Constraints         |
|----------|--------|---------------------|
| `lat`    | number | -90 to 90           |
| `lon`    | number | -180 to 180         |
| `height` | number | metres above WGS84  |

## Environment

| Field              | Type   | Default  | Description |
|--------------------|--------|----------|-------------|
| `sea_state`        | SeaState | --     | Wave parameters (optional) |
| `wind`             | Wind   | --       | Wind parameters (optional) |
| `time_of_day`      | string | `"12:00"` | HH:MM, 24-hour format |
| `visibility_m`     | number | 20000    | Meteorological visibility (m) |
| `rain_rate_mm_h`   | number | 0        | Precipitation rate (mm/h); drives radar weather attenuation |

### SeaState

| Field                      | Type   | Description |
|----------------------------|--------|-------------|
| `significant_wave_height`  | number | Hs in metres (>= 0) |
| `peak_period`              | number | Tp in seconds (> 0) |
| `direction_deg`            | number | Wave propagation direction (degrees) |
| `spectrum`                 | string | `"pierson_moskowitz"` (only option) |

### Wind

| Field           | Type   | Description |
|-----------------|--------|-------------|
| `speed`         | number | m/s (>= 0) |
| `direction_deg` | number | Wind-from direction (degrees) |

## Terrain

When present, the scene compiler fetches OSM coastline and GMRT
bathymetry for the given bounding box.

| Field      | Type     | Default | Description |
|------------|----------|---------|-------------|
| `bbox`     | [W, S, E, N] | --  | Bounding box in degrees (required) |
| `landmask` | boolean  | true    | Generate filled land polygons from OSM coastline |
| `buildings`| boolean  | true    | Extrude OSM building footprints |
| `seamarks` | boolean  | true    | Place OSM seamark features |

## Vessels

| Field        | Type           | Description |
|--------------|----------------|-------------|
| `id`         | string         | Unique vessel identifier |
| `model`      | string         | Asset registry name (see below) |
| `pose_source`| PoseSource     | Where poses come from |
| `sensors`    | Sensor[]       | List of sensors (default: []) |
| `dimensions` | VesselDimensions | Override model dimensions (optional) |

### PoseSource

Discriminated union on `type`:

**zenoh** -- poses arrive over Zenoh.

| Field   | Type   | Description |
|---------|--------|-------------|
| `type`  | `"zenoh"` | |
| `topic` | string | Zenoh key expression for frame_transform |

### VesselDimensions

Optional override for the asset registry defaults.

| Field    | Type   | Description |
|----------|--------|-------------|
| `length` | number | LOA in metres |
| `beam`   | number | Beam in metres |
| `draft`  | number | Draft in metres |

## Sensor types

Discriminated union on `type`. All sensors share a common `mount` block.

### Mount

Sensor placement in the vessel's body frame.

| Field      | Type   | Default | Description |
|------------|--------|---------|-------------|
| `x`        | number | --      | Longitudinal offset from amidships (m, +fwd) |
| `y`        | number | --      | Vertical offset from waterline (m, +up) |
| `z`        | number | --      | Lateral offset from centreline (m, +stbd) |
| `yaw_deg`  | number | 0       | Yaw rotation (degrees) |
| `pitch_deg`| number | 0       | Pitch rotation (degrees) |
| `roll_deg` | number | 0       | Roll rotation (degrees) |

### Camera (`type: "camera"`)

| Field                    | Type         | Default | Constraints |
|--------------------------|--------------|---------|-------------|
| `id`                     | string       | --      | |
| `fov_deg`                | number       | --      | (0, 180] |
| `resolution`             | [width, height] | --   | positive integers |
| `rate_hz`                | number       | --      | > 0 |
| `phase_offset_s`         | number       | 0       | scheduling offset |
| `exposure_time_s`        | number       | 0       | exposure interval (s) |
| `publish_topic_override` | string       | --      | override Keelson topic |

### Lidar (`type: "lidar"`)

| Field                    | Type   | Default    | Constraints |
|--------------------------|--------|------------|-------------|
| `id`                     | string | --         | |
| `channels`               | int    | --         | > 0 |
| `range_m`                | number | --         | > 0 |
| `rate_hz`                | number | --         | > 0 |
| `phase_offset_s`         | number | 0          | scheduling offset |
| `fov_h_deg`              | number | 360        | (0, 360] |
| `azimuths`               | int    | = channels | horizontal samples |
| `publish_topic_override` | string | --         | override Keelson topic |

### Marine Radar (`type: "radar_marine"`)

| Field                    | Type   | Default | Constraints |
|--------------------------|--------|---------|-------------|
| `id`                     | string | --      | |
| `range_m`                | number | --      | > 0 |
| `rotation_rate_hz`       | number | --      | > 0 |
| `phase_offset_s`         | number | 0       | scheduling offset |
| `beam_width_deg`         | number | --      | (0, 360] |
| `spokes_per_rev`         | int    | --      | > 0 |
| `range_bins`             | int    | --      | > 0 |
| `publish_topic_override` | string | --      | override Keelson topic |

## Modes

| Field           | Values                             | Description |
|-----------------|------------------------------------|-------------|
| `rendering`     | `replace`, `inject`, `inject_all`  | V&V rendering mode |
| `clock`         | `wall`, `stepped`, `external_fmi`  | Time source |
| `determinism`   | `strict`, `relaxed`                | Reproducibility level |

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

## Asset registry

Built-in named models with default dimensions:

| Model          | Length | Beam | Draft | Superstructure |
|----------------|--------|------|-------|----------------|
| `tanker_120m`  | 120 m  | 20 m | 6 m   | 18 m long, 14 m high, offset 40 m aft |
| `ferry_60m`    | 60 m   | 14 m | 3.5 m | 25 m long, 10 m high, offset 5 m aft  |
| `cargo_90m`    | 90 m   | 16 m | 5 m   | 14 m long, 12 m high, offset 30 m aft |

Unknown model names fall back to 80 m x 14 m x 4 m with no
superstructure.

## Topic conventions

Default Keelson topic key per sensor:

```
{base}/@v0/{vessel_id}/pubsub/{subject}/{sensor_id}
```

Subjects by sensor type:

| Sensor          | Subject         | Payload schema |
|-----------------|-----------------|----------------|
| camera          | `image_raw`     | foxglove.RawImage |
| lidar           | `point_cloud`   | foxglove.PointCloud |
| radar_marine    | `radar_sweep`   | keelson.RadarSweep |

Pose input topic: `{base}/@v0/{vessel_id}/pubsub/frame_transform/{source_id}`

Use `publish_topic_override` per sensor to bypass the Keelson key
construction. This is useful for non-Keelson consumers but loses
interoperability with standard Keelson tooling.
