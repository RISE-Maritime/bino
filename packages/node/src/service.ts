import * as THREE from "three";
import {
  applyPoseUpdate,
  buildScene,
  buildingsToObstacles,
  createCameraKernel,
  createClock,
  createLidarKernelWasm,
  createRadarKernel,
  groundTruthTargets,
  groundTruthTopicKey,
  lidarTopicKey,
  marshalRadarSensorPose,
  PoseSampler,
  radarSpokeTopicKey,
  resolveOutputIdentity,
  type CompiledScene,
  type Clock,
  type GroundTruthTarget,
  type KeelsonNaming,
  type LidarFrame,
  type RadarFrame,
  type TerrainData,
} from "@bino/core";
import type { RadarGeom } from "./radar-augmenter.js";
import { createHeadlessRenderer, type HeadlessRendererHandle } from "./headless-gl.js";
import { BinoRunner, type ScheduledKernel } from "./runner.js";
import { createLidarThreadKernel, createRadarThreadKernel } from "./thread-kernel.js";
import {
  createSensorPublisher,
  type PublishSession,
  type SensorMeta,
  type SensorPublisher,
} from "./publisher.js";

export interface NodeServiceOptions {
  scenario: CompiledScene;
  /** Override the clock (defaults to the one declared in scenario.modes). */
  clock?: Clock;
  /** Tick rate for the runner — defaults to the highest sensor rate in the scenario. */
  tickHz?: number;
  /** GL context dimensions — defaults to the largest sensor resolution. */
  width?: number;
  height?: number;
  /** When set, the service exposes a publisher that emits each frame on the
   *  configured Keelson topics. */
  zenohSession?: PublishSession;
  /** Override Keelson naming (base_path — the published-topic realm). */
  naming?: KeelsonNaming;
  /** Pre-prepared terrain (from prepareTerrain). When the scenario has
   *  a terrain.bbox the caller is expected to pass this in;
   *  createNodeService stays synchronous to keep the test ergonomic. */
  terrain?: TerrainData;
  /** Run lidar/radar compute in dedicated worker threads (one per sensor)
   *  instead of serially on the main thread. Trades a frame of latency for
   *  parallelism, so it's ignored under strict determinism. Default false. */
  workers?: boolean;
}

/** A radar sensor configured for inject-augment (DSL `augment_source`). Built
 *  by the service but not scheduled on the runner clock or published as a
 *  synthetic-only stream — the caller wires it to a RadarAugmenter, which drives
 *  it off the inbound real stream. `renderRevolution` samples the shared
 *  PoseSampler at `time`, applies those poses to the scene, and renders one
 *  synthetic revolution. */
export interface RadarAugmentBuild {
  sensorId: string;
  realTopic: string;
  publishTopic: string;
  fallbackGeom: RadarGeom;
  renderRevolution: (time: number, geom: RadarGeom) => RadarFrame;
  /** Ground-truth co-publish for the injected targets (once per revolution). */
  groundTruth: { topic: string; render: (time: number) => GroundTruthTarget[] };
}

/** A lidar sensor configured for inject-augment (DSL `augment_source`). Like
 *  RadarAugmentBuild but with a per-frame render (no revolution/azimuth). */
export interface LidarAugmentBuild {
  sensorId: string;
  realTopic: string;
  publishTopic: string;
  renderFrame: (time: number) => LidarFrame;
}

export interface NodeService {
  runner: BinoRunner;
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  publisher?: SensorPublisher;
  /** Present when any sensor sets `augment_source`. The caller feeds this
   *  sampler from a teed pose stream so the render closures can reconstruct
   *  poses at each real message's timestamp. */
  poseSampler?: PoseSampler;
  /** One per augment-configured radar sensor. Empty/absent otherwise. */
  radarAugments?: RadarAugmentBuild[];
  /** One per augment-configured lidar sensor. Empty/absent otherwise. */
  lidarAugments?: LidarAugmentBuild[];
  dispose(): void;
}

export function createNodeService(opts: NodeServiceOptions): NodeService {
  const { width, height } = pickContextSize(opts);
  const handle = createHeadlessRenderer(
    width,
    height,
    opts.scenario.modes.determinism === "strict",
  );
  try {
    return buildSceneFromScenario(opts, handle);
  } catch (err) {
    handle.dispose();
    throw err;
  }
}

