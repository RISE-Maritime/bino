#!/usr/bin/env node
// Inject-augment loopback harness (docs/internal/inject-augment.md).
//
// Plays the *real* side of an inject-augment run so the radar augment path can
// be exercised end-to-end without real hardware:
//   - publishes ego + ghost_target poses on the frame_transform/sim keys that
//     scenarios/v07_inject_augment.yaml subscribes to;
//   - publishes a free-running "real" radar_spoke stream (empty returns) on the
//     augment_source key;
//   - subscribes to the augmented output key and reports how many spokes came
//     back carrying a synthetic (ghost) return, and at what bearing.
//
// Run on a GL host (the bino-node augment path needs a real GL context):
//   1. start a zenoh router reachable at ws://HOST:PORT
//   2. terminal A:  bino-node scenarios/v07_inject_augment.yaml --zenoh ws://HOST:PORT
//   3. terminal B:  node packages/node/scripts/augment-loopback.mjs --zenoh ws://HOST:PORT
//
// A successful run prints a non-zero "augmented spokes with ghost return" count
// clustered around the ghost's bearing. Zero means the merge never fired — check
// that bino-node connected, the keys match, and GL is available.

import { argv, exit, stdout } from "node:process";
import { Config, open } from "@eclipse-zenoh/zenoh-ts";
import {
  encodePoseUpdate,
  encodeRadarSpoke,
  encodePointCloudPayload,
  decodeRadarSpokeEnvelope,
  decodePointCloudEnvelope,
  decodePoseEnvelope,
  groundTruthTopicKey,
  lidarTopicKey,
  radarSpokeTopicKey,
  resolveOutputIdentity,
} from "@bino/core";

// --- config (must match scenarios/v07_inject_augment.yaml) -------------------
const BASE_PATH = "bino";
const REAL_KEY = "platform/@v0/nav_radar/pubsub/radar_spoke/real"; // radar augment_source
const LIDAR_REAL_KEY = "platform/@v0/main_lidar/pubsub/point_cloud/real"; // lidar augment_source
const RANGE_M = 4000;
const RANGE_BINS = 256;
const SPOKES_PER_REV = 360;
const ROTATION_HZ = 0.4;

const RADAR_ID = resolveOutputIdentity({
  scenarioBasePath: BASE_PATH,
  vesselId: "ego",
  sensorId: "nav_radar",
});
const LIDAR_ID = resolveOutputIdentity({
  scenarioBasePath: BASE_PATH,
  vesselId: "ego",
  sensorId: "main_lidar",
});
const AUG_KEY = radarSpokeTopicKey(RADAR_ID);
const GT_KEY = groundTruthTopicKey(RADAR_ID);
const LIDAR_AUG_KEY = lidarTopicKey(LIDAR_ID);

// xyz-only point cloud fields (FLOAT32 = 7), 12-byte stride.
const XYZ_FIELDS = [
  { name: "x", offset: 0, type: 7 },
  { name: "y", offset: 4, type: 7 },
  { name: "z", offset: 8, type: 7 },
];

function parseArgs(args) {
  let zenoh = "ws://localhost:10000";
  let durationS = 15;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--zenoh" || args[i] === "-z") zenoh = args[++i];
    else if (args[i] === "--duration") durationS = Number(args[++i]);
  }
  return { zenoh, durationS };
}

function poseBytes(entityId, x, y, time) {
  return encodePoseUpdate(
    { entityId, pose: { position: [x, y, 0], orientation: [0, 0, 0, 1] }, time },
    { base_path: BASE_PATH },
  );
}

