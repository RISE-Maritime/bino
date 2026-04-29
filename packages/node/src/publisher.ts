import {
  encodeCameraFrame,
  encodePointCloud,
  DEFAULT_NAMING,
  type KeelsonNaming,
} from "@bino/core";
import type { FrameEvent } from "./runner.js";

export interface SensorMeta {
  /** Matches FrameEvent.outputs[].sensorId — usually "{vesselId}/{sensorId}". */
  sensorId: string;
  vesselId: string;
  /** The source_id segment of the Keelson topic key (typically the sensor.id). */
  topicSensorId: string;
  type: "camera" | "lidar";
}

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
        if (meta.type === "camera") {
          const { keyExpr, bytes } = encodeCameraFrame(
            out.output as Parameters<typeof encodeCameraFrame>[0],
            meta.vesselId,
            meta.topicSensorId,
            naming,
          );
          puts.push(opts.session.put(keyExpr, bytes));
        } else {
          const { keyExpr, bytes } = encodePointCloud(
            out.output as Parameters<typeof encodePointCloud>[0],
            meta.vesselId,
            meta.topicSensorId,
            naming,
          );
          puts.push(opts.session.put(keyExpr, bytes));
        }
      }
      await Promise.all(puts);
    },
  };
}
