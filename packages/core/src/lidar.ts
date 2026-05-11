import * as THREE from "three";
import type { LidarSensor } from "./dsl.js";

const DEFAULT_FOV_DEG = 90;
const NEAR_DEFAULT = 0.1;
const SKY_DEPTH_THRESHOLD = 0.999;

export interface LidarFrame {
  points: Float32Array;
  count: number;
  time: number;
  /** Per-point intra-sweep timestamps (seconds). Present when the
   *  kernel supports temporal interpolation. */
  timestamps?: Float32Array;
}

export interface LidarKernel {
  readonly camera: THREE.PerspectiveCamera;
  step(time: number): LidarFrame;
  dispose(): void;
}

export interface LidarKernelOptions {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  sensorNode: THREE.Object3D;
  config: LidarSensor;
  fov_deg?: number;
  /** Render target width (horizontal pixels / azimuths). Defaults to config.channels. */
  width?: number;
  /** When true, the own vessel's hull group is hidden during the
   *  depth pass so the lidar doesn't hit its own geometry. Default true. */
  excludeOwnVessel?: boolean;
}

export interface DecodedPoints {
  points: Float32Array;
  count: number;
}

export function createLidarKernel(opts: LidarKernelOptions): LidarKernel {
  const fov = opts.fov_deg ?? DEFAULT_FOV_DEG;
  const channels = opts.config.channels;
  const range = opts.config.range_m;
  const width = opts.width ?? opts.config.azimuths ?? channels;
  const height = channels;

  const camera = new THREE.PerspectiveCamera(fov, width / height, NEAR_DEFAULT, range);
  opts.sensorNode.add(camera);

  const target = new THREE.WebGLRenderTarget(width, height, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    depthBuffer: true,
    stencilBuffer: false,
  });

  const depthOverride = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking,
    blending: THREE.NoBlending,
  });

  const depthBuf = new Uint8Array(width * height * 4);

  const excludeOwn = opts.excludeOwnVessel !== false;
  const ownHull = excludeOwn
    ? opts.sensorNode.parent?.children.find((c) => c.name.endsWith("__hull")) ?? null
    : null;

  return {
    camera,
    step(time: number): LidarFrame {
      if (ownHull) ownHull.visible = false;
      const prevOverride = opts.scene.overrideMaterial;
      opts.scene.overrideMaterial = depthOverride;
      opts.renderer.setRenderTarget(target);
      opts.renderer.render(opts.scene, camera);
      opts.renderer.readRenderTargetPixels(target, 0, 0, width, height, depthBuf);
      opts.renderer.setRenderTarget(null);
      opts.scene.overrideMaterial = prevOverride;
      if (ownHull) ownHull.visible = true;
      const decoded = decodeDepthToPoints(depthBuf, width, height, camera, range);
      return { points: decoded.points, count: decoded.count, time };
    },
    dispose() {
      target.dispose();
      depthOverride.dispose();
      opts.sensorNode.remove(camera);
    },
  };
}

export function decodeDepthToPoints(
  rgba: Uint8Array,
  width: number,
  height: number,
  camera: THREE.PerspectiveCamera,
  maxRange: number,
): DecodedPoints {
  const out = new Float32Array(width * height * 3);
  const v = new THREE.Vector3();
  const projInv = camera.projectionMatrixInverse;
  let count = 0;
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const idx = (row * width + col) * 4;
      const depth01 = decodeRGBADepth(rgba, idx);
      if (depth01 >= SKY_DEPTH_THRESHOLD) continue;
      const ndcX = ((col + 0.5) / width) * 2 - 1;
      const ndcY = ((row + 0.5) / height) * 2 - 1;
      const ndcZ = depth01 * 2 - 1;
      v.set(ndcX, ndcY, ndcZ).applyMatrix4(projInv);
      if (v.length() > maxRange) continue;
      out[count * 3 + 0] = v.x;
      out[count * 3 + 1] = v.y;
      out[count * 3 + 2] = v.z;
      count++;
    }
  }
  return { points: out.subarray(0, count * 3), count };
}

function decodeRGBADepth(rgba: Uint8Array, idx: number): number {
  const r = rgba[idx + 0]!;
  const g = rgba[idx + 1]!;
  const b = rgba[idx + 2]!;
  const a = rgba[idx + 3]!;
  return a / 256 + b / 65536 + g / 16777216 + r / 4294967296;
}
