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
  /** Entities whose last pose update is older than the staleness threshold. */
  staleEntities: string[];
}

const STALE_THRESHOLD_MS = 5000;

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
  const cameraHelpers: THREE.CameraHelper[] = [];
  for (const vessel of compiled.vessels) {
    const vesselNode = built.entities.get(vessel.id);
    if (!vesselNode) continue;
    for (const sensor of vessel.sensors) {
      const sensorNode = vesselNode.getObjectByName(sensor.id);
      if (!sensorNode) continue;
      if (sensor.type === "camera") {
        const kernel = createCameraKernel({
          renderer,
          scene: built.scene,
          sensorNode,
          config: sensor,
        });
        kernels.push(kernel);
        // Frustum overlay (plan v0.2 #7) — Three's CameraHelper draws
        // the kernel's perspective camera as a wireframe pyramid in
        // the third-person view. Updated each tick because the camera
        // matrix changes as the host vessel moves.
        const helper = new THREE.CameraHelper(kernel.camera);
        built.scene.add(helper);
        cameraHelpers.push(helper);
      } else if (sensor.type === "lidar") {
        const kernel = createLidarKernel({
          renderer,
          scene: built.scene,
          sensorNode,
          config: sensor,
        });
        kernels.push(kernel);
        // Lidar fan overlay (plan v0.2 #8). CameraHelper draws the
        // kernel's depth-pass perspective camera; recolor it cyan so
        // it visually distinguishes from the camera frustum (white).
        const helper = new THREE.CameraHelper(kernel.camera);
        const mat = helper.material as THREE.LineBasicMaterial;
        mat.color = new THREE.Color(0x33ccff);
        built.scene.add(helper);
        cameraHelpers.push(helper);
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
  // Per-entity last-pose-arrival timestamps for stale detection.
  const lastPoseAt = new Map<string, number>();

  const pump = (async () => {
    for await (const u of poses) {
      if (stopped) break;
      applyPoseUpdate(built.entities, u);
      lastPoseAt.set(u.entityId, performance.now());
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

    for (const h of cameraHelpers) h.update();

    renderer.setRenderTarget(null);
    renderer.render(built.scene, debugCamera);

    frames += 1;
    framesSinceLastFpsTick += 1;
    const now = performance.now();
    if (now - lastFpsTick >= 500) {
      fps = (framesSinceLastFpsTick * 1000) / (now - lastFpsTick);
      lastFpsTick = now;
      framesSinceLastFpsTick = 0;
      const staleEntities: string[] = [];
      for (const id of built.entities.keys()) {
        const last = lastPoseAt.get(id);
        if (last === undefined || now - last > STALE_THRESHOLD_MS) {
          staleEntities.push(id);
        }
      }
      onStats?.({ frames, fps, cameraFrames, lidarPoints, staleEntities });
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
      for (const h of cameraHelpers) {
        built.scene.remove(h);
        h.dispose();
      }
      for (const k of kernels) k.dispose();
      renderer.dispose();
    },
    stats: () => ({ frames, fps, cameraFrames, lidarPoints, staleEntities: [] }),
  };
}

function resize(renderer: THREE.WebGLRenderer, canvas: HTMLCanvasElement): void {
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
}
