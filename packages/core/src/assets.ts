import * as THREE from "three";

export interface VesselDimensions {
  length: number;
  beam: number;
  draft: number;
}

export interface AssetEntry {
  dimensions: VesselDimensions;
  superstructure?: {
    length: number;
    height: number;
    offset: number; // longitudinal offset from amidships (positive = aft)
  };
}

export type AssetRegistry = Record<string, AssetEntry>;

const DEFAULT_REGISTRY: AssetRegistry = {
  tanker_120m: {
    dimensions: { length: 120, beam: 20, draft: 6 },
    superstructure: { length: 18, height: 14, offset: 40 },
  },
  ferry_60m: {
    dimensions: { length: 60, beam: 14, draft: 3.5 },
    superstructure: { length: 25, height: 10, offset: 5 },
  },
  cargo_90m: {
    dimensions: { length: 90, beam: 16, draft: 5 },
    superstructure: { length: 14, height: 12, offset: 30 },
  },
};

export function getRegistry(): AssetRegistry {
  return DEFAULT_REGISTRY;
}

export function lookupDimensions(model: string): VesselDimensions {
  const entry = DEFAULT_REGISTRY[model];
  if (entry) return entry.dimensions;
  return { length: 80, beam: 14, draft: 4 };
}

export function parametricHull(
  dims: VesselDimensions,
  superstructure?: AssetEntry["superstructure"],
): THREE.Group {
  const group = new THREE.Group();
  group.name = "parametric_hull";

  const hull = buildHullGeometry(dims);
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.7 });
  const hullMesh = new THREE.Mesh(hull, hullMat);
  hullMesh.name = "hull";
  group.add(hullMesh);

  if (superstructure) {
    const ss = buildSuperstructure(dims, superstructure);
    group.add(ss);
  }

  return group;
}

function buildHullGeometry(dims: VesselDimensions): THREE.BufferGeometry {
  const { length, beam, draft } = dims;
  const freeboard = draft * 0.6;
  const totalHeight = draft + freeboard;
  const halfLen = length / 2;
  const halfBeam = beam / 2;
  const bowTaper = length * 0.2;
  const sternTaper = length * 0.1;

  // Cross-section profile: 8 stations from bow to stern
  // Each station has a width and a keel depth factor
  const stations: Array<{ x: number; widthFactor: number; keelFactor: number }> = [
    { x: halfLen, widthFactor: 0.0, keelFactor: 0.3 }, // bow tip
    { x: halfLen - bowTaper * 0.3, widthFactor: 0.3, keelFactor: 0.6 },
    { x: halfLen - bowTaper, widthFactor: 0.85, keelFactor: 0.9 },
    { x: halfLen - bowTaper - length * 0.1, widthFactor: 1.0, keelFactor: 1.0 },
    { x: -halfLen + sternTaper + length * 0.1, widthFactor: 1.0, keelFactor: 1.0 },
    { x: -halfLen + sternTaper, widthFactor: 0.9, keelFactor: 0.95 },
    { x: -halfLen + sternTaper * 0.3, widthFactor: 0.7, keelFactor: 0.8 },
    { x: -halfLen, widthFactor: 0.5, keelFactor: 0.6 }, // stern
  ];

  // Per-station profile: 5 vertices (keel, waterline-port, deck-port, deck-stbd, waterline-stbd)
  const vertsPerStation = 5;
  const nStations = stations.length;
  const positions: number[] = [];

  for (const st of stations) {
    const w = halfBeam * st.widthFactor;
    const k = -draft * st.keelFactor;
    // Keel centre
    positions.push(st.x, k, 0);
    // Waterline port
    positions.push(st.x, 0, -w);
    // Deck port
    positions.push(st.x, freeboard, -w * 0.95);
    // Deck starboard
    positions.push(st.x, freeboard, w * 0.95);
    // Waterline starboard
    positions.push(st.x, 0, w);
  }

  const indices: number[] = [];
  for (let i = 0; i < nStations - 1; i++) {
    const a = i * vertsPerStation;
    const b = (i + 1) * vertsPerStation;
    for (let j = 0; j < vertsPerStation; j++) {
      const j1 = (j + 1) % vertsPerStation;
      indices.push(a + j, b + j, b + j1);
      indices.push(a + j, b + j1, a + j1);
    }
  }

  // Cap the bow (first station) — fan from vertex 0
  const bowBase = 0;
  for (let j = 1; j < vertsPerStation - 1; j++) {
    indices.push(bowBase, bowBase + j + 1, bowBase + j);
  }
  // Cap the stern (last station) — fan from vertex 0 of last station
  const sternBase = (nStations - 1) * vertsPerStation;
  for (let j = 1; j < vertsPerStation - 1; j++) {
    indices.push(sternBase, sternBase + j, sternBase + j + 1);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

function buildSuperstructure(
  dims: VesselDimensions,
  ss: NonNullable<AssetEntry["superstructure"]>,
): THREE.Mesh {
  const freeboard = dims.draft * 0.6;
  const geom = new THREE.BoxGeometry(ss.length, ss.height, dims.beam * 0.7);
  const mat = new THREE.MeshStandardMaterial({ color: 0xd0d0d0, roughness: 0.6 });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.name = "superstructure";
  mesh.position.set(-ss.offset, freeboard + ss.height / 2, 0);
  return mesh;
}

export function loadModel(model: string): THREE.Group {
  const entry = DEFAULT_REGISTRY[model];
  const dims = entry?.dimensions ?? { length: 80, beam: 14, draft: 4 };
  const ss = entry?.superstructure;
  return parametricHull(dims, ss);
}
