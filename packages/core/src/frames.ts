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
const _quat = new THREE.Quaternion();
const _qp = new THREE.Quaternion();
const _qr = new THREE.Quaternion();
const X_AXIS = new THREE.Vector3(1, 0, 0);
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);

/**
 * Decomposed nav attitude → three.js scene quaternion.
 *
 * Body convention (right-handed, Y-up): bow (forward) = +X, up = +Y,
 * starboard = +Z — how the hull models and mounts are authored, and what the
 * radar reads back (scene-marshal `bowBearingXZ`). See ADR-003.
 *
 * - `headingDeg` is keelson `heading_true_north_deg`: clockwise from true North
 *   (= world −Z). At heading 0 the bow (+X) points North; this is a base
 *   rotation `Ry(π/2)`, and increasing heading rotates the bow toward East,
 *   so the heading term is `Ry(π/2 − heading)`.
 * - `pitchDeg` positive = bow up (rotation about starboard, body +Z).
 * - `rollDeg` positive = starboard down (rotation about the bow, body +X).
 *
 * Composed intrinsically heading → pitch → roll. The pitch/roll signs are
 * Bino's stated convention (keelson leaves ISO-8855 sign nuances loose); if a
 * producer differs, this is the one place to adjust.
 */
export function navToSceneQuaternion(
  headingDeg: number,
  pitchDeg = 0,
  rollDeg = 0,
): SceneQuaternion {
  _quat.setFromAxisAngle(Y_AXIS, Math.PI / 2 - headingDeg * DEG);
  _qp.setFromAxisAngle(Z_AXIS, pitchDeg * DEG);
  _qr.setFromAxisAngle(X_AXIS, rollDeg * DEG);
  _quat.multiply(_qp).multiply(_qr);
  return [_quat.x, _quat.y, _quat.z, _quat.w];
}

