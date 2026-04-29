import * as THREE from "three";
import {
  buildScene,
  createCameraKernel,
  createClock,
  createLidarKernel,
  createRadarKernel,
  type CompiledScene,
  type Clock,
  type KeelsonNaming,
} from "@bino/core";
import { createHeadlessRenderer, type HeadlessRendererHandle } from "./headless-gl.js";
import { BinoRunner, type ScheduledKernel } from "./runner.js";
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
  /** Override Keelson naming (base_path / source_id / parent_frame_id). */
  naming?: KeelsonNaming;
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
  const handle = createHeadlessRenderer(width, height);
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
  const built = buildScene(scenario);
  const scheduled: ScheduledKernel[] = [];
  const sensorMeta: SensorMeta[] = [];

  for (const vessel of scenario.vessels) {
    const vesselNode = built.entities.get(vessel.id);
    if (!vesselNode) continue;
    for (const sensor of vessel.sensors) {
      const sensorNode = vesselNode.getObjectByName(sensor.id);
      if (!sensorNode) continue;
      const sensorId = `${vessel.id}/${sensor.id}`;
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
        });
        sensorMeta.push({
          sensorId,
          vesselId: vessel.id,
          topicSensorId: sensor.id,
          type: "camera",
          ...(sensor.publish_topic_override
            ? { topicOverride: sensor.publish_topic_override }
            : {}),
        });
      } else if (sensor.type === "lidar") {
        scheduled.push({
          sensorId,
          rate_hz: sensor.rate_hz,
          kernel: createLidarKernel({
            renderer: handle.renderer,
            scene: built.scene,
            sensorNode,
            config: sensor,
          }),
        });
        sensorMeta.push({
          sensorId,
          vesselId: vessel.id,
          topicSensorId: sensor.id,
          type: "lidar",
          ...(sensor.publish_topic_override
            ? { topicOverride: sensor.publish_topic_override }
            : {}),
        });
      } else if (sensor.type === "radar_marine") {
        scheduled.push({
          sensorId,
          rate_hz: sensor.rotation_rate_hz,
          kernel: createRadarKernel({
            scene: built.scene,
            sensorNode,
            config: sensor,
          }),
        });
        sensorMeta.push({
          sensorId,
          vesselId: vessel.id,
          topicSensorId: sensor.id,
          type: "radar",
          rangeM: sensor.range_m,
          ...(sensor.publish_topic_override
            ? { topicOverride: sensor.publish_topic_override }
            : {}),
        });
      }
    }
  }

  const clock = createClock(scenario.modes.clock);
  const runner = new BinoRunner({
    scene: built.scene,
    entities: built.entities,
    kernels: scheduled,
    clock,
    ...(built.sea
      ? {
          onTick: (t) => {
            built.sea!.setTime(t);
          },
        }
      : {}),
  });

  const publisher = opts.zenohSession
    ? createSensorPublisher({
        session: opts.zenohSession,
        sensors: sensorMeta,
        ...(opts.naming ? { naming: opts.naming } : {}),
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
      } else if (s.type === "lidar") {
        w = Math.max(w, s.channels);
        h = Math.max(h, s.channels);
      }
    }
  }
  return { width: w, height: h };
}

