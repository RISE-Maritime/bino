import * as THREE from "three";
import { fromArrayBuffer } from "geotiff";
import type { Anchor, Bbox } from "./dsl.js";
import { geodeticToEnu } from "./geo.js";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const GMRT_URL = "https://www.gmrt.org/services/GridServer";
const HTTP_USER_AGENT = "bino/0.4 (terrain loader)";

// ─── OSM coastline ────────────────────────────────────────────────

/** A single chain of (lon, lat) points stitched from OSM coastline
 *  ways. Open chains exit the bbox; closed chains are full polygons. */
export interface CoastlineChain {
  points: Array<[number, number]>;
  closed: boolean;
}

interface OverpassNode {
  type: "node";
  id: number;
  lat: number;
  lon: number;
}
interface OverpassWay {
  type: "way";
  id: number;
  nodes: number[];
}
type OverpassElement = OverpassNode | OverpassWay;

/**
 * Load coastline geometry for a bbox via the Overpass API.
 * Settled by spike S11 — see spikes/osm-coastline/results.md.
 */
export async function loadCoastline(bbox: Bbox): Promise<CoastlineChain[]> {
  const [west, south, east, north] = bbox;
  const query = `
[out:json][timeout:60];
(
  way["natural"="coastline"](${south},${west},${north},${east});
);
out body;
>;
out skel qt;
`.trim();

  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    body: new URLSearchParams({ data: query }),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "User-Agent": HTTP_USER_AGENT,
    },
  });
  if (!res.ok) {
    throw new Error(`Overpass returned ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { elements: OverpassElement[] };
  return parseCoastlineElements(data.elements);
}

/** Split out for testability — given Overpass elements, produce
 *  stitched chains. */
export function parseCoastlineElements(elements: OverpassElement[]): CoastlineChain[] {
  const nodes = new Map<number, OverpassNode>();
  const ways: OverpassWay[] = [];
  for (const el of elements) {
    if (el.type === "node") nodes.set(el.id, el);
    else if (el.type === "way") ways.push(el);
  }

  const lineStrings: Array<Array<[number, number]>> = ways.map((w) =>
    w.nodes.map((nid) => {
      const n = nodes.get(nid);
      if (!n) throw new Error(`way ${w.id} references missing node ${nid}`);
      return [n.lon, n.lat] as [number, number];
    }),
  );

  return stitchChains(lineStrings);
}

function stitchChains(strings: Array<Array<[number, number]>>): CoastlineChain[] {
  const remaining = strings.map((ls) => [...ls]);
  const chains: CoastlineChain[] = [];
  while (remaining.length > 0) {
    const seed = remaining.shift()!;
    let extended = true;
    while (extended) {
      extended = false;
      for (let i = 0; i < remaining.length; i++) {
        const r = remaining[i]!;
        const last = seed[seed.length - 1]!;
        const first = seed[0]!;
        if (samePoint(last, r[0]!)) {
          seed.push(...r.slice(1));
          remaining.splice(i, 1);
          extended = true;
          break;
        }
        if (samePoint(last, r[r.length - 1]!)) {
          seed.push(...r.slice(0, -1).reverse());
          remaining.splice(i, 1);
          extended = true;
          break;
        }
        if (samePoint(first, r[r.length - 1]!)) {
          seed.unshift(...r.slice(0, -1));
          remaining.splice(i, 1);
          extended = true;
          break;
        }
        if (samePoint(first, r[0]!)) {
          seed.unshift(...r.slice(1).reverse());
          remaining.splice(i, 1);
          extended = true;
          break;
        }
      }
    }
    chains.push({
      points: seed,
      closed: samePoint(seed[0]!, seed[seed.length - 1]!),
    });
  }
  return chains;
}

function samePoint(a: [number, number], b: [number, number]): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

// ─── Bathymetry (GMRT GridServer) ─────────────────────────────────

/** Heights sampled from a bathymetry raster at a regular grid in
 *  bbox-projected metres. Units: metres (positive = land, negative =
 *  below sea level). */
export interface BathymetryGrid {
  heights: Float32Array;
  width: number;
  height: number;
  bbox: Bbox;
  /** Metres per grid cell — set by the caller via gridResM. */
  cellSizeM: number;
}

/**
 * Fetch a bathymetry tile from GMRT's GridServer, parse with
 * geotiff.js, and sample to a regular grid at gridResM-metre
 * spacing. Settled by spike S12 — see spikes/bathymetry/results.md.
 */
export async function loadBathymetry(bbox: Bbox, gridResM = 50): Promise<BathymetryGrid> {
  const [west, south, east, north] = bbox;
  const url = `${GMRT_URL}?north=${north}&south=${south}&east=${east}&west=${west}&format=geotiff&resolution=high`;
  const res = await fetch(url, { headers: { "User-Agent": HTTP_USER_AGENT } });
  if (!res.ok) {
    throw new Error(`GMRT returned ${res.status}: ${await res.text()}`);
  }
  const ab = await res.arrayBuffer();
  const geo = await fromArrayBuffer(ab);
  const image = await geo.getImage();
  const rasterW = image.getWidth();
  const rasterH = image.getHeight();
  const rasters = await image.readRasters();
  const raster = rasters[0] as Float32Array | Uint16Array | number[];

  // Project bbox to ENU metres for grid sizing.
  const heightDeg = north - south;
  const widthDeg = east - west;
  const heightM = heightDeg * 111_320;
  const widthM = widthDeg * 111_320 * Math.cos(((south + heightDeg / 2) * Math.PI) / 180);
  const gridW = Math.max(2, Math.round(widthM / gridResM));
  const gridH = Math.max(2, Math.round(heightM / gridResM));

  const heights = new Float32Array(gridW * gridH);
  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      const sx = Math.min(rasterW - 1, Math.floor((gx / gridW) * rasterW));
      const sy = Math.min(rasterH - 1, Math.floor((gy / gridH) * rasterH));
      const v = Number(raster[sy * rasterW + sx]);
      heights[gy * gridW + gx] = Number.isFinite(v) ? v : 0;
    }
  }

  return { heights, width: gridW, height: gridH, bbox, cellSizeM: gridResM };
}

// ─── Mesh construction ────────────────────────────────────────────

export interface TerrainData {
  coastline: CoastlineChain[];
  bathymetry: BathymetryGrid;
}

/** Async preparation step the service/viewer runs before
 *  buildScene. Keeps compileScenario sync and isolates network /
 *  filesystem effects from the pure compile path. */
export async function prepareTerrain(bbox: Bbox): Promise<TerrainData> {
  const [coastline, bathymetry] = await Promise.all([
    loadCoastline(bbox),
    loadBathymetry(bbox),
  ]);
  return { coastline, bathymetry };
}

/**
 * Build a Three.js Group containing:
 *  - a seabed plane mesh from the bathymetry grid
 *  - line objects for each coastline chain at z=0
 * The group is positioned at ENU origin (the scenario anchor).
 */
export function buildTerrainMesh(terrain: TerrainData, anchor: Anchor): THREE.Group {
  const group = new THREE.Group();
  group.name = "terrain";

  group.add(buildSeabedMesh(terrain.bathymetry, anchor));
  for (const chain of terrain.coastline) {
    group.add(buildCoastlineLine(chain, anchor));
  }
  return group;
}

function buildSeabedMesh(grid: BathymetryGrid, anchor: Anchor): THREE.Mesh {
  // Plane spans the bbox; vertex heights are y values.
  const [west, south, east, north] = grid.bbox;
  // SW corner ENU.
  const sw = geodeticToEnu({ lat: south, lon: west, height: 0 }, anchor);
  const ne = geodeticToEnu({ lat: north, lon: east, height: 0 }, anchor);
  const widthM = ne.e - sw.e;
  const heightM = ne.n - sw.n;

  const geom = new THREE.PlaneGeometry(widthM, heightM, grid.width - 1, grid.height - 1);
  geom.rotateX(-Math.PI / 2); // Y up; plane lies in XZ.

  const positions = geom.attributes["position"]!.array as Float32Array;
  // PlaneGeometry vertex layout for a (W-1)×(H-1) segment plane is
  // (W*H) verts, row-major from top-left, x in [-w/2, +w/2], z in
  // [-h/2, +h/2]. Map to (gx, gy) in the height grid.
  for (let gy = 0; gy < grid.height; gy++) {
    for (let gx = 0; gx < grid.width; gx++) {
      const i = gy * grid.width + gx;
      // Y-up: height is the y value. PlaneGeometry rotated about X
      // means the original plane's y becomes z; vertex y is index 1.
      // After rotateX(-π/2): original (x, y, 0) → (x, 0, -y), so the
      // height attribute index of the vertex is 1 (y).
      positions[i * 3 + 1] = grid.heights[i] ?? 0;
    }
  }
  geom.computeVertexNormals();

  // Centre the mesh on the bbox centre in ENU.
  const centreE = (sw.e + ne.e) / 2;
  const centreN = (sw.n + ne.n) / 2;

  const mat = new THREE.MeshStandardMaterial({
    color: 0x3a4a5a,
    roughness: 0.95,
    flatShading: true,
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.name = "seabed";
  // ENU: x=east, y=up, z=-north (right-handed). Our scene uses y-up
  // and treats +x=east, -z=north (same as Three.js's lookAt
  // convention). Place the seabed centre accordingly.
  mesh.position.set(centreE, 0, -centreN);
  return mesh;
}

function buildCoastlineLine(chain: CoastlineChain, anchor: Anchor): THREE.Line {
  const positions = new Float32Array(chain.points.length * 3);
  for (let i = 0; i < chain.points.length; i++) {
    const [lon, lat] = chain.points[i]!;
    const enu = geodeticToEnu({ lat, lon, height: 0 }, anchor);
    positions[i * 3 + 0] = enu.e;
    positions[i * 3 + 1] = 0.5; // slightly above sea so it doesn't z-fight
    positions[i * 3 + 2] = -enu.n;
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.LineBasicMaterial({ color: 0xeeddaa });
  const line = new THREE.Line(geom, mat);
  line.name = chain.closed ? "coastline-closed" : "coastline-open";
  return line;
}
