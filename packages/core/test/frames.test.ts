import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { enuToScene, sceneToEnu, geodeticToScene, navToSceneQuaternion } from "../src/frames.js";
import { bowBearingXZ } from "../src/scene-marshal.js";
import type { Anchor } from "../src/dsl.js";

const quat = (q: [number, number, number, number]): THREE.Quaternion =>
  new THREE.Quaternion(q[0], q[1], q[2], q[3]);
/** Bow vector for a scene quaternion: rotate the body forward axis (+X). */
function bowOf(q: [number, number, number, number]): THREE.Vector3 {
  return new THREE.Vector3(1, 0, 0).applyQuaternion(quat(q));
}
/** Starboard vector: rotate the body +Z axis. */
function starboardOf(q: [number, number, number, number]): THREE.Vector3 {
  return new THREE.Vector3(0, 0, 1).applyQuaternion(quat(q));
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

describe("navToSceneQuaternion — heading → bow direction (bow = +X)", () => {
  it("heading 0 points the bow due North (−Z)", () => {
    const f = bowOf(navToSceneQuaternion(0));
    expect(f.x).toBeCloseTo(0, 6);
    expect(f.z).toBeCloseTo(-1, 6); // North
  });

  it("heading 90° points the bow due East (+X)", () => {
    const f = bowOf(navToSceneQuaternion(90));
    expect(f.x).toBeCloseTo(1, 6); // East
    expect(f.z).toBeCloseTo(0, 6);
  });

  it("heading 180° points the bow due South (+Z)", () => {
    expect(bowOf(navToSceneQuaternion(180)).z).toBeCloseTo(1, 6); // South
  });

  it("heading 270° points the bow due West (−X)", () => {
    expect(bowOf(navToSceneQuaternion(270)).x).toBeCloseTo(-1, 6); // West
  });

  it("is consistent with the radar bow bearing for every heading", () => {
    // navToSceneQuaternion and scene-marshal.bowBearingXZ must agree, else a
    // nav-driven vessel and its radar would disagree on where the bow points.
    for (const h of [0, 45, 90, 137, 270]) {
      const q = navToSceneQuaternion(h);
      const f = bowOf(q);
      expect(bowBearingXZ(quat(q))).toBeCloseTo(Math.atan2(f.z, f.x), 6);
    }
  });

  it("positive pitch lifts the bow (+Y)", () => {
    const f = bowOf(navToSceneQuaternion(0, 10, 0));
    expect(f.y).toBeGreaterThan(0); // bow up
    expect(f.z).toBeCloseTo(-Math.cos((10 * Math.PI) / 180), 6);
  });

  it("positive roll drops the starboard side (−Y)", () => {
    const s = starboardOf(navToSceneQuaternion(0, 0, 10));
    expect(s.y).toBeLessThan(0); // starboard down
  });
});
