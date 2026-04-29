import * as THREE from "three";
import {
  applyPoseUpdate,
  buildScene,
  compileScenario,
  createCameraKernel,
  createLidarKernel,
  type CameraKernel,
  type LidarKernel,
  type PoseStream,
} from "@bino/core";
import { v01Scenario } from "./scenario.js";

export interface ViewerStats {
  frames: number;
  fps: number;
  cameraFrames: number;
  lidarPoints: number;
}

export interface ViewerHandle {
  stop(): void;
  stats(): ViewerStats;
}

export interface MountOptions {
  canvas: HTMLCanvasElement;
  poses: PoseStream;
  onStats?: (stats: ViewerStats) => void;
}

/**
 * Mounts the viewer on a canvas. Builds the scene from the v0.1 demo
 * scenario, instantiates the same camera/lidar kernels @bino/node uses
 * (off-screen render targets), and drives a third-person debug camera
 * that orbits ego.
 */
export function mountViewer(opts: MountOptions): ViewerHandle {
  const { canvas, poses, onStats } = opts;

  const compiled = compileScenario(v01Scenario);
  const built = buildScene(compiled);
  built.scene.background = new THREE.Color(0x0a1626);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  resize(renderer, canvas);

  const debugCamera = new THREE.PerspectiveCamera(
    55,
    canvas.clientWidth / Math.max(1, canvas.clientHeight),
    0.5,
    2000,
  );
  debugCamera.position.set(80, 60, 120);
  debugCamera.lookAt(0, 0, 0);

  const kernels: Array<CameraKernel | LidarKernel> = [];
  for (const vessel of compiled.vessels) {
    const vesselNode = built.entities.get(vessel.id);
    if (!vesselNode) continue;
    for (const sensor of vessel.sensors) {
      const sensorNode = vesselNode.getObjectByName(sensor.id);
      if (!sensorNode) continue;
      if (sensor.type === "camera") {
        kernels.push(
          createCameraKernel({
            renderer,
            scene: built.scene,
            sensorNode,
            config: sensor,
          }),
        );
      } else if (sensor.type === "lidar") {
        kernels.push(
          createLidarKernel({
            renderer,
            scene: built.scene,
            sensorNode,
            config: sensor,
          }),
        );
      }
    }
  }

  let stopped = false;
  let frames = 0;
  let cameraFrames = 0;
  let lidarPoints = 0;
  let fps = 0;
  let lastFpsTick = performance.now();
  let framesSinceLastFpsTick = 0;
  let rafId = 0;

  const pump = (async () => {
    for await (const u of poses) {
      if (stopped) break;
      applyPoseUpdate(built.entities, u);
    }
  })();

  const tick = (): void => {
    if (stopped) return;
    if (canvas.clientWidth !== canvas.width || canvas.clientHeight !== canvas.height) {
      resize(renderer, canvas);
      debugCamera.aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
      debugCamera.updateProjectionMatrix();
    }

    const t = performance.now() / 1000;
    for (const k of kernels) {
      const out = k.step(t);
      if ("pixels" in out) cameraFrames += 1;
      else lidarPoints = out.count;
    }

    renderer.setRenderTarget(null);
    renderer.render(built.scene, debugCamera);

    frames += 1;
    framesSinceLastFpsTick += 1;
    const now = performance.now();
    if (now - lastFpsTick >= 500) {
      fps = (framesSinceLastFpsTick * 1000) / (now - lastFpsTick);
      lastFpsTick = now;
      framesSinceLastFpsTick = 0;
      onStats?.({ frames, fps, cameraFrames, lidarPoints });
    }
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);

  return {
    stop() {
      stopped = true;
      cancelAnimationFrame(rafId);
      poses.close();
      void pump.catch(() => {});
      for (const k of kernels) k.dispose();
      renderer.dispose();
    },
    stats: () => ({ frames, fps, cameraFrames, lidarPoints }),
  };
}

function resize(renderer: THREE.WebGLRenderer, canvas: HTMLCanvasElement): void {
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
}
