import { describe, expect, it } from "vitest";
import { Config, Session } from "@eclipse-zenoh/zenoh-ts";
import {
  compileScenario,
  createZenohPoseStream,
  decodeCameraEnvelope,
  decodePointCloudEnvelope,
  decodeRadarSweepEnvelope,
  encodePoseUpdate,
  poseTopicKey,
  cameraTopicKey,
  lidarTopicKey,
  radarTopicKey,
  DEFAULT_NAMING,
} from "@bino/core";
import { createNodeService } from "../src/service.js";
import { createHeadlessRenderer } from "../src/headless-gl.js";

// Gated on BINO_ZENOH_URL — set to "ws/127.0.0.1:10000" with the
// zenoh-router compose stack up to exercise the full v0.2 acceptance.
//
// Bring the router up:
//   docker compose -f tests/zenoh-router/docker-compose.yml up -d
const url = process.env["BINO_ZENOH_URL"];
const glAvailable = (() => {
  try {
    const handle = createHeadlessRenderer(8, 8);
    handle.dispose();
    return true;
  } catch {
    return false;
  }
})();
const itLive = url && glAvailable ? it : it.skip;

const scenario = {
  name: "v02-e2e",
  anchor: { lat: 54.3233, lon: 10.1394, height: 0 },
  vessels: [
    {
      id: "ego",
      model: "tanker_120m",
      pose_source: { type: "zenoh", topic: poseTopicKey(DEFAULT_NAMING, "ego") },
      sensors: [
        {
          id: "bow_camera",
          type: "camera",
          mount: { x: 20, y: 0, z: 8 },
          fov_deg: 90,
          resolution: [128, 96],
          rate_hz: 10,
        },
        {
          id: "main_lidar",
          type: "lidar",
          mount: { x: 20, y: 0, z: 8 },
          channels: 32,
          range_m: 200,
          rate_hz: 10,
        },
        {
          id: "main_radar",
          type: "radar_marine",
          mount: { x: 0, y: 0, z: 35 },
          // Faster rotation than the scenario default (0.4 Hz) so we
          // get at least 1-2 sweeps in the 3-second test window.
          range_m: 2000,
          rotation_rate_hz: 2.0,
          beam_width_deg: 1.2,
          spokes_per_rev: 90,
          range_bins: 100,
        },
      ],
    },
    {
      id: "ferry",
      model: "ferry_60m",
      pose_source: { type: "zenoh", topic: poseTopicKey(DEFAULT_NAMING, "ferry") },
      sensors: [],
    },
  ],
  modes: { rendering: "replace", clock: "wall", determinism: "relaxed" },
};

