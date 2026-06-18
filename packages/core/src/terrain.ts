import * as THREE from "three";
import { fromArrayBuffer } from "geotiff";
import type { Anchor, Bbox } from "./dsl.js";
import { geodeticToEnu } from "./geo.js";
import { buildLandmaskMesh } from "./landmask.js";
import { buildBuildingsMesh } from "./buildings.js";
import { buildSeamarksMesh } from "./seamarks.js";
import { loadBuildings, loadSeamarks, type BuildingData, type SeamarkData } from "./overpass.js";
import { overpassUrl, gmrtUrl, fetchWithRetry } from "./terrain-net.js";

const HTTP_USER_AGENT = "bino/0.4 (terrain loader)";

const errMsg = (e: unknown): string => (e instanceof Error ? e.message : String(e));

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

  const res = await fetchWithRetry(
    overpassUrl(),
    {
      method: "POST",
      body: new URLSearchParams({ data: query }),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        "User-Agent": HTTP_USER_AGENT,
      },
    },
    { label: "Overpass coastline" },
  );
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
/** Grid dimensions for a bbox sampled at gridResM-metre spacing, projecting
 *  degrees to ENU metres (latitude-aware in longitude). Shared by the GMRT
 *  sampler and the flat placeholder so both agree on cell layout. */
function gridDims(bbox: Bbox, gridResM: number): { gridW: number; gridH: number } {
  const [west, south, east, north] = bbox;
  const heightDeg = north - south;
  const widthDeg = east - west;
  const heightM = heightDeg * 111_320;
  const widthM = widthDeg * 111_320 * Math.cos(((south + heightDeg / 2) * Math.PI) / 180);
  return {
    gridW: Math.max(2, Math.round(widthM / gridResM)),
    gridH: Math.max(2, Math.round(heightM / gridResM)),
  };
}

/** A flat seabed at a uniform depth, covering the bbox. Used as the
 *  placeholder when bathymetry can't be fetched (ADR-005 graceful
 *  degradation), so a scenario renders open water instead of crashing. */
export function flatBathymetry(bbox: Bbox, depthM = 10, gridResM = 50): BathymetryGrid {
  const { gridW, gridH } = gridDims(bbox, gridResM);
  // Stored as height: positive = land, negative = below sea level.
  const heights = new Float32Array(gridW * gridH).fill(-Math.abs(depthM));
  return { heights, width: gridW, height: gridH, bbox, cellSizeM: gridResM };
}

export async function loadBathymetry(bbox: Bbox, gridResM = 50): Promise<BathymetryGrid> {
  const [west, south, east, north] = bbox;
  const url = `${gmrtUrl()}?north=${north}&south=${south}&east=${east}&west=${west}&format=geotiff&resolution=high`;
  const res = await fetchWithRetry(
    url,
    { headers: { "User-Agent": HTTP_USER_AGENT } },
    { label: "GMRT bathymetry" },
  );
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

  const { gridW, gridH } = gridDims(bbox, gridResM);
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
  buildings?: BuildingData[];
  seamarks?: SeamarkData[];
}

/** A store for prepared terrain, keyed by bbox+options. Lets a host
 *  fetch each location once and reuse it offline. The filesystem
 *  implementation lives in @bino/node; the browser can supply an
 *  IndexedDB-backed one (or none). Core stays environment-agnostic. */
export interface TerrainCache {
  get(key: string): Promise<TerrainData | undefined>;
  set(key: string, data: TerrainData): Promise<void>;
}

/** Stable cache key for a bbox + fetch options. Bbox is rounded to
 *  ~1 m so trivially-different floats still hit the same entry. */
export function terrainCacheKey(bbox: Bbox, opts: PrepareTerrainOptions = {}): string {
  const coords = bbox.map((n) => n.toFixed(5)).join("_");
  const buildings = opts.buildings !== false ? 1 : 0;
  const seamarks = opts.seamarks !== false ? 1 : 0;
  return `terrain_${coords}_b${buildings}_s${seamarks}`;
}

/** Async preparation step the service/viewer runs before
 *  buildScene. Keeps compileScenario sync and isolates network /
 *  filesystem effects from the pure compile path. */
export interface PrepareTerrainOptions {
  buildings?: boolean;
  seamarks?: boolean;
  /** When set, prepared terrain is read from / written to this cache,
   *  keyed by bbox+options — so a location is fetched only once. */
  cache?: TerrainCache;
}