async function main() {
  const { zenoh, durationS } = parseArgs(argv.slice(2));
  const session = await open(new Config(zenoh));
  stdout.write(`loopback: connected to ${zenoh}\n`);
  stdout.write(`loopback: real radar → ${REAL_KEY}\n`);
  stdout.write(`loopback: real lidar → ${LIDAR_REAL_KEY}\n`);
  stdout.write(`loopback: watching augmented radar → ${AUG_KEY}\n`);
  stdout.write(`loopback: watching ground truth → ${GT_KEY}\n`);
  stdout.write(`loopback: watching augmented lidar → ${LIDAR_AUG_KEY}\n`);

  // Watch the augmented output: count spokes whose intensity has any non-zero
  // bin (i.e. a synthetic ghost return merged in), and remember their bearings.
  let augmentedTotal = 0;
  let augmentedWithGhost = 0;
  const ghostBearings = new Set();
  const sub = await session.declareSubscriber(AUG_KEY);
  const recv = sub.receiver?.();
  if (recv) {
    void (async () => {
      for await (const sample of recv) {
        const s = decodeRadarSpokeEnvelope(sample.payload().toBytes());
        if (!s) continue;
        augmentedTotal++;
        if (s.intensity.some((v) => v > 0)) {
          augmentedWithGhost++;
          ghostBearings.add(Math.round((s.azimuth * 180) / Math.PI));
        }
      }
    })();
  }

  // Watch ground truth: the injected target's true range/bearing per revolution.
  let groundTruthMsgs = 0;
  let lastTruth = "";
  const gtSub = await session.declareSubscriber(GT_KEY);
  const gtRecv = gtSub.receiver?.();
  if (gtRecv) {
    void (async () => {
      for await (const sample of gtRecv) {
        const ft = decodePoseEnvelope(sample.payload().toBytes());
        if (!ft) continue;
        groundTruthMsgs++;
        const [x, y] = ft.pose.position;
        const range = Math.hypot(x, y);
        const bearing = Math.round((Math.atan2(y, x) * 180) / Math.PI);
        lastTruth = `${ft.entityId} @ ${range.toFixed(0)} m, ${bearing}°`;
      }
    })();
  }

  // Watch the augmented lidar: an empty real cloud means any points in the
  // augmented cloud are Bino's synthetic ghost.
  let lidarCloudsRecv = 0;
  let maxLidarPoints = 0;
  const lidarSub = await session.declareSubscriber(LIDAR_AUG_KEY);
  const lidarRecv = lidarSub.receiver?.();
  if (lidarRecv) {
    void (async () => {
      for await (const sample of lidarRecv) {
        const pc = decodePointCloudEnvelope(sample.payload().toBytes());
        if (!pc) continue;
        lidarCloudsRecv++;
        if (pc.count > maxLidarPoints) maxLidarPoints = pc.count;
      }
    })();
  }
  // An empty real point cloud (0 points), republished each frame on the real key.
  const emptyCloud = (time) =>
    encodePointCloudPayload(
      {
        data: new Uint8Array(0),
        pointStride: 12,
        fields: XYZ_FIELDS,
        frameId: "platform/lidar",
        time,
      },
      LIDAR_REAL_KEY,
    );

  // Drive poses + a rotating real radar. Ego at the origin; ghost 1200 m ahead
  // and 300 m to starboard, drifting slowly so sample-at-spoke-time matters.
  const sweepDuration = 1 / ROTATION_HZ;
  const spokeDt = sweepDuration / SPOKES_PER_REV;
  const emptyBins = new Uint8Array(RANGE_BINS);
  const t0 = 0;
  let realSpokesSent = 0;
  const startWall = nowMs();
  let t = t0;

  while (nowMs() - startWall < durationS * 1000) {
    // Pose updates once per revolution (AIS-ish rate is fine; the sampler
    // interpolates between them at each spoke's timestamp).
    await session.put(...putArgs(poseBytes("ego", 0, 0, t)));
    const ghostX = 1200;
    const ghostY = 300 + 20 * Math.sin(t / 5); // gentle drift
    await session.put(...putArgs(poseBytes("ghost_target", ghostX, ghostY, t)));

    // One revolution of empty real spokes — the augmented stream's only returns
    // come from Bino's synthetic ghost, which is exactly what we want to detect.
    for (let i = 0; i < SPOKES_PER_REV; i++) {
      const azimuth = (i / SPOKES_PER_REV) * Math.PI * 2;
      const spokeTime = t + i * spokeDt;
      const e = encodeRadarSpoke(
        {
          azimuth,
          intensity: emptyBins,
          range_m: RANGE_M,
          time: spokeTime,
          frameId: "platform/nav_radar",
        },
        REAL_KEY,
      );
      await session.put(...putArgs(e));
      realSpokesSent++;
    }
    // One empty real lidar cloud per frame.
    await session.put(...putArgs(emptyCloud(t)));
    t += sweepDuration;
    await sleep(sweepDuration * 1000);
  }

  await sleep(500); // let the last augmented messages arrive
  stdout.write(
    `\nloopback summary:\n` +
      `  real spokes sent:                 ${realSpokesSent}\n` +
      `  augmented spokes received:        ${augmentedTotal}\n` +
      `  augmented spokes with ghost:      ${augmentedWithGhost}\n` +
      `  ghost bearings (deg):             ${[...ghostBearings].sort((a, b) => a - b).join(", ") || "(none)"}\n` +
      `  ground-truth messages:            ${groundTruthMsgs}\n` +
      `  last ground truth:                ${lastTruth || "(none)"}\n` +
      `  augmented lidar clouds:           ${lidarCloudsRecv}\n` +
      `  max synthetic lidar points:       ${maxLidarPoints}\n`,
  );
  if (augmentedTotal === 0)
    stdout.write("  ⚠ no augmented spokes — is bino-node running and connected?\n");
  else if (augmentedWithGhost === 0)
    stdout.write("  ⚠ augmented but no ghost — check GL render / ghost pose\n");
  else stdout.write("  ✓ synthetic ghost is being merged into the real stream\n");

  await sub.undeclare?.().catch(() => {});
  await gtSub.undeclare?.().catch(() => {});
  await lidarSub.undeclare?.().catch(() => {});
  await session.close().catch(() => {});
}

// zenoh-ts put takes (keyExpr, payload); spread an EncodedTopic into that shape.
function putArgs(encoded) {
  return [encoded.keyExpr, encoded.bytes];
}
function nowMs() {
  return Number(process.hrtime.bigint() / 1000000n);
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((err) => {
  stdout.write(`augment-loopback: ${err instanceof Error ? err.message : String(err)}\n`);
  exit(1);
});
