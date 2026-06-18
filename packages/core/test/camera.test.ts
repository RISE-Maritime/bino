import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { compileScenario } from "../src/compile.js";
import { buildScene } from "../src/scene.js";
import { applyPoseUpdate } from "../src/pose.js";
import { createCameraKernel } from "../src/camera.js";

const scenario = {
  name: "camera-test",
  anchor: { lat: 0, lon: 0, height: 0 },
  keelson: { base_path: "bino" },
  vessels: [
    {
      id: "ego",
      model: "tanker_120m",
      pose_source: { type: "zenoh", topic: "ego/pose" },
      sensors: [
        {
          id: "bow_camera",
          type: "camera",
          mount: { x: 5, y: 0, z: 2 },
          fov_deg: 60,
          resolution: [320, 240],
          rate_hz: 10,
        },
      ],
    },
  ],
  modes: { rendering: "replace", clock: "wall", determinism: "relaxed" },
};

interface RendererStub {
  setRenderTarget: ReturnType<typeof vi.fn>;
  render: ReturnType<typeof vi.fn>;
  readRenderTargetPixels: ReturnType<typeof vi.fn>;
}

function makeRendererStub(): RendererStub & THREE.WebGLRenderer {
  const stub: RendererStub = {
    setRenderTarget: vi.fn(),
    render: vi.fn(),
    readRenderTargetPixels: vi.fn((_target, _x, _y, _w, _h, buf: Uint8Array) => {
      for (let i = 0; i < buf.length; i += 4) {
        buf[i] = 0xab;
        buf[i + 1] = 0xcd;
        buf[i + 2] = 0xef;
        buf[i + 3] = 0xff;
      }
    }),
  };
  return stub as unknown as RendererStub & THREE.WebGLRenderer;
}

function getSensorNode() {
  const compiled = compileScenario(scenario);
  const built = buildScene(compiled);
  const sensorNode = built.entities.get("ego")!.getObjectByName("bow_camera")!;
  return { ...built, sensorNode };
}

describe("createCameraKernel", () => {
  it("derives PerspectiveCamera intrinsics from the sensor config", () => {
    const { scene, sensorNode } = getSensorNode();
    const kernel = createCameraKernel({
      renderer: makeRendererStub(),
      scene,
      sensorNode,
      config: scenario.vessels[0]!.sensors[0]! as Extract<
        (typeof scenario)["vessels"][0]["sensors"][0],
        { type: "camera" }
      >,
    });
    expect(kernel.camera).toBeInstanceOf(THREE.PerspectiveCamera);
    expect(kernel.camera.fov).toBe(60);
    expect(kernel.camera.aspect).toBeCloseTo(320 / 240);
  });

  it("parents the camera under the sensor node so transforms compose", () => {
    const { scene, sensorNode, entities } = getSensorNode();
    applyPoseUpdate(entities, {
      entityId: "ego",
      pose: { position: [100, 0, 0], orientation: [0, 0, 0, 1] },
      time: 0,
    });
    const kernel = createCameraKernel({
      renderer: makeRendererStub(),
      scene,
      sensorNode,
      config: scenario.vessels[0]!.sensors[0]! as Extract<
        (typeof scenario)["vessels"][0]["sensors"][0],
        { type: "camera" }
      >,
    });
    scene.updateMatrixWorld(true);
    const worldPos = new THREE.Vector3();
    kernel.camera.getWorldPosition(worldPos);
    // ego at (100,0,0), camera mount at (5,0,2) in vessel frame -> world (105,0,2)
    expect(worldPos.x).toBeCloseTo(105);
    expect(worldPos.y).toBeCloseTo(0);
    expect(worldPos.z).toBeCloseTo(2);
  });

  it("aims the camera over the bow (+X) at mount yaw 0", () => {
    // ego at identity → bow = +X (East). A bow camera with no mount yaw must
    // look along the bow, not abeam (its three.js −Z look axis is aimed at +X).
    const { scene, sensorNode } = getSensorNode();
    const kernel = createCameraKernel({
      renderer: makeRendererStub(),
      scene,
      sensorNode,
      config: scenario.vessels[0]!.sensors[0]! as Extract<
        (typeof scenario)["vessels"][0]["sensors"][0],
        { type: "camera" }
      >,
    });
    scene.updateMatrixWorld(true);
    const dir = new THREE.Vector3();
    kernel.camera.getWorldDirection(dir);
    expect(dir.x).toBeCloseTo(1, 5); // along the bow
    expect(dir.y).toBeCloseTo(0, 5);
    expect(dir.z).toBeCloseTo(0, 5);
  });

  it("step() drives the renderer and returns a sized RGBA frame", () => {
    const { scene, sensorNode } = getSensorNode();
    const renderer = makeRendererStub();
    const kernel = createCameraKernel({
      renderer,
      scene,
      sensorNode,
      config: scenario.vessels[0]!.sensors[0]! as Extract<
        (typeof scenario)["vessels"][0]["sensors"][0],
        { type: "camera" }
      >,
    });
    const frame = kernel.step(1.5);
    expect(renderer.setRenderTarget).toHaveBeenCalledTimes(2); // bind + unbind
    expect(renderer.render).toHaveBeenCalledTimes(1);
    expect(renderer.readRenderTargetPixels).toHaveBeenCalledTimes(1);
    expect(frame.width).toBe(320);
    expect(frame.height).toBe(240);
    expect(frame.pixels.length).toBe(320 * 240 * 4);
    expect(frame.time).toBe(1.5);
    expect(frame.pixels[0]).toBe(0xab);
  });

  it("dispose() releases the render target", () => {
    const { scene, sensorNode } = getSensorNode();
    const kernel = createCameraKernel({
      renderer: makeRendererStub(),
      scene,
      sensorNode,
      config: scenario.vessels[0]!.sensors[0]! as Extract<
        (typeof scenario)["vessels"][0]["sensors"][0],
        { type: "camera" }
      >,
    });
    expect(() => kernel.dispose()).not.toThrow();
  });
});
