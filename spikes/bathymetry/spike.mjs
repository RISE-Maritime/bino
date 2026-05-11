// S12 — Bathymetry data source spike.
//
// Fetches a Kiel-area bathymetry GeoTIFF from GMRT (gmrt.org)'s
// public GridServer, parses with geotiff.js, samples to a grid,
// reports stats, and dumps a PPM heightmap for visual sanity.

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fromArrayBuffer } from "geotiff";

const here = dirname(fileURLToPath(import.meta.url));
const cacheDir = join(here, "cache");
const outDir = join(here, "out");
await mkdir(cacheDir, { recursive: true });
await mkdir(outDir, { recursive: true });

const BBOX = { south: 54.28, west: 10.05, north: 54.38, east: 10.25 };
const cachePath = join(cacheDir, "kiel-gmrt.tif");

async function fetchOrCache() {
  try {
    const s = await stat(cachePath);
    if (s.size > 0) {
      console.log(`[cache hit] ${cachePath} (${s.size} bytes)`);
      return await readFile(cachePath);
    }
  } catch {
    // missing
  }
  console.log("[fetching] from GMRT GridServer...");
  const url = `https://www.gmrt.org/services/GridServer?north=${BBOX.north}&south=${BBOX.south}&east=${BBOX.east}&west=${BBOX.west}&format=geotiff&resolution=high`;
  const t0 = Date.now();
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GMRT returned ${res.status}: ${await res.text()}`);
  const buf = Buffer.from(await res.arrayBuffer());
  console.log(`[fetched] ${buf.length} bytes in ${Date.now() - t0} ms`);
  await writeFile(cachePath, buf);
  return buf;
}

const tiff = await fetchOrCache();
const ab = tiff.buffer.slice(tiff.byteOffset, tiff.byteOffset + tiff.byteLength);

const t0 = Date.now();
const geo = await fromArrayBuffer(ab);
const image = await geo.getImage();
console.log(`[parsed] in ${Date.now() - t0} ms`);

const width = image.getWidth();
const height = image.getHeight();
const bbox = image.getBoundingBox();
const samplesPerPixel = image.getSamplesPerPixel();
const fileDirectory = image.getFileDirectory();

console.log(`dimensions: ${width}x${height} (${samplesPerPixel} samples/px)`);
console.log(`bbox (geotiff): ${bbox.join(", ")} (xmin, ymin, xmax, ymax)`);
console.log(`bps: ${fileDirectory.BitsPerSample}, format: ${fileDirectory.SampleFormat}`);

const rasters = await image.readRasters();
const depths = rasters[0]; // single-channel — first raster

// Stats: min/max/mean ignoring NaN/NoData.
let minD = Infinity;
let maxD = -Infinity;
let sumD = 0;
let nValid = 0;
let nNoData = 0;
for (let i = 0; i < depths.length; i++) {
  const v = depths[i];
  if (Number.isNaN(v) || v === fileDirectory.GDAL_NODATA) {
    nNoData += 1;
    continue;
  }
  if (v < minD) minD = v;
  if (v > maxD) maxD = v;
  sumD += v;
  nValid += 1;
}
const meanD = sumD / nValid;

console.log(`depth range: [${minD.toFixed(1)}, ${maxD.toFixed(1)}] m  mean=${meanD.toFixed(2)} m`);
console.log(`valid pixels: ${nValid} / ${depths.length}  (NoData: ${nNoData})`);

// Visual sanity — a PPM dump of the heightmap, normalized.
const range = maxD - minD;
const ppmHeader = `P6\n${width} ${height}\n255\n`;
const ppmPixels = Buffer.alloc(width * height * 3);
for (let i = 0; i < depths.length; i++) {
  let v = depths[i];
  let r;
  let g;
  let b;
  if (Number.isNaN(v) || v === fileDirectory.GDAL_NODATA) {
    // NoData — magenta
    r = 200;
    g = 0;
    b = 200;
  } else {
    const t = (v - minD) / range; // 0 = deepest, 1 = highest
    if (v >= 0) {
      // land — brown ramp
      r = Math.floor(120 + t * 100);
      g = Math.floor(80 + t * 60);
      b = Math.floor(40 + t * 40);
    } else {
      // sea — blue ramp; deeper = darker
      const seaT = (v - minD) / -minD;
      r = Math.floor(20 + seaT * 30);
      g = Math.floor(50 + seaT * 80);
      b = Math.floor(120 + seaT * 100);
    }
  }
  ppmPixels[i * 3 + 0] = r;
  ppmPixels[i * 3 + 1] = g;
  ppmPixels[i * 3 + 2] = b;
}
const ppmPath = join(outDir, "kiel-bathymetry.ppm");
await writeFile(ppmPath, Buffer.concat([Buffer.from(ppmHeader), ppmPixels]));
console.log(`[wrote] ${ppmPath}  (open in any image viewer)`);

// Sample to a 50m grid and report what that looks like.
// Approximate metres per degree at lat 54: 111_320 m/deg lat,
// ~65_400 m/deg lon (cos(54°) × 111320).
const dLat = BBOX.north - BBOX.south;
const dLon = BBOX.east - BBOX.west;
const heightM = dLat * 111_320;
const widthM = dLon * 111_320 * Math.cos(((BBOX.south + dLat / 2) * Math.PI) / 180);
const tileResLat = heightM / height;
const tileResLon = widthM / width;
console.log(
  `tile resolution: ~${tileResLat.toFixed(1)} m/px lat, ~${tileResLon.toFixed(1)} m/px lon`,
);

const targetGridM = 50;
const gridH = Math.round(heightM / targetGridM);
const gridW = Math.round(widthM / targetGridM);
console.log(`at 50 m grid: ${gridW}x${gridH} = ${(gridW * gridH).toLocaleString()} vertices`);

const summary = {
  bbox: BBOX,
  source: "gmrt.org GridServer",
  fetched_bytes: tiff.length,
  raster: { width, height, samplesPerPixel },
  bbox_geotiff: bbox,
  depth_m: { min: minD, max: maxD, mean: meanD },
  valid_pixels: nValid,
  nodata_pixels: nNoData,
  resolution_m_per_pixel: { lat: tileResLat, lon: tileResLon },
  grid_at_50m: { width: gridW, height: gridH, vertices: gridW * gridH },
};
await writeFile(join(outDir, "summary.json"), JSON.stringify(summary, null, 2));
console.log("\nsummary:", summary);
