import * as THREE from "three";
import {
  buildScene,
  buildingsToObstacles,
  createCameraKernel,
  createClock,
  createLidarKernelWasm,
  createRadarKernel,
  resolveOutputIdentity,
  type CompiledScene,
  type Clock,
  type KeelsonNaming,
  type TerrainData,
} from "@bino/core";
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

export interface NodeService {
  runner: BinoRunner;
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  publisher?: SensorPublisher;
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
    dispose() {
      for (const s of scheduled) s.kernel.dispose();
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
