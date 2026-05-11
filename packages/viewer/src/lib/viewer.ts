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
  type CameraFrame,
  type CameraKernel,
  type LidarFrame,
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
  /** Preview canvases keyed by sensor ID. Each tick, the matching
   *  kernel's output is rendered to the canvas: camera frames as RGBA
   *  (Y-flipped), lidar points as a top-down scatter, radar sweeps as
   *  a PPI polar plot. Sensors not in the map produce no preview. */
  previewCanvases?: Map<string, HTMLCanvasElement>;
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
  // Above-water vantage from north of ego, looking south down the
  // fjord — that's where the Kiel coastline + city are, with the
  // narrow fjord walls converging on the horizon. ~80 m up, 200 m
  // north of ego (-z), aimed at a point ~500 m south.
  debugCamera.position.set(0, 80, -200);
  debugCamera.lookAt(0, 0, 500);

  // Pan/zoom/orbit: drag = orbit, right-drag = pan, wheel = zoom.
  // Damping smooths the input; .target is the look-at point.
  const controls = new OrbitControls(debugCamera, canvas);
  controls.target.set(0, 0, 500);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI * 0.49; // don't let the user dive below water
  controls.minDistance = 30;
  controls.maxDistance = 50_000;
  controls.update();

  const kernels: Array<CameraKernel | LidarKernel | RadarKernel> = [];
  const cameraHelpers: THREE.CameraHelper[] = [];
  const radarOverlays: Array<{ ring: THREE.LineLoop }> = [];
  /** Per-sensor preview wiring. The same map across all three sensor
   *  types — branched on type at draw time. */
  interface CameraPreview {
    type: "camera";
    id: string;
    kernel: CameraKernel;
    canvas: HTMLCanvasElement;
    /** Re-used offscreen at sensor resolution; intermediate for
     *  scaled drawImage onto the small preview canvas. */
    offscreen: HTMLCanvasElement;
    /** Pre-allocated ImageData backed by an ArrayBuffer (not
     *  ArrayBufferLike) — frame.pixels gets copied into this each
     *  tick. Avoids the TS narrowing pain of constructing ImageData
     *  from a possibly-SharedArrayBuffer Uint8Array. */
    imageData: ImageData;
  }
  interface LidarPreview {
    type: "lidar";
    id: string;
    kernel: LidarKernel;
    canvas: HTMLCanvasElement;
    range: number;
  }
  interface RadarPreview {
    type: "radar";
    id: string;
    kernel: RadarKernel;
    canvas: HTMLCanvasElement;
  }
  const previews: Array<CameraPreview | LidarPreview | RadarPreview> = [];
  const previewCanvases = opts.previewCanvases;
  for (const vessel of compiled.vessels) {
    const vesselNode = built.entities.get(vessel.id);
    if (!vesselNode) continue;
    for (const sensor of vessel.sensors) {
      const sensorNode = vesselNode.getObjectByName(sensor.id);
      if (!sensorNode) continue;
      const previewCanvas = previewCanvases?.get(sensor.id);
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
        if (previewCanvas) {
          const offscreen = document.createElement("canvas");
          offscreen.width = sensor.resolution[0];
          offscreen.height = sensor.resolution[1];
          const imageData = new ImageData(sensor.resolution[0], sensor.resolution[1]);
          previews.push({ type: "camera", id: sensor.id, kernel, canvas: previewCanvas, offscreen, imageData });
        }
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
        if (previewCanvas) {
          previews.push({ type: "lidar", id: sensor.id, kernel, canvas: previewCanvas, range: sensor.range_m });
        }
      } else if (sensor.type === "radar_marine") {
        const kernel = createRadarKernel({
          scene: built.scene,
          sensorNode,
          config: sensor,
          environment: compiled.environment,
        });
        kernels.push(kernel);
        // Radar wedge overlay (plan v0.3 #15) — green wireframe ring
        // in the horizontal plane at sensor.range_m, attached to the
        // sensor node so it follows the host vessel. Distinct from
        // camera (white) and lidar (cyan).
        const ring = makeRadarRing(sensor.range_m);
        sensorNode.add(ring);
        radarOverlays.push({ ring });
        if (previewCanvas) {
          previews.push({ type: "radar", id: sensor.id, kernel, canvas: previewCanvas });
        }
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
    if (built.sea) {
      built.sea.setTime(t);
      built.sea.setCenter(debugCamera.position.x, debugCamera.position.z);
    }
    const radarStats: Record<string, { spokes: number; bins: number }> = {};
    const latestByKernel = new Map<unknown, CameraFrame | LidarFrame | RadarFrame>();
    for (const k of kernels) {
      const out = k.step(t);
      latestByKernel.set(k, out);
      if ("pixels" in out) cameraFrames += 1;
      else if ("count" in out) lidarPoints = out.count;
    }
    // Radar stats are keyed by sensor id, not kernel — pull them from
    // the preview wiring (which is the only place id↔kernel is bound).
    for (const p of previews) {
      if (p.type !== "radar") continue;
      const out = latestByKernel.get(p.kernel) as RadarFrame | undefined;
      if (out) {
        radarStats[p.id] = {
          spokes: out.spokes.length,
          bins: out.spokes[0]?.intensity.length ?? 0,
        };
      }
    }

    for (const p of previews) {
      const out = latestByKernel.get(p.kernel);
      if (!out) continue;
      if (p.type === "camera") drawCameraPreview(p.canvas, p.offscreen, p.imageData, out as CameraFrame);
      else if (p.type === "lidar") drawLidarPreview(p.canvas, out as LidarFrame, p.range);
      else if (p.type === "radar") drawPpi(p.canvas, out as RadarFrame);
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

function drawCameraPreview(
  canvas: HTMLCanvasElement,
  offscreen: HTMLCanvasElement,
  imageData: ImageData,
  frame: CameraFrame,
): void {
  const dst = canvas.getContext("2d");
  if (!dst) return;
  const offCtx = offscreen.getContext("2d");
  if (!offCtx) return;
  // Copy into the pre-allocated ImageData (backed by an ArrayBuffer,
  // unlike frame.pixels whose buffer type is ArrayBufferLike — TS
  // refuses to construct ImageData from the latter). Then putImageData
  // at native resolution, then drawImage scaled + Y-flipped onto the
  // small preview canvas.
  imageData.data.set(frame.pixels);
  offCtx.putImageData(imageData, 0, 0);
  dst.save();
  dst.translate(0, canvas.height);
  dst.scale(canvas.width / frame.width, -canvas.height / frame.height);
  dst.drawImage(offscreen, 0, 0);
  dst.restore();
}

function drawLidarPreview(canvas: HTMLCanvasElement, frame: LidarFrame, range: number): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(cx, cy) - 4;

  ctx.fillStyle = "#0a1626";
  ctx.fillRect(0, 0, w, h);

  // range rings + crosshair, same look as the PPI for visual coherence
  ctx.strokeStyle = "#1f3a4d";
  ctx.lineWidth = 1;
  for (let k = 1; k <= 4; k++) {
    ctx.beginPath();
    ctx.arc(cx, cy, (r * k) / 4, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(cx - r, cy);
  ctx.lineTo(cx + r, cy);
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx, cy + r);
  ctx.stroke();

  // points: top-down scatter onto x-z plane.
  // Sensor-local frame: camera looks down -Z, so forward is -z. Map
  // forward → up on the canvas (small canvas-y), right → right.
  ctx.fillStyle = "#ffaa55";
  const scale = r / range;
  for (let i = 0; i < frame.count; i++) {
    const px = frame.points[i * 3 + 0]!;
    const pz = frame.points[i * 3 + 2]!;
    const sx = cx + px * scale;
    const sy = cy + pz * scale; // pz<0 (forward) → sy<cy (above center)
    if (sx < 0 || sx >= w || sy < 0 || sy >= h) continue;
    ctx.fillRect(sx - 0.5, sy - 0.5, 1.5, 1.5);
  }
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

  // returns — intensity-mapped green phosphor
  const bins = sweep.spokes[0]?.intensity.length ?? 0;
  if (bins === 0) return;
  for (const spoke of sweep.spokes) {
    for (let b = 0; b < bins; b++) {
      const v = spoke.intensity[b]!;
      if (v === 0) continue;
      const alpha = v / 255;
      const radius = (b / bins) * r;
      const angle = spoke.azimuth - Math.PI / 2;
      const px = cx + Math.cos(angle) * radius;
      const py = cy + Math.sin(angle) * radius;
      const green = Math.round(100 + 155 * alpha);
      ctx.fillStyle = `rgba(${Math.round(alpha * 40)}, ${green}, ${Math.round(alpha * 30)}, ${Math.max(alpha, 0.15)})`;
      ctx.beginPath();
      ctx.arc(px, py, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function resize(renderer: THREE.WebGLRenderer, canvas: HTMLCanvasElement): void {
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
}