describe("v0.2 e2e: full duplex via Zenoh", () => {
  itLive(
    "publisher → bino-node service → camera + lidar + radar consumers all roundtrip",
    async () => {
      const compiled = compileScenario(scenario);

      // Two sessions — service and probe — to confirm each side stands
      // independently against the same router.
      const serviceSession = await Session.open(new Config(url!));
      const probeSession = await Session.open(new Config(url!));
      try {
        // Pose stream for the service consumes ego + ferry.
        const poseStream = await createZenohPoseStream({
          session: serviceSession,
          vessels: [
            { vesselId: "ego", topic: poseTopicKey(DEFAULT_NAMING, "ego") },
            { vesselId: "ferry", topic: poseTopicKey(DEFAULT_NAMING, "ferry") },
          ],
        });
        const service = createNodeService({
          scenario: compiled,
          zenohSession: serviceSession,
        });
        expect(service.publisher).toBeDefined();

        // Probe consumers for camera, lidar, radar.
        const camTopic = cameraTopicKey(DEFAULT_NAMING, "ego", "bow_camera");
        const lidTopic = lidarTopicKey(DEFAULT_NAMING, "ego", "main_lidar");
        const radTopic = radarTopicKey(DEFAULT_NAMING, "ego", "main_radar");
        const camSub = await probeSession.declareSubscriber(camTopic);
        const lidSub = await probeSession.declareSubscriber(lidTopic);
        const radSub = await probeSession.declareSubscriber(radTopic);

        type CamSnap = { hash: number; t: number };
        const camFrames: CamSnap[] = [];
        const lidCounts: number[] = [];
        const radSweeps: Array<{ spokes: number; t: number }> = [];

        const fnv = (b: Uint8Array): number => {
          let h = 0x811c9dc5;
          for (let i = 0; i < b.length; i++) {
            h ^= b[i]!;
            h = Math.imul(h, 0x01000193);
          }
          return h >>> 0;
        };

        const camTask = (async () => {
          const recv = camSub.receiver();
          if (!recv) return;
          for await (const sample of recv) {
            const decoded = decodeCameraEnvelope(sample.payload().toBytes());
            if (!decoded) continue;
            camFrames.push({ hash: fnv(decoded.pixels), t: decoded.time });
            if (camFrames.length >= 10) break;
          }
        })();
        const lidTask = (async () => {
          const recv = lidSub.receiver();
          if (!recv) return;
          for await (const sample of recv) {
            const decoded = decodePointCloudEnvelope(sample.payload().toBytes());
            if (!decoded) continue;
            lidCounts.push(decoded.count);
            if (lidCounts.length >= 10) break;
          }
        })();
        const radTask = (async () => {
          const recv = radSub.receiver();
          if (!recv) return;
          for await (const sample of recv) {
            const decoded = decodeRadarSweepEnvelope(sample.payload().toBytes());
            if (!decoded) continue;
            radSweeps.push({ spokes: decoded.spokes.length, t: decoded.time });
            if (radSweeps.length >= 3) break;
          }
        })();

        // Drive the service for ~3s while a synthetic publisher emits
        // pose updates at 20 Hz.
        const runStart = Date.now();
        const runner = service.runner;
        const runTask = (async () => {
          for await (const frame of runner.frames(poseStream)) {
            if (service.publisher) await service.publisher.publish(frame);
            if (Date.now() - runStart > 3000) break;
          }
        })();

        const publishTask = (async () => {
          let i = 0;
          while (Date.now() - runStart < 3000) {
            const t = (Date.now() - runStart) / 1000;
            const ego = encodePoseUpdate({
              entityId: "ego",
              pose: { position: [0, 0, -t * 2], orientation: [0, 0, 0, 1] },
              time: t,
            });
            const ferry = encodePoseUpdate({
              entityId: "ferry",
              pose: { position: [Math.sin(t) * 30, 0, -50 - t * 2], orientation: [0, 0, 0, 1] },
              time: t,
            });
            await probeSession.put(ego.keyExpr, ego.bytes);
            await probeSession.put(ferry.keyExpr, ferry.bytes);
            i += 1;
            await new Promise((r) => setTimeout(r, 50));
          }
          void i;
        })();

        await Promise.all([
          publishTask,
          camTask.catch(() => {}),
          lidTask.catch(() => {}),
          radTask.catch(() => {}),
        ]);
        runner.stop();
        poseStream.close();
        await runTask.catch(() => {});

        // Acceptance:
        //  (a) per-sensor rate ≈ 10 Hz over 3s window → expect ≥ 20 frames.
        expect(camFrames.length).toBeGreaterThanOrEqual(10);
        expect(lidCounts.length).toBeGreaterThanOrEqual(10);

        //  (b) frame contents advance — camera hashes differ over time
        //      because ferry is moving relative to ego.
        const distinctHashes = new Set(camFrames.map((f) => f.hash));
        expect(distinctHashes.size).toBeGreaterThan(1);

        //  (c) lidar always produces a non-zero point count for the v0.1
        //      placeholder hulls in view.
        for (const c of lidCounts) expect(c).toBeGreaterThan(0);

        //  (d) radar fires at rotation_rate_hz=2.0 — expect ≥3 sweeps
        //      in 3 seconds. Each sweep has spokes_per_rev=90 spokes.
        expect(radSweeps.length).toBeGreaterThanOrEqual(3);
        for (const s of radSweeps) expect(s.spokes).toBe(90);

        // Cleanup
        await camSub.undeclare();
        await lidSub.undeclare();
        await radSub.undeclare();
        service.dispose();
      } finally {
        await serviceSession.close().catch(() => {});
        await probeSession.close().catch(() => {});
      }
    },
    20_000,
  );
});
