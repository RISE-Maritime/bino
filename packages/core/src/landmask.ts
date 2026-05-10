import * as THREE from "three";
import type { Anchor, Bbox } from "./dsl.js";
import type { CoastlineChain } from "./terrain.js";
import { geodeticToEnu } from "./geo.js";

type Point = [number, number]; // [lon, lat]

// ─── Bbox edge enumeration (clockwise: top → right → bottom → left) ─

const enum Edge {
  Top = 0,
  Right = 1,
  Bottom = 2,
  Left = 3,
}

interface BboxRect {
  west: number;
  south: number;
  east: number;
  north: number;
}

function toBboxRect(bbox: Bbox): BboxRect {
  return { west: bbox[0], south: bbox[1], east: bbox[2], north: bbox[3] };
}

// ─── Point-on-bbox perimeter parameter ──────────────────────────────
// Maps a point on the bbox boundary to a scalar ∈ [0, 4) that
// increases clockwise starting from the top-left corner (NW).
//   0..1 = top edge (west→east)
//   1..2 = right edge (north→south)
//   2..3 = bottom edge (east→west)
//   3..4 = left edge (south→north)

function perimeterParam(p: Point, r: BboxRect): number {
  const [lon, lat] = p;
  const eps = 1e-9;
  const w = r.east - r.west;
  const h = r.north - r.south;
  if (Math.abs(lat - r.north) < eps) return (lon - r.west) / w; // top
  if (Math.abs(lon - r.east) < eps) return 1 + (r.north - lat) / h; // right
  if (Math.abs(lat - r.south) < eps) return 2 + (r.east - lon) / w; // bottom
  if (Math.abs(lon - r.west) < eps) return 3 + (lat - r.south) / h; // left
  return 0;
}

// ─── Line-segment vs bbox clipping ──────────────────────────────────

function inside(p: Point, r: BboxRect): boolean {
  return p[0] >= r.west && p[0] <= r.east && p[1] >= r.south && p[1] <= r.north;
}

function clampToBbox(p: Point, r: BboxRect): Point {
  return [
    Math.max(r.west, Math.min(r.east, p[0])),
    Math.max(r.south, Math.min(r.north, p[1])),
  ];
}

function intersectSegmentBbox(
  a: Point,
  b: Point,
  r: BboxRect,
): Point | null {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  let tMin = 0;
  let tMax = 1;

  const edges: [number, number, number, number][] = [
    [-dx, a[0] - r.west, dx, r.east - a[0]], // left / right
  ];
  // Use parametric clipping (Liang-Barsky)
  const check = (p: number, q: number): boolean => {
    if (Math.abs(p) < 1e-12) return q >= -1e-12;
    const t = q / p;
    if (p < 0) {
      if (t > tMax) return false;
      if (t > tMin) tMin = t;
    } else {
      if (t < tMin) return false;
      if (t < tMax) tMax = t;
    }
    return true;
  };

  if (!check(-dx, a[0] - r.west)) return null;
  if (!check(dx, r.east - a[0])) return null;
  if (!check(-dy, a[1] - r.south)) return null;
  if (!check(dy, r.north - a[1])) return null;

  if (tMin > 0) return [a[0] + tMin * dx, a[1] + tMin * dy];
  if (tMax < 1) return [a[0] + tMax * dx, a[1] + tMax * dy];
  return null;
}

// ─── Clip a chain to the bbox ───────────────────────────────────────
// Returns an array of sub-chains, each fully inside the bbox.
// Endpoints of sub-chains that were clipped lie exactly on the bbox.

interface ClippedChain {
  points: Point[];
  entryOnBbox: boolean; // first point was clipped to bbox
  exitOnBbox: boolean; // last point was clipped to bbox
}

