import type { Anchor } from "./dsl.js";

const WGS84_A = 6378137.0;
const WGS84_F = 1 / 298.257223563;
const WGS84_E2 = WGS84_F * (2 - WGS84_F);

export interface Geodetic {
  lat: number;
  lon: number;
  height: number;
}

export interface Ecef {
  x: number;
  y: number;
  z: number;
}

export interface Enu {
  e: number;
  n: number;
  u: number;
}

export function geodeticToEcef(g: Geodetic): Ecef {
  const lat = (g.lat * Math.PI) / 180;
  const lon = (g.lon * Math.PI) / 180;
  const sinLat = Math.sin(lat);
  const cosLat = Math.cos(lat);
  const sinLon = Math.sin(lon);
  const cosLon = Math.cos(lon);
  const N = WGS84_A / Math.sqrt(1 - WGS84_E2 * sinLat * sinLat);
  return {
    x: (N + g.height) * cosLat * cosLon,
    y: (N + g.height) * cosLat * sinLon,
    z: (N * (1 - WGS84_E2) + g.height) * sinLat,
  };
}

export function ecefToEnu(point: Ecef, anchor: Anchor): Enu {
  const anchorEcef = geodeticToEcef(anchor);
  const dx = point.x - anchorEcef.x;
  const dy = point.y - anchorEcef.y;
  const dz = point.z - anchorEcef.z;
  const lat = (anchor.lat * Math.PI) / 180;
  const lon = (anchor.lon * Math.PI) / 180;
  const sinLat = Math.sin(lat);
  const cosLat = Math.cos(lat);
  const sinLon = Math.sin(lon);
  const cosLon = Math.cos(lon);
  return {
    e: -sinLon * dx + cosLon * dy,
    n: -sinLat * cosLon * dx - sinLat * sinLon * dy + cosLat * dz,
    u: cosLat * cosLon * dx + cosLat * sinLon * dy + sinLat * dz,
  };
}

export function geodeticToEnu(point: Geodetic, anchor: Anchor): Enu {
  return ecefToEnu(geodeticToEcef(point), anchor);
}
