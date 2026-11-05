import {
  construct_pubSub_key,
  enclose,
  uncover,
  encodePayloadFromTypeName,
  decodePayloadFromTypeName,
  Envelope,
  PackedElementField_NumericType,
} from "./keelson-sdk.js";
// Generated payload types from the SDK — used to type the decode paths so a
// schema drift fails at compile time rather than silently at runtime. All
// SDK-internal imports are centralized in keelson-sdk.ts.
import type {
  FrameTransform,
  RawImage,
  PointCloud,
  RadarSweep,
  RadarSpoke,
  LocationFix,
  TimestampedFloat,
  ScenarioStatus,
} from "./keelson-sdk.js";
import { ScenarioTickAck_Disposition } from "./keelson-sdk.js";

import type { PoseUpdate } from "./pose.js";
import type { CameraFrame } from "./camera.js";
import type { LidarFrame } from "./lidar-wasm.js";
import type { RadarFrame } from "./radar.js";
import type { GroundTruthTarget } from "./radar-augment.js";

const SUBJECT_FRAME_TRANSFORM = "frame_transform";
const SUBJECT_IMAGE_RAW = "image_raw";
const SUBJECT_POINT_CLOUD = "point_cloud";
const SUBJECT_RADAR_SWEEP = "radar_sweep";
const SUBJECT_RADAR_SPOKE = "radar_spoke";
// Inject-augment output: true state of the injected (synthetic) targets, so a
// consumer can score detections in the merged stream against ground truth. It
// rides the well-known `frame_transform` subject (the payload is exactly a
// `foxglove.FrameTransform`), and the truth is marked in the *source*, as its
// last chunk: `.../frame_transform/{source}/truth`. That is how Slipway marks
// truth (its ADR-0022), so `**/truth` finds it with the rest, and keelson has
// no subject to add for it.
const TRUTH_SOURCE_SUFFIX = "truth";

// Decomposed navigation subjects (input). A real maritime feed (AIS, NMEA,
// MAVLink) publishes a vessel's nav state as these separate scalars rather
// than a bundled pose.
export const SUBJECT_LOCATION_FIX = "location_fix";
export const SUBJECT_HEADING = "heading_true_north_deg";
export const SUBJECT_PITCH = "pitch_deg";
export const SUBJECT_ROLL = "roll_deg";

const TYPE_FRAME_TRANSFORM = "foxglove.FrameTransform";
const TYPE_RAW_IMAGE = "foxglove.RawImage";
const TYPE_POINT_CLOUD = "foxglove.PointCloud";
const TYPE_RADAR_SWEEP = "keelson.RadarSweep";
const TYPE_RADAR_SPOKE = "keelson.RadarSpoke";
const TYPE_LOCATION_FIX = "foxglove.LocationFix";
const TYPE_TIMESTAMPED_FLOAT = "keelson.TimestampedFloat";
const TYPE_SCENARIO_STATUS = "keelson.ScenarioStatus";
const TYPE_SCENARIO_TICK_ACK = "keelson.ScenarioTickAck";

export interface KeelsonNaming {
  /** First key segment (realm) of every published sensor topic. */
  base_path: string;
}

/** A conventional realm for tests and the optional service-level realm
 *  override. NOTE: as of ADR-004 this is **not** a schema default —
 *  `scenario.keelson.base_path` is mandatory. It survives only as a test
 *  convenience and the `poseTopicKey` default argument. */
export const DEFAULT_NAMING: KeelsonNaming = {
  base_path: "bino",
};

/** A fully-resolved keelson key identity for one emitter — the four identity
 *  segments of `{base_path}/@v0/{entity_id}/pubsub/{subject}/{source_id}
 *  [/@target/{target_id}]`. Produced by the cascade resolvers below; `subject`
 *  and the `@v0` version are supplied by the per-subject key builders, never
 *  carried here. `target_id` is input-side only. See ADR-004. */
export interface KeelsonKeyIdentity {
  base_path: string;
  entity_id: string;
  source_id: string;
  /** keelson @target extension for observed (non-own-ship) entities (input). */
  target_id?: string;
}