export function clipChainToBbox(chain: CoastlineChain, bbox: Bbox): ClippedChain[] {
  const r = toBboxRect(bbox);
  const pts = chain.points;
  if (pts.length < 2) return [];

  const result: ClippedChain[] = [];
  let current: Point[] = [];
  let entryOnBbox = false;

  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!;
    const pIn = inside(p, r);

    if (i === 0) {
      if (pIn) {
        current.push(p);
        entryOnBbox = false;
      }
      continue;
    }

    const prev = pts[i - 1]!;
    const prevIn = inside(prev, r);

    if (prevIn && pIn) {
      current.push(p);
    } else if (prevIn && !pIn) {
      // Exiting bbox
      const ix = intersectSegmentBbox(prev, p, r);
      if (ix) current.push(clampToBbox(ix, r));
      if (current.length >= 2) {
        result.push({ points: current, entryOnBbox, exitOnBbox: true });
      }
      current = [];
      entryOnBbox = false;
    } else if (!prevIn && pIn) {
      // Entering bbox
      const ix = intersectSegmentBbox(prev, p, r);
      current = ix ? [clampToBbox(ix, r), p] : [p];
      entryOnBbox = !!ix;
    } else {
      // Both outside — but segment might cross bbox
      const dx = p[0] - prev[0];
      const dy = p[1] - prev[1];
      let tMin = 0;
      let tMax = 1;
      let valid = true;
      const check = (pp: number, q: number): boolean => {
        if (Math.abs(pp) < 1e-12) return q >= -1e-12;
        const t = q / pp;
        if (pp < 0) {
          if (t > tMax) return false;
          if (t > tMin) tMin = t;
        } else {
          if (t < tMin) return false;
          if (t < tMax) tMax = t;
        }
        return true;
      };
      valid = check(-dx, prev[0] - r.west) && valid;
      valid = check(dx, r.east - prev[0]) && valid;
      valid = check(-dy, prev[1] - r.south) && valid;
      valid = check(dy, r.north - prev[1]) && valid;
      if (valid && tMin < tMax) {
        const entry: Point = clampToBbox(
          [prev[0] + tMin * dx, prev[1] + tMin * dy],
          r,
        );
        const exit: Point = clampToBbox(
          [prev[0] + tMax * dx, prev[1] + tMax * dy],
          r,
        );
        result.push({
          points: [entry, exit],
          entryOnBbox: true,
          exitOnBbox: true,
        });
      }
    }
  }

  if (current.length >= 2) {
    result.push({ points: current, entryOnBbox, exitOnBbox: false });
  }

  return result;
}

// ─── Assemble clipped chains into closed land polygons ──────────────
// OSM coastline convention: land is on the LEFT when walking the chain.
// After clipping, each sub-chain has an exit point and the next chain
// has an entry point, both on the bbox boundary. We walk CLOCKWISE
// along the bbox perimeter from exit to entry, inserting corner
// vertices as needed, to close the land-side polygon.

function bboxCorners(r: BboxRect): Point[] {
  // Clockwise from NW: NW, NE, SE, SW
  return [
    [r.west, r.north],
    [r.east, r.north],
    [r.east, r.south],
    [r.west, r.south],
  ];
}

function cornerParam(i: number): number {
  return i; // 0=NW, 1=NE, 2=SE, 3=SW
}

function walkPerimeterCW(
  fromParam: number,
  toParam: number,
  r: BboxRect,
): Point[] {
  const corners = bboxCorners(r);
  const pts: Point[] = [];
  let t = fromParam;
  const target = toParam <= fromParam ? toParam + 4 : toParam;
  for (let ci = Math.ceil(t); ci < target; ci++) {
    const idx = ci % 4;
    pts.push(corners[idx]!);
  }
  return pts;
}

export interface LandPolygon {
  ring: Point[];
}