function buildSceneFromScenario(
  opts: NodeServiceOptions,
  handle: HeadlessRendererHandle,
): NodeService {
  const scenario = opts.scenario;
  const built = buildScene(scenario, opts.terrain ? { terrain: opts.terrain } : {});
  const buildingObstacles = opts.terrain?.buildings
    ? buildingsToObstacles(opts.terrain.buildings, scenario.anchor)
    : [];
  const scheduled: ScheduledKernel[] = [];
  const sensorMeta: SensorMeta[] = [];
  // Inject-augment: radar sensors driven by a real inbound stream, not the
  // runner clock. Their kernels are built here but routed to RadarAugmentBuilds
  // instead of `scheduled`/`sensorMeta`, and disposed alongside the rest.
  const radarAugments: RadarAugmentBuild[] = [];
  const lidarAugments: LidarAugmentBuild[] = [];
  const augmentKernels: { dispose(): void }[] = [];
  // Scratch vector for ground-truth world-position reads (sync, single-threaded).
  const tmpWorld = new THREE.Vector3();
  // One shared sampler feeds every augment renderRevolution closure; the caller
  // pumps it from a teed pose stream. Created unconditionally (cheap) and only
  // surfaced on the service when at least one augment radar exists.
  const poseSampler = new PoseSampler();

  // Root of the ADR-004 key-identity cascade. An explicit service-level realm
  // override (opts.naming) wins over the scenario's mandatory base_path.
  const scenarioBasePath = opts.naming?.base_path ?? scenario.keelson.base_path;

  // Worker offload trades a frame of latency for parallelism, so it's
  // incompatible with strict (synchronous, ordered) determinism.
  const useWorkers = (opts.workers ?? false) && scenario.modes.determinism !== "strict";
  if (opts.workers && !useWorkers) {
    console.warn("[bino] workers requested but ignored under strict determinism");
  }

  for (const vessel of scenario.vessels) {
    const vesselNode = built.entities.get(vessel.id);
    if (!vesselNode) continue;
    for (const sensor of vessel.sensors) {
      const sensorNode = vesselNode.getObjectByName(sensor.id);
      if (!sensorNode) continue;
      const sensorId = `${vessel.id}/${sensor.id}`;
      const identity = resolveOutputIdentity({
        scenarioBasePath,
        vesselId: vessel.id,
        ...(vessel.keelson ? { vesselKeelson: vessel.keelson } : {}),
        sensorId: sensor.id,
        ...(sensor.keelson ? { sensorKeelson: sensor.keelson } : {}),
      });
      if (sensor.type === "camera") {
        scheduled.push({
          sensorId,
          rate_hz: sensor.rate_hz,
          kernel: createCameraKernel({
            renderer: handle.renderer,
            scene: built.scene,
            sensorNode,
            config: sensor,
          }),
          phaseOffset_s: sensor.phase_offset_s,
        });
        sensorMeta.push({
          sensorId,
          identity,
          type: "camera",
          ...(sensor.publish_topic_override
            ? { topicOverride: sensor.publish_topic_override }
            : {}),
          ...(sensor.frame_id ? { frameId: sensor.frame_id } : {}),
        });
      } else if (sensor.type === "lidar" && sensor.augment_source) {
        // Inject-augment lidar: build the kernel for renderFrame, but don't
        // schedule or publish it — the augmenter drives it off the real cloud
        // stream. Synchronous (non-worker) kernel so renderFrame stays sync.
        const kernel = createLidarKernelWasm({
          scene: built.scene,
          sensorNode,
          config: sensor,
          terrain: built.terrain,
          waterLevelY: 0,
          environment: scenario.environment,
        });
        augmentKernels.push(kernel);
        lidarAugments.push({
          sensorId,
          realTopic: sensor.augment_source,
          publishTopic: lidarTopicKey(identity),
          renderFrame: (time: number): LidarFrame => {
            for (const v of scenario.vessels) {
              const p = poseSampler.sample(v.id, time);
              if (p) applyPoseUpdate(built.entities, { entityId: v.id, pose: p, time });
            }
            return kernel.step(time);
          },
        });
      } else if (sensor.type === "lidar") {
        scheduled.push({
          sensorId,
          rate_hz: sensor.rate_hz,
          kernel: (useWorkers ? createLidarThreadKernel : createLidarKernelWasm)({
            scene: built.scene,
            sensorNode,
            config: sensor,
            terrain: built.terrain,
            waterLevelY: 0,
            environment: scenario.environment,
          }),
          phaseOffset_s: sensor.phase_offset_s,
        });
        sensorMeta.push({
          sensorId,
          identity,
          type: "lidar",
          ...(sensor.publish_topic_override
            ? { topicOverride: sensor.publish_topic_override }
            : {}),
          ...(sensor.frame_id ? { frameId: sensor.frame_id } : {}),
        });
      } else if (sensor.type === "radar_marine" && sensor.augment_source) {
        // Inject-augment radar: build the kernel for renderRevolution, but do
        // not schedule it or register it with the publisher — the augmenter owns
        // its timing and publishing. Always the synchronous (non-worker) kernel
        // so renderRevolution stays sync. Geometry is derived from the live
        // stream by the merge; the fallback below is advisory.
        const kernel = createRadarKernel({
          scene: built.scene,
          sensorNode,
          config: sensor,
          environment: scenario.environment,
          staticObstacles: buildingObstacles,
        });
        augmentKernels.push(kernel);
        radarAugments.push({
          sensorId,
          realTopic: sensor.augment_source,
          publishTopic: radarSpokeTopicKey(identity),
          fallbackGeom: {
            range_m: sensor.range_m,
            range_bins: sensor.range_bins,
            spokes_per_rev: sensor.spokes_per_rev,
          },
          renderRevolution: (time: number): RadarFrame => {
            // Reconstruct each entity's pose at the spoke time, apply to the
            // shared scene, then render one synthetic revolution. Synchronous,
            // so the runner's own pose application can't interleave mid-render.
            for (const v of scenario.vessels) {
              const p = poseSampler.sample(v.id, time);
              if (p) applyPoseUpdate(built.entities, { entityId: v.id, pose: p, time });
            }
            return kernel.step(time);
          },
          groundTruth: {
            topic: groundTruthTopicKey(identity),
            // Runs immediately after renderRevolution at the same time, so the
            // scene is already posed: read each injected target's world position
            // (every vessel except this sensor's host) and reduce to bow-relative
            // range/bearing in the radar's own convention.
            render: (time: number): GroundTruthTarget[] => {
              void time;
              const host = marshalRadarSensorPose(sensorNode);
              const targets: { id: string; position: [number, number, number] }[] = [];
              for (const v of scenario.vessels) {
                if (v.id === vessel.id) continue;
                const e = built.entities.get(v.id);
                if (!e) continue;
                e.getWorldPosition(tmpWorld);
                targets.push({ id: v.id, position: [tmpWorld.x, tmpWorld.y, tmpWorld.z] });
              }
              return groundTruthTargets(host, targets, sensor.range_m);
            },
          },
        });
      } else if (sensor.type === "radar_marine") {
        scheduled.push({
          sensorId,
          rate_hz: sensor.rotation_rate_hz,
          kernel: (useWorkers ? createRadarThreadKernel : createRadarKernel)({
            scene: built.scene,
            sensorNode,
            config: sensor,
            environment: scenario.environment,
            staticObstacles: buildingObstacles,
          }),
          phaseOffset_s: sensor.phase_offset_s,
        });
        sensorMeta.push({
          sensorId,
          identity,
          type: "radar",
          rangeM: sensor.range_m,
          emit: sensor.emit,
          ...(sensor.publish_topic_override
            ? { topicOverride: sensor.publish_topic_override }
            : {}),
          ...(sensor.frame_id ? { frameId: sensor.frame_id } : {}),
        });
      }
    }
  }

  const clock = createClock(scenario.modes.clock);

  if (scenario.modes.determinism === "strict" && scenario.modes.clock !== "stepped") {
    throw new Error(`strict determinism requires stepped clock (got '${scenario.modes.clock}')`);
  }

  const runner = new BinoRunner({
    scene: built.scene,
    entities: built.entities,
    kernels: scheduled,
    clock,
    deterministic: scenario.modes.determinism === "strict",
    ...(built.sea
      ? {
          onTick: (t) => {
            built.sea!.setTime(t);
          },
        }
      : {}),
  });

  // Each sensorMeta already carries its fully-resolved key identity (ADR-004),
  // including the realm — no separate naming is threaded to the publisher.
  const publisher = opts.zenohSession
    ? createSensorPublisher({
        session: opts.zenohSession,
        sensors: sensorMeta,
      })
    : undefined;

  return {
    runner,
    scene: built.scene,
    renderer: handle.renderer,
    ...(publisher ? { publisher } : {}),
    ...(radarAugments.length || lidarAugments.length ? { poseSampler } : {}),
    ...(radarAugments.length ? { radarAugments } : {}),
    ...(lidarAugments.length ? { lidarAugments } : {}),
    dispose() {
      for (const s of scheduled) s.kernel.dispose();
      for (const k of augmentKernels) k.dispose();
      handle.dispose();
    },
  };
}

function pickContextSize(opts: NodeServiceOptions): { width: number; height: number } {
  if (opts.width && opts.height) return { width: opts.width, height: opts.height };
  let w = 1;
  let h = 1;
  for (const v of opts.scenario.vessels) {
    for (const s of v.sensors) {
      if (s.type === "camera") {
        w = Math.max(w, s.resolution[0]);
        h = Math.max(h, s.resolution[1]);
      }
    }
  }
  return { width: w, height: h };
}
