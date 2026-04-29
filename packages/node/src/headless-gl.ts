import { createRequire } from "node:module";
import * as THREE from "three";

const require = createRequire(import.meta.url);

export interface HeadlessRendererHandle {
  renderer: THREE.WebGLRenderer;
  dispose: () => void;
}

export function createHeadlessRenderer(width: number, height: number): HeadlessRendererHandle {
  const createGL = require("@kmamal/gl") as (
    w: number,
    h: number,
    opts?: object,
  ) => WebGLRenderingContext | null;

  // @kmamal/gl 9.x reads options.window.gl unconditionally — pass an empty
  // window stub to dodge the throw and get a pure offscreen context.
  const gl = createGL(width, height, { preserveDrawingBuffer: true, window: {} });
  if (!gl) throw new Error("@kmamal/gl: createGL returned null");

  const canvas = makeFakeCanvas(gl, width, height);
  const renderer = new THREE.WebGLRenderer({
    canvas: canvas as unknown as HTMLCanvasElement,
    context: gl,
    antialias: false,
    powerPreference: "high-performance",
    preserveDrawingBuffer: true,
  });
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(1);

  return {
    renderer,
    dispose: () => {
      renderer.dispose();
    },
  };
}

function makeFakeCanvas(gl: WebGLRenderingContext, width: number, height: number): object {
  return {
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
}