export function assemblePolygons(
  chains: CoastlineChain[],
  bbox: Bbox,
): LandPolygon[] {
  const r = toBboxRect(bbox);
  const clipped: ClippedChain[] = [];
  for (const chain of chains) {
    if (chain.closed) {
      // Closed island chain — use directly as a polygon
      clipped.push({
        points: chain.points,
        entryOnBbox: false,
        exitOnBbox: false,
      });
    } else {
      clipped.push(...clipChainToBbox(chain, bbox));
    }
  }

  const polygons: LandPolygon[] = [];

  // Separate fully-interior closed chains (islands) from bbox-crossing chains
  const crossingChains: ClippedChain[] = [];
  for (const c of clipped) {
    if (!c.entryOnBbox && !c.exitOnBbox && c.points.length >= 3) {
      // Fully interior closed polygon (island)
      polygons.push({ ring: c.points });
    } else if (c.entryOnBbox && c.exitOnBbox && c.points.length >= 2) {
      crossingChains.push(c);
    }
  }

  if (crossingChains.length === 0) return polygons;

  // Sort crossing chains by their entry parameter (clockwise around bbox)
  const sorted = crossingChains.map((c) => ({
    chain: c,
    entryParam: perimeterParam(c.points[0]!, r),
    exitParam: perimeterParam(c.points[c.points.length - 1]!, r),
  }));
  sorted.sort((a, b) => a.entryParam - b.entryParam);

  // Connect chains: walk CW from each chain's exit to the next chain's
  // entry. The land polygon is: chain₁ points → CW walk → chain₂ points
  // → CW walk → ... → back to chain₁ entry.
  const used = new Set<number>();
  for (let startIdx = 0; startIdx < sorted.length; startIdx++) {
    if (used.has(startIdx)) continue;
    const ring: Point[] = [];
    let idx = startIdx;
    do {
      used.add(idx);
      const entry = sorted[idx]!;
      ring.push(...entry.chain.points);
      const nextIdx = (idx + 1) % sorted.length;
      const nextEntry = sorted[nextIdx]!;
      const cornerPts = walkPerimeterCW(entry.exitParam, nextEntry.entryParam, r);
      ring.push(...cornerPts);
      idx = nextIdx;
    } while (idx !== startIdx);
    if (ring.length >= 3) {
      polygons.push({ ring });
    }
  }

  return polygons;
}

// ─── Three.js mesh construction ─────────────────────────────────────

const LAND_COLOR = 0x6b8f4e;
const LAND_Y = 0.5; // slightly above sea level

export function buildLandmaskMesh(
  chains: CoastlineChain[],
  bbox: Bbox,
  anchor: Anchor,
): THREE.Group {
  const group = new THREE.Group();
  group.name = "landmask";

  const polygons = assemblePolygons(chains, bbox);
  if (polygons.length === 0) return group;

  const material = new THREE.MeshStandardMaterial({
    color: LAND_COLOR,
    roughness: 0.9,
    side: THREE.DoubleSide,
  });

  for (const polygon of polygons) {
    const mesh = polygonToMesh(polygon, anchor, material);
    if (mesh) group.add(mesh);
  }

  return group;
}

function polygonToMesh(
  polygon: LandPolygon,
  anchor: Anchor,
  material: THREE.Material,
): THREE.Mesh | null {
  if (polygon.ring.length < 3) return null;

  const enuPoints: Array<{ e: number; n: number }> = polygon.ring.map(
    ([lon, lat]) => geodeticToEnu({ lat, lon, height: 0 }, anchor),
  );

  const shape = new THREE.Shape();
  shape.moveTo(enuPoints[0]!.e, enuPoints[0]!.n);
  for (let i = 1; i < enuPoints.length; i++) {
    shape.lineTo(enuPoints[i]!.e, enuPoints[i]!.n);
  }
  shape.closePath();

  const geometry = new THREE.ShapeGeometry(shape);
  // ShapeGeometry lies in XY; rotate so Y is up (Three.js convention)
  geometry.rotateX(-Math.PI / 2);

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = LAND_Y;
  return mesh;
}