interface IdentityOverride {
  base_path?: string | undefined;
  entity_id?: string | undefined;
}
interface SensorIdentityOverride extends IdentityOverride {
  source_id?: string | undefined;
}

/** Resolve a sensor's OUTPUT key identity through the ADR-004 cascade:
 *  sensor → vessel → scenario for `base_path`/`entity_id`; `source_id`
 *  defaults to the sensor id. */
export function resolveOutputIdentity(p: {
  scenarioBasePath: string;
  vesselId: string;
  vesselKeelson?: IdentityOverride;
  sensorId: string;
  sensorKeelson?: SensorIdentityOverride;
}): KeelsonKeyIdentity {
  return {
    base_path: p.sensorKeelson?.base_path ?? p.vesselKeelson?.base_path ?? p.scenarioBasePath,
    entity_id: p.sensorKeelson?.entity_id ?? p.vesselKeelson?.entity_id ?? p.vesselId,
    source_id: p.sensorKeelson?.source_id ?? p.sensorId,
  };
}

/** Resolve a vessel's pose-INPUT (keelson_nav) key identity through the same
 *  cascade: pose source → vessel → scenario for `base_path`/`entity_id`.
 *  `entity_id` defaults to the vessel id (own-ship); observed traffic should
 *  set it explicitly to the receiving platform. `source_id` is explicit. */
export function resolveNavIdentity(p: {
  scenarioBasePath: string;
  vesselId: string;
  vesselKeelson?: IdentityOverride;
  poseSource: {
    base_path?: string | undefined;
    entity_id?: string | undefined;
    source_id: string;
    target_id?: string | undefined;
  };
}): KeelsonKeyIdentity {
  return {
    base_path: p.poseSource.base_path ?? p.vesselKeelson?.base_path ?? p.scenarioBasePath,
    entity_id: p.poseSource.entity_id ?? p.vesselKeelson?.entity_id ?? p.vesselId,
    source_id: p.poseSource.source_id,
    ...(p.poseSource.target_id ? { target_id: p.poseSource.target_id } : {}),
  };
}

// frame_transform is an INPUT subject for Bino (pose injection) — Bino never
// publishes it. encodePoseUpdate / poseTopicKey exist only to fabricate
// frame_transform envelopes in tests, so the source/parent segments they need
// are fixed constants rather than configuration.
const POSE_SOURCE_ID = "sim";
const POSE_PARENT_FRAME_ID = "world";

export function poseTopicKey(naming: KeelsonNaming, vesselId: string): string {
  return construct_pubSub_key(naming.base_path, vesselId, SUBJECT_FRAME_TRANSFORM, POSE_SOURCE_ID);
}

export function cameraTopicKey(id: KeelsonKeyIdentity): string {
  return construct_pubSub_key(id.base_path, id.entity_id, SUBJECT_IMAGE_RAW, id.source_id);
}

export function lidarTopicKey(id: KeelsonKeyIdentity): string {
  return construct_pubSub_key(id.base_path, id.entity_id, SUBJECT_POINT_CLOUD, id.source_id);
}

export function radarTopicKey(id: KeelsonKeyIdentity): string {
  return construct_pubSub_key(id.base_path, id.entity_id, SUBJECT_RADAR_SWEEP, id.source_id);
}

export function radarSpokeTopicKey(id: KeelsonKeyIdentity): string {
  return construct_pubSub_key(id.base_path, id.entity_id, SUBJECT_RADAR_SPOKE, id.source_id);
}

export function groundTruthTopicKey(id: KeelsonKeyIdentity): string {
  return construct_pubSub_key(
    id.base_path,
    id.entity_id,
    SUBJECT_FRAME_TRANSFORM,
    `${id.source_id}/${TRUTH_SOURCE_SUFFIX}`,
  );
}

export interface NavTopicKeys {
  locationFix: string;
  heading: string;
  pitch: string;
  roll: string;
}

/** Per-subject `source_id` overrides for a decomposed-nav vessel. Each unset
 *  subject falls back to the identity's shared `source_id`. */
