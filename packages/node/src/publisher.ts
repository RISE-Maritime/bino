import {
  encodeCameraFrame,
  encodePointCloud,
  encodeRadarSweep,
  DEFAULT_NAMING,
  type KeelsonNaming,
} from "@bino/core";
import type { FrameEvent } from "./runner.js";

interface BaseSensorMeta {
  /** Matches FrameEvent.outputs[].sensorId — usually "{vesselId}/{sensorId}". */
  sensorId: string;
  vesselId: string;
  /** The source_id segment of the Keelson topic key (typically the sensor.id). */
  topicSensorId: string;
  /** Optional full topic-key override (from DSL publish_topic_override). */
  topicOverride?: string;
  /** Optional in-payload frame_id override (from DSL frame_id). Falls back
   *  to the encoder default "{vesselId}/{sensorId}" when unset. */
  frameId?: string;
}

export type SensorMeta =
  | (BaseSensorMeta & { type: "camera" })
  | (BaseSensorMeta & { type: "lidar" })
  | (BaseSensorMeta & { type: "radar"; rangeM: number });

export interface PublishSession {
  put(keyExpr: string, payload: Uint8Array): Promise<void>;
}

export interface SensorPublisherOptions {
  session: PublishSession;
  sensors: ReadonlyArray<SensorMeta>;
  naming?: KeelsonNaming;
}

export interface SensorPublisher {
  publish(frame: FrameEvent): Promise<void>;
}

export function createSensorPublisher(opts: SensorPublisherOptions): SensorPublisher {
  const naming = opts.naming ?? DEFAULT_NAMING;
  const byId = new Map(opts.sensors.map((s) => [s.sensorId, s]));

  return {
    async publish(frame: FrameEvent): Promise<void> {
      const puts: Array<Promise<void>> = [];
      for (const out of frame.outputs) {
        const meta = byId.get(out.sensorId);
        if (!meta) continue;
        let encoded;
        if (meta.type === "camera") {
          encoded = encodeCameraFrame(
            out.output as Parameters<typeof encodeCameraFrame>[0],
            meta.vesselId,
            meta.topicSensorId,
            naming,
            meta.frameId,
          );
        } else if (meta.type === "lidar") {
          encoded = encodePointCloud(
            out.output as Parameters<typeof encodePointCloud>[0],
            meta.vesselId,
            meta.topicSensorId,
            naming,
            meta.frameId,
          );
        } else {
          encoded = encodeRadarSweep(
            out.output as Parameters<typeof encodeRadarSweep>[0],
            meta.vesselId,
            meta.topicSensorId,
            meta.rangeM,
            naming,
            meta.frameId,
          );
        }
        const keyExpr = meta.topicOverride ?? encoded.keyExpr;
        puts.push(opts.session.put(keyExpr, encoded.bytes));
      }
      await Promise.all(puts);
    },
  };
}
