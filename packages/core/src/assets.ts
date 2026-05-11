import * as THREE from "three";
import type { VesselDimensions } from "./dsl.js";

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

// ---------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------

const MAT = {
  hullAbove: () =>
    new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.6 }),
  hullBelow: () =>
    new THREE.MeshStandardMaterial({ color: 0x6b1a1a, roughness: 0.8 }),
  deckhouse: () =>
    new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.5 }),
  funnel: () =>
    new THREE.MeshStandardMaterial({ color: 0xd04040, roughness: 0.6 }),
  deck: () =>
    new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.9 }),
  windows: () =>
    new THREE.MeshStandardMaterial({
      color: 0x1a3050,
      roughness: 0.3,
      metalness: 0.3,
    }),
  hatchCover: () =>
    new THREE.MeshStandardMaterial({ color: 0x5a5a5a, roughness: 0.7 }),
  mast: () =>
    new THREE.MeshStandardMaterial({ color: 0xc0c0c0, roughness: 0.5 }),
};

// ---------------------------------------------------------------------------
// Hull geometry — 20 stations × 9 vertices
// ---------------------------------------------------------------------------

interface StationParams {
  x: number;
  widthFactor: number;
  keelFactor: number;
}

/**
 * Compute smooth hull stations using sine-based interpolation.
 * 6 bow stations, 8 parallel-body, 6 stern stations = 20 total.
 */
function computeStations(halfLen: number, length: number): StationParams[] {
  const stations: StationParams[] = [];
  const bowLen = length * 0.25;
  const sternLen = length * 0.2;

  // Bow (6 stations): x from halfLen down to halfLen - bowLen
  for (let i = 0; i < 6; i++) {
    const t = i / 5; // 0..1
    const x = halfLen - bowLen * t;
    // sine curve for smooth entry: width goes from 0 to ~1
    const widthFactor = Math.sin((t * Math.PI) / 2);
    // keel deepens from shallow to full
    const keelFactor = 0.3 + 0.7 * Math.sin((t * Math.PI) / 2);
    stations.push({ x, widthFactor, keelFactor });
  }

  // Parallel body (8 stations): full beam, full depth
  const bodyStart = halfLen - bowLen;
  const bodyEnd = -halfLen + sternLen;
  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    const x = bodyStart + (bodyEnd - bodyStart) * t;
    stations.push({ x, widthFactor: 1.0, keelFactor: 1.0 });
  }

  // Stern (6 stations): taper broader than bow, flatter transom
  for (let i = 0; i < 6; i++) {
    const t = i / 5; // 0..1
    const x = bodyEnd - sternLen * t;
    // cosine taper — broader than bow
    const widthFactor = 1.0 - 0.4 * Math.sin((t * Math.PI) / 2);
    const keelFactor = 1.0 - 0.3 * Math.sin((t * Math.PI) / 2);
    stations.push({ x, widthFactor, keelFactor });
  }

  return stations;
}

/**
 * Build hull geometry for the portion above or below the waterline.
 *
 * above=true  → waterline to deck (vertices 2-4 of the 9-vertex profile)
 * above=false → keel to waterline (vertices 0-2 of the 9-vertex profile)
 */
