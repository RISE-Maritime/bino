import { describe, expect, it, vi } from "vitest";
import { isSubjectWellKnown } from "@rise-maritime/keelson-js";
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
  navTopicKeys,
  navSourceOverrides,
  DEFAULT_NAMING,
  groundTruthTopicKey,
} from "../src/keelson.js";
import type { PoseUpdate } from "../src/pose.js";
import type { CameraFrame } from "../src/camera.js";
import type { LidarFrame } from "../src/lidar-wasm.js";

describe("Keelson topic keys", () => {
  it("constructs frame_transform key for a vessel", () => {
    expect(poseTopicKey(DEFAULT_NAMING, "ego")).toBe("bino/@v0/ego/pubsub/frame_transform/sim");
  });

  it("constructs image_raw key from a resolved identity", () => {
    expect(cameraTopicKey({ base_path: "bino", entity_id: "ego", source_id: "bow_camera" })).toBe(
      "bino/@v0/ego/pubsub/image_raw/bow_camera",
    );
  });

  it("constructs point_cloud key from a resolved identity", () => {
    expect(lidarTopicKey({ base_path: "bino", entity_id: "ego", source_id: "main_lidar" })).toBe(
      "bino/@v0/ego/pubsub/point_cloud/main_lidar",
    );
  });

  it("honors overridden identity segments (ADR-004)", () => {
    expect(
      cameraTopicKey({ base_path: "rise", entity_id: "ego_platform", source_id: "cam_fwd" }),
    ).toBe("rise/@v0/ego_platform/pubsub/image_raw/cam_fwd");
    expect(poseTopicKey({ base_path: "rise" }, "ego")).toBe(
      "rise/@v0/ego/pubsub/frame_transform/sim",
    );
  });
});

describe("navTopicKeys — decomposed-nav subscription keys", () => {
  const id = { base_path: "rise", entity_id: "sf18", source_id: "mav/0" };

  it("uses the shared source_id for every subject by default", () => {
    expect(navTopicKeys(id)).toEqual({
      locationFix: "rise/@v0/sf18/pubsub/location_fix/mav/0",
      heading: "rise/@v0/sf18/pubsub/heading_true_north_deg/mav/0",
      pitch: "rise/@v0/sf18/pubsub/pitch_deg/mav/0",
      roll: "rise/@v0/sf18/pubsub/roll_deg/mav/0",
    });
  });

  it("overrides source per subject, falling back to source_id when unset", () => {
    const sources = navSourceOverrides({
      location_fix_source: "ardusimple/gga",
      heading_source: "ardusimple/uniheadinga",
      pitch_source: "ardusimple/uniheadinga",
      // roll_source omitted → falls back to mav/0
    });
    expect(navTopicKeys(id, sources)).toEqual({
      locationFix: "rise/@v0/sf18/pubsub/location_fix/ardusimple/gga",
      heading: "rise/@v0/sf18/pubsub/heading_true_north_deg/ardusimple/uniheadinga",
      pitch: "rise/@v0/sf18/pubsub/pitch_deg/ardusimple/uniheadinga",
      roll: "rise/@v0/sf18/pubsub/roll_deg/mav/0",
    });
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
    const { keyExpr, bytes } = encodeCameraFrame(frame, {
      base_path: "bino",
      entity_id: "ego",
      source_id: "bow_camera",
    });
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
    const { encodeRadarSweep, decodeRadarSweepEnvelope, radarTopicKey } =
      await import("../src/keelson.js");
    const id = { base_path: "bino", entity_id: "ego", source_id: "main_radar" };
    const { keyExpr, bytes } = encodeRadarSweep(frame, id, 200);
    expect(keyExpr).toBe(radarTopicKey(id));

    const decoded = decodeRadarSweepEnvelope(bytes);
    expect(decoded).not.toBeNull();
    expect(decoded!.spokes).toHaveLength(2);
    expect(decoded!.spokes[0]!.azimuth).toBeCloseTo(0, 5);
    expect(decoded!.spokes[1]!.azimuth).toBeCloseTo(Math.PI, 5);
    expect(Array.from(decoded!.spokes[0]!.intensity)).toEqual([0, 0, 255, 0]);
    expect(Array.from(decoded!.spokes[1]!.intensity)).toEqual([0, 0, 0, 255]);
    expect(decoded!.time).toBeCloseTo(1.25, 3);
  });

  it("preserves per-spoke acquisition time (frame.time + intra-sweep offset)", async () => {
    const { encodeRadarSweep, decodeRadarSweepEnvelope } = await import("../src/keelson.js");
    // Kernel emits intra-sweep offsets relative to frame start; absolute spoke
    // time must come out as frame.time + offset, not collapsed to frame.time.
    const swept = {
      spokes: [
        { azimuth: 0, intensity: new Uint8Array([1]), timestamp: 0 },
        { azimuth: Math.PI / 2, intensity: new Uint8Array([2]), timestamp: 0.25 },
        { azimuth: Math.PI, intensity: new Uint8Array([3]), timestamp: 0.5 },
      ],
      time: 1000,
    };
    const { bytes } = encodeRadarSweep(
      swept,
      { base_path: "bino", entity_id: "ego", source_id: "main_radar" },
      200,
    );
    const decoded = decodeRadarSweepEnvelope(bytes);
    expect(decoded).not.toBeNull();
    expect(decoded!.spokes[0]!.time).toBeCloseTo(1000.0, 3);
    expect(decoded!.spokes[1]!.time).toBeCloseTo(1000.25, 3);
    expect(decoded!.spokes[2]!.time).toBeCloseTo(1000.5, 3);
    // Frame time tracks the first spoke (start of sweep).
    expect(decoded!.time).toBeCloseTo(1000.0, 3);
  });
});

