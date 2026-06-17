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
import type { FrameTransform, RawImage, PointCloud, RadarSweep } from "./keelson-sdk.js";

import type { PoseUpdate } from "./pose.js";
import type { CameraFrame } from "./camera.js";
import type { LidarFrame } from "./lidar-wasm.js";
import type { RadarFrame } from "./radar.js";

const SUBJECT_FRAME_TRANSFORM = "frame_transform";
const SUBJECT_IMAGE_RAW = "image_raw";
const SUBJECT_POINT_CLOUD = "point_cloud";
const SUBJECT_RADAR_SWEEP = "radar_sweep";

const TYPE_FRAME_TRANSFORM = "foxglove.FrameTransform";
const TYPE_RAW_IMAGE = "foxglove.RawImage";
const TYPE_POINT_CLOUD = "foxglove.PointCloud";
const TYPE_RADAR_SWEEP = "keelson.RadarSweep";

export interface KeelsonNaming {
  base_path: string;
  source_id: string;
  parent_frame_id: string;
}

export const DEFAULT_NAMING: KeelsonNaming = {
  base_path: "bino",
  source_id: "sim",
  parent_frame_id: "world",
};

export function poseTopicKey(naming: KeelsonNaming, vesselId: string): string {
  return construct_pubSub_key(
    naming.base_path,
    vesselId,
    SUBJECT_FRAME_TRANSFORM,
    naming.source_id,
  );
}

export function cameraTopicKey(naming: KeelsonNaming, vesselId: string, sensorId: string): string {
  return construct_pubSub_key(naming.base_path, vesselId, SUBJECT_IMAGE_RAW, sensorId);
}

export function lidarTopicKey(naming: KeelsonNaming, vesselId: string, sensorId: string): string {
  return construct_pubSub_key(naming.base_path, vesselId, SUBJECT_POINT_CLOUD, sensorId);
}

export function radarTopicKey(naming: KeelsonNaming, vesselId: string, sensorId: string): string {
  return construct_pubSub_key(naming.base_path, vesselId, SUBJECT_RADAR_SWEEP, sensorId);
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

export function encodePoseUpdate(
  update: PoseUpdate,
  naming: KeelsonNaming = DEFAULT_NAMING,
): EncodedTopic {
  const ft = {
    timestamp: secondsToDate(update.time),
    parentFrameId: naming.parent_frame_id,
    childFrameId: update.entityId,
    translation: {
      x: update.pose.position[0],
      y: update.pose.position[1],
      z: update.pose.position[2],
    },
    rotation: {
      x: update.pose.orientation[0],
      y: update.pose.orientation[1],
      z: update.pose.orientation[2],
      w: update.pose.orientation[3],
    },
  };
  const bytes = envelopeBytes(TYPE_FRAME_TRANSFORM, ft, secondsToDate(update.time));
  return { keyExpr: poseTopicKey(naming, update.entityId), bytes };
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
  vesselId: string,
  sensorId: string,
  naming: KeelsonNaming = DEFAULT_NAMING,
  frameId: string = `${vesselId}/${sensorId}`,
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
  return { keyExpr: cameraTopicKey(naming, vesselId, sensorId), bytes };
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
  vesselId: string,
  sensorId: string,
  naming: KeelsonNaming = DEFAULT_NAMING,
  frameId: string = `${vesselId}/${sensorId}`,
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
  return { keyExpr: lidarTopicKey(naming, vesselId, sensorId), bytes };
}

export interface DecodedPointCloud {
  points: Float32Array;
  count: number;
  time: number;
  frameId: string;
}

export function encodeRadarSweep(
  frame: RadarFrame,
  vesselId: string,
  sensorId: string,
  range_m: number,
  naming: KeelsonNaming = DEFAULT_NAMING,
  frameId: string = `${vesselId}/${sensorId}`,
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
  return { keyExpr: radarTopicKey(naming, vesselId, sensorId), bytes };
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

function secondsToDate(t: number): Date {
  return new Date(t * 1000);
}

function dateToSeconds(d: Date): number {
  return d.getTime() / 1000;
}
