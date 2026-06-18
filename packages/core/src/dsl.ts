import { z } from "zod";

export const Anchor = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  height: z.number(),
});
export type Anchor = z.infer<typeof Anchor>;

export const Mount = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
  yaw_deg: z.number().optional(),
  pitch_deg: z.number().optional(),
  roll_deg: z.number().optional(),
});
export type Mount = z.infer<typeof Mount>;

export const ZenohPoseSource = z.object({
  type: z.literal("zenoh"),
  topic: z.string().min(1),
});

/** Ingest a vessel's pose from keelson's decomposed navigation subjects
 *  (location_fix + heading_true_north_deg [+ pitch_deg/roll_deg]) — what a
 *  real AIS/GNSS/MAVLink feed actually publishes. Bino constructs the per-
 *  subject keys from this identity and projects the fix through the scenario
 *  anchor itself. Own-ship uses bare keys; observed traffic sets target_id
 *  (e.g. "mmsi_245060000") for keelson's @target extension. See ADR-002.
 *
 *  Per ADR-004, `base_path` and `entity_id` are optional here and inherit
 *  through the cascade (vessel → scenario); `entity_id` defaults to the
 *  vessel id. Observed traffic should set `entity_id` to the *receiving*
 *  platform (not the contact) — compile-time warns when a `target_id` feed
 *  leaves it inherited. `source_id` stays explicit. */
export const KeelsonNavPoseSource = z.object({
  type: z.literal("keelson_nav"),
  base_path: z.string().min(1).optional(),
  entity_id: z.string().min(1).optional(),
  source_id: z.string().min(1),
  target_id: z.string().min(1).optional(),
});

export const PoseSource = z.discriminatedUnion("type", [ZenohPoseSource, KeelsonNavPoseSource]);
export type PoseSource = z.infer<typeof PoseSource>;

/** Per-sensor keelson key-identity overrides (ADR-004). Each segment, when
 *  set, overrides the value cascading down from the vessel / scenario. Unset
 *  segments inherit: `base_path` and `entity_id` from the vessel (then
 *  scenario), `source_id` defaults to the sensor id. `subject` and the `@v0`
 *  version are always derived, never set here. To emit a deliberately
 *  non-keelson key, use `publish_topic_override` instead (it bypasses
 *  resolution entirely). */
export const SensorKeelson = z.object({
  base_path: z.string().min(1).optional(),
  entity_id: z.string().min(1).optional(),
  source_id: z.string().min(1).optional(),
});
export type SensorKeelson = z.infer<typeof SensorKeelson>;

export const CameraSensor = z.object({
  id: z.string().min(1),
  type: z.literal("camera"),
  mount: Mount,
  fov_deg: z.number().positive().max(180),
  resolution: z.tuple([z.number().int().positive(), z.number().int().positive()]),
  rate_hz: z.number().positive(),
  phase_offset_s: z.number().default(0),
  exposure_time_s: z.number().nonnegative().default(0),
  /** Override the Keelson-derived publish topic. When set, the
   *  publisher uses this exact string instead of
   *  construct_pubSub_key(...). Real deployments may want non-Keelson
   *  topics; the trade-off is losing real-Keelson-tool interop. */
  publish_topic_override: z.string().min(1).optional(),
  /** Override the in-payload frame_id. Independent of the topic key.
   *  In inject mode the synthetic return must carry the real platform's
   *  child_frame_id to merge into the real sensor's frame. Defaults to
   *  "{vesselId}/{sensorId}" when unset. */
  frame_id: z.string().min(1).optional(),
  /** Per-sensor keelson key-identity overrides (ADR-004). */
  keelson: SensorKeelson.optional(),
});
export type CameraSensor = z.infer<typeof CameraSensor>;

export const LidarSensor = z.object({
  id: z.string().min(1),
  type: z.literal("lidar"),
  mount: Mount,
  channels: z.number().int().positive(),
  range_m: z.number().positive(),
  rate_hz: z.number().positive(),
  phase_offset_s: z.number().default(0),
  fov_h_deg: z.number().positive().max(360).default(360),
  /** Vertical FOV in degrees (total, centred on horizontal). Defaults to 90;
   *  e.g. an Ouster OS2 is 22.5, OS1 45, OS0 90. */
  fov_v_deg: z.number().positive().max(180).optional(),
  azimuths: z.number().int().positive().optional(),
  publish_topic_override: z.string().min(1).optional(),
  /** Override the in-payload frame_id (see CameraSensor.frame_id). */
  frame_id: z.string().min(1).optional(),
  /** Per-sensor keelson key-identity overrides (ADR-004). */
  keelson: SensorKeelson.optional(),
});
export type LidarSensor = z.infer<typeof LidarSensor>;