describe("encodeRadarSpokes / decodeRadarSpokeEnvelope", () => {
  const frame = {
    spokes: [
      { azimuth: 0, intensity: new Uint8Array([1, 2]), timestamp: 0 },
      { azimuth: Math.PI / 2, intensity: new Uint8Array([3, 4]), timestamp: 0.5 },
    ],
    time: 100,
  };

  it("emits one RadarSpoke per spoke, all on the radar_spoke key", async () => {
    const { encodeRadarSpokes, decodeRadarSpokeEnvelope, radarSpokeTopicKey } =
      await import("../src/keelson.js");
    const id = { base_path: "bino", entity_id: "ego", source_id: "main_radar" };
    const encoded = encodeRadarSpokes(frame, id, 200);

    expect(encoded).toHaveLength(2);
    expect(encoded[0]!.keyExpr).toBe(radarSpokeTopicKey(id));
    expect(encoded[0]!.keyExpr).toBe("bino/@v0/ego/pubsub/radar_spoke/main_radar");
    expect(encoded[1]!.keyExpr).toBe(encoded[0]!.keyExpr);

    const s0 = decodeRadarSpokeEnvelope(encoded[0]!.bytes)!;
    const s1 = decodeRadarSpokeEnvelope(encoded[1]!.bytes)!;
    expect(s0.azimuth).toBeCloseTo(0, 5);
    expect(s1.azimuth).toBeCloseTo(Math.PI / 2, 5);
    expect(Array.from(s0.intensity)).toEqual([1, 2]);
    expect(s0.range).toBe(200);
    // Per-spoke absolute time = frame.time + intra-sweep offset.
    expect(s0.time).toBeCloseTo(100.0, 3);
    expect(s1.time).toBeCloseTo(100.5, 3);
  });
});

describe("encodePointCloud / decodePointCloudEnvelope", () => {
  const pts = new Float32Array([1, 2, 3, 4, 5, 6]);
  const frame: LidarFrame = { points: pts, count: 2, time: 0.25 };

  it("roundtrips points (x,y,z) via point_cloud", () => {
    const { keyExpr, bytes } = encodePointCloud(frame, {
      base_path: "bino",
      entity_id: "ego",
      source_id: "main_lidar",
    });
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

describe("ground truth key", () => {
  const id = { base_path: "bino", entity_id: "ego", source_id: "nav_radar" };

  it("rides frame_transform, with truth marked in the source", () => {
    expect(groundTruthTopicKey(id)).toBe("bino/@v0/ego/pubsub/frame_transform/nav_radar/truth");
  });

  it("is a subject keelson knows, so building it warns of nothing", () => {
    expect(isSubjectWellKnown("frame_transform")).toBe(true);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      groundTruthTopicKey(id);
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });
});
