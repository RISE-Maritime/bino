import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { enuToScene, sceneToEnu, geodeticToScene, navToSceneQuaternion } from "../src/frames.js";
import type { Anchor } from "../src/dsl.js";

/** Forward (bow) vector for a scene quaternion: rotate local −Z by it. */
function forwardOf(q: [number, number, number, number]): THREE.Vector3 {
  return new THREE.Vector3(0, 0, -1).applyQuaternion(
    new THREE.Quaternion(q[0], q[1], q[2], q[3]),
  );
}

describe("ENU ↔ three.js scene frame", () => {
  it("maps East→+X, Up→+Y, North→−Z", () => {
    const expectVec = (got: number[], want: number[]) => {
      want.forEach((w, i) => expect(got[i]).toBeCloseTo(w, 9));
    };
    expectVec(enuToScene({ e: 1, n: 0, u: 0 }), [1, 0, 0]); // East → +X
    expectVec(enuToScene({ e: 0, n: 0, u: 1 }), [0, 1, 0]); // Up → +Y
    expectVec(enuToScene({ e: 0, n: 1, u: 0 }), [0, 0, -1]); // North → −Z
  });

  it("round-trips ENU → scene → ENU", () => {
    const enu = { e: 123.5, n: -47.25, u: 8.0 };
    const back = sceneToEnu(enuToScene(enu));
    expect(back.e).toBeCloseTo(enu.e, 9);
    expect(back.n).toBeCloseTo(enu.n, 9);
    expect(back.u).toBeCloseTo(enu.u, 9);
  });

  it("places a point north of the anchor at −Z", () => {
    const anchor: Anchor = { lat: 54.32, lon: 10.14, height: 0 };
    // ~100 m due north (lat increases), same lon.
    const north = geodeticToScene({ lat: 54.32 + 100 / 111_320, lon: 10.14, height: 0 }, anchor);
    expect(north[0]).toBeCloseTo(0, 1); // no east offset
    expect(north[2]).toBeLessThan(0); // north → −Z
    expect(Math.abs(north[2])).toBeCloseTo(100, 0); // ~100 m
  });

  it("places a point east of the anchor at +X", () => {
    const anchor: Anchor = { lat: 54.32, lon: 10.14, height: 0 };
    const east = geodeticToScene(
      { lat: 54.32, lon: 10.14 + 100 / (111_320 * Math.cos((54.32 * Math.PI) / 180)), height: 0 },
      anchor,
    );
    expect(east[0]).toBeGreaterThan(0); // east → +X
    expect(Math.abs(east[0])).toBeCloseTo(100, 0);
    expect(east[2]).toBeCloseTo(0, 1); // no north offset
  });
});

describe("navToSceneQuaternion — heading → bow direction", () => {
  it("heading 0 points the bow due North (−Z)", () => {
    const f = forwardOf(navToSceneQuaternion(0));
    expect(f.x).toBeCloseTo(0, 6);
    expect(f.z).toBeCloseTo(-1, 6); // North
  });

  it("heading 90° points the bow due East (+X)", () => {
    const f = forwardOf(navToSceneQuaternion(90));
    expect(f.x).toBeCloseTo(1, 6); // East
    expect(f.z).toBeCloseTo(0, 6);
  });

  it("heading 180° points the bow due South (+Z)", () => {
    const f = forwardOf(navToSceneQuaternion(180));
    expect(f.z).toBeCloseTo(1, 6); // South
  });

  it("heading 270° points the bow due West (−X)", () => {
    const f = forwardOf(navToSceneQuaternion(270));
    expect(f.x).toBeCloseTo(-1, 6); // West
  });

  it("reads back through the engine's YXZ Euler.y convention as −heading", () => {
    // scene-marshal derives heading as the YXZ Euler.y of the world quaternion.
    const q = navToSceneQuaternion(90);
    const e = new THREE.Euler().setFromQuaternion(
      new THREE.Quaternion(q[0], q[1], q[2], q[3]),
      "YXZ",
    );
    expect(e.y).toBeCloseTo(-Math.PI / 2, 6);
  });

  it("positive pitch lifts the bow (+Y)", () => {
    const f = forwardOf(navToSceneQuaternion(0, 10, 0));
    expect(f.y).toBeGreaterThan(0); // bow up
    expect(f.z).toBeCloseTo(-Math.cos((10 * Math.PI) / 180), 6);
  });
});