export interface NavSourceOverrides {
  locationFix?: string | undefined;
  heading?: string | undefined;
  pitch?: string | undefined;
  roll?: string | undefined;
}

/** Build the per-subject keys Bino subscribes to for a decomposed-nav vessel.
 *  `sources` overrides the source_id per subject (e.g. RTK GNSS for the fix,
 *  a dual-antenna compass for heading); each falls back to `id.source_id`. */
export function navTopicKeys(id: KeelsonKeyIdentity, sources?: NavSourceOverrides): NavTopicKeys {
  const key = (subject: string, source: string | undefined): string =>
    construct_pubSub_key(id.base_path, id.entity_id, subject, source ?? id.source_id, id.target_id);
  return {
    locationFix: key(SUBJECT_LOCATION_FIX, sources?.locationFix),
    heading: key(SUBJECT_HEADING, sources?.heading),
    pitch: key(SUBJECT_PITCH, sources?.pitch),
    roll: key(SUBJECT_ROLL, sources?.roll),
  };
}

/** Map a keelson_nav pose source's optional `*_source` DSL fields onto the
 *  NavSourceOverrides shape navTopicKeys expects. Omitted fields stay unset so
 *  they fall back to the shared `source_id`. */
export function navSourceOverrides(p: {
  location_fix_source?: string | undefined;
  heading_source?: string | undefined;
  pitch_source?: string | undefined;
  roll_source?: string | undefined;
}): NavSourceOverrides {
  return {
    locationFix: p.location_fix_source,
    heading: p.heading_source,
    pitch: p.pitch_source,
    roll: p.roll_source,
  };
}

interface EncodedTopic {
  keyExpr: string;
  bytes: Uint8Array;
}

function envelopeBytes(typeName: string, payload: object, enclosedAt: Date): Uint8Array {
  const payloadBytes = encodePayloadFromTypeName(typeName, payload);
  if (!payloadBytes) {
    throw new Error(`keelson-js: no encoder for ${typeName}`);
  }
  const env = enclose(payloadBytes, enclosedAt);
  return Envelope.encode(env).finish();
}

function unwrapEnvelope(bytes: Uint8Array): { enclosedAt: Date; payload: Uint8Array } | null {
  let result;
  try {
    result = uncover(bytes);
  } catch {
    return null;
  }
  if (!result) return null;
  const [enclosedAt, , payload] = result;
  return { enclosedAt, payload };
}

/** Serialize one `foxglove.FrameTransform` envelope. Shared by pose output
 *  (parent = world) and ground-truth output (parent = the sensor frame). */
function frameTransformBytes(
  parentFrameId: string,
  childFrameId: string,
  translation: readonly [number, number, number],
  rotation: readonly [number, number, number, number],
  time: number,
): Uint8Array {
  const ts = secondsToDate(time);
  const ft = {
    timestamp: ts,
    parentFrameId,
    childFrameId,
    translation: { x: translation[0], y: translation[1], z: translation[2] },
    rotation: { x: rotation[0], y: rotation[1], z: rotation[2], w: rotation[3] },
  };
  return envelopeBytes(TYPE_FRAME_TRANSFORM, ft, ts);
}

export function encodePoseUpdate(
  update: PoseUpdate,
  naming: KeelsonNaming = DEFAULT_NAMING,
): EncodedTopic {
  const bytes = frameTransformBytes(
    POSE_PARENT_FRAME_ID,
    update.entityId,
    update.pose.position,
    update.pose.orientation,
    update.time,
  );
  return { keyExpr: poseTopicKey(naming, update.entityId), bytes };
}

/** Encode ground truth for the injected targets as one `FrameTransform` per
 *  target on the sensor's ground-truth key (see `groundTruthTopicKey`). Each target's true position is placed
 *  in the radar's bow-relative frame (x along the bow, y to starboard, z up), so
 *  `parentFrameId` is the merged stream's frame (the real sensor's), letting a
 *  consumer compare truth and detections in one frame. Recover polar truth with
 *  `range = hypot(x, y)`, `bearing = atan2(y, x)`. */
