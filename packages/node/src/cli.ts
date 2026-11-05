#!/usr/bin/env node
import { argv, env, exit, stderr, stdout } from "node:process";
import { dirname } from "node:path";
import { CongestionControl, Config, open } from "@eclipse-zenoh/zenoh-ts";
import {
  MemoryPoseStream,
  createZenohPoseStream,
  navTopicKeys,
  navSourceOverrides,
  resolveNavIdentity,
  prepareTerrain,
  teePoseStream,
  terrainProviderFromSources,
  terrainSourcesSignature,
  type PoseStream,
  type CompiledScene,
  type TerrainData,
  type ZenohNavVessel,
} from "@bino/core";
import { loadScenario } from "./yaml.js";
import { createNodeService } from "./service.js";
import { BarrierTickSource } from "./tick-source.js";
import { createRadarAugmenter, type RadarAugmenter } from "./radar-augmenter.js";
import { createLidarAugmenter, type LidarAugmenter } from "./lidar-augmenter.js";
import { createFileTerrainCache } from "./terrain-cache.js";
import { createFileSourceReaders } from "./terrain-readers.js";

interface CliArgs {
  scenarioPath: string;
  zenoh?: string;
  workers?: boolean;
}

function parseArgs(args: string[]): CliArgs | null {
  let scenarioPath: string | undefined;
  let zenoh: string | undefined;
  let workers = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === "--zenoh" || a === "-z") {
      zenoh = args[++i];
    } else if (a === "--workers") {
      workers = true;
    } else if (!scenarioPath) {
      scenarioPath = a;
    }
  }
  if (!scenarioPath) return null;
  return { scenarioPath, ...(zenoh ? { zenoh } : {}), ...(workers ? { workers } : {}) };
}

function zenohVessels(scenario: CompiledScene): Array<{ vesselId: string; topic: string }> {
  const out: Array<{ vesselId: string; topic: string }> = [];
  for (const v of scenario.vessels) {
    if (v.pose_source.type === "zenoh") {
      out.push({ vesselId: v.id, topic: v.pose_source.topic });
    }
  }
  return out;
}

function navVessels(scenario: CompiledScene): ZenohNavVessel[] {
  const out: ZenohNavVessel[] = [];
  const scenarioBasePath = scenario.keelson.base_path;
  for (const v of scenario.vessels) {
    if (v.pose_source.type === "keelson_nav") {
      const identity = resolveNavIdentity({
        scenarioBasePath,
        vesselId: v.id,
        ...(v.keelson ? { vesselKeelson: v.keelson } : {}),
        poseSource: v.pose_source,
      });
      out.push({
        vesselId: v.id,
        keys: navTopicKeys(identity, navSourceOverrides(v.pose_source)),
        useFixAltitude: v.pose_source.altitude_mode === "fix",
      });
    }
  }
  return out;
}