function buildHullHalf(
  dims: VesselDimensions,
  above: boolean,
): THREE.BufferGeometry {
  const { length, beam, draft } = dims;
  const freeboard = draft * 0.6;
  const halfLen = length / 2;
  const halfBeam = beam / 2;

  const stations = computeStations(halfLen, length);
  const nStations = stations.length;

  // Per-station profile for each half:
  //
  // BELOW waterline (5 verts):
  //   0  keel center          (x, -draft*kf, 0)
  //   1  lower hull port      (x, -draft*kf*0.5, -w*0.7)
  //   2  waterline port       (x, 0, -w)
  //   3  waterline starboard  (x, 0,  w)
  //   4  lower hull starboard (x, -draft*kf*0.5,  w*0.7)
  //
  // ABOVE waterline (5 verts):
  //   0  waterline port       (x, 0, -w)
  //   1  upper hull port      (x, freeboard*0.5, -w*1.02)
  //   2  deck edge port       (x, freeboard, -w*0.95)
  //   3  deck edge starboard  (x, freeboard,  w*0.95)
  //   4  upper hull starboard (x, freeboard*0.5,  w*1.02)
  //   -- we close the strip back to waterline stbd in the index loop

  const vertsPerStation = 5;
  const positions: number[] = [];

  for (const st of stations) {
    const w = halfBeam * st.widthFactor;
    const k = -draft * st.keelFactor;

    if (!above) {
      // Below waterline
      positions.push(st.x, k, 0); // keel
      positions.push(st.x, k * 0.5, -w * 0.7); // lower hull port
      positions.push(st.x, 0, -w); // waterline port
      positions.push(st.x, 0, w); // waterline stbd
      positions.push(st.x, k * 0.5, w * 0.7); // lower hull stbd
    } else {
      // Above waterline
      positions.push(st.x, 0, -w); // waterline port
      positions.push(st.x, freeboard * 0.5, -w * 1.02); // upper hull port (slight flare)
      positions.push(st.x, freeboard, -w * 0.95); // deck edge port
      positions.push(st.x, freeboard, w * 0.95); // deck edge stbd
      positions.push(st.x, freeboard * 0.5, w * 1.02); // upper hull stbd
    }
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

  // Cap bow
  const bowBase = 0;
  for (let j = 1; j < vertsPerStation - 1; j++) {
    indices.push(bowBase, bowBase + j + 1, bowBase + j);
  }
  // Cap stern
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

// ---------------------------------------------------------------------------
// Superstructure parts — shared helpers
// ---------------------------------------------------------------------------

function makeBridgeBlock(
  x: number,
  y: number,
  w: number,
  d: number,
  h: number,
): THREE.Mesh {
  const geom = new THREE.BoxGeometry(d, h, w);
  const mesh = new THREE.Mesh(geom, MAT.deckhouse());
  mesh.name = "superstructure"; // primary block keeps the canonical name
  mesh.position.set(x, y + h / 2, 0);
  return mesh;
}

function makeWindowStrip(
  x: number,
  y: number,
  w: number,
  d: number,
): THREE.Mesh {
  const geom = new THREE.BoxGeometry(d + 0.1, 0.8, w + 0.1);
  const mesh = new THREE.Mesh(geom, MAT.windows());
  mesh.name = "bridge_windows";
  mesh.position.set(x, y, 0);
  return mesh;
}

function makeFunnel(
  x: number,
  y: number,
  w: number,
  h: number,
): THREE.Mesh {
  const geom = new THREE.CylinderGeometry(w * 0.35, w * 0.45, h, 8);
  const mesh = new THREE.Mesh(geom, MAT.funnel());
  mesh.name = "funnel";
  mesh.position.set(x, y + h / 2, 0);
  return mesh;
}

function makeMast(
  x: number,
  y: number,
  height: number,
): THREE.Mesh {
  const geom = new THREE.CylinderGeometry(0.15, 0.25, height, 6);
  const mesh = new THREE.Mesh(geom, MAT.mast());
  mesh.name = "mast";
  mesh.position.set(x, y + height / 2, 0);
  return mesh;
}

function makeDeckPlane(
  length: number,
  beam: number,
  y: number,
): THREE.Mesh {
  const geom = new THREE.PlaneGeometry(length * 0.95, beam * 0.9);
  geom.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geom, MAT.deck());
  mesh.name = "deck_surface";
  mesh.position.set(0, y, 0);
  return mesh;
}

// ---------------------------------------------------------------------------
// Per-vessel-type superstructure assemblies
// ---------------------------------------------------------------------------

function buildTankerSuperstructure(
  dims: VesselDimensions,
  ss: NonNullable<AssetEntry["superstructure"]>,
): THREE.Mesh[] {
  const freeboard = dims.draft * 0.6;
  const halfLen = dims.length / 2;
  const deckY = freeboard;
  const bridgeX = -ss.offset;
  const bridgeW = dims.beam * 0.6;

  const parts: THREE.Mesh[] = [];

  // Lower deckhouse (wider)
  const lowerH = ss.height * 0.55;
  const lowerBlock = makeBridgeBlock(bridgeX, deckY, bridgeW, ss.length, lowerH);
  parts.push(lowerBlock);

  // Upper bridge (narrower)
  const upperH = ss.height * 0.35;
  const upperW = bridgeW * 0.75;
  const upperD = ss.length * 0.7;
  const upperGeom = new THREE.BoxGeometry(upperD, upperH, upperW);
  const upperMesh = new THREE.Mesh(upperGeom, MAT.deckhouse());
  upperMesh.name = "bridge_upper";
  upperMesh.position.set(bridgeX, deckY + lowerH + upperH / 2, 0);
  parts.push(upperMesh);

  // Window strip on upper bridge
  parts.push(
    makeWindowStrip(bridgeX, deckY + lowerH + upperH * 0.75, upperW, upperD),
  );

  // Funnel behind bridge
  const funnelH = ss.height * 0.5;
  parts.push(
    makeFunnel(bridgeX - ss.length * 0.6, deckY + lowerH, bridgeW * 0.3, funnelH),
  );

  // Mast on top of bridge
  const mastH = 10;
  parts.push(makeMast(bridgeX, deckY + lowerH + upperH, mastH));

  // Deck surface
  parts.push(makeDeckPlane(dims.length, dims.beam, deckY));

  // Pipe runs along deck centerline
  const pipeLen = halfLen + bridgeX - ss.length / 2 - 2;
  if (pipeLen > 0) {
    const pipeGeom = new THREE.CylinderGeometry(0.25, 0.25, pipeLen, 6);
    pipeGeom.rotateZ(Math.PI / 2);
    const pipeMesh = new THREE.Mesh(pipeGeom, MAT.mast());
    pipeMesh.name = "pipe_run";
    pipeMesh.position.set(
      (halfLen + (bridgeX - ss.length / 2)) / 2,
      deckY + 1.0,
      0,
    );
    parts.push(pipeMesh);
  }

  // Catwalk — thin elevated walkway from bow area to bridge
  const catwalkLen = halfLen + bridgeX - ss.length / 2 - 4;
  if (catwalkLen > 0) {
    const cwGeom = new THREE.BoxGeometry(catwalkLen, 0.15, 1.0);
    const cwMesh = new THREE.Mesh(cwGeom, MAT.mast());
    cwMesh.name = "catwalk";
    cwMesh.position.set(
      (halfLen + (bridgeX - ss.length / 2)) / 2,
      deckY + 2.5,
      0,
    );
    parts.push(cwMesh);
  }

  return parts;
}

function buildFerrySuperstructure(
  dims: VesselDimensions,
  ss: NonNullable<AssetEntry["superstructure"]>,
): THREE.Mesh[] {
  const freeboard = dims.draft * 0.6;
  const deckY = freeboard;
  const ssW = dims.beam * 0.85;
  const ssLen = dims.length * 0.7;
  const ssX = -ss.offset + ssLen * 0.05; // slightly forward of center

  const parts: THREE.Mesh[] = [];

  // Deck surface
  parts.push(makeDeckPlane(dims.length, dims.beam, deckY));

  // Tier 1: Car deck — open at sides (just the ceiling/floor of next deck)
  const tier1H = ss.height * 0.3;
  // We represent the car deck as thin floor plates at each end (no walls)
  // Skip visible walls for the bottom tier — open sides

  // Tier 2: Passenger deck (full enclosure, slightly narrower)
  const tier2H = ss.height * 0.3;
  const tier2W = ssW * 0.95;
  const tier2Geom = new THREE.BoxGeometry(ssLen, tier2H, tier2W);
  const tier2Mesh = new THREE.Mesh(tier2Geom, MAT.deckhouse());
  tier2Mesh.name = "superstructure"; // primary — satisfies test
  tier2Mesh.position.set(ssX, deckY + tier1H + tier2H / 2, 0);
  parts.push(tier2Mesh);

  // Window strip on tier 2
  parts.push(
    makeWindowStrip(ssX, deckY + tier1H + tier2H * 0.7, tier2W, ssLen),
  );

  // Tier 3: Upper passenger deck (inset)
  const tier3H = ss.height * 0.25;
  const tier3W = ssW * 0.85;
  const tier3Len = ssLen * 0.9;
  const tier3Geom = new THREE.BoxGeometry(tier3Len, tier3H, tier3W);
  const tier3Mesh = new THREE.Mesh(tier3Geom, MAT.deckhouse());
  tier3Mesh.name = "upper_deck";
  tier3Mesh.position.set(ssX, deckY + tier1H + tier2H + tier3H / 2, 0);
  parts.push(tier3Mesh);

  // Window strip on tier 3
  parts.push(
    makeWindowStrip(
      ssX,
      deckY + tier1H + tier2H + tier3H * 0.7,
      tier3W,
      tier3Len,
    ),
  );

  // Bridge on top (narrower, shorter)
  const bridgeH = ss.height * 0.2;
  const bridgeW = ssW * 0.6;
  const bridgeLen = ssLen * 0.3;
  const bridgeGeom = new THREE.BoxGeometry(bridgeLen, bridgeH, bridgeW);
  const bridgeMesh = new THREE.Mesh(bridgeGeom, MAT.deckhouse());
  bridgeMesh.name = "ferry_bridge";
  const bridgeY = deckY + tier1H + tier2H + tier3H + bridgeH / 2;
  bridgeMesh.position.set(ssX + ssLen * 0.2, bridgeY, 0);
  parts.push(bridgeMesh);

  // Bridge windows
  parts.push(
    makeWindowStrip(
      ssX + ssLen * 0.2,
      bridgeY + bridgeH * 0.2,
      bridgeW,
      bridgeLen,
    ),
  );

  // Funnel (smaller, behind bridge)
  const funnelH = ss.height * 0.35;
  parts.push(
    makeFunnel(ssX - ssLen * 0.2, deckY + tier1H + tier2H + tier3H, ssW * 0.15, funnelH),
  );

  // Mast
  parts.push(makeMast(ssX + ssLen * 0.2, bridgeY + bridgeH / 2, 8));

  return parts;
}

function buildCargoSuperstructure(
  dims: VesselDimensions,
  ss: NonNullable<AssetEntry["superstructure"]>,
): THREE.Mesh[] {
  const freeboard = dims.draft * 0.6;
  const halfLen = dims.length / 2;
  const deckY = freeboard;
  const bridgeX = -ss.offset;
  const bridgeW = dims.beam * 0.65;

  const parts: THREE.Mesh[] = [];

  // Deck surface
  parts.push(makeDeckPlane(dims.length, dims.beam, deckY));

  // Bridge house aft (main deckhouse)
  const bridgeH = ss.height * 0.6;
  parts.push(makeBridgeBlock(bridgeX, deckY, bridgeW, ss.length, bridgeH));

  // Upper bridge tier
  const upperH = ss.height * 0.3;
  const upperW = bridgeW * 0.7;
  const upperD = ss.length * 0.65;
  const upperGeom = new THREE.BoxGeometry(upperD, upperH, upperW);
  const upperMesh = new THREE.Mesh(upperGeom, MAT.deckhouse());
  upperMesh.name = "bridge_upper";
  upperMesh.position.set(bridgeX, deckY + bridgeH + upperH / 2, 0);
  parts.push(upperMesh);

  // Bridge windows
  parts.push(
    makeWindowStrip(bridgeX, deckY + bridgeH + upperH * 0.75, upperW, upperD),
  );

  // Funnel behind bridge
  const funnelH = ss.height * 0.4;
  parts.push(
    makeFunnel(bridgeX - ss.length * 0.55, deckY + bridgeH, bridgeW * 0.25, funnelH),
  );

  // Mast on top of bridge
  parts.push(makeMast(bridgeX, deckY + bridgeH + upperH, 10));

  // Hatch covers forward of bridge (3-4 evenly spaced)
  const hatchStart = bridgeX + ss.length / 2 + 3;
  const hatchEnd = halfLen - dims.length * 0.08;
  const numHatches = 4;
  const hatchSpacing = (hatchEnd - hatchStart) / numHatches;
  const hatchLen = hatchSpacing * 0.7;
  const hatchW = dims.beam * 0.6;

  for (let i = 0; i < numHatches; i++) {
    const hx = hatchStart + hatchSpacing * (i + 0.5);
    const hatchGeom = new THREE.BoxGeometry(hatchLen, 0.8, hatchW);
    const hatchMesh = new THREE.Mesh(hatchGeom, MAT.hatchCover());
    hatchMesh.name = `hatch_cover_${i}`;
    hatchMesh.position.set(hx, deckY + 0.4, 0);
    parts.push(hatchMesh);
  }

  // 2 cargo cranes between hatches
  const craneIndices = [1, 2]; // between hatch 1-2 and 2-3
  for (const ci of craneIndices) {
    const cx = hatchStart + hatchSpacing * ci;
    const postH = ss.height * 0.7;
    const boomLen = hatchSpacing * 1.2;

    // Vertical post
    const postGeom = new THREE.CylinderGeometry(0.3, 0.4, postH, 6);
    const postMesh = new THREE.Mesh(postGeom, MAT.mast());
    postMesh.name = `crane_post_${ci}`;
    postMesh.position.set(cx, deckY + postH / 2, 0);
    parts.push(postMesh);

    // Horizontal boom (angled upward slightly)
    const boomGeom = new THREE.CylinderGeometry(0.2, 0.2, boomLen, 6);
    boomGeom.rotateZ(Math.PI / 2 + 0.3); // slight upward angle
    const boomMesh = new THREE.Mesh(boomGeom, MAT.mast());
    boomMesh.name = `crane_boom_${ci}`;
    boomMesh.position.set(
      cx + boomLen * 0.3,
      deckY + postH * 0.9,
      0,
    );
    parts.push(boomMesh);
  }

  return parts;
}

function buildGenericSuperstructure(
  dims: VesselDimensions,
  ss: NonNullable<AssetEntry["superstructure"]>,
): THREE.Mesh[] {
  const freeboard = dims.draft * 0.6;
  const deckY = freeboard;
  const bridgeX = -ss.offset;
  const bridgeW = dims.beam * 0.7;

  const parts: THREE.Mesh[] = [];

  // Deck
  parts.push(makeDeckPlane(dims.length, dims.beam, deckY));

  // Main bridge block
  parts.push(makeBridgeBlock(bridgeX, deckY, bridgeW, ss.length, ss.height));

  // Window strip
  parts.push(
    makeWindowStrip(bridgeX, deckY + ss.height * 0.85, bridgeW, ss.length),
  );

  // Funnel
  const funnelH = ss.height * 0.4;
  parts.push(
    makeFunnel(bridgeX - ss.length * 0.5, deckY + ss.height * 0.5, bridgeW * 0.2, funnelH),
  );

  // Mast
  parts.push(makeMast(bridgeX, deckY + ss.height, 8));

  return parts;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function parametricHull(
  dims: VesselDimensions,
  superstructure?: AssetEntry["superstructure"],
  vesselType?: string,
): THREE.Group {
  const group = new THREE.Group();
  group.name = "parametric_hull";

  // Hull — topside (above waterline), named "hull" for API compat
  const hullAboveGeom = buildHullHalf(dims, true);
  const hullAboveMesh = new THREE.Mesh(hullAboveGeom, MAT.hullAbove());
  hullAboveMesh.name = "hull";
  group.add(hullAboveMesh);

  // Hull — underwater (below waterline), anti-fouling paint
  const hullBelowGeom = buildHullHalf(dims, false);
  const hullBelowMesh = new THREE.Mesh(hullBelowGeom, MAT.hullBelow());
  hullBelowMesh.name = "hull_underwater";
  group.add(hullBelowMesh);

  if (superstructure) {
    let parts: THREE.Mesh[];
    if (vesselType === "tanker_120m") {
      parts = buildTankerSuperstructure(dims, superstructure);
    } else if (vesselType === "ferry_60m") {
      parts = buildFerrySuperstructure(dims, superstructure);
    } else if (vesselType === "cargo_90m") {
      parts = buildCargoSuperstructure(dims, superstructure);
    } else {
      parts = buildGenericSuperstructure(dims, superstructure);
    }
    for (const p of parts) {
      group.add(p);
    }
  }

  return group;
}

export function loadModel(model: string): THREE.Group {
  const entry = DEFAULT_REGISTRY[model];
  const dims = entry?.dimensions ?? { length: 80, beam: 14, draft: 4 };
  const ss = entry?.superstructure;
  return parametricHull(dims, ss, model);
}