export function encodeGroundTruth(
  targets: ReadonlyArray<GroundTruthTarget>,
  time: number,
  parentFrameId: string,
  keyExpr: string,
): EncodedTopic[] {
  return targets.map((t) => {
    const x = t.range_m * Math.cos(t.azimuth);
    const y = t.range_m * Math.sin(t.azimuth);
    const bytes = frameTransformBytes(parentFrameId, t.id, [x, y, t.height_m], [0, 0, 0, 1], time);
    return { keyExpr, bytes };
  });
}

export function decodePoseEnvelope(bytes: Uint8Array): PoseUpdate | null {
  const env = unwrapEnvelope(bytes);
  if (!env) return null;
  const ft = decodePayloadFromTypeName(TYPE_FRAME_TRANSFORM, env.payload) as
    | FrameTransform
    | undefined;
  if (!ft || !ft.translation || !ft.rotation || !ft.childFrameId) return null;
  const time = ft.timestamp ? dateToSeconds(ft.timestamp) : dateToSeconds(env.enclosedAt);
  return {
    entityId: ft.childFrameId,
    pose: {
      position: [ft.translation.x, ft.translation.y, ft.translation.z],
      orientation: [ft.rotation.x, ft.rotation.y, ft.rotation.z, ft.rotation.w],
    },
    time,
  };
}

export function encodeCameraFrame(
  frame: CameraFrame,
  id: KeelsonKeyIdentity,
  frameId: string = `${id.entity_id}/${id.source_id}`,
): EncodedTopic {
  const img = {
    timestamp: secondsToDate(frame.time),
    frameId,
    width: frame.width,
    height: frame.height,
    encoding: "rgba8",
    step: frame.width * 4,
    data: frame.pixels,
  };
  const bytes = envelopeBytes(TYPE_RAW_IMAGE, img, secondsToDate(frame.time));
  return { keyExpr: cameraTopicKey(id), bytes };
}

export interface DecodedCameraFrame {
  pixels: Uint8Array;
  width: number;
  height: number;
  encoding: string;
  step: number;
  time: number;
  frameId: string;
}

export function decodeCameraEnvelope(bytes: Uint8Array): DecodedCameraFrame | null {
  const env = unwrapEnvelope(bytes);
  if (!env) return null;
  const img = decodePayloadFromTypeName(TYPE_RAW_IMAGE, env.payload) as RawImage | undefined;
  if (!img || !img.data) return null;
  return {
    pixels: img.data,
    width: img.width ?? 0,
    height: img.height ?? 0,
    encoding: img.encoding ?? "",
    step: img.step ?? 0,
    time: img.timestamp ? dateToSeconds(img.timestamp) : dateToSeconds(env.enclosedAt),
    frameId: img.frameId ?? "",
  };
}

export function encodePointCloud(
  frame: LidarFrame,
  id: KeelsonKeyIdentity,
  frameId: string = `${id.entity_id}/${id.source_id}`,
): EncodedTopic {
  const data = new Uint8Array(frame.points.buffer, frame.points.byteOffset, frame.count * 3 * 4);
  const pc = {
    timestamp: secondsToDate(frame.time),
    frameId,
    pose: undefined,
    pointStride: 12,
    fields: [
      { name: "x", offset: 0, type: PackedElementField_NumericType.FLOAT32 },
      { name: "y", offset: 4, type: PackedElementField_NumericType.FLOAT32 },
      { name: "z", offset: 8, type: PackedElementField_NumericType.FLOAT32 },
    ],
    data,
  };
  const bytes = envelopeBytes(TYPE_POINT_CLOUD, pc, secondsToDate(frame.time));
  return { keyExpr: lidarTopicKey(id), bytes };
}

export interface DecodedPointCloud {
  points: Float32Array;
  count: number;
  time: number;
  frameId: string;
}

