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

export const PoseSource = z.discriminatedUnion("type", [ZenohPoseSource]);
export type PoseSource = z.infer<typeof PoseSource>;

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
  azimuths: z.number().int().positive().optional(),
  publish_topic_override: z.string().min(1).optional(),
  /** Override the in-payload frame_id (see CameraSensor.frame_id). */
  frame_id: z.string().min(1).optional(),
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
  publish_topic_override: z.string().min(1).optional(),
  /** Override the in-payload frame_id (see CameraSensor.frame_id). */
  frame_id: z.string().min(1).optional(),
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

export const Vessel = z
  .object({
    id: z.string().min(1),
    model: z.string().min(1),
    pose_source: PoseSource,
    sensors: z.array(Sensor).default([]),
    dimensions: VesselDimensions.optional(),
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

/** Terrain block — when present, the scene compiler triggers a
 *  prepareTerrain() async pass that fetches OSM coastline +
 *  bathymetry for the given bbox. v0.4a uses a single bbox for
 *  both sources; per-source bbox / source overrides are v0.5+. */
export const Terrain = z.object({
  bbox: Bbox,
  landmask: z.boolean().default(true),
  buildings: z.boolean().default(true),
  seamarks: z.boolean().default(true),
});
export type Terrain = z.infer<typeof Terrain>;

/** Keelson topic naming. Defaults mirror keelson.ts DEFAULT_NAMING;
 *  a drift test keeps them in sync. Lets a scenario publish into the
 *  consumer's namespace without code changes. */
export const Keelson = z.object({
  base_path: z.string().min(1).default("bino"),
  source_id: z.string().min(1).default("sim"),
  parent_frame_id: z.string().min(1).default("world"),
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
    keelson: Keelson.default({}),
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
