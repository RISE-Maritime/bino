import { createRequire } from "node:module";
import * as THREE from "three";

const require = createRequire(import.meta.url);

export interface HeadlessRendererHandle {
  renderer: THREE.WebGLRenderer;
  dispose: () => void;
}

// Three's WebGLRenderer constructor only wires its WebGLAnimation context
// when `typeof self !== 'undefined'`. In Node's main thread `self` is
// undefined, so the animation has no context — and both start() and
// stop() blow up dereferencing null.{request,cancel}AnimationFrame.
// Setting globalThis.self = globalThis (and stubbing the missing
// methods) makes Three's check pass and gives the animation a usable
// context. Spike never disposed/started so didn't hit this.
function ensureAnimationFrameStubs(): void {
  const g = globalThis as unknown as {
    self?: unknown;
    requestAnimationFrame?: (cb: FrameRequestCallback) => number;
    cancelAnimationFrame?: (id: number) => void;
  };
  if (typeof g.requestAnimationFrame !== "function") {
    g.requestAnimationFrame = (cb: FrameRequestCallback): number => {
      setImmediate(() => cb(performance.now()));
      return 0;
    };
  }
  if (typeof g.cancelAnimationFrame !== "function") {
    g.cancelAnimationFrame = () => {};
  }
  if (typeof g.self === "undefined") {
    g.self = globalThis;
  }
}

export function createHeadlessRenderer(width: number, height: number): HeadlessRendererHandle {
  ensureAnimationFrameStubs();
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