export function encodeRadarSweep(
  frame: RadarFrame,
  id: KeelsonKeyIdentity,
  range_m: number,
  frameId: string = `${id.entity_id}/${id.source_id}`,
): EncodedTopic {
  const ts = secondsToDate(frame.time);
  const sweep = {
    spokes: frame.spokes.map((s) => ({
      // Each spoke carries its own acquisition time: the kernel produces an
      // intra-sweep offset (0..sweepDuration) relative to the frame start, so
      // the absolute spoke time is frame.time + offset. Collapsing every spoke
      // to frame.time would discard the rotation timing a rotating radar needs
      // for motion de-distortion.
      timestamp: secondsToDate(frame.time + (s.timestamp ?? 0)),
      frameId,
      pose: undefined,
      azimuth: s.azimuth,
      range: range_m,
      fields: [
        {
          name: "intensity",
          offset: 0,
          type: PackedElementField_NumericType.UINT8,
        },
      ],
      data: s.intensity,
    })),
  };
  const bytes = envelopeBytes(TYPE_RADAR_SWEEP, sweep, ts);
  return { keyExpr: radarTopicKey(id), bytes };
}

export interface DecodedRadarSweep {
  /** Per-spoke absolute acquisition time (seconds), preserved from the wire so
   *  consumers can de-distort a rotating sweep. */
  spokes: Array<{ azimuth: number; intensity: Uint8Array; time: number }>;
  /** Frame time — the first spoke's timestamp (start of the sweep). */
  time: number;
  frameId: string;
}

export function decodeRadarSweepEnvelope(bytes: Uint8Array): DecodedRadarSweep | null {
  const env = unwrapEnvelope(bytes);
  if (!env) return null;
  const sweep = decodePayloadFromTypeName(TYPE_RADAR_SWEEP, env.payload) as RadarSweep | undefined;
  if (!sweep || !sweep.spokes) return null;
  const fallback = dateToSeconds(env.enclosedAt);
  const first = sweep.spokes[0];
  return {
    spokes: sweep.spokes.map((s) => ({
      azimuth: s.azimuth ?? 0,
      intensity: s.data ?? new Uint8Array(0),
      time: s.timestamp ? dateToSeconds(s.timestamp) : fallback,
    })),
    time: first?.timestamp ? dateToSeconds(first.timestamp) : fallback,
    frameId: first?.frameId ?? "",
  };
}

/** Encode each spoke of a sweep as a standalone `keelson.RadarSpoke` message
 *  (subject `radar_spoke`) — the streaming interface a real rotating radar
 *  presents, as opposed to the batched `radar_sweep`. All spokes share one
 *  topic key; each carries its own absolute acquisition time. (ADR-002: the
 *  underlying geometry is still one snapshot per revolution — these timestamps
 *  are intra-sweep interpolation, not independently sampled.) */
export function encodeRadarSpokes(
  frame: RadarFrame,
  id: KeelsonKeyIdentity,
  range_m: number,
  frameId: string = `${id.entity_id}/${id.source_id}`,
): EncodedTopic[] {
  const keyExpr = radarSpokeTopicKey(id);
  return frame.spokes.map((s) =>
    encodeRadarSpoke(
      {
        azimuth: s.azimuth,
        intensity: s.intensity,
        range_m,
        time: frame.time + (s.timestamp ?? 0),
        frameId,
      },
      keyExpr,
    ),
  );
}

/** Encode a single `keelson.RadarSpoke` message with an explicit key, absolute
 *  acquisition time and frame_id. The inject-augment path uses this to republish
 *  a merged (real + synthetic) spoke that carries the *real* spoke's timestamp
 *  and frame_id so it lands in the real sensor's frame downstream. */
export function encodeRadarSpoke(
  s: { azimuth: number; intensity: Uint8Array; range_m: number; time: number; frameId: string },
  keyExpr: string,
): EncodedTopic {
  const ts = secondsToDate(s.time);
  const spoke = {
    timestamp: ts,
    frameId: s.frameId,
    pose: undefined,
    azimuth: s.azimuth,
    range: s.range_m,
    fields: [{ name: "intensity", offset: 0, type: PackedElementField_NumericType.UINT8 }],
    data: s.intensity,
  };
  return { keyExpr, bytes: envelopeBytes(TYPE_RADAR_SPOKE, spoke, ts) };
}

