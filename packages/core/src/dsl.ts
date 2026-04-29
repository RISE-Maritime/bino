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
  /** Override the Keelson-derived publish topic. When set, the
   *  publisher uses this exact string instead of
   *  construct_pubSub_key(...). Real deployments may want non-Keelson
   *  topics; the trade-off is losing real-Keelson-tool interop. */
  publish_topic_override: z.string().min(1).optional(),
});
export type CameraSensor = z.infer<typeof CameraSensor>;

export const LidarSensor = z.object({
  id: z.string().min(1),
  type: z.literal("lidar"),
  mount: Mount,
  channels: z.number().int().positive(),
  range_m: z.number().positive(),
  rate_hz: z.number().positive(),
  publish_topic_override: z.string().min(1).optional(),
});
export type LidarSensor = z.infer<typeof LidarSensor>;

export const Sensor = z.discriminatedUnion("type", [CameraSensor, LidarSensor]);
export type Sensor = z.infer<typeof Sensor>;

export const Vessel = z.object({
  id: z.string().min(1),
  model: z.string().min(1),
  pose_source: PoseSource,
  sensors: z.array(Sensor).default([]),
});
export type Vessel = z.infer<typeof Vessel>;

export const Modes = z.object({
  rendering: z.enum(["replace", "inject", "inject_all"]),
  clock: z.enum(["external_fmi", "wall", "stepped"]),
  determinism: z.enum(["strict", "relaxed"]),
});
export type Modes = z.infer<typeof Modes>;

export const Scenario = z.object({
  name: z.string().min(1),
  anchor: Anchor,
  vessels: z.array(Vessel).min(1),
  modes: Modes,
});
export type Scenario = z.infer<typeof Scenario>;