export const RadarSensor = z.object({
  id: z.string().min(1),
  type: z.literal("radar_marine"),
  mount: Mount,
  range_m: z.number().positive(),
  /** Antenna rotation rate; one full sweep is published per rotation. */
  rotation_rate_hz: z.number().positive(),
  phase_offset_s: z.number().default(0),
  beam_width_deg: z.number().positive().max(360),
  spokes_per_rev: z.number().int().positive(),
  range_bins: z.number().int().positive(),
  /** Which keelson subject(s) to publish: `radar_sweep` (one batched message
   *  per revolution, default), `radar_spoke` (each spoke streamed separately,
   *  the real rotating-radar interface — `spokes_per_rev`× more messages), or
   *  `both`. The spoke stream is a per-revolution snapshot sliced into spokes;
   *  intra-sweep target motion is not modelled. */
  emit: z.enum(["sweep", "spoke", "both"]).default("sweep"),
  publish_topic_override: z.string().min(1).optional(),
  /** Override the in-payload frame_id (see CameraSensor.frame_id). */
  frame_id: z.string().min(1).optional(),
  /** Per-sensor keelson key-identity overrides (ADR-004). */
  keelson: SensorKeelson.optional(),
});
export type RadarSensor = z.infer<typeof RadarSensor>;

export const Sensor = z.discriminatedUnion("type", [CameraSensor, LidarSensor, RadarSensor]);
export type Sensor = z.infer<typeof Sensor>;

export const VesselDimensions = z.object({
  length: z.number().positive(),
  beam: z.number().positive(),
  draft: z.number().positive(),
});
export type VesselDimensions = z.infer<typeof VesselDimensions>;

/** Per-vessel keelson key-identity overrides (ADR-004). Sits between the
 *  scenario realm and each emitter in the cascade; inherited by this vessel's
 *  pose subscription and its sensor outputs unless an emitter overrides
 *  further. No `source_id` — that is inherently per-emitter. */
export const VesselKeelson = z.object({
  base_path: z.string().min(1).optional(),
  entity_id: z.string().min(1).optional(),
});
export type VesselKeelson = z.infer<typeof VesselKeelson>;

export const Vessel = z
  .object({
    id: z.string().min(1),
    model: z.string().min(1),
    pose_source: PoseSource,
    sensors: z.array(Sensor).default([]),
    dimensions: VesselDimensions.optional(),
    /** Per-vessel keelson key-identity overrides (ADR-004). */
    keelson: VesselKeelson.optional(),
  })
  .superRefine((v, ctx) => {
    const ids = new Set<string>();
    for (const s of v.sensors) {
      if (ids.has(s.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `duplicate sensor id '${s.id}' on vessel '${v.id}'`,
          path: ["sensors"],
        });
      }
      ids.add(s.id);
    }
  });
export type Vessel = z.infer<typeof Vessel>;

export const Modes = z.object({
  rendering: z.enum(["replace", "inject", "inject_all"]),
  clock: z.enum(["external_fmi", "wall", "stepped"]),
  determinism: z.enum(["strict", "relaxed"]),
});
export type Modes = z.infer<typeof Modes>;

/** Wave-spectrum family. v0.4a ships pierson_moskowitz only;
 *  jonswap and others are v1.0 sea-clutter work. */
export const WaveSpectrum = z.enum(["pierson_moskowitz"]);
export type WaveSpectrum = z.infer<typeof WaveSpectrum>;

export const SeaState = z.object({
  significant_wave_height: z.number().nonnegative(),
  peak_period: z.number().positive(),
  direction_deg: z.number(),
  spectrum: WaveSpectrum.default("pierson_moskowitz"),
});
export type SeaState = z.infer<typeof SeaState>;

export const Wind = z.object({
  speed: z.number().nonnegative(),
  direction_deg: z.number(),
});
export type Wind = z.infer<typeof Wind>;

