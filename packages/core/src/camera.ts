import * as THREE from "three";
import type { CameraSensor } from "./dsl.js";

const NEAR_DEFAULT = 0.1;
// Far plane has to clear the Sky cube (~450k units) and the bbox
// extents so the camera kernel renders the same world the debug
// view does. Comfortably within fp32 precision for a single-anchor
// scene; still inside the depth-buffer's effective resolution given
// near=0.1.
const FAR_DEFAULT = 1_000_000;

export interface CameraFrame {
  pixels: Uint8Array;
  width: number;
  height: number;
  time: number;
  /** Start of the exposure interval (seconds). Equals `time` when
   *  `exposure_time_s` is zero or not configured. */
  exposure_start: number;
  /** End of the exposure interval (seconds). Equals `time` when
   *  `exposure_time_s` is zero or not configured. */
  exposure_end: number;
}

export interface CameraKernel {
  readonly camera: THREE.PerspectiveCamera;
  step(time: number): CameraFrame;
  dispose(): void;
}

export interface CameraKernelOptions {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  sensorNode: THREE.Object3D;
  config: CameraSensor;
}

export function createCameraKernel(opts: CameraKernelOptions): CameraKernel {
  const exposureTime: number = (opts.config as Record<string, unknown>).exposure_time_s as number ?? 0;
  const [width, height] = opts.config.resolution;
  const camera = new THREE.PerspectiveCamera(
    opts.config.fov_deg,
    width / height,
    NEAR_DEFAULT,
    FAR_DEFAULT,
  );
  opts.sensorNode.add(camera);

  const target = new THREE.WebGLRenderTarget(width, height, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    depthBuffer: true,
    stencilBuffer: false,
  });

  const pixels = new Uint8Array(width * height * 4);

  return {
    camera,
    step(time: number): CameraFrame {
      opts.renderer.setRenderTarget(target);
      opts.renderer.render(opts.scene, camera);
      opts.renderer.readRenderTargetPixels(target, 0, 0, width, height, pixels);
      opts.renderer.setRenderTarget(null);
      return {
        pixels, width, height, time,
        exposure_start: exposureTime > 0 ? time - exposureTime / 2 : time,
        exposure_end: exposureTime > 0 ? time + exposureTime / 2 : time,
      };
    },
    dispose() {
      target.dispose();
      opts.sensorNode.remove(camera);
    },
  };
}
