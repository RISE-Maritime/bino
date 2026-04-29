// S11 — OSM coastline data source spike.
//
// Fetches `way["natural"="coastline"]` for a Kiel bbox via the
// Overpass API, caches the response, reports counts, attempts a
// minimal assembly into line strings + SVG dump for visual sanity.

import { writeFile, mkdir, readFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const cacheDir = join(here, "cache");
const outDir = join(here, "out");

// Kiel approach bbox — same as docs/bino_design_vision.md's example.
const BBOX = { south: 54.28, west: 10.05, north: 54.38, east: 10.25 };
const BBOX_KEY = `${BBOX.south}_${BBOX.west}_${BBOX.north}_${BBOX.east}`;
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

const OVERPASS_QUERY = `
[out:json][timeout:60];
(
  way["natural"="coastline"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
);
out body;
>;
out skel qt;
`.trim();

await mkdir(cacheDir, { recursive: true });
await mkdir(outDir, { recursive: true });
const cachePath = join(cacheDir, `kiel_${BBOX_KEY}.json`);

async function fetchOrCache() {
  try {
    const s = await stat(cachePath);
    if (s.size > 0) {
      console.log(`[cache hit] ${cachePath} (${s.size} bytes)`);
      return JSON.parse(await readFile(cachePath, "utf8"));
    }
  } catch {
    // missing — fall through
  }
  console.log("[fetching] from Overpass…");
  const t0 = Date.now();
  // Overpass expects form-urlencoded with the QL in a `data=` field,
  // OR plain text with octet-stream content-type. The form-encoded
  // path is the documented one.
  const body = new URLSearchParams({ data: OVERPASS_QUERY });
  // Overpass returns 406 if Accept includes */* implicitly without a
  // matching MIME — set both Content-Type and Accept explicitly.
  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    body,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "User-Agent": "bino-spike/0.4 (S11 osm-coastline)",
    },
  });
  if (!res.ok) {
    throw new Error(`Overpass returned ${res.status}: ${await res.text()}`);
  }
  const text = await res.text();
  const ms = Date.now() - t0;
  console.log(`[fetched] ${text.length} bytes in ${ms} ms`);
  await writeFile(cachePath, text);
  return JSON.parse(text);
}

const data = await fetchOrCache();

const nodes = data.elements.filter((e) => e.type === "node");
const ways = data.elements.filter((e) => e.type === "way");
console.log(`elements: ${data.elements.length} (nodes=${nodes.length}, ways=${ways.length})`);

if (ways.length === 0) {
  console.error("no coastline ways returned — bbox may be entirely inland or entirely sea");
  process.exit(1);
}

const nodeById = new Map(nodes.map((n) => [n.id, n]));

// Build line strings: each way → ordered list of (lon, lat) tuples.
const lineStrings = ways.map((w) => ({
  id: w.id,
  tags: w.tags ?? {},
  points: w.nodes.map((nid) => {
    const n = nodeById.get(nid);
    if (!n) throw new Error(`way ${w.id} references missing node ${nid}`);
    return [n.lon, n.lat];
  }),
}));

const totalSegments = lineStrings.reduce((sum, ls) => sum + ls.points.length - 1, 0);
console.log(`line strings: ${lineStrings.length}, total segments: ${totalSegments}`);

// Stitch ways that share endpoints into longer chains. OSM coastlines
// often arrive split into multiple ways at tile boundaries; stitching
// is a precondition to closed-polygon assembly.
function stitch(strings) {
  const remaining = strings.map((ls) => [...ls.points]);
  const chains = [];
  while (remaining.length) {
    const seed = remaining.shift();
    let extended = true;
    while (extended) {
      extended = false;
      for (let i = 0; i < remaining.length; i++) {
        const r = remaining[i];
        if (samePoint(seed[seed.length - 1], r[0])) {
          seed.push(...r.slice(1));
          remaining.splice(i, 1);
          extended = true;
          break;
        }
        if (samePoint(seed[seed.length - 1], r[r.length - 1])) {
          seed.push(...r.slice(0, -1).reverse());
          remaining.splice(i, 1);
          extended = true;
          break;
        }
        if (samePoint(seed[0], r[r.length - 1])) {
          seed.unshift(...r.slice(0, -1));
          remaining.splice(i, 1);
          extended = true;
          break;
        }
        if (samePoint(seed[0], r[0])) {
          seed.unshift(...r.slice(1).reverse());
          remaining.splice(i, 1);
          extended = true;
          break;
        }
      }
    }
    chains.push(seed);
  }
  return chains;
}

function samePoint(a, b) {
  return a[0] === b[0] && a[1] === b[1];
}

const chains = stitch(lineStrings);
const closedChains = chains.filter((c) => samePoint(c[0], c[c.length - 1]));
const openChains = chains.filter((c) => !samePoint(c[0], c[c.length - 1]));
console.log(
  `chains after stitching: ${chains.length} (closed=${closedChains.length}, open=${openChains.length})`,
);
console.log(
  `total chain points: ${chains.reduce((s, c) => s + c.length, 0)} (longest chain: ${Math.max(...chains.map((c) => c.length))})`,
);

// SVG visualization — project lon/lat to a unit-ish viewbox for the
// bbox so it's easy to eyeball the geometry.
const W = 800;
const H = 800;
const svgX = (lon) => ((lon - BBOX.west) / (BBOX.east - BBOX.west)) * W;
const svgY = (lat) => H - ((lat - BBOX.south) / (BBOX.north - BBOX.south)) * H;

const svgLines = chains
  .map((c, idx) => {
    const d = c
      .map((p, i) => `${i === 0 ? "M" : "L"}${svgX(p[0]).toFixed(2)},${svgY(p[1]).toFixed(2)}`)
      .join(" ");
    const closed = samePoint(c[0], c[c.length - 1]);
    const stroke = closed ? "#3b8" : "#d84";
    return `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="1.2"/>`;
  })
  .join("\n");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="background:#0a1626">
  <rect x="0" y="0" width="${W}" height="${H}" fill="#0a1626"/>
  ${svgLines}
  <text x="8" y="20" fill="#aaa" font-family="monospace" font-size="11">Kiel bbox ${JSON.stringify(BBOX)}  · chains=${chains.length} closed=${closedChains.length} open=${openChains.length}</text>
</svg>`;
await writeFile(join(outDir, "kiel-coastline.svg"), svg);
console.log(`[wrote] ${join(outDir, "kiel-coastline.svg")}`);

// Stats summary written to JSON for the verdict to cite.
const summary = {
  bbox: BBOX,
  fetched_bytes: (await stat(cachePath)).size,
  nodes: nodes.length,
  ways: ways.length,
  segments: totalSegments,
  chains: chains.length,
  closed_chains: closedChains.length,
  open_chains: openChains.length,
  longest_chain_points: Math.max(...chains.map((c) => c.length)),
};
await writeFile(join(outDir, "summary.json"), JSON.stringify(summary, null, 2));
console.log("\nsummary:", summary);