export interface DecodedRadarSpoke {
  azimuth: number;
  intensity: Uint8Array;
  range: number;
  time: number;
  frameId: string;
}

export function decodeRadarSpokeEnvelope(bytes: Uint8Array): DecodedRadarSpoke | null {
  const env = unwrapEnvelope(bytes);
  if (!env) return null;
  const spoke = decodePayloadFromTypeName(TYPE_RADAR_SPOKE, env.payload) as RadarSpoke | undefined;
  if (!spoke) return null;
  return {
    azimuth: spoke.azimuth ?? 0,
    intensity: spoke.data ?? new Uint8Array(0),
    range: spoke.range ?? 0,
    time: spoke.timestamp ? dateToSeconds(spoke.timestamp) : dateToSeconds(env.enclosedAt),
    frameId: spoke.frameId ?? "",
  };
}

export function decodePointCloudEnvelope(bytes: Uint8Array): DecodedPointCloud | null {
  const env = unwrapEnvelope(bytes);
  if (!env) return null;
  const pc = decodePayloadFromTypeName(TYPE_POINT_CLOUD, env.payload) as PointCloud | undefined;
  if (!pc || !pc.data) return null;
  const stride = pc.pointStride ?? 12;
  const count = Math.floor(pc.data.byteLength / stride);
  // Copy out as Float32Array — pc.data may be non-aligned for direct view.
  const points = new Float32Array(count * 3);
  const view = new DataView(pc.data.buffer, pc.data.byteOffset, pc.data.byteLength);
  for (let i = 0; i < count; i++) {
    points[i * 3 + 0] = view.getFloat32(i * stride + 0, true);
    points[i * 3 + 1] = view.getFloat32(i * stride + 4, true);
    points[i * 3 + 2] = view.getFloat32(i * stride + 8, true);
  }
  return {
    points,
    count,
    time: pc.timestamp ? dateToSeconds(pc.timestamp) : dateToSeconds(env.enclosedAt),
    frameId: pc.frameId ?? "",
  };
}

export interface PointCloudField {
  name: string;
  offset: number;
  type: number;
}

/** A point cloud with its raw packed buffer and layout preserved. Inject-augment
 *  needs this (not the xyz-only DecodedPointCloud) so it can append synthetic
 *  points into the *real* cloud's exact layout without dropping intensity or any
 *  other per-point field the consumer relies on. */
export interface RawPointCloud {
  data: Uint8Array;
  pointStride: number;
  fields: PointCloudField[];
  frameId: string;
  time: number;
}

export function decodePointCloudPayload(bytes: Uint8Array): RawPointCloud | null {
  const env = unwrapEnvelope(bytes);
  if (!env) return null;
  const pc = decodePayloadFromTypeName(TYPE_POINT_CLOUD, env.payload) as PointCloud | undefined;
  if (!pc || !pc.data) return null;
  return {
    data: pc.data,
    pointStride: pc.pointStride ?? 12,
    fields: (pc.fields ?? []).map((f) => ({ name: f.name, offset: f.offset, type: f.type })),
    frameId: pc.frameId ?? "",
    time: pc.timestamp ? dateToSeconds(pc.timestamp) : dateToSeconds(env.enclosedAt),
  };
}

export function encodePointCloudPayload(pc: RawPointCloud, keyExpr: string): EncodedTopic {
  const ts = secondsToDate(pc.time);
  const payload = {
    timestamp: ts,
    frameId: pc.frameId,
    pose: undefined,
    pointStride: pc.pointStride,
    fields: pc.fields.map((f) => ({ name: f.name, offset: f.offset, type: f.type })),
    data: pc.data,
  };
  return { keyExpr, bytes: envelopeBytes(TYPE_POINT_CLOUD, payload, ts) };
}

export interface DecodedLocationFix {
  lat: number;
  lon: number;
  altitude: number;
  time: number;
}

