// Coordinate-frame conversions at the keelson boundary.
//
// Bino renders in a three.js right-handed Y-up world. Geo-registration places
// it as a local ENU tangent frame at the scenario anchor, mapped to three.js
// as: East → +X, Up → +Y, North → −Z. (This mapping is fixed by the terrain
// mesh builder — see terrain.ts buildSeabedMesh, where height goes to +Y and
// the north extent maps to −Z.)
//
// This module is the single place that mapping is expressed, so the
// decomposed-nav input path and any future boundary code agree on it.

import * as THREE from "three";
import type { Anchor } from "./dsl.js";
import { geodeticToEnu, type Enu, type Geodetic } from "./geo.js";

/** A position in Bino's three.js scene frame (Y-up): [x_east, y_up, z]. */
export type ScenePosition = [number, number, number];

/** ENU (East/North/Up, metres from anchor) → three.js scene position. */
export function enuToScene(enu: Enu): ScenePosition {
  return [enu.e, enu.u, -enu.n];
}

/** three.js scene position → ENU. Inverse of enuToScene. */
export function sceneToEnu(p: ScenePosition): Enu {
  return { e: p[0], n: -p[2], u: p[1] };
}

/** Geodetic (lat/lon/height) → three.js scene position, via the anchor. */
export function geodeticToScene(point: Geodetic, anchor: Anchor): ScenePosition {
  return enuToScene(geodeticToEnu(point, anchor));
}

/** A scene-frame orientation quaternion [x, y, z, w]. */
export type SceneQuaternion = [number, number, number, number];

const DEG = Math.PI / 180;
const _euler = new THREE.Euler();
const _quat = new THREE.Quaternion();

/**
 * Decomposed nav attitude → three.js scene quaternion.
 *
 * Body convention in the scene frame (right-handed, Y-up): bow (forward) = −Z,
 * up = +Y, starboard = +X — the same convention the rest of the engine reads
 * back (scene-marshal derives heading as the YXZ Euler.y; radar.test.ts
 * documents −Z as forward for an unrotated entity).
 *
 * - `headingDeg` is keelson `heading_true_north_deg`: clockwise from true North
 *   (= −Z). A positive heading rotates the bow toward East (+X), which is a
 *   *negative* rotation about three.js +Y, hence Euler.y = −heading.
 * - `pitchDeg` positive = bow up (rotation about starboard +X).
 * - `rollDeg` positive = starboard down (rotation about the bow axis).
 *
 * The pitch/roll signs are Bino's stated convention; if a producer's
 * `pitch_deg`/`roll_deg` sign differs this is the one place to adjust.
 */
export function navToSceneQuaternion(
  headingDeg: number,
  pitchDeg = 0,
  rollDeg = 0,
): SceneQuaternion {
  _euler.set(pitchDeg * DEG, -headingDeg * DEG, -rollDeg * DEG, "YXZ");
  _quat.setFromEuler(_euler);
  return [_quat.x, _quat.y, _quat.z, _quat.w];
}