/** Environment block — terrain/sea/sky context for the scene.
 *  v0.1-v0.3 ignored this; v0.4a is its first concrete consumer.
 *  v1.0 adds rain_rate_mm_h for radar weather attenuation. */
export const Environment = z.object({
  sea_state: SeaState.optional(),
  wind: Wind.optional(),
  time_of_day: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "time_of_day must be HH:MM (24h)")
    .default("12:00"),
  visibility_m: z.number().positive().default(20000),
  rain_rate_mm_h: z.number().nonnegative().default(0),
});
export type Environment = z.infer<typeof Environment>;

/** Bbox in [west, south, east, north] degrees — same convention
 *  Overpass + GMRT use. */
export const Bbox = z.tuple([z.number(), z.number(), z.number(), z.number()]);
export type Bbox = z.infer<typeof Bbox>;

/** Per-layer data-source specification (ADR-005). Selects where one terrain
 *  layer's data comes from. `overpass`/`gmrt` hit the network (optionally a
 *  custom `endpoint`); `geotiff`/`geojson` read a local file (`path`,
 *  resolved relative to the scenario file); `none` skips the layer. A layer
 *  omitted from `terrain.sources` falls back to the default OSM/GMRT source.
 *  Layer/type compatibility (e.g. `gmrt` only for bathymetry) is enforced
 *  when the provider is built. */
export const TerrainSource = z.discriminatedUnion("type", [
  z.object({ type: z.literal("overpass"), endpoint: z.string().url().optional() }),
  z.object({ type: z.literal("gmrt"), endpoint: z.string().url().optional() }),
  z.object({ type: z.literal("geotiff"), path: z.string().min(1) }),
  z.object({ type: z.literal("geojson"), path: z.string().min(1) }),
  z.object({ type: z.literal("none") }),
]);
export type TerrainSource = z.infer<typeof TerrainSource>;

export const TerrainSources = z.object({
  coastline: TerrainSource.optional(),
  bathymetry: TerrainSource.optional(),
  buildings: TerrainSource.optional(),
  seamarks: TerrainSource.optional(),
});
export type TerrainSources = z.infer<typeof TerrainSources>;

/** Terrain block — when present, the scene compiler triggers a
 *  prepareTerrain() async pass that loads coastline + bathymetry (+ optional
 *  buildings/seamarks) for the bbox. By default each layer comes from the
 *  public OSM/GMRT sources; `sources` overrides per layer with custom or
 *  local data (ADR-005). `offline: true` asserts no layer may touch the
 *  network — every needed layer must be a local (`geotiff`/`geojson`) or
 *  `none` source, else the build fails fast. */
export const Terrain = z.object({
  bbox: Bbox,
  landmask: z.boolean().default(true),
  buildings: z.boolean().default(true),
  seamarks: z.boolean().default(true),
  sources: TerrainSources.optional(),
  offline: z.boolean().default(false),
  /** Bathymetry grid spacing in metres — larger trades fidelity for a smaller
   *  mesh and faster load (ADR-005). Default 50 m. */
  grid_res_m: z.number().positive().default(50),
});
export type Terrain = z.infer<typeof Terrain>;

/** Keelson topic naming — the root of the key-identity cascade (ADR-004).
 *  `base_path` is the realm (first key segment) shared by every key Bino
 *  touches, on both the pose-input and sensor-output paths. It is
 *  **mandatory, with no default**: Bino emits onto a shared bus, and a silent
 *  default is how synthetic data collides with — or is mistaken for — real
 *  data. Declared once here and inherited by every emitter (vessel → sensor /
 *  pose source); per-emitter override stays optional. */
export const Keelson = z.object({
  base_path: z.string().min(1),
});
export type Keelson = z.infer<typeof Keelson>;

export const Scenario = z
  .object({
    name: z.string().min(1),
    anchor: Anchor,
    vessels: z.array(Vessel).min(1),
    modes: Modes,
    environment: Environment.default({}),
    terrain: Terrain.optional(),
    keelson: Keelson,
  })
  .superRefine((s, ctx) => {
    const ids = new Set<string>();
    for (const v of s.vessels) {
      if (ids.has(v.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `duplicate vessel id '${v.id}'`,
          path: ["vessels"],
        });
      }
      ids.add(v.id);
    }
  });
export type Scenario = z.infer<typeof Scenario>;
