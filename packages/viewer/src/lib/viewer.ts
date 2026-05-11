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

interface PpiCache {
  lut: Uint32Array;
  imageData: ImageData;
  w: number;
  h: number;
  nSpokes: number;
  nBins: number;
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
    range: number;
    ppiCache: PpiCache;
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
          previews.push({
            type: "radar", id: sensor.id, kernel, canvas: previewCanvas,
            range: sensor.range_m,
            ppiCache: { lut: new Uint32Array(0), imageData: new ImageData(1, 1), w: 0, h: 0, nSpokes: 0, nBins: 0 },
          });
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
      else if (p.type === "radar") drawPpi(p.canvas, out as RadarFrame, p.range, p.ppiCache);
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

  // Range rings + crosshair
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

  // Points: top-down scatter, color-coded by distance.
  const scale = r / range;
  const pointSize = Math.max(1.5, w / 150);
  const halfPt = pointSize / 2;
  for (let i = 0; i < frame.count; i++) {
    const px = frame.points[i * 3 + 0]!;
    const pz = frame.points[i * 3 + 2]!;
    const sx = cx + px * scale;
    const sy = cy + pz * scale;
    if (sx < 0 || sx >= w || sy < 0 || sy >= h) continue;
    const dist = Math.sqrt(px * px + pz * pz);
    const t = Math.min(dist / range, 1.0);
    const cr = Math.round(255 - 195 * t);
    const cg = Math.round(200 - 80 * t);
    const cb = Math.round(80 + 175 * t);
    ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
    ctx.fillRect(sx - halfPt, sy - halfPt, pointSize, pointSize);
  }

  // Range labels
  const fontSize = Math.max(10, Math.round(w / 25));
  ctx.font = `${fontSize}px monospace`;
  ctx.fillStyle = "rgba(100, 160, 180, 0.6)";
  ctx.textAlign = "left";
  for (let k = 1; k <= 4; k++) {
    const m = (k / 4) * range;
    const label = m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${m.toFixed(0)}m`;
    ctx.fillText(label, cx + 3, cy - (r * k) / 4 - 3);
  }

  // Forward marker
  ctx.strokeStyle = "rgba(100, 180, 140, 0.5)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx, cy - r);
  ctx.stroke();
}

const PPI_LUT_INVALID = 0xFFFFFFFF;

function buildPpiLut(w: number, h: number, nSpokes: number, nBins: number): Uint32Array {
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(cx, cy) - 4;
  const lut = new Uint32Array(w * h);
  lut.fill(PPI_LUT_INVALID);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > r || dist < 1) continue;
      let az = Math.atan2(dx, -dy);
      if (az < 0) az += Math.PI * 2;
      const spokeIdx = Math.floor((az / (Math.PI * 2)) * nSpokes) % nSpokes;
      const binIdx = Math.floor((dist / r) * nBins);
      if (binIdx >= nBins) continue;
      lut[y * w + x] = (spokeIdx << 16) | binIdx;
    }
  }
  return lut;
}

function drawPpi(canvas: HTMLCanvasElement, sweep: RadarFrame, range: number, cache: PpiCache): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const bins = sweep.spokes[0]?.intensity.length ?? 0;
  const nSpokes = sweep.spokes.length;
  if (bins === 0 || nSpokes === 0) return;

  if (cache.w !== w || cache.h !== h || cache.nSpokes !== nSpokes || cache.nBins !== bins) {
    cache.lut = buildPpiLut(w, h, nSpokes, bins);
    cache.imageData = new ImageData(w, h);
    cache.w = w;
    cache.h = h;
    cache.nSpokes = nSpokes;
    cache.nBins = bins;
  }

  const { lut, imageData } = cache;
  const data = imageData.data;

  // Background fill
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 10; data[i + 1] = 22; data[i + 2] = 38; data[i + 3] = 255;
  }

  // Fill pixels from polar LUT — pixel-perfect coverage, no gaps
  const n = w * h;
  for (let i = 0; i < n; i++) {
    const entry = lut[i]!;
    if (entry === PPI_LUT_INVALID) continue;
    const spokeIdx = entry >>> 16;
    const binIdx = entry & 0xFFFF;
    const v = sweep.spokes[spokeIdx]!.intensity[binIdx]!;
    if (v === 0) continue;
    const norm = Math.sqrt(v / 255);
    const idx = i * 4;
    data[idx] = Math.round(norm * 40);
    data[idx + 1] = Math.round(norm * 255);
    data[idx + 2] = Math.round(norm * 20);
  }

  ctx.putImageData(imageData, 0, 0);

  // Overlay: range rings + crosshair
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(cx, cy) - 4;
  ctx.strokeStyle = "rgba(80, 140, 160, 0.45)";
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

  // Range labels
  const fontSize = Math.max(10, Math.round(w / 25));
  ctx.font = `${fontSize}px monospace`;
  ctx.fillStyle = "rgba(100, 160, 180, 0.6)";
  ctx.textAlign = "left";
  for (let k = 1; k <= 4; k++) {
    const m = (k / 4) * range;
    const label = m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${m.toFixed(0)}m`;
    ctx.fillText(label, cx + 3, cy - (r * k) / 4 - 3);
  }

  // Heading flash: forward direction
  ctx.strokeStyle = "rgba(100, 200, 140, 0.5)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx, cy - r);
  ctx.stroke();
}

function resize(renderer: THREE.WebGLRenderer, canvas: HTMLCanvasElement): void {
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
}
