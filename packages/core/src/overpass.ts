import type { Bbox } from "./dsl.js";
import { overpassUrl, fetchWithRetry } from "./terrain-net.js";

const HTTP_USER_AGENT = "bino/0.5 (overpass loader)";

// ─── Shared Overpass query infrastructure ───────────────────────────

interface OverpassResponse {
  elements: OverpassElement[];
}

export interface OverpassNode {
  type: "node";
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
}

export interface OverpassWay {
  type: "way";
  id: number;
  nodes: number[];
  tags?: Record<string, string>;
}

export type OverpassElement = OverpassNode | OverpassWay;

export async function queryOverpass(
  query: string,
  opts: { endpoint?: string } = {},
): Promise<OverpassElement[]> {
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
    { label: "Overpass" },
  );
  if (!res.ok) {
    throw new Error(`Overpass returned ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as OverpassResponse;
  return data.elements;
}

// ─── Building footprints ────────────────────────────────────────────

export interface BuildingData {
  polygon: Array<[number, number]>; // [lon, lat][]
  heightM: number;
  tags: Record<string, string>;
}

export async function loadBuildings(
  bbox: Bbox,
  opts: { endpoint?: string } = {},
): Promise<BuildingData[]> {
  const [west, south, east, north] = bbox;
  const query = `
[out:json][timeout:60];
(
  way["building"](${south},${west},${north},${east});
);
out body;
>;
out skel qt;
`.trim();

  const elements = await queryOverpass(query, opts);
  return parseBuildingElements(elements);
}

export function parseBuildingElements(elements: OverpassElement[]): BuildingData[] {
  const nodes = new Map<number, OverpassNode>();
  const ways: OverpassWay[] = [];
  for (const el of elements) {
    if (el.type === "node") nodes.set(el.id, el);
    else if (el.type === "way") ways.push(el);
  }

  const buildings: BuildingData[] = [];
  for (const way of ways) {
    if (!way.tags?.["building"]) continue;
    const polygon: Array<[number, number]> = [];
    let valid = true;
    for (const nid of way.nodes) {
      const n = nodes.get(nid);
      if (!n) {
        valid = false;
        break;
      }
      polygon.push([n.lon, n.lat]);
    }
    if (!valid || polygon.length < 3) continue;

    const levels = parseInt(way.tags["building:levels"] ?? "3", 10);
    const heightM = (Number.isFinite(levels) && levels > 0 ? levels : 3) * 3;

    buildings.push({ polygon, heightM, tags: way.tags });
  }

  return buildings;
}

// ─── Seamark data (query only — mesh construction in seamarks.ts) ───

export interface SeamarkData {
  lat: number;
  lon: number;
  type: string;
  tags: Record<string, string>;
}

export async function loadSeamarks(
  bbox: Bbox,
  opts: { endpoint?: string } = {},
): Promise<SeamarkData[]> {
  const [west, south, east, north] = bbox;
  const query = `
[out:json][timeout:60];
(
  node["seamark:type"](${south},${west},${north},${east});
);
out body;
`.trim();

  const elements = await queryOverpass(query, opts);
  return parseSeamarkElements(elements);
}

export function parseSeamarkElements(elements: OverpassElement[]): SeamarkData[] {
  const seamarks: SeamarkData[] = [];
  for (const el of elements) {
    if (el.type !== "node") continue;
    const seamarkType = el.tags?.["seamark:type"];
    if (!seamarkType) continue;
    seamarks.push({
      lat: el.lat,
      lon: el.lon,
      type: seamarkType,
      tags: el.tags ?? {},
    });
  }
  return seamarks;
}