export async function prepareTerrain(
  bbox: Bbox,
  opts: PrepareTerrainOptions = {},
): Promise<TerrainData> {
  const { cache } = opts;
  const key = terrainCacheKey(bbox, opts);
  if (cache) {
    const hit = await cache.get(key).catch((e) => {
      console.warn("terrain cache read failed:", e);
      return undefined;
    });
    if (hit) return hit;
  }

  const fetchBuildings = opts.buildings !== false;
  const fetchSeamarks = opts.seamarks !== false;
  // Every layer degrades gracefully (ADR-005): a failed fetch logs a warning
  // and yields a placeholder rather than rejecting, so "any location" never
  // hard-crashes on a flaky public API. Coastline/bathymetry are structural,
  // so their failure is surfaced more loudly than the cosmetic layers'.
  const [coastline, bathymetry, buildings, seamarks] = await Promise.all([
    loadCoastline(bbox).catch((e) => {
      console.warn(`[bino] coastline fetch failed (${errMsg(e)}); rendering without coastline`);
      return [] as CoastlineChain[];
    }),
    loadBathymetry(bbox).catch((e) => {
      console.warn(
        `[bino] bathymetry fetch failed (${errMsg(e)}); using a flat placeholder seabed`,
      );
      return flatBathymetry(bbox);
    }),
    fetchBuildings
      ? loadBuildings(bbox).catch((e) => {
          console.warn(`[bino] buildings fetch failed (${errMsg(e)}); rendering without buildings`);
          return [] as BuildingData[];
        })
      : ([] as BuildingData[]),
    fetchSeamarks
      ? loadSeamarks(bbox).catch((e) => {
          console.warn(`[bino] seamarks fetch failed (${errMsg(e)}); rendering without seamarks`);
          return [] as SeamarkData[];
        })
      : ([] as SeamarkData[]),
  ]);

  // Surface silent coverage cliffs: a layer that fetched fine but came back
  // empty usually means the region is poorly mapped, not that there's nothing.
  if (coastline.length === 0) {
    console.info(`[bino] no coastline in bbox ${JSON.stringify(bbox)} (open water or unmapped)`);
  }
  if (fetchBuildings && buildings.length === 0) {
    console.info(`[bino] no buildings in bbox ${JSON.stringify(bbox)} (none mapped)`);
  }
  if (fetchSeamarks && seamarks.length === 0) {
    console.info(`[bino] no seamarks in bbox ${JSON.stringify(bbox)} (none mapped)`);
  }

  const data: TerrainData = { coastline, bathymetry, buildings, seamarks };
  if (cache) {
    await cache.set(key, data).catch((e) => console.warn("terrain cache write failed:", e));
  }
  return data;
}

/** Build terrain group: seabed mesh + landmask + buildings + seamarks. */
export function buildTerrainMesh(terrain: TerrainData, anchor: Anchor): THREE.Group {
  const group = new THREE.Group();
  group.name = "terrain";
  group.add(buildSeabedMesh(terrain.bathymetry, anchor));
  if (terrain.coastline.length > 0) {
    const landmask = buildLandmaskMesh(terrain.coastline, terrain.bathymetry.bbox, anchor);
    if (landmask.children.length > 0) group.add(landmask);
  }
  if (terrain.buildings && terrain.buildings.length > 0) {
    const buildings = buildBuildingsMesh(terrain.buildings, anchor);
    if (buildings.children.length > 0) group.add(buildings);
  }
  if (terrain.seamarks && terrain.seamarks.length > 0) {
    const seamarks = buildSeamarksMesh(terrain.seamarks, anchor);
    if (seamarks.children.length > 0) group.add(seamarks);
  }
  return group;
}

function buildSeabedMesh(grid: BathymetryGrid, anchor: Anchor): THREE.Mesh {
  const [west, south, east, north] = grid.bbox;
  const sw = geodeticToEnu({ lat: south, lon: west, height: 0 }, anchor);
  const ne = geodeticToEnu({ lat: north, lon: east, height: 0 }, anchor);
  const widthM = ne.e - sw.e;
  const heightM = ne.n - sw.n;

  const geom = new THREE.PlaneGeometry(widthM, heightM, grid.width - 1, grid.height - 1);
  geom.rotateX(-Math.PI / 2);

  const positions = geom.attributes["position"]!.array as Float32Array;
  const colors = new Float32Array(grid.width * grid.height * 3);
  for (let gy = 0; gy < grid.height; gy++) {
    for (let gx = 0; gx < grid.width; gx++) {
      const i = gy * grid.width + gx;
      const h = grid.heights[i] ?? 0;
      positions[i * 3 + 1] = h;
      const [r, g, b] = depthToColor(h);
      colors[i * 3 + 0] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }
  }
  geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geom.computeVertexNormals();

  const centreE = (sw.e + ne.e) / 2;
  const centreN = (sw.n + ne.n) / 2;

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.95,
    flatShading: true,
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.name = "seabed";
  mesh.position.set(centreE, 0, -centreN);
  return mesh;
}

function depthToColor(h: number): [number, number, number] {
  if (h >= 0) {
    const t = Math.min(1, h / 60);
    return [0.85 - 0.3 * t, 0.78 - 0.1 * t, 0.55 - 0.2 * t];
  }
  const t = Math.min(1, -h / 20);
  return [0.04 + 0.02 * (1 - t), 0.1 + 0.02 * (1 - t), 0.23 + 0.05 * (1 - t)];
}
