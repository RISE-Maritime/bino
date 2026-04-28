import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { compileScenario } from "../src/compile.js";
import { buildScene } from "../src/scene.js";
import { createLidarKernel, decodeDepthToPoints } from "../src/lidar.js";

const scenario = {
  name: "lidar-test",
  anchor: { lat: 0, lon: 0, height: 0 },
  vessels: [
    {
      id: "ego",
      model: "tanker_120m",
      pose_source: { type: "zenoh", topic: "ego/pose" },
      sensors: [
        {
          id: "main_lidar",
          type: "lidar",
          mount: { x: 0, y: 0, z: 5 },
          channels: 16,
          range_m: 50,
          rate_hz: 10,
        },
      ],
    },
  ],
  modes: { rendering: "replace", clock: "wall", determinism: "relaxed" },
};

function makeRendererStub(fillByte = 0): THREE.WebGLRenderer {
  return {
    setRenderTarget: vi.fn(),
    render: vi.fn(),
    readRenderTargetPixels: vi.fn((_t, _x, _y, _w, _h, buf: Uint8Array) => {
      buf.fill(fillByte);
    }),
  } as unknown as THREE.WebGLRenderer;
}

function getSensorNode() {
  const compiled = compileScenario(scenario);
  const built = buildScene(compiled);
  const sensorNode = built.entities.get("ego")!.getObjectByName("main_lidar")!;
  return { ...built, sensorNode };
}

const lidarConfig = scenario.vessels[0]!.sensors[0]! as Extract<
  (typeof scenario)["vessels"][0]["sensors"][0],
  { type: "lidar" }
>;

describe("decodeDepthToPoints", () => {
  it("returns no points for a far-plane buffer (sky)", () => {
    const w = 4;
    const h = 4;
    const buf = new Uint8Array(w * h * 4).fill(0xff);
    const camera = new THREE.PerspectiveCamera(90, 1, 0.1, 100);
    const result = decodeDepthToPoints(buf, w, h, camera, 100);
    expect(result.count).toBe(0);
  });

  it("emits camera-frame points for a near-plane buffer", () => {
    const w = 4;
    const h = 4;
    const buf = new Uint8Array(w * h * 4); // all zeros = depth01=0 = near plane
    const camera = new THREE.PerspectiveCamera(90, 1, 0.1, 100);
    const result = decodeDepthToPoints(buf, w, h, camera, 100);
    expect(result.count).toBe(w * h);
    // Each near-plane point should sit at z ≈ -near (in front of the camera).
    for (let i = 0; i < result.count; i++) {
      const z = result.points[i * 3 + 2]!;
      expect(z).toBeLessThan(0);
      expect(z).toBeGreaterThan(-0.2);
    }
  });

  it("filters points beyond max_range", () => {
    const w = 2;
    const h = 2;
    // alpha=255 -> depth01=255/256≈0.9961 -> view-z ≈ -20m for near=0.1, far=100.
    // Below the 0.999 sky threshold, so it survives that filter.
    const buf = new Uint8Array(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      buf[i * 4 + 3] = 255;
    }
    const camera = new THREE.PerspectiveCamera(90, 1, 0.1, 100);
    const tight = decodeDepthToPoints(buf, w, h, camera, 10);
    const loose = decodeDepthToPoints(buf, w, h, camera, 200);
    expect(tight.count).toBe(0);
    expect(loose.count).toBe(w * h);
  });
});

describe("createLidarKernel", () => {
  it("creates a perspective camera under the sensor node", () => {
    const { scene, sensorNode } = getSensorNode();
    const kernel = createLidarKernel({
      renderer: makeRendererStub(),
      scene,
      sensorNode,
      config: lidarConfig,
    });
    expect(kernel.camera).toBeInstanceOf(THREE.PerspectiveCamera);
    expect(kernel.camera.parent).toBe(sensorNode);
    expect(kernel.camera.far).toBe(50); // capped at range_m
  });

  it("step() runs a depth pass and returns a points frame", () => {
    const { scene, sensorNode } = getSensorNode();
    const renderer = makeRendererStub(0);
    const kernel = createLidarKernel({
      renderer,
      scene,
      sensorNode,
      config: lidarConfig,
    });
    const frame = kernel.step(2.5);
    expect(renderer.setRenderTarget).toHaveBeenCalledTimes(2);
    expect(renderer.render).toHaveBeenCalledTimes(1);
    expect(renderer.readRenderTargetPixels).toHaveBeenCalledTimes(1);
    expect(frame.points).toBeInstanceOf(Float32Array);
    expect(frame.time).toBe(2.5);
    expect(frame.count).toBeGreaterThan(0);
    expect(frame.points.length).toBe(frame.count * 3);
  });

  it("uses scene.overrideMaterial during the depth pass and restores it", () => {
    const { scene, sensorNode } = getSensorNode();
    const sentinel = new THREE.MeshBasicMaterial();
    scene.overrideMaterial = sentinel;
    const kernel = createLidarKernel({
      renderer: makeRendererStub(),
      scene,
      sensorNode,
      config: lidarConfig,
    });
    kernel.step(0);
    expect(scene.overrideMaterial).toBe(sentinel);
  });

  it("dispose() releases the render target and detaches the camera", () => {
    const { scene, sensorNode } = getSensorNode();
    const kernel = createLidarKernel({
      renderer: makeRendererStub(),
      scene,
      sensorNode,
      config: lidarConfig,
    });
    kernel.dispose();
    expect(kernel.camera.parent).toBeNull();
  });
});
