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
import { BinoRunner, type SensorKernelLike } from "./runner.js";

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
  const kernels: SensorKernelLike[] = [];
  for (const vessel of scenario.vessels) {
    const vesselNode = built.entities.get(vessel.id);
    if (!vesselNode) continue;
    for (const sensor of vessel.sensors) {
      const sensorNode = vesselNode.getObjectByName(sensor.id);
      if (!sensorNode) continue;
      if (sensor.type === "camera") {
        kernels.push(
          createCameraKernel({
            renderer: handle.renderer,
            scene: built.scene,
            sensorNode,
            config: sensor,
          }),
        );
      } else if (sensor.type === "lidar") {
        kernels.push(
          createLidarKernel({
            renderer: handle.renderer,
            scene: built.scene,
            sensorNode,
            config: sensor,
          }),
        );
      }
    }
  }

  const clock = createClock(scenario.modes.clock);
  const tickHz = pickTickHz(scenario);
  const runner = new BinoRunner({
    scene: built.scene,
    entities: built.entities,
    kernels,
    clock,
    tickHz,
  });

  return {
    runner,
    scene: built.scene,
    renderer: handle.renderer,
    dispose() {
      for (const k of kernels) k.dispose();
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

function pickTickHz(scenario: CompiledScene): number {
  let max = 30;
  for (const v of scenario.vessels) {
    for (const s of v.sensors) {
      max = Math.max(max, s.rate_hz);
    }
  }
  return max;
}