/** Decode a foxglove.LocationFix envelope (subject `location_fix`). */
export function decodeLocationFixEnvelope(bytes: Uint8Array): DecodedLocationFix | null {
  const env = unwrapEnvelope(bytes);
  if (!env) return null;
  const fix = decodePayloadFromTypeName(TYPE_LOCATION_FIX, env.payload) as LocationFix | undefined;
  if (!fix || typeof fix.latitude !== "number" || typeof fix.longitude !== "number") return null;
  return {
    lat: fix.latitude,
    lon: fix.longitude,
    altitude: fix.altitude ?? 0,
    time: fix.timestamp ? dateToSeconds(fix.timestamp) : dateToSeconds(env.enclosedAt),
  };
}

export interface DecodedTimestampedFloat {
  value: number;
  time: number;
}

/** Decode a keelson.TimestampedFloat envelope (heading/pitch/roll subjects). */
export function decodeTimestampedFloatEnvelope(bytes: Uint8Array): DecodedTimestampedFloat | null {
  const env = unwrapEnvelope(bytes);
  if (!env) return null;
  const tf = decodePayloadFromTypeName(TYPE_TIMESTAMPED_FLOAT, env.payload) as
    | TimestampedFloat
    | undefined;
  if (!tf || typeof tf.value !== "number") return null;
  return {
    value: tf.value,
    time: tf.timestamp ? dateToSeconds(tf.timestamp) : dateToSeconds(env.enclosedAt),
  };
}

/** One tick fence as a render worker needs it (Slipway ADR-0019). */
export interface TickFence {
  runId: string;
  tick: number;
  /** The kernel's step, in whole microseconds — integer so `tick * step` is
   *  exact and two workers agree on which tick a sensor fires in. */
  stepUs: number;
  /** The tick's absolute simulated instant, when the kernel stated one. */
  simulationTime: Date | undefined;
}

/** Decode a `keelson.ScenarioStatus` envelope into the fence it carries.
 *  Null for anything that is not one, or that carries no run or step — a
 *  status from before a run is loaded is not a tick anyone can answer. */
export function decodeTickFenceEnvelope(bytes: Uint8Array): TickFence | null {
  const env = unwrapEnvelope(bytes);
  if (!env) return null;
  let status: ScenarioStatus | undefined;
  try {
    status = decodePayloadFromTypeName(TYPE_SCENARIO_STATUS, env.payload) as
      | ScenarioStatus
      | undefined;
  } catch {
    return null;
  }
  if (!status || !status.runId || !status.stepSize) return null;
  const stepUs = Math.round(status.stepSize.seconds * 1e6 + status.stepSize.nanos / 1e3);
  if (stepUs <= 0) return null;
  return {
    runId: status.runId,
    tick: status.tick,
    stepUs,
    simulationTime: status.simulationTime,
  };
}

/** Encode `fence` as the `keelson.ScenarioStatus` a kernel would send — the
 *  other half of the protocol, for a test harness or a stand-in clock. */
export function encodeTickFenceEnvelope(fence: TickFence): Uint8Array {
  const at = fence.simulationTime ?? new Date(0);
  return envelopeBytes(
    TYPE_SCENARIO_STATUS,
    {
      runId: fence.runId,
      tick: fence.tick,
      stepSize: {
        seconds: Math.floor(fence.stepUs / 1e6),
        nanos: (fence.stepUs % 1e6) * 1e3,
      },
      ...(fence.simulationTime ? { simulationTime: fence.simulationTime } : {}),
    },
    at,
  );
}

/** Encode the `keelson.ScenarioTickAck` that answers `fence`: COMPLETED,
 *  stamped with the wall clock it was sent on, and enclosed at the fence's
 *  simulated instant — the same shape as Slipway's `barrier.tick_ack`. */
export function encodeTickAckEnvelope(fence: TickFence, wallNow: Date): Uint8Array {
  return envelopeBytes(
    TYPE_SCENARIO_TICK_ACK,
    {
      timestamp: wallNow,
      runId: fence.runId,
      tick: fence.tick,
      disposition: ScenarioTickAck_Disposition.COMPLETED,
      detail: "",
    },
    fence.simulationTime ?? wallNow,
  );
}

function secondsToDate(t: number): Date {
  return new Date(t * 1000);
}

function dateToSeconds(d: Date): number {
  return d.getTime() / 1000;
}
