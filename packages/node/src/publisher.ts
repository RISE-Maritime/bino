import {
  encodeCameraFrame,
  encodePointCloud,
  encodeRadarSweep,
  encodeRadarSpokes,
  type KeelsonKeyIdentity,
} from "@bino/core";
import type { FrameEvent } from "./runner.js";

interface BaseSensorMeta {
  /** Matches FrameEvent.outputs[].sensorId — usually "{vesselId}/{sensorId}".
   *  Also the ADR-002 default in-payload frame_id when `frameId` is unset. */
  sensorId: string;
  /** Fully-resolved keelson output key identity (ADR-004 cascade). */
  identity: KeelsonKeyIdentity;
  /** Optional full topic-key override (from DSL publish_topic_override). */
  topicOverride?: string;
  /** Optional in-payload frame_id override (from DSL frame_id). Falls back
   *  to "{vesselId}/{sensorId}" (== sensorId) when unset. */
  frameId?: string;
}

export type SensorMeta =
  | (BaseSensorMeta & { type: "camera" })
  | (BaseSensorMeta & { type: "lidar" })
  | (BaseSensorMeta & { type: "radar"; rangeM: number; emit: "sweep" | "spoke" | "both" });

export interface PublishSession {
  put(keyExpr: string, payload: Uint8Array): Promise<void>;
}

export interface SensorPublisherOptions {
  session: PublishSession;
  sensors: ReadonlyArray<SensorMeta>;
}

export interface SensorPublisher {
  publish(frame: FrameEvent): Promise<void>;
}

export function createSensorPublisher(opts: SensorPublisherOptions): SensorPublisher {
  const byId = new Map(opts.sensors.map((s) => [s.sensorId, s]));

  return {
    async publish(frame: FrameEvent): Promise<void> {
      const puts: Array<Promise<void>> = [];
      for (const out of frame.outputs) {
        const meta = byId.get(out.sensorId);
        if (!meta) continue;
        const frameId = meta.frameId ?? meta.sensorId;
        if (meta.type === "camera") {
          const e = encodeCameraFrame(
            out.output as Parameters<typeof encodeCameraFrame>[0],
            meta.identity,
            frameId,
          );
          puts.push(opts.session.put(meta.topicOverride ?? e.keyExpr, e.bytes));
        } else if (meta.type === "lidar") {
          const e = encodePointCloud(
            out.output as Parameters<typeof encodePointCloud>[0],
            meta.identity,
            frameId,
          );
          puts.push(opts.session.put(meta.topicOverride ?? e.keyExpr, e.bytes));
        } else {
          const radarOut = out.output as Parameters<typeof encodeRadarSweep>[0];
          // emit: sweep (batched, default) | spoke (per-spoke stream) | both.
          // topicOverride applies only to the sweep key; spokes use the
          // derived radar_spoke key.
          if (meta.emit !== "spoke") {
            const e = encodeRadarSweep(radarOut, meta.identity, meta.rangeM, frameId);
            puts.push(opts.session.put(meta.topicOverride ?? e.keyExpr, e.bytes));
          }
          if (meta.emit !== "sweep") {
            for (const e of encodeRadarSpokes(radarOut, meta.identity, meta.rangeM, frameId)) {
              puts.push(opts.session.put(e.keyExpr, e.bytes));
            }
          }
        }
      }
      await Promise.all(puts);
    },
  };
}
