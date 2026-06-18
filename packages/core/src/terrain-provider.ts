// Build a TerrainProvider from a declarative `terrain.sources` block
// (ADR-005). Network source kinds (overpass/gmrt) use the core loaders;
// file kinds (geotiff/geojson) are read through injected readers so this
// stays environment-agnostic — @bino/node supplies fs-backed readers, a
// browser host could supply fetch-backed ones. Layer/type compatibility and
// the strict-offline assertion are enforced here.

import type { Bbox, TerrainSource, TerrainSources } from "./dsl.js";
import {
  loadCoastline,
  loadBathymetry,
  parseGeoTiffBathymetry,
  flatBathymetry,
  type TerrainProvider,
  type CoastlineChain,
  type BathymetryGrid,
} from "./terrain.js";
import { loadBuildings, loadSeamarks, type BuildingData, type SeamarkData } from "./overpass.js";
import { parseGeoJsonCoastline, parseGeoJsonBuildings, parseGeoJsonSeamarks } from "./geojson.js";

/** Host-supplied file readers (paths already resolved by the host). */
export interface TerrainSourceReaders {
  readBinary(path: string): Promise<ArrayBuffer>;
  readText(path: string): Promise<string>;
}

export interface BuildProviderOptions {
  /** Assert no layer touches the network; throws on any network/absent layer. */
  offline?: boolean;
  /** Whether buildings/seamarks will actually be fetched (DSL flags) — scopes
   *  the offline assertion to layers that will load. Default true. */
  buildings?: boolean;
  seamarks?: boolean;
}

type Layer = "coastline" | "bathymetry" | "buildings" | "seamarks";

const ALLOWED: Record<Layer, ReadonlySet<string>> = {
  coastline: new Set(["overpass", "geojson", "none"]),
  bathymetry: new Set(["gmrt", "geotiff", "none"]),
  buildings: new Set(["overpass", "geojson", "none"]),
  seamarks: new Set(["overpass", "geojson", "none"]),
};
const NETWORK = new Set(["overpass", "gmrt"]);

const ep = (s: { endpoint?: string | undefined }): { endpoint?: string } =>
  s.endpoint ? { endpoint: s.endpoint } : {};

function check(layer: Layer, spec: TerrainSource): void {
  if (!ALLOWED[layer].has(spec.type)) {
    throw new Error(
      `terrain source '${spec.type}' is not valid for layer '${layer}' ` +
        `(allowed: ${[...ALLOWED[layer]].join(", ")})`,
    );
  }
}

async function readJson(readers: TerrainSourceReaders, path: string): Promise<unknown> {
  try {
    return JSON.parse(await readers.readText(path));
  } catch (e) {
    throw new Error(`failed to read GeoJSON '${path}': ${e instanceof Error ? e.message : e}`, {
      cause: e,
    });
  }
}

/**
 * Compose a TerrainProvider from a `terrain.sources` block. Only layers named
 * in `sources` get a method; unnamed layers stay undefined so prepareTerrain
 * falls back to the default OSM/GMRT source. With `offline`, every layer that
 * would load must be a local (`geotiff`/`geojson`) or `none` source, else this
 * throws before any fetch happens.
 */
export function terrainProviderFromSources(
  sources: TerrainSources | undefined,
  readers: TerrainSourceReaders,
  opts: BuildProviderOptions = {},
): TerrainProvider {
  if (opts.offline) {
    const required: Layer[] = ["coastline", "bathymetry"];
    if (opts.buildings !== false) required.push("buildings");
    if (opts.seamarks !== false) required.push("seamarks");
    for (const layer of required) {
      const spec = sources?.[layer];
      if (!spec) {
        throw new Error(
          `offline terrain: layer '${layer}' has no source — set ` +
            `terrain.sources.${layer} to a geotiff/geojson/none source`,
        );
      }
      if (NETWORK.has(spec.type)) {
        throw new Error(`offline terrain: layer '${layer}' uses network source '${spec.type}'`);
      }
    }
  }

  const provider: TerrainProvider = {};
  if (sources?.coastline) {
    const s = sources.coastline;
    check("coastline", s);
    provider.coastline = coastline(s, readers);
  }
  if (sources?.bathymetry) {
    const s = sources.bathymetry;
    check("bathymetry", s);
    provider.bathymetry = bathymetry(s, readers);
  }
  if (sources?.buildings) {
    const s = sources.buildings;
    check("buildings", s);
    provider.buildings = buildings(s, readers);
  }
  if (sources?.seamarks) {
    const s = sources.seamarks;
    check("seamarks", s);
    provider.seamarks = seamarks(s, readers);
  }
  return provider;
}

function coastline(
  s: TerrainSource,
  readers: TerrainSourceReaders,
): (bbox: Bbox) => Promise<CoastlineChain[]> {
  if (s.type === "overpass") return (bbox) => loadCoastline(bbox, ep(s));
  if (s.type === "geojson")
    return async () => parseGeoJsonCoastline(await readJson(readers, s.path));
  return async () => [];
}

function bathymetry(
  s: TerrainSource,
  readers: TerrainSourceReaders,
): (bbox: Bbox) => Promise<BathymetryGrid> {
  if (s.type === "gmrt") return (bbox) => loadBathymetry(bbox, ep(s));
  if (s.type === "geotiff")
    return async (bbox) => parseGeoTiffBathymetry(await readers.readBinary(s.path), bbox);
  return async (bbox) => flatBathymetry(bbox);
}

function buildings(
  s: TerrainSource,
  readers: TerrainSourceReaders,
): (bbox: Bbox) => Promise<BuildingData[]> {
  if (s.type === "overpass") return (bbox) => loadBuildings(bbox, ep(s));
  if (s.type === "geojson")
    return async () => parseGeoJsonBuildings(await readJson(readers, s.path));
  return async () => [];
}

function seamarks(
  s: TerrainSource,
  readers: TerrainSourceReaders,
): (bbox: Bbox) => Promise<SeamarkData[]> {
  if (s.type === "overpass") return (bbox) => loadSeamarks(bbox, ep(s));
  if (s.type === "geojson")
    return async () => parseGeoJsonSeamarks(await readJson(readers, s.path));
  return async () => [];
}
