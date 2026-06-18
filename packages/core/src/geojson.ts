// GeoJSON parsers for local terrain sources (ADR-005). Pure: they take a
// parsed GeoJSON object and produce the same TerrainData shapes the network
// sources do. Host code (node fs / viewer fetch) reads the file and JSON.parses
// it; this module never does I/O.

import type { CoastlineChain } from "./terrain.js";
import type { BuildingData, SeamarkData } from "./overpass.js";

type Position = [number, number]; // [lon, lat]

interface Geometry {
  type: string;
  coordinates?: unknown;
}
interface Feature {
  type: "Feature";
  geometry?: Geometry | null;
  properties?: Record<string, unknown> | null;
}
interface FeatureCollection {
  type: "FeatureCollection";
  features?: Feature[];
}
type GeoJson = Feature | FeatureCollection | Geometry;

/** Normalize any GeoJSON root into a flat list of (geometry, properties). */
function features(input: unknown): Array<{
  geometry: Geometry;
  properties: Record<string, unknown>;
}> {
  if (!input || typeof input !== "object") throw new Error("geojson: not an object");
  const gj = input as GeoJson;
  if (gj.type === "FeatureCollection") {
    return ((gj as FeatureCollection).features ?? []).flatMap((f) =>
      f.geometry ? [{ geometry: f.geometry, properties: f.properties ?? {} }] : [],
    );
  }
  if (gj.type === "Feature") {
    const f = gj as Feature;
    return f.geometry ? [{ geometry: f.geometry, properties: f.properties ?? {} }] : [];
  }
  return [{ geometry: gj as Geometry, properties: {} }];
}

function asPositions(coords: unknown): Position[] {
  if (!Array.isArray(coords)) return [];
  return coords
    .filter(
      (p): p is [number, number] =>
        Array.isArray(p) && typeof p[0] === "number" && typeof p[1] === "number",
    )
    .map((p) => [p[0], p[1]] as Position);
}

function samePoint(a: Position, b: Position): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

function chainFrom(points: Position[]): CoastlineChain {
  return { points, closed: points.length > 1 && samePoint(points[0]!, points[points.length - 1]!) };
}

/** Coastline from LineString / MultiLineString / Polygon (ring) geometries. */
export function parseGeoJsonCoastline(gj: unknown): CoastlineChain[] {
  const chains: CoastlineChain[] = [];
  for (const { geometry } of features(gj)) {
    const c = geometry.coordinates;
    switch (geometry.type) {
      case "LineString":
        chains.push(chainFrom(asPositions(c)));
        break;
      case "MultiLineString":
      case "Polygon":
        for (const ring of (c as unknown[]) ?? []) chains.push(chainFrom(asPositions(ring)));
        break;
      case "MultiPolygon":
        for (const poly of (c as unknown[]) ?? [])
          for (const ring of (poly as unknown[]) ?? []) chains.push(chainFrom(asPositions(ring)));
        break;
    }
  }
  return chains.filter((ch) => ch.points.length >= 2);
}

function buildingHeight(props: Record<string, unknown>): number {
  const h = props["height"] ?? props["building:height"];
  if (typeof h === "number" && h > 0) return h;
  if (typeof h === "string" && Number.isFinite(parseFloat(h)) && parseFloat(h) > 0)
    return parseFloat(h);
  const levels = props["building:levels"] ?? props["levels"];
  const n = typeof levels === "number" ? levels : parseInt(String(levels ?? ""), 10);
  return (Number.isFinite(n) && n > 0 ? n : 3) * 3;
}

function stringTags(props: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(props)) {
    if (v != null && typeof v !== "object") out[k] = String(v);
  }
  return out;
}

/** Buildings from Polygon / MultiPolygon outer rings; height from
 *  `height` / `building:levels` properties (defaulting to 3 levels). */
export function parseGeoJsonBuildings(gj: unknown): BuildingData[] {
  const buildings: BuildingData[] = [];
  for (const { geometry, properties } of features(gj)) {
    const rings: unknown[] =
      geometry.type === "Polygon"
        ? [(geometry.coordinates as unknown[])?.[0]]
        : geometry.type === "MultiPolygon"
          ? (geometry.coordinates as unknown[][]).map((poly) => poly?.[0])
          : [];
    for (const ring of rings) {
      const polygon = asPositions(ring);
      if (polygon.length >= 3) {
        buildings.push({
          polygon,
          heightM: buildingHeight(properties),
          tags: stringTags(properties),
        });
      }
    }
  }
  return buildings;
}

/** Seamarks from Point features; type from `seamark:type` / `type`. */
export function parseGeoJsonSeamarks(gj: unknown): SeamarkData[] {
  const seamarks: SeamarkData[] = [];
  for (const { geometry, properties } of features(gj)) {
    if (geometry.type !== "Point") continue;
    const pos = geometry.coordinates as unknown;
    if (!Array.isArray(pos) || typeof pos[0] !== "number" || typeof pos[1] !== "number") continue;
    const type = String(properties["seamark:type"] ?? properties["type"] ?? "unknown");
    seamarks.push({ lon: pos[0], lat: pos[1], type, tags: stringTags(properties) });
  }
  return seamarks;
}
