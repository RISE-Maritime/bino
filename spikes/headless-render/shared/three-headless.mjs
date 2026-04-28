// Helpers shared by the headless-gl and @kmamal/gl candidates: build a
// fake DOM canvas around a raw WebGL1 context so Three.js's
// WebGLRenderer can drive it.

import * as THREE from "three";

export function makeFakeCanvas(gl, width, height) {
  // Three.js looks at a small surface area of HTMLCanvasElement: width,
  // height, getContext, addEventListener, removeEventListener, style,
  // and a few feature-detect properties. We stub just enough.
  const canvas = {
    width,
    height,
    clientWidth: width,
    clientHeight: height,
    style: {},
    addEventListener() {},
    removeEventListener() {},
    getContext() {
      return gl;
    },
    getBoundingClientRect() {
      return { left: 0, top: 0, width, height };
    },
  };
  return canvas;
}

export function makeRenderer(gl, width, height) {
  const canvas = makeFakeCanvas(gl, width, height);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    context: gl,
    antialias: false,
    powerPreference: "high-performance",
    preserveDrawingBuffer: true,
  });
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(1);
  return renderer;
}

// Render-target pair: one for color (with depth attachment so geometry
// resolves correctly), one for a separate depth-encoded pass we can read
// back as RGBA-packed depth. WebGL1 doesn't expose float depth readback
// portably, so we use Three.js's MeshDepthMaterial with RGBADepthPacking
// — the four bytes encode a 0..1 depth which the lidar kernel can
// decode. This is the WebGL1 lidar-readback story.
export function makeTargets(width, height) {
  const colorTarget = new THREE.WebGLRenderTarget(width, height, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    depthBuffer: true,
    stencilBuffer: false,
  });
  const depthRGBATarget = new THREE.WebGLRenderTarget(width, height, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    depthBuffer: true,
    stencilBuffer: false,
  });
  return { colorTarget, depthRGBATarget };
}

export function makeDepthOverride() {
  return new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking,
    blending: THREE.NoBlending,
  });
}

export function decodeRGBADepthSample(rgba, idx) {
  // Mirror of three's unpackRGBAToDepth: depth = dot(rgba_byte, (1, 1/256, 1/65536, 1/16M) / 256).
  // Most-significant byte is A (alpha), not R — Three.js packs that way.
  const r = rgba[idx + 0];
  const g = rgba[idx + 1];
  const b = rgba[idx + 2];
  const a = rgba[idx + 3];
  return a / 256 + b / 65536 + g / 16777216 + r / 4294967296;
}
