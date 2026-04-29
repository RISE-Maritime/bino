import { describe, expect, it, vi } from "vitest";
import {
  decodeCameraEnvelope,
  decodePointCloudEnvelope,
  DEFAULT_NAMING,
} from "@bino/core";
import { createSensorPublisher, type SensorMeta } from "../src/publisher.js";
import type { FrameEvent } from "../src/runner.js";

interface PutCall {
  keyExpr: string;
  payload: Uint8Array;
}

function makeSession(): {
  session: { put: (key: string, payload: Uint8Array) => Promise<void> };
  puts: PutCall[];
} {
  const puts: PutCall[] = [];
  return {
    session: {
      put: vi.fn(async (keyExpr: string, payload: Uint8Array) => {
        puts.push({ keyExpr, payload });
      }),
    },
    puts,
  };
}

const sensors: SensorMeta[] = [
  { sensorId: "ego/bow_camera", vesselId: "ego", topicSensorId: "bow_camera", type: "camera" },
  { sensorId: "ego/main_lidar", vesselId: "ego", topicSensorId: "main_lidar", type: "lidar" },
];

const sampleFrame: FrameEvent = {
  index: 0,
  time: 1.5,
  outputs: [
    {
      sensorId: "ego/bow_camera",
      renderMs: 1,
      output: {
        pixels: new Uint8Array(2 * 2 * 4).fill(0xab),
        width: 2,
        height: 2,
        time: 1.5,
      },
    },
    {
      sensorId: "ego/main_lidar",
      renderMs: 1,
      output: {
        points: new Float32Array([1, 2, 3, 4, 5, 6]),
        count: 2,
        time: 1.5,
      },
    },
  ],
};

describe("createSensorPublisher", () => {
  it("publishes camera output to image_raw and lidar to point_cloud", async () => {
    const { session, puts } = makeSession();
    const publisher = createSensorPublisher({ session, sensors });

    await publisher.publish(sampleFrame);

    expect(puts).toHaveLength(2);
    const cam = puts.find((p) => p.keyExpr.includes("image_raw"))!;
    const lid = puts.find((p) => p.keyExpr.includes("point_cloud"))!;
    expect(cam.keyExpr).toBe(`bino/@v0/ego/pubsub/image_raw/bow_camera`);
    expect(lid.keyExpr).toBe(`bino/@v0/ego/pubsub/point_cloud/main_lidar`);

    const decodedCam = decodeCameraEnvelope(cam.payload)!;
    expect(decodedCam.width).toBe(2);
    expect(decodedCam.height).toBe(2);
    expect(decodedCam.pixels[0]).toBe(0xab);

    const decodedLid = decodePointCloudEnvelope(lid.payload)!;
    expect(decodedLid.count).toBe(2);
    expect(decodedLid.points[0]).toBeCloseTo(1, 5);
    expect(decodedLid.points[5]).toBeCloseTo(6, 5);
  });

  it("ignores outputs whose sensorId isn't registered", async () => {
    const { session, puts } = makeSession();
    const publisher = createSensorPublisher({ session, sensors });
    await publisher.publish({
      index: 0,
      time: 0,
      outputs: [
        {
          sensorId: "ghost/sensor",
          renderMs: 0,
          output: { pixels: new Uint8Array(4), width: 1, height: 1, time: 0 },
        },
      ],
    });
    expect(puts).toHaveLength(0);
  });

  it("uses topicOverride when set, bypassing construct_pubSub_key", async () => {
    const { session, puts } = makeSession();
    const overridden: SensorMeta[] = [
      {
        sensorId: "ego/bow_camera",
        vesselId: "ego",
        topicSensorId: "bow_camera",
        type: "camera",
        topicOverride: "custom/topic/foo",
      },
    ];
    const publisher = createSensorPublisher({ session, sensors: overridden });
    await publisher.publish({
      ...sampleFrame,
      outputs: [sampleFrame.outputs[0]!],
    });
    expect(puts).toHaveLength(1);
    expect(puts[0]!.keyExpr).toBe("custom/topic/foo");
  });

  it("respects a custom KeelsonNaming", async () => {
    const { session, puts } = makeSession();
    const publisher = createSensorPublisher({
      session,
      sensors,
      naming: { ...DEFAULT_NAMING, base_path: "rise", source_id: "bino-1" },
    });
    await publisher.publish(sampleFrame);
    expect(puts.find((p) => p.keyExpr.includes("image_raw"))!.keyExpr).toBe(
      "rise/@v0/ego/pubsub/image_raw/bow_camera",
    );
  });
});
