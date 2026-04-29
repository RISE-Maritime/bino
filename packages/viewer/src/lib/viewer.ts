import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  applyPoseUpdate,
  buildScene,
  compileScenario,
  createCameraKernel,
  createLidarKernel,
  createRadarKernel,
  prepareTerrain,
  type CameraKernel,
  type LidarKernel,
  type RadarFrame,
  type RadarKernel,
  type PoseStream,
} from "@bino/core";
import { v01Scenario } from "./scenario.js";

export interface ViewerStats {
  frames: number;
  fps: number;
  cameraFrames: number;
  lidarPoints: number;
  /** Most recent radar sweep, indexed by sensorId. */
  radar: Record<string, { spokes: number; bins: number }>;
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
  /** Optional canvas for the radar PPI; if provided, the latest radar
   *  sweep per sensor is rasterized here as a polar plot. */
  ppiCanvas?: HTMLCanvasElement;
}

/**
 * Mounts the viewer on a canvas. Builds the scene from the v0.1 demo
 * scenario, instantiates the same camera/lidar kernels @bino/node uses
 * (off-screen render targets), and drives a third-person debug camera
 * that orbits ego.
 */
export async function mountViewer(opts: MountOptions): Promise<ViewerHandle> {
  const { canvas, poses, onStats } = opts;

  const compiled = compileScenario(v01Scenario);
  const terrain = compiled.terrain ? await prepareTerrain(compiled.terrain.bbox) : undefined;
  const built = buildScene(compiled, terrain ? { terrain } : {});

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  resize(renderer, canvas);

  // Far plane has to clear the terrain bbox extent (~7 km to far
  // corners) and Sky's 450k-unit cube. 1e6 is generous and well
  // within fp32 precision for a single-anchor scene.
  const debugCamera = new THREE.PerspectiveCamera(
    55,
    canvas.clientWidth / Math.max(1, canvas.clientHeight),
    1,
    1_000_000,
  );
  // Above-water vantage looking forward over the bow: ~80 m up,
  // 200 m back along +z, looking out toward -z (where the scripted
  // ferry orbits). Close enough to see wave detail; far enough to
  // see the ferry plus a sweep of coastline.
  debugCamera.position.set(0, 80, 200);
  debugCamera.lookAt(0, 0, -300);

  // Pan/zoom/orbit: drag = orbit, right-drag = pan, wheel = zoom.
  // Damping smooths the input; .target is the look-at point.
  const controls = new OrbitControls(debugCamera, canvas);
  controls.target.set(0, 0, -300);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI * 0.49; // don't let the user dive below water
  controls.minDistance = 30;
  controls.maxDistance = 50_000;
  controls.update();

  const kernels: Array<CameraKernel | LidarKernel | RadarKernel> = [];
  const cameraHelpers: THREE.CameraHelper[] = [];
  const radarOverlays: Array<{ ring: THREE.LineLoop }> = [];
  const radarKernels: Array<{ id: string; kernel: RadarKernel }> = [];
  const latestSweeps = new Map<string, RadarFrame>();
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
      } else if (sensor.type === "radar_marine") {
        const kernel = createRadarKernel({
          scene: built.scene,
          sensorNode,
          config: sensor,
        });
        kernels.push(kernel);
        radarKernels.push({ id: sensor.id, kernel });
        // Radar wedge overlay (plan v0.3 #15) — green wireframe ring
        // in the horizontal plane at sensor.range_m, attached to the
        // sensor node so it follows the host vessel. Distinct from
        // camera (white) and lidar (cyan).
        const ring = makeRadarRing(sensor.range_m);
        sensorNode.add(ring);
        radarOverlays.push({ ring });
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
    controls.update();

    const t = performance.now() / 1000;
    if (built.sea) built.sea.setTime(t);
    const radarStats: Record<string, { spokes: number; bins: number }> = {};
    for (const k of kernels) {
      const out = k.step(t);
      if ("pixels" in out) cameraFrames += 1;
      else if ("count" in out) lidarPoints = out.count;
      else if ("spokes" in out) {
        // RadarFrame
        const id = radarKernels.find((r) => r.kernel === k)?.id;
        if (id) {
          latestSweeps.set(id, out);
          radarStats[id] = {
            spokes: out.spokes.length,
            bins: out.spokes[0]?.intensity.length ?? 0,
          };
        }
      }
    }

    if (opts.ppiCanvas && radarKernels[0]) {
      const sweep = latestSweeps.get(radarKernels[0].id);
      if (sweep) drawPpi(opts.ppiCanvas, sweep);
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
      onStats?.({
        frames,
        fps,
        cameraFrames,
        lidarPoints,
        radar: radarStats,
        staleEntities,
      });
    }
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);

  return {
    stop() {
      stopped = true;
      cancelAnimationFrame(rafId);
      controls.dispose();
      poses.close();
      void pump.catch(() => {});
      for (const h of cameraHelpers) {
        built.scene.remove(h);
        h.dispose();
      }
      for (const o of radarOverlays) {
        o.ring.parent?.remove(o.ring);
        o.ring.geometry.dispose();
        (o.ring.material as THREE.Material).dispose();
      }
      for (const k of kernels) k.dispose();
      renderer.dispose();
    },
    stats: () => ({
      frames,
      fps,
      cameraFrames,
      lidarPoints,
      radar: {},
      staleEntities: [],
    }),
  };
}

function makeRadarRing(range_m: number): THREE.LineLoop {
  const segments = 64;
  const positions = new Float32Array(segments * 3);
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    positions[i * 3 + 0] = Math.cos(angle) * range_m;
    positions[i * 3 + 1] = 0;
    positions[i * 3 + 2] = Math.sin(angle) * range_m;
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.LineBasicMaterial({ color: 0x55ff66, transparent: true, opacity: 0.4 });
  return new THREE.LineLoop(geom, mat);
}

function drawPpi(canvas: HTMLCanvasElement, sweep: RadarFrame): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(cx, cy) - 4;

  ctx.fillStyle = "#0a1626";
  ctx.fillRect(0, 0, w, h);

  // range rings
  ctx.strokeStyle = "#1f3a4d";
  ctx.lineWidth = 1;
  for (let k = 1; k <= 4; k++) {
    ctx.beginPath();
    ctx.arc(cx, cy, (r * k) / 4, 0, Math.PI * 2);
    ctx.stroke();
  }
  // crosshair
  ctx.beginPath();
  ctx.moveTo(cx - r, cy);
  ctx.lineTo(cx + r, cy);
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx, cy + r);
  ctx.stroke();

  // returns
  const bins = sweep.spokes[0]?.intensity.length ?? 0;
  if (bins === 0) return;
  ctx.fillStyle = "#55ff66";
  for (const spoke of sweep.spokes) {
    for (let b = 0; b < bins; b++) {
      const v = spoke.intensity[b]!;
      if (v === 0) continue;
      const radius = (b / bins) * r;
      // azimuth=0 is +x in the sensor's local horizontal plane → up
      // on the PPI is the host's bow. Translate accordingly.
      const angle = spoke.azimuth - Math.PI / 2;
      const px = cx + Math.cos(angle) * radius;
      const py = cy + Math.sin(angle) * radius;
      ctx.beginPath();
      ctx.arc(px, py, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function resize(renderer: THREE.WebGLRenderer, canvas: HTMLCanvasElement): void {
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
}
