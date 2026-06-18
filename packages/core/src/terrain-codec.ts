// Binary serialization for TerrainData (ADR-005). The JSON cache stored the
// bulk numeric data — bathymetry heights and every coastline/building vertex —
// as text number[], which is large (a dense-urban bundle ran ~21 MB) and slow
// to JSON.parse. This codec keeps the small, irregular bits (dimensions, tags,
// sparse seamarks) in a JSON manifest and packs the bulk into typed-array
// sections: Float32 heights, Float64 lon/lat coords (full OSM precision).
//
// Layout (little-endian):
//   "BTR1" (4 bytes magic) | uint32 manifestLen | manifest JSON (utf8)
//   | heights  Float32[width*height]
//   | coast    Float64[2 * sum(chain.n)]      (lon,lat interleaved)
//   | building Float64[2 * sum(building.n)]
// Sections are copied out on decode, so view alignment is never an issue.

import type { Bbox } from "./dsl.js";
import type { TerrainData, CoastlineChain, BathymetryGrid } from "./terrain.js";
import type { BuildingData, SeamarkData } from "./overpass.js";

const MAGIC = "BTR1";
const HEADER_LEN = 8; // magic(4) + manifestLen(4)
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

interface Manifest {
  v: 1;
  bathymetry: { width: number; height: number; bbox: Bbox; cellSizeM: number };
  coastline: Array<{ closed: boolean; n: number }>;
  buildings: Array<{ heightM: number; tags: Record<string, string>; n: number }>;
  seamarks: SeamarkData[];
}

function flattenCoords(
  rings: ReadonlyArray<ReadonlyArray<[number, number]>>,
  total: number,
): Float64Array {
  const out = new Float64Array(total * 2);
  let i = 0;
  for (const ring of rings) {
    for (const [lon, lat] of ring) {
      out[i++] = lon;
      out[i++] = lat;
    }
  }
  return out;
}

/** Serialize TerrainData to the compact binary container. */
export function encodeTerrain(data: TerrainData): Uint8Array {
  const buildings = data.buildings ?? [];
  const coastTotal = data.coastline.reduce((s, c) => s + c.points.length, 0);
  const bldTotal = buildings.reduce((s, b) => s + b.polygon.length, 0);

  const heights = data.bathymetry.heights;
  const coast = flattenCoords(
    data.coastline.map((c) => c.points),
    coastTotal,
  );
  const bld = flattenCoords(
    buildings.map((b) => b.polygon),
    bldTotal,
  );

  const manifest: Manifest = {
    v: 1,
    bathymetry: {
      width: data.bathymetry.width,
      height: data.bathymetry.height,
      bbox: data.bathymetry.bbox,
      cellSizeM: data.bathymetry.cellSizeM,
    },
    coastline: data.coastline.map((c) => ({ closed: c.closed, n: c.points.length })),
    buildings: buildings.map((b) => ({ heightM: b.heightM, tags: b.tags, n: b.polygon.length })),
    seamarks: data.seamarks ?? [],
  };
  const manifestBytes = textEncoder.encode(JSON.stringify(manifest));

  const sections = [
    new Uint8Array(heights.buffer, heights.byteOffset, heights.byteLength),
    new Uint8Array(coast.buffer, coast.byteOffset, coast.byteLength),
    new Uint8Array(bld.buffer, bld.byteOffset, bld.byteLength),
  ];
  const total = HEADER_LEN + manifestBytes.length + sections.reduce((s, sec) => s + sec.length, 0);

  const out = new Uint8Array(total);
  out.set(textEncoder.encode(MAGIC), 0);
  new DataView(out.buffer).setUint32(4, manifestBytes.length, true);
  let off = HEADER_LEN;
  out.set(manifestBytes, off);
  off += manifestBytes.length;
  for (const sec of sections) {
    out.set(sec, off);
    off += sec.length;
  }
  return out;
}

/** Copy `len` bytes at `off` into a fresh, alignment-safe buffer. */
function slice(bytes: Uint8Array, off: number, len: number): ArrayBufferLike {
  const start = bytes.byteOffset + off;
  return bytes.buffer.slice(start, start + len);
}

/** Parse the binary container back into TerrainData. Throws on a bad header. */
export function decodeTerrain(bytes: Uint8Array): TerrainData {
  if (bytes.length < HEADER_LEN || textDecoder.decode(bytes.subarray(0, 4)) !== MAGIC) {
    throw new Error("terrain-codec: not a BTR1 binary terrain blob");
  }
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const manifestLen = dv.getUint32(4, true);
  let off = HEADER_LEN;
  const manifest = JSON.parse(
    textDecoder.decode(bytes.subarray(off, off + manifestLen)),
  ) as Manifest;
  off += manifestLen;

  const hN = manifest.bathymetry.width * manifest.bathymetry.height;
  const heights = new Float32Array(slice(bytes, off, hN * 4));
  off += hN * 4;

  const coastN = manifest.coastline.reduce((s, c) => s + c.n, 0);
  const coast = new Float64Array(slice(bytes, off, coastN * 2 * 8));
  off += coastN * 2 * 8;
  const coastline: CoastlineChain[] = [];
  let ci = 0;
  for (const c of manifest.coastline) {
    const points: Array<[number, number]> = [];
    for (let i = 0; i < c.n; i++) points.push([coast[ci++]!, coast[ci++]!]);
    coastline.push({ points, closed: c.closed });
  }

  const bldN = manifest.buildings.reduce((s, b) => s + b.n, 0);
  const bld = new Float64Array(slice(bytes, off, bldN * 2 * 8));
  let bi = 0;
  const buildings: BuildingData[] = manifest.buildings.map((b) => {
    const polygon: Array<[number, number]> = [];
    for (let i = 0; i < b.n; i++) polygon.push([bld[bi++]!, bld[bi++]!]);
    return { polygon, heightM: b.heightM, tags: b.tags };
  });

  const bathymetry: BathymetryGrid = {
    heights,
    width: manifest.bathymetry.width,
    height: manifest.bathymetry.height,
    bbox: manifest.bathymetry.bbox,
    cellSizeM: manifest.bathymetry.cellSizeM,
  };
  return { coastline, bathymetry, buildings, seamarks: manifest.seamarks };
}
