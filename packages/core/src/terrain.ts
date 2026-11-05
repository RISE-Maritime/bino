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
export async function loadCoastline(
  bbox: Bbox,
  opts: { endpoint?: string } = {},
): Promise<CoastlineChain[]> {
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
    opts.endpoint ?? overpassUrl(),
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

/** Nearest-neighbour resample of an elevation raster onto the bbox grid.
 *  Pure (no I/O) so it's unit-testable and shared by the GMRT fetch and the
 *  local-GeoTIFF source. Units: metres, positive = land. */
export function sampleRasterToGrid(
  raster: Float32Array | Uint16Array | Int16Array | number[],
  rasterW: number,
  rasterH: number,
  bbox: Bbox,
  gridResM = 50,
): BathymetryGrid {
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

/** Parse a GeoTIFF elevation raster (e.g. a GMRT tile or a local file) into a
 *  bathymetry grid. Pure given the bytes — used by both the network and
 *  local-file (ADR-005) bathymetry sources. */
export async function parseGeoTiffBathymetry(
  bytes: ArrayBuffer,
  bbox: Bbox,
  gridResM = 50,
): Promise<BathymetryGrid> {
  const geo = await fromArrayBuffer(bytes);
  const image = await geo.getImage();
  const rasters = await image.readRasters();
  const raster = rasters[0] as Float32Array | Uint16Array | Int16Array | number[];
  return sampleRasterToGrid(raster, image.getWidth(), image.getHeight(), bbox, gridResM);
}

/**
 * Fetch a bathymetry tile from GMRT's GridServer, parse with geotiff.js, and
 * sample to a regular grid at gridResM-metre spacing. Settled by spike S12 —
 * see spikes/bathymetry/results.md. `endpoint` overrides the GMRT host.
 */
export async function loadBathymetry(
  bbox: Bbox,
  opts: { gridResM?: number; endpoint?: string } = {},
): Promise<BathymetryGrid> {
  const gridResM = opts.gridResM ?? 50;
  const [west, south, east, north] = bbox;
  const base = opts.endpoint ?? gmrtUrl();
  const url = `${base}?north=${north}&south=${south}&east=${east}&west=${west}&format=geotiff&resolution=high`;
  // A 200 can still carry a body that is not a whole GeoTIFF — a truncated
  // download is the case that was seen, and geotiff.js then fails with an
  // opaque "Offset is outside the bounds of the DataView". `fetchWithRetry`
  // only retries statuses, so a bad body is checked here and refetched.
  let problem = "";
  for (let attempt = 1; attempt <= GEOTIFF_ATTEMPTS; attempt++) {
    const res = await fetchWithRetry(
      url,
      { headers: { "User-Agent": HTTP_USER_AGENT } },
      { label: "GMRT bathymetry" },
    );
    if (!res.ok) {
      throw new Error(`GMRT returned ${res.status}: ${await res.text()}`);
    }
    const bytes = await res.arrayBuffer();
    problem = geoTiffProblem(bytes, res.headers.get("content-length"));
    if (!problem) {
      // Without a Content-Length a truncated body still starts like a TIFF,
      // so a read that fails is a bad body too, and worth another fetch.
      try {
        return await parseGeoTiffBathymetry(bytes, bbox, gridResM);
      } catch (e) {
        problem = `GMRT returned ${bytes.byteLength} bytes that do not read as a GeoTIFF (${errMsg(e)})`;
      }
    }
    if (attempt < GEOTIFF_ATTEMPTS) {
      console.warn(`[bino] GMRT bathymetry attempt ${attempt}: ${problem}; refetching`);
    }
  }
  throw new Error(problem);
}

/** Layers whose fallback is wrong to keep: what a hull grounds on, and where. */
const STRUCTURAL_LAYERS = new Set(["coastline", "bathymetry"]);

/** How many times a GMRT body that is not a whole GeoTIFF is fetched. */
const GEOTIFF_ATTEMPTS = 3;

/** Why `bytes` is not a complete GeoTIFF, or "" if it looks like one: the TIFF
 *  magic number, and the declared length when the server sent one. Checked
 *  before geotiff.js sees the bytes, so the error says what was wrong. */
export function geoTiffProblem(bytes: ArrayBuffer, contentLength: string | null): string {
  const n = bytes.byteLength;
  const declared = contentLength === null ? NaN : Number(contentLength);
  if (Number.isFinite(declared) && declared !== n) {
    return `GMRT returned ${n} bytes, not a complete GeoTIFF (${declared} declared)`;
  }
  const head = new Uint8Array(bytes, 0, Math.min(4, n));
  const tiff =
    n >= 4 &&
    ((head[0] === 0x49 && head[1] === 0x49 && head[2] === 0x2a && head[3] === 0x00) ||
      (head[0] === 0x4d && head[1] === 0x4d && head[2] === 0x00 && head[3] === 0x2a));
  return tiff ? "" : `GMRT returned ${n} bytes, not a complete GeoTIFF (no TIFF header)`;
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

/** Deterministic, filename-safe signature of a source configuration (ADR-005).
 *  Folded into the cache key so a changed `terrain.sources` can't read a stale
 *  entry. FNV-1a over the JSON form — no crypto, so it runs in the browser too,
 *  and the CLI + prefetch script agree on the same key. */
export function terrainSourcesSignature(sources: unknown): string {
  const str = JSON.stringify(sources ?? null);
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** Stable cache key for a bbox + fetch options. Bbox is rounded to
 *  ~1 m so trivially-different floats still hit the same entry. */
export function terrainCacheKey(bbox: Bbox, opts: PrepareTerrainOptions = {}): string {
  const coords = bbox.map((n) => n.toFixed(5)).join("_");
  const buildings = opts.buildings !== false ? 1 : 0;
  const seamarks = opts.seamarks !== false ? 1 : 0;
  // Default scenarios keep their original key (backward-compatible); a custom
  // source config or non-default grid spacing adds a suffix so a changed
  // config can't read a stale entry.
  const sig = opts.sourcesSig ? `_${opts.sourcesSig}` : "";
  const grid = opts.gridResM && opts.gridResM !== 50 ? `_g${opts.gridResM}` : "";
  return `terrain_${coords}_b${buildings}_s${seamarks}${grid}${sig}`;
}

/** A source for each terrain layer (ADR-005). Each method is optional; an
 *  unset layer falls back to {@link defaultTerrainProvider} (OSM/GMRT). Build
 *  one for custom/local/offline data via `terrainProviderFromSources`. */
export interface TerrainProvider {
  coastline?: (bbox: Bbox) => Promise<CoastlineChain[]>;
  bathymetry?: (bbox: Bbox) => Promise<BathymetryGrid>;
  buildings?: (bbox: Bbox) => Promise<BuildingData[]>;
  seamarks?: (bbox: Bbox) => Promise<SeamarkData[]>;
}

/** The public OSM/GMRT sources — the fallback for any layer a custom provider
 *  leaves unset, and the whole provider when none is supplied. */
export const defaultTerrainProvider: Required<TerrainProvider> = {
  coastline: (bbox) => loadCoastline(bbox),
  bathymetry: (bbox) => loadBathymetry(bbox),
  buildings: (bbox) => loadBuildings(bbox),
  seamarks: (bbox) => loadSeamarks(bbox),
};

/** Async preparation step the service/viewer runs before
 *  buildScene. Keeps compileScenario sync and isolates network /
 *  filesystem effects from the pure compile path. */
export interface PrepareTerrainOptions {
  buildings?: boolean;
  seamarks?: boolean;
  /** When set, prepared terrain is read from / written to this cache,
   *  keyed by bbox+options — so a location is fetched only once. */
  cache?: TerrainCache;
  /** Per-layer source provider (ADR-005). Unset layers fall back to the
   *  default OSM/GMRT provider. */
  provider?: TerrainProvider;
  /** Opaque signature of the source configuration, folded into the cache key
   *  so switching sources for the same bbox doesn't return stale data. */
  sourcesSig?: string;
  /** Bathymetry grid spacing in metres (default 50). Applies to the default
   *  GMRT source and the flat placeholder; custom providers carry their own. */
  gridResM?: number;
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
  // Resolve each layer from the supplied provider, falling back per-layer to
  // the default OSM/GMRT source (ADR-005).
  const p = opts.provider;
  const gridResM = opts.gridResM ?? 50;
  const coastlineFn = p?.coastline ?? defaultTerrainProvider.coastline;
  const bathymetryFn = p?.bathymetry ?? ((b: Bbox) => loadBathymetry(b, { gridResM }));
  const buildingsFn = p?.buildings ?? defaultTerrainProvider.buildings;
  const seamarksFn = p?.seamarks ?? defaultTerrainProvider.seamarks;
  // Every layer degrades gracefully (ADR-005): a failed fetch logs a warning
  // and yields a placeholder rather than rejecting, so "any location" never
  // hard-crashes on a flaky source. Coastline/bathymetry are structural, so
  // their failure is surfaced more loudly than the cosmetic layers'.
  // Which layers fell back. A placeholder is right for this run and wrong to
  // keep: cached, one bad fetch became a permanently flat seabed for its bbox
  // (SLIPWAY#63), because a hit never asks the source again.
  const fellBack: string[] = [];
  const [coastline, bathymetry, buildings, seamarks] = await Promise.all([
    coastlineFn(bbox).catch((e) => {
      fellBack.push("coastline");
      console.warn(`[bino] coastline source failed (${errMsg(e)}); rendering without coastline`);
      return [] as CoastlineChain[];
    }),
    bathymetryFn(bbox).catch((e) => {
      fellBack.push("bathymetry");
      console.warn(
        `[bino] bathymetry source failed (${errMsg(e)}); using a flat placeholder seabed`,
      );
      return flatBathymetry(bbox, 10, gridResM);
    }),
    fetchBuildings
      ? buildingsFn(bbox).catch((e) => {
          fellBack.push("buildings");
          console.warn(
            `[bino] buildings source failed (${errMsg(e)}); rendering without buildings`,
          );
          return [] as BuildingData[];
        })
      : ([] as BuildingData[]),
    fetchSeamarks
      ? seamarksFn(bbox).catch((e) => {
          fellBack.push("seamarks");
          console.warn(`[bino] seamarks source failed (${errMsg(e)}); rendering without seamarks`);
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
  // A structural fallback is never cached: a flat seabed or a missing shore is
  // wrong for anything grounding-related, and must be fetched again. A
  // cosmetic one is — the public Overpass server is often busy, and refusing
  // to cache over a missing seamark would refetch every layer on every start.
  const structural = fellBack.filter((l) => STRUCTURAL_LAYERS.has(l)).sort();
  const cosmetic = fellBack.filter((l) => !STRUCTURAL_LAYERS.has(l)).sort();
  if (cache && structural.length > 0) {
    console.warn(
      `[bino] not caching terrain: ${structural.join(", ")} fell back; ` +
        "the next run fetches them again",
    );
  } else if (cache) {
    if (cosmetic.length > 0) {
      console.warn(
        `[bino] caching terrain without ${cosmetic.join(", ")} (their source failed); ` +
          `delete the cache entry ${key} to fetch them again`,
      );
    }
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
