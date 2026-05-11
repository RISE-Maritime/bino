import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  applyPoseUpdate,
  buildScene,
  compileScenario,
  createCameraKernel,
  createLidarKernelWasm,
  createRadarKernel,
  geodeticToEnu,
  prepareTerrain,
  type CameraFrame,
  type CameraKernel,
  type LidarFrame,
  type RadarFrame,
  type RadarKernel,
  type PoseStream,
  type Anchor,
  type BuildingData,
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
  setOverlayVisible(sensorId: string, visible: boolean): void;
  getOverlaySensors(): Array<{ id: string; type: string; visible: boolean }>;
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

  const buildingObstacles = terrain?.buildings
    ? buildingsToObstacles(terrain.buildings, compiled.anchor)
    : [];

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

  interface AnyKernel { step(time: number): CameraFrame | LidarFrame | RadarFrame; dispose(): void }
  const kernels: AnyKernel[] = [];
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
    kernel: AnyKernel;
    canvas: HTMLCanvasElement;
    range: number;
    sensorNode: THREE.Object3D;
    renderer3d: THREE.WebGLRenderer;
    scene3d: THREE.Scene;
    camera3d: THREE.PerspectiveCamera;
    controls3d: OrbitControls;
    positionAttr: THREE.BufferAttribute;
    colorAttr: THREE.BufferAttribute;
    pointGeometry: THREE.BufferGeometry;
    maxPoints: number;
    prevW: number;
    prevH: number;
  }
  interface SensorOverlay {
    sensorId: string;
    sensorNode: THREE.Object3D;
    type: "lidar" | "radar";
    range: number;
    kernel: AnyKernel;
    points: THREE.Points;
    geometry: THREE.BufferGeometry;
    positionAttr: THREE.BufferAttribute;
    colorAttr: THREE.BufferAttribute;
    maxPoints: number;
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
  const sensorOverlays: SensorOverlay[] = [];
  const previewCanvases = opts.previewCanvases;

  function createOverlay(sensorId: string, sensorNode: THREE.Object3D, type: "lidar" | "radar", range: number, kernel: AnyKernel, maxPts: number): void {
    const ovPos = new THREE.BufferAttribute(new Float32Array(maxPts * 3), 3);
    ovPos.setUsage(THREE.DynamicDrawUsage);
    const ovCol = new THREE.BufferAttribute(new Float32Array(maxPts * 3), 3);
    ovCol.setUsage(THREE.DynamicDrawUsage);
    const ovGeo = new THREE.BufferGeometry();
    ovGeo.setAttribute("position", ovPos);
    ovGeo.setAttribute("color", ovCol);
    ovGeo.setDrawRange(0, 0);
    const ovMat = new THREE.PointsMaterial({ size: 4, vertexColors: true, sizeAttenuation: false, depthTest: true, transparent: true, opacity: 0.85 });
    const ovPts = new THREE.Points(ovGeo, ovMat);
    ovPts.visible = false;
    ovPts.renderOrder = 1;
    built.scene.add(ovPts);
    sensorOverlays.push({ sensorId, sensorNode, type, range, kernel, points: ovPts, geometry: ovGeo, positionAttr: ovPos, colorAttr: ovCol, maxPoints: maxPts });
  }

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
        const kernel = createLidarKernelWasm({
          scene: built.scene,
          sensorNode,
          config: sensor,
          terrain: built.terrain,
          fov_h_deg: sensor.fov_h_deg ?? 360,
          azimuths: sensor.azimuths ?? sensor.channels * 8,
        });
        kernels.push(kernel);
        createOverlay(sensor.id, sensorNode, "lidar", sensor.range_m, kernel, 65536);
        if (previewCanvas) {
          const range = sensor.range_m;
          const maxPoints = 32768;
          const lidarRenderer = new THREE.WebGLRenderer({ canvas: previewCanvas, antialias: true });
          lidarRenderer.setClearColor(0x0a1626);
          lidarRenderer.setSize(previewCanvas.width, previewCanvas.height, false);
          const lidarScene = new THREE.Scene();
          const lidarCam = new THREE.PerspectiveCamera(50, previewCanvas.width / Math.max(1, previewCanvas.height), 0.5, range * 3);
          lidarCam.position.set(range * 0.3, range * 0.4, range * 0.3);
          lidarCam.lookAt(0, 0, -range * 0.15);
          const lidarControls = new OrbitControls(lidarCam, previewCanvas);
          lidarControls.enableDamping = true;
          lidarControls.dampingFactor = 0.1;
          lidarControls.target.set(0, 0, -range * 0.15);
          lidarControls.update();
          const grid = new THREE.GridHelper(range * 2, 8, 0x1f3a4d, 0x152535);
          lidarScene.add(grid);
          lidarScene.add(new THREE.AxesHelper(range * 0.12));
          const fwdGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -range)]);
          lidarScene.add(new THREE.Line(fwdGeo, new THREE.LineBasicMaterial({ color: 0x55cc77, transparent: true, opacity: 0.3 })));
          const posAttr = new THREE.BufferAttribute(new Float32Array(maxPoints * 3), 3);
          posAttr.setUsage(THREE.DynamicDrawUsage);
          const colAttr = new THREE.BufferAttribute(new Float32Array(maxPoints * 3), 3);
          colAttr.setUsage(THREE.DynamicDrawUsage);
          const pcGeo = new THREE.BufferGeometry();
          pcGeo.setAttribute("position", posAttr);
          pcGeo.setAttribute("color", colAttr);
          pcGeo.setDrawRange(0, 0);
          lidarScene.add(new THREE.Points(pcGeo, new THREE.PointsMaterial({ size: 3, vertexColors: true, sizeAttenuation: false })));
          lidarScene.add(new THREE.AmbientLight(0xffffff, 0.5));
          previews.push({
            type: "lidar", id: sensor.id, kernel, canvas: previewCanvas, range,
            sensorNode, renderer3d: lidarRenderer, scene3d: lidarScene, camera3d: lidarCam, controls3d: lidarControls,
            positionAttr: posAttr, colorAttr: colAttr, pointGeometry: pcGeo, maxPoints,
            prevW: previewCanvas.width, prevH: previewCanvas.height,
          });
        }
      } else if (sensor.type === "radar_marine") {
        const kernel = createRadarKernel({
          scene: built.scene,
          sensorNode,
          config: sensor,
          environment: compiled.environment,
          staticObstacles: buildingObstacles,
        });
        kernels.push(kernel);
        const ring = makeRadarRing(sensor.range_m);
        sensorNode.add(ring);
        radarOverlays.push({ ring });
        createOverlay(sensor.id, sensorNode, "radar", sensor.range_m, kernel, 65536);
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
      else if (p.type === "lidar") drawLidarPreview3d(p, out as LidarFrame);
      else if (p.type === "radar") drawPpi(p.canvas, out as RadarFrame, p.range, p.ppiCache);
    }

    for (const ov of sensorOverlays) {
      if (!ov.points.visible) continue;
      const out = latestByKernel.get(ov.kernel);
      if (!out) continue;
      if (ov.type === "lidar") updateLidarOverlay(ov, out as LidarFrame);
      else updateRadarOverlay(ov, out as RadarFrame);
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
      for (const p of previews) {
        if (p.type === "lidar") {
          p.controls3d.dispose();
          p.renderer3d.dispose();
          p.pointGeometry.dispose();
        }
      }
      for (const ov of sensorOverlays) {
        built.scene.remove(ov.points);
        ov.geometry.dispose();
        (ov.points.material as THREE.Material).dispose();
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
    setOverlayVisible(sensorId: string, visible: boolean) {
      const ov = sensorOverlays.find((o) => o.sensorId === sensorId);
      if (ov) ov.points.visible = visible;
    },
    getOverlaySensors() {
      return sensorOverlays.map((o) => ({ id: o.sensorId, type: o.type, visible: o.points.visible }));
    },
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

function drawLidarPreview3d(
  p: { renderer3d: THREE.WebGLRenderer; scene3d: THREE.Scene; camera3d: THREE.PerspectiveCamera; controls3d: OrbitControls; canvas: HTMLCanvasElement; positionAttr: THREE.BufferAttribute; colorAttr: THREE.BufferAttribute; pointGeometry: THREE.BufferGeometry; range: number; maxPoints: number; prevW: number; prevH: number },
  frame: LidarFrame,
): void {
  const { renderer3d, scene3d, camera3d, controls3d, canvas, positionAttr, colorAttr, pointGeometry, range, maxPoints } = p;

  if (p.prevW !== canvas.width || p.prevH !== canvas.height) {
    renderer3d.setSize(canvas.width, canvas.height, false);
    camera3d.aspect = canvas.width / Math.max(1, canvas.height);
    camera3d.updateProjectionMatrix();
    p.prevW = canvas.width;
    p.prevH = canvas.height;
  }

  controls3d.update();

  const count = Math.min(frame.count, maxPoints);
  const positions = positionAttr.array as Float32Array;
  const colors = colorAttr.array as Float32Array;

  for (let i = 0; i < count; i++) {
    const px = frame.points[i * 3 + 0]!;
    const py = frame.points[i * 3 + 1]!;
    const pz = frame.points[i * 3 + 2]!;
    positions[i * 3 + 0] = px;
    positions[i * 3 + 1] = py;
    positions[i * 3 + 2] = pz;
    const dist = Math.sqrt(px * px + pz * pz);
    const t = Math.min(dist / range, 1.0);
    colors[i * 3 + 0] = (255 - 195 * t) / 255;
    colors[i * 3 + 1] = (200 - 80 * t) / 255;
    colors[i * 3 + 2] = (80 + 175 * t) / 255;
  }

  positionAttr.needsUpdate = true;
  colorAttr.needsUpdate = true;
  pointGeometry.setDrawRange(0, count);

  renderer3d.render(scene3d, camera3d);
}

const _ovVec = new THREE.Vector3();
const _ovQuat = new THREE.Quaternion();
const _ovEuler = new THREE.Euler();

function updateLidarOverlay(
  ov: { sensorNode: THREE.Object3D; positionAttr: THREE.BufferAttribute; colorAttr: THREE.BufferAttribute; geometry: THREE.BufferGeometry; maxPoints: number },
  frame: LidarFrame,
): void {
  const count = Math.min(frame.count, ov.maxPoints);
  const positions = ov.positionAttr.array as Float32Array;
  const colors = ov.colorAttr.array as Float32Array;
  const wm = ov.sensorNode.matrixWorld;
  for (let i = 0; i < count; i++) {
    _ovVec.set(frame.points[i * 3]!, frame.points[i * 3 + 1]!, frame.points[i * 3 + 2]!);
    _ovVec.applyMatrix4(wm);
    positions[i * 3] = _ovVec.x;
    positions[i * 3 + 1] = _ovVec.y;
    positions[i * 3 + 2] = _ovVec.z;
    colors[i * 3] = 1.0;
    colors[i * 3 + 1] = 0.6;
    colors[i * 3 + 2] = 0.2;
  }
  ov.positionAttr.needsUpdate = true;
  ov.colorAttr.needsUpdate = true;
  ov.geometry.setDrawRange(0, count);
}

function updateRadarOverlay(
  ov: { sensorNode: THREE.Object3D; positionAttr: THREE.BufferAttribute; colorAttr: THREE.BufferAttribute; geometry: THREE.BufferGeometry; maxPoints: number; range: number },
  sweep: RadarFrame,
): void {
  const positions = ov.positionAttr.array as Float32Array;
  const colors = ov.colorAttr.array as Float32Array;
  const bins = sweep.spokes[0]?.intensity.length ?? 0;
  ov.sensorNode.getWorldPosition(_ovVec);
  ov.sensorNode.getWorldQuaternion(_ovQuat);
  _ovEuler.setFromQuaternion(_ovQuat, "YXZ");
  const heading = _ovEuler.y;
  const sx = _ovVec.x, sy = _ovVec.y, sz = _ovVec.z;
  let count = 0;
  for (const spoke of sweep.spokes) {
    const wa = heading + spoke.azimuth;
    const cosA = Math.cos(wa);
    const sinA = Math.sin(wa);
    for (let b = 0; b < bins && count < ov.maxPoints; b++) {
      const v = spoke.intensity[b]!;
      if (v === 0) continue;
      const r = ((b + 0.5) / bins) * ov.range;
      positions[count * 3] = sx + cosA * r;
      positions[count * 3 + 1] = sy;
      positions[count * 3 + 2] = sz + sinA * r;
      const norm = Math.sqrt(v / 255);
      colors[count * 3] = norm * 0.15;
      colors[count * 3 + 1] = norm;
      colors[count * 3 + 2] = norm * 0.08;
      count++;
    }
  }
  ov.positionAttr.needsUpdate = true;
  ov.colorAttr.needsUpdate = true;
  ov.geometry.setDrawRange(0, count);
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

const BUILDING_Y = 0.5;

function buildingsToObstacles(
  buildings: BuildingData[],
  anchor: Anchor,
): Array<{ position: [number, number, number]; heading: number; half_extents: [number, number, number] }> {
  return buildings.map((bldg) => {
    const enu = bldg.polygon.map(([lon, lat]) => geodeticToEnu({ lat, lon, height: 0 }, anchor));
    const es = enu.map((p) => p.e);
    const ns = enu.map((p) => p.n);
    const minE = Math.min(...es), maxE = Math.max(...es);
    const minN = Math.min(...ns), maxN = Math.max(...ns);
    const halfX = Math.max((maxE - minE) / 2, 0.5);
    const halfZ = Math.max((maxN - minN) / 2, 0.5);
    const halfY = bldg.heightM / 2;
    return {
      position: [(minE + maxE) / 2, BUILDING_Y + halfY, -((minN + maxN) / 2)] as [number, number, number],
      heading: 0,
      half_extents: [halfX, halfY, halfZ] as [number, number, number],
    };
  });
}
