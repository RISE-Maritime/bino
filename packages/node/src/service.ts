import * as THREE from "three";
import {
  buildScene,
  createCameraKernel,
  createClock,
  createLidarKernel,
  type CompiledScene,
  type Clock,
} from "@bino/core";
import { createHeadlessRenderer, type HeadlessRendererHandle } from "./headless-gl.js";
import { BinoRunner, type ScheduledKernel } from "./runner.js";

export interface NodeServiceOptions {
  scenario: CompiledScene;
  /** Override the clock (defaults to the one declared in scenario.modes). */
  clock?: Clock;
  /** Tick rate for the runner — defaults to the highest sensor rate in the scenario. */
  tickHz?: number;
  /** GL context dimensions — defaults to the largest sensor resolution. */
  width?: number;
  height?: number;
}

export interface NodeService {
  runner: BinoRunner;
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  dispose(): void;
}

export function createNodeService(opts: NodeServiceOptions): NodeService {
  const { width, height } = pickContextSize(opts);
  const handle = createHeadlessRenderer(width, height);
  try {
    const scene = buildSceneFromScenario(opts.scenario, handle);
    return scene;
  } catch (err) {
    handle.dispose();
    throw err;
  }
}

function buildSceneFromScenario(
  scenario: CompiledScene,
  handle: HeadlessRendererHandle,
): NodeService {
  const built = buildScene(scenario);
  const scheduled: ScheduledKernel[] = [];
  for (const vessel of scenario.vessels) {
    const vesselNode = built.entities.get(vessel.id);
    if (!vesselNode) continue;
    for (const sensor of vessel.sensors) {
      const sensorNode = vesselNode.getObjectByName(sensor.id);
      if (!sensorNode) continue;
      if (sensor.type === "camera") {
        scheduled.push({
          sensorId: `${vessel.id}/${sensor.id}`,
          rate_hz: sensor.rate_hz,
          kernel: createCameraKernel({
            renderer: handle.renderer,
            scene: built.scene,
            sensorNode,
            config: sensor,
          }),
        });
      } else if (sensor.type === "lidar") {
        scheduled.push({
          sensorId: `${vessel.id}/${sensor.id}`,
          rate_hz: sensor.rate_hz,
          kernel: createLidarKernel({
            renderer: handle.renderer,
            scene: built.scene,
            sensorNode,
            config: sensor,
          }),
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
  });

  return {
    runner,
    scene: built.scene,
    renderer: handle.renderer,
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