async function main(): Promise<void> {
  const parsed = parseArgs(argv.slice(2));
  if (!parsed) {
    stderr.write("usage: bino-node <scenario.yaml> [--zenoh ws://host:port] [--workers]\n");
    exit(1);
  }

  const scene = await loadScenario(parsed.scenarioPath);
  stdout.write(
    `loaded scenario '${scene.name}': ${scene.vessels.length} vessel(s), ` +
      `mode=${scene.modes.rendering}/${scene.modes.clock}/${scene.modes.determinism}\n`,
  );

  let terrain: TerrainData | undefined;
  if (scene.terrain) {
    // Cache prepared terrain by bbox so a location is fetched once.
    // Override the directory with BINO_TERRAIN_CACHE; set it empty to disable.
    const cacheDir = env.BINO_TERRAIN_CACHE ?? ".bino-cache/terrain";
    const cache = cacheDir ? createFileTerrainCache(cacheDir) : undefined;
    stdout.write(
      `terrain: preparing coastline + bathymetry for ${JSON.stringify(scene.terrain.bbox)}` +
        `${cache ? ` (cache: ${cacheDir})` : ""}…\n`,
    );
    // Build the per-layer source provider (ADR-005): custom/local/offline
    // sources from the DSL, with file paths resolved relative to the scenario.
    const readers = createFileSourceReaders(dirname(parsed.scenarioPath));
    const provider = terrainProviderFromSources(scene.terrain.sources, readers, {
      offline: scene.terrain.offline,
      buildings: scene.terrain.buildings,
      seamarks: scene.terrain.seamarks,
      gridResM: scene.terrain.grid_res_m,
    });
    const sourcesSig = scene.terrain.sources
      ? terrainSourcesSignature(scene.terrain.sources)
      : undefined;
    const t0 = performance.now();
    terrain = await prepareTerrain(scene.terrain.bbox, {
      ...(cache ? { cache } : {}),
      buildings: scene.terrain.buildings,
      seamarks: scene.terrain.seamarks,
      gridResM: scene.terrain.grid_res_m,
      provider,
      ...(sourcesSig ? { sourcesSig } : {}),
    });
    stdout.write(
      `terrain: ready in ${(performance.now() - t0).toFixed(0)} ms ` +
        `(${terrain.coastline.length} chains, ${terrain.bathymetry.width}x${terrain.bathymetry.height} grid)\n`,
    );
  }

  let stream: PoseStream;
  let zenohSession: Awaited<ReturnType<typeof open>> | undefined;

  if (parsed.zenoh) {
    zenohSession = await open(new Config(parsed.zenoh));
    const ftVessels = zenohVessels(scene);
    const nav = navVessels(scene);
    // Warn (once per vessel) when latest-wins fusion accepts a stale attitude
    // value, so the lossiness is visible rather than silent.
    const warnedSkew = new Set<string>();
    stream = await createZenohPoseStream({
      session: zenohSession,
      vessels: ftVessels,
      nav,
      anchor: scene.anchor,
      onSkew: (vesselId, skew_s) => {
        if (skew_s > 0.5 && !warnedSkew.has(vesselId)) {
          warnedSkew.add(vesselId);
          stdout.write(
            `zenoh: nav fusion for '${vesselId}' pairing a fix with attitude ` +
              `${skew_s.toFixed(2)}s stale (latest-wins)\n`,
          );
        }
      },
    });
    stdout.write(
      `zenoh: connected to ${parsed.zenoh}, ${ftVessels.length} frame_transform + ` +
        `${nav.length} decomposed-nav vessel(s)\n`,
    );
  } else {
    stream = new MemoryPoseStream();
    stdout.write("zenoh: no --zenoh endpoint, running without pose updates\n");
  }

  // A barrier clock waits on Slipway's tick fence and answers each tick it
  // rendered (ADR-0033). Subscribed before the loop starts, because a worker
  // that misses its first fence holds a blocking run until the deadline.
  let tickSource: BarrierTickSource | undefined;
  if (scene.modes.clock === "barrier") {
    if (!zenohSession || !scene.barrier) {
      stderr.write("bino-node: a 'barrier' clock needs --zenoh and a barrier block\n");
      exit(2);
    }
    const session = zenohSession;
    tickSource = new BarrierTickSource({
      session: {
        declareSubscriber: (k) => session.declareSubscriber(k),
        // BLOCK: a dropped ack stalls the run until its deadline, for nothing.
        put: (k, b) => session.put(k, b, { congestionControl: CongestionControl.BLOCK }),
      },
      fenceKey: scene.barrier.fence_key,
      ackKey: scene.barrier.ack_key,
    });
    await tickSource.start();
    stdout.write(
      `barrier: waiting on ${scene.barrier.fence_key}, acking on ${scene.barrier.ack_key}\n`,
    );
  }

  const service = createNodeService({
    scenario: scene,
    ...(tickSource ? { tickSource } : {}),
    ...(zenohSession ? { zenohSession } : {}),
    ...(terrain ? { terrain } : {}),
    ...(parsed.workers ? { workers: true } : {}),
  });
  if (parsed.workers) {
    stdout.write("compute: lidar/radar offloaded to worker threads\n");
  }
  if (service.publisher) {
    stdout.write("zenoh: sensor publishing enabled\n");
  }

  // Inject-augment: tee the pose stream so the runner keeps its path while a
  // PoseSampler is fed in parallel; each augment radar subscribes to its real
  // stream and republishes the merged result. Needs a zenoh session for both
  // the subscribe and the publish.
  let runnerStream: PoseStream = stream;
  const radarAugmenters: RadarAugmenter[] = [];
  const lidarAugmenters: LidarAugmenter[] = [];
  const augmentPumps: Promise<void>[] = [];
  const hasAugment = !!(service.radarAugments?.length || service.lidarAugments?.length);
  if (zenohSession && hasAugment && service.poseSampler) {
    const sampler = service.poseSampler;
    const [rs, ss] = teePoseStream(stream);
    runnerStream = rs;
    augmentPumps.push(
      (async () => {
        for await (const u of ss) sampler.record(u.entityId, u.pose, u.time);
      })(),
    );
    for (const b of service.radarAugments ?? []) {
      const aug = createRadarAugmenter({
        session: zenohSession,
        publish: zenohSession,
        realTopic: b.realTopic,
        publishTopic: b.publishTopic,
        fallbackGeom: b.fallbackGeom,
        renderRevolution: b.renderRevolution,
        groundTruth: b.groundTruth,
      });
      radarAugmenters.push(aug);
      augmentPumps.push(aug.run());
      stdout.write(`augment: radar '${b.sensorId}' merging ${b.realTopic} → ${b.publishTopic}\n`);
      stdout.write(`augment: radar '${b.sensorId}' ground truth → ${b.groundTruth.topic}\n`);
    }
    for (const b of service.lidarAugments ?? []) {
      const aug = createLidarAugmenter({
        session: zenohSession,
        publish: zenohSession,
        realTopic: b.realTopic,
        publishTopic: b.publishTopic,
        renderFrame: b.renderFrame,
      });
      lidarAugmenters.push(aug);
      augmentPumps.push(aug.run());
      stdout.write(`augment: lidar '${b.sensorId}' merging ${b.realTopic} → ${b.publishTopic}\n`);
    }
  }

  const shutdown = (): void => {
    service.runner.stop();
    for (const a of radarAugmenters) void a.stop();
    for (const a of lidarAugmenters) void a.stop();
    stream.close();
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  try {
    let count = 0;
    let lastLog = performance.now();
    for await (const frame of service.runner.frames(runnerStream)) {
      count += 1;
      if (service.publisher) await service.publisher.publish(frame);
      const now = performance.now();
      if (now - lastLog >= 1000) {
        const totalRenderMs = frame.outputs.reduce((s, o) => s + o.renderMs, 0);
        const fired = frame.outputs.map((o) => o.sensorId).join(",");
        stdout.write(
          `t=${frame.time.toFixed(2)}s  frames=${count}  fired=[${fired}]  renderMs=${totalRenderMs.toFixed(2)}\n`,
        );
        lastLog = now;
      }
    }
    stdout.write(`stopped after ${count} frame(s)\n`);
    if (tickSource) {
      const { acked, skipped } = tickSource.stats;
      stdout.write(`barrier: ${acked} tick(s) acknowledged, ${skipped} skipped\n`);
    }
  } finally {
    for (const a of radarAugmenters) await a.stop();
    for (const a of lidarAugmenters) await a.stop();
    await Promise.allSettled(augmentPumps);
    for (let i = 0; i < radarAugmenters.length; i++) {
      const { augmented, forwarded, groundTruth } = radarAugmenters[i]!.stats;
      stdout.write(
        `augment: radar '${service.radarAugments![i]!.sensorId}' ${augmented} merged, ` +
          `${forwarded} forwarded, ${groundTruth} ground-truth\n`,
      );
    }
    for (let i = 0; i < lidarAugmenters.length; i++) {
      const { augmented, forwarded } = lidarAugmenters[i]!.stats;
      stdout.write(
        `augment: lidar '${service.lidarAugments![i]!.sensorId}' ${augmented} merged, ` +
          `${forwarded} forwarded\n`,
      );
    }
    service.dispose();
    await zenohSession?.close().catch(() => {});
  }
}

main().catch((err) => {
  stderr.write(`bino-node: ${err instanceof Error ? err.message : String(err)}\n`);
  exit(2);
});
