import { describe, expect, it } from "vitest";
import {
  encodePoseUpdate,
  decodePoseEnvelope,
  encodeCameraFrame,
  decodeCameraEnvelope,
  encodePointCloud,
  decodePointCloudEnvelope,
  poseTopicKey,
  cameraTopicKey,
  lidarTopicKey,
  DEFAULT_NAMING,
} from "../src/keelson.js";
import type { PoseUpdate } from "../src/pose.js";
import type { CameraFrame } from "../src/camera.js";
import type { LidarFrame } from "../src/lidar.js";

describe("Keelson topic keys", () => {
  it("constructs frame_transform key for a vessel", () => {
    expect(poseTopicKey(DEFAULT_NAMING, "ego")).toBe(
      "bino/@v0/ego/pubsub/frame_transform/sim",
    );
  });

  it("constructs image_raw key for a sensor on a vessel", () => {
    expect(cameraTopicKey(DEFAULT_NAMING, "ego", "bow_camera")).toBe(
      "bino/@v0/ego/pubsub/image_raw/bow_camera",
    );
  });

  it("constructs point_cloud key for a sensor on a vessel", () => {
    expect(lidarTopicKey(DEFAULT_NAMING, "ego", "main_lidar")).toBe(
      "bino/@v0/ego/pubsub/point_cloud/main_lidar",
    );
  });

  it("respects an overridden base_path and source_id", () => {
    const naming = { ...DEFAULT_NAMING, base_path: "rise", source_id: "bino-1" };
    expect(poseTopicKey(naming, "ego")).toBe("rise/@v0/ego/pubsub/frame_transform/bino-1");
  });
});

describe("encodePoseUpdate / decodePoseEnvelope", () => {
  const update: PoseUpdate = {
    entityId: "ego",
    pose: {
      position: [12.5, -3.25, 7.0],
      orientation: [0.1, 0.2, 0.3, 0.927],
    },
    time: 1.5,
  };

  it("roundtrips position, orientation, and time through the envelope", () => {
    const { keyExpr, bytes } = encodePoseUpdate(update);
    expect(keyExpr).toBe("bino/@v0/ego/pubsub/frame_transform/sim");
    expect(bytes.byteLength).toBeGreaterThan(0);

    const decoded = decodePoseEnvelope(bytes);
    expect(decoded).not.toBeNull();
    expect(decoded!.entityId).toBe("ego");
    expect(decoded!.pose.position[0]).toBeCloseTo(12.5);
    expect(decoded!.pose.position[1]).toBeCloseTo(-3.25);
    expect(decoded!.pose.position[2]).toBeCloseTo(7.0);
    expect(decoded!.pose.orientation[0]).toBeCloseTo(0.1, 5);
    expect(decoded!.pose.orientation[3]).toBeCloseTo(0.927, 5);
    expect(decoded!.time).toBeCloseTo(1.5, 3);
  });

  it("returns null on garbage input", () => {
    expect(decodePoseEnvelope(new Uint8Array([1, 2, 3, 4]))).toBeNull();
  });
});

describe("encodeCameraFrame / decodeCameraEnvelope", () => {
  const frame: CameraFrame = {
    pixels: new Uint8Array([1, 2, 3, 255, 4, 5, 6, 255, 7, 8, 9, 255, 10, 11, 12, 255]),
    width: 2,
    height: 2,
    time: 0.5,
  };

  it("roundtrips dimensions and pixels via image_raw / rgba8", () => {
    const { keyExpr, bytes } = encodeCameraFrame(frame, "ego", "bow_camera");
    expect(keyExpr).toBe("bino/@v0/ego/pubsub/image_raw/bow_camera");

    const decoded = decodeCameraEnvelope(bytes);
    expect(decoded).not.toBeNull();
    expect(decoded!.width).toBe(2);
    expect(decoded!.height).toBe(2);
    expect(decoded!.encoding).toBe("rgba8");
    expect(decoded!.step).toBe(2 * 4);
    expect(Array.from(decoded!.pixels)).toEqual(Array.from(frame.pixels));
    expect(decoded!.time).toBeCloseTo(0.5, 3);
  });
});

describe("encodeRadarSweep / decodeRadarSweepEnvelope", () => {
  const frame = {
    spokes: [
      { azimuth: 0, intensity: new Uint8Array([0, 0, 255, 0]) },
      { azimuth: Math.PI, intensity: new Uint8Array([0, 0, 0, 255]) },
    ],
    time: 1.25,
  };

  it("roundtrips spokes via radar_sweep", async () => {
    const { encodeRadarSweep, decodeRadarSweepEnvelope, radarTopicKey, DEFAULT_NAMING } =
      await import("../src/keelson.js");
    const { keyExpr, bytes } = encodeRadarSweep(frame, "ego", "main_radar", 200);
    expect(keyExpr).toBe(radarTopicKey(DEFAULT_NAMING, "ego", "main_radar"));

    const decoded = decodeRadarSweepEnvelope(bytes);
    expect(decoded).not.toBeNull();
    expect(decoded!.spokes).toHaveLength(2);
    expect(decoded!.spokes[0]!.azimuth).toBeCloseTo(0, 5);
    expect(decoded!.spokes[1]!.azimuth).toBeCloseTo(Math.PI, 5);
    expect(Array.from(decoded!.spokes[0]!.intensity)).toEqual([0, 0, 255, 0]);
    expect(Array.from(decoded!.spokes[1]!.intensity)).toEqual([0, 0, 0, 255]);
    expect(decoded!.time).toBeCloseTo(1.25, 3);
  });
});

describe("encodePointCloud / decodePointCloudEnvelope", () => {
  const pts = new Float32Array([1, 2, 3, 4, 5, 6]);
  const frame: LidarFrame = { points: pts, count: 2, time: 0.25 };

  it("roundtrips points (x,y,z) via point_cloud", () => {
    const { keyExpr, bytes } = encodePointCloud(frame, "ego", "main_lidar");
    expect(keyExpr).toBe("bino/@v0/ego/pubsub/point_cloud/main_lidar");

    const decoded = decodePointCloudEnvelope(bytes);
    expect(decoded).not.toBeNull();
    expect(decoded!.count).toBe(2);
    expect(decoded!.points.length).toBe(6);
    for (let i = 0; i < 6; i++) {
      expect(decoded!.points[i]).toBeCloseTo(pts[i]!, 5);
    }
    expect(decoded!.time).toBeCloseTo(0.25, 3);
  });
});
