import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { clipChainToBbox, assemblePolygons, buildLandmaskMesh } from "../src/landmask.js";
import type { CoastlineChain } from "../src/terrain.js";
import type { Bbox } from "../src/dsl.js";

const BBOX: Bbox = [10.0, 54.0, 10.2, 54.2]; // [west, south, east, north]

describe("clipChainToBbox", () => {
  it("passes through a chain fully inside the bbox", () => {
    const chain: CoastlineChain = {
      points: [
        [10.05, 54.05],
        [10.10, 54.10],
        [10.15, 54.15],
      ],
      closed: false,
    };
    const clipped = clipChainToBbox(chain, BBOX);
    expect(clipped).toHaveLength(1);
    expect(clipped[0]!.points).toHaveLength(3);
    expect(clipped[0]!.entryOnBbox).toBe(false);
    expect(clipped[0]!.exitOnBbox).toBe(false);
  });

  it("clips a chain that exits the bbox on the east edge", () => {
    const chain: CoastlineChain = {
      points: [
        [10.10, 54.10],
        [10.30, 54.10], // outside east
      ],
      closed: false,
    };
    const clipped = clipChainToBbox(chain, BBOX);
    expect(clipped).toHaveLength(1);
    expect(clipped[0]!.exitOnBbox).toBe(true);
    const last = clipped[0]!.points[clipped[0]!.points.length - 1]!;
    expect(last[0]).toBeCloseTo(10.2, 6); // clipped to east edge
    expect(last[1]).toBeCloseTo(54.10, 6);
  });

  it("clips a chain that enters from outside the bbox", () => {
    const chain: CoastlineChain = {
      points: [
        [9.90, 54.10], // outside west
        [10.10, 54.10],
      ],
      closed: false,
    };
    const clipped = clipChainToBbox(chain, BBOX);
    expect(clipped).toHaveLength(1);
    expect(clipped[0]!.entryOnBbox).toBe(true);
    const first = clipped[0]!.points[0]!;
    expect(first[0]).toBeCloseTo(10.0, 6); // clipped to west edge
  });

  it("produces two sub-chains when a chain exits and re-enters", () => {
    const chain: CoastlineChain = {
      points: [
        [10.05, 54.10],
        [10.25, 54.10], // exits east
        [10.25, 54.15], // outside
        [10.05, 54.15], // re-enters from east going west — but this enters from east
      ],
      closed: false,
    };
    // Actually this chain goes: inside → exits east → outside → comes back
    // Let me construct it more carefully
    const chain2: CoastlineChain = {
      points: [
        [10.05, 54.05], // inside
        [10.25, 54.05], // outside east
        [10.25, 54.15], // outside
        [10.05, 54.15], // inside (re-enters via east edge at lon=10.2)
      ],
      closed: false,
    };
    const clipped = clipChainToBbox(chain2, BBOX);
    expect(clipped.length).toBeGreaterThanOrEqual(2);
    // First sub-chain: enters from inside, exits east
    expect(clipped[0]!.exitOnBbox).toBe(true);
    // Last sub-chain: enters from east
    expect(clipped[clipped.length - 1]!.entryOnBbox).toBe(true);
  });

  it("returns empty for a chain fully outside the bbox", () => {
    const chain: CoastlineChain = {
      points: [
        [11.0, 55.0],
        [11.1, 55.1],
      ],
      closed: false,
    };
    const clipped = clipChainToBbox(chain, BBOX);
    expect(clipped).toHaveLength(0);
  });

  it("handles a segment that crosses the bbox without endpoints inside", () => {
    const chain: CoastlineChain = {
      points: [
        [9.5, 54.10], // outside west
        [10.5, 54.10], // outside east
      ],
      closed: false,
    };
    const clipped = clipChainToBbox(chain, BBOX);
    expect(clipped).toHaveLength(1);
    expect(clipped[0]!.entryOnBbox).toBe(true);
    expect(clipped[0]!.exitOnBbox).toBe(true);
    expect(clipped[0]!.points[0]![0]).toBeCloseTo(10.0, 6);
    expect(clipped[0]!.points[1]![0]).toBeCloseTo(10.2, 6);
  });
});

describe("assemblePolygons", () => {
  it("returns a closed island chain as-is", () => {
    const chains: CoastlineChain[] = [
      {
        points: [
          [10.08, 54.08],
          [10.12, 54.08],
          [10.10, 54.12],
          [10.08, 54.08],
        ],
        closed: true,
      },
    ];
    const polygons = assemblePolygons(chains, BBOX);
    expect(polygons).toHaveLength(1);
    expect(polygons[0]!.ring.length).toBeGreaterThanOrEqual(3);
  });

  it("closes a single crossing chain by walking the bbox perimeter", () => {
    // Chain enters from the west edge and exits from the east edge
    // Land is on the left (north side), so the polygon should include
    // the NW and NE corners.
    const chains: CoastlineChain[] = [
      {
        points: [
          [9.8, 54.10], // outside west
          [10.05, 54.10],
          [10.15, 54.10],
          [10.4, 54.10], // outside east
        ],
        closed: false,
      },
    ];
    const polygons = assemblePolygons(chains, BBOX);
    expect(polygons).toHaveLength(1);
    // The polygon should be closed (ring)
    expect(polygons[0]!.ring.length).toBeGreaterThanOrEqual(4);
    // Land is on the left (north side) — polygon must include NE and
    // NW corners, NOT SE/SW corners.
    const ring = polygons[0]!.ring;
    const hasNE = ring.some(([lon, lat]) => Math.abs(lon - 10.2) < 1e-6 && Math.abs(lat - 54.2) < 1e-6);
    const hasNW = ring.some(([lon, lat]) => Math.abs(lon - 10.0) < 1e-6 && Math.abs(lat - 54.2) < 1e-6);
    const hasSE = ring.some(([lon, lat]) => Math.abs(lon - 10.2) < 1e-6 && Math.abs(lat - 54.0) < 1e-6);
    const hasSW = ring.some(([lon, lat]) => Math.abs(lon - 10.0) < 1e-6 && Math.abs(lat - 54.0) < 1e-6);
    expect(hasNE).toBe(true);
    expect(hasNW).toBe(true);
    expect(hasSE).toBe(false);
    expect(hasSW).toBe(false);
  });

  it("returns empty when no coastline chains are provided", () => {
    expect(assemblePolygons([], BBOX)).toHaveLength(0);
  });

  it("assembles two crossing chains into a polygon", () => {
    // Two parallel chains crossing the bbox
    const chains: CoastlineChain[] = [
      {
        points: [
          [9.8, 54.08],
          [10.4, 54.08],
        ],
        closed: false,
      },
      {
        points: [
          [9.8, 54.15],
          [10.4, 54.15],
        ],
        closed: false,
      },
    ];
    const polygons = assemblePolygons(chains, BBOX);
    expect(polygons.length).toBeGreaterThanOrEqual(1);
  });
});

describe("buildLandmaskMesh", () => {
  const ANCHOR = { lat: 54.10, lon: 10.10, height: 0 };

  it("returns a named group", () => {
    const chains: CoastlineChain[] = [];
    const group = buildLandmaskMesh(chains, BBOX, ANCHOR);
    expect(group).toBeInstanceOf(THREE.Group);
    expect(group.name).toBe("landmask");
  });

  it("produces mesh children for a closed island chain", () => {
    const chains: CoastlineChain[] = [
      {
        points: [
          [10.08, 54.08],
          [10.12, 54.08],
          [10.10, 54.12],
          [10.08, 54.08],
        ],
        closed: true,
      },
    ];
    const group = buildLandmaskMesh(chains, BBOX, ANCHOR);
    expect(group.children.length).toBeGreaterThanOrEqual(1);
    const mesh = group.children[0] as THREE.Mesh;
    expect(mesh).toBeInstanceOf(THREE.Mesh);
    expect(mesh.geometry).toBeInstanceOf(THREE.ShapeGeometry);
  });

  it("mesh is positioned above sea level", () => {
    const chains: CoastlineChain[] = [
      {
        points: [
          [10.08, 54.08],
          [10.12, 54.08],
          [10.10, 54.12],
          [10.08, 54.08],
        ],
        closed: true,
      },
    ];
    const group = buildLandmaskMesh(chains, BBOX, ANCHOR);
    const mesh = group.children[0] as THREE.Mesh;
    expect(mesh.position.y).toBeGreaterThan(0);
  });

  it("produces meshes from a bbox-crossing chain", () => {
    const chains: CoastlineChain[] = [
      {
        points: [
          [9.8, 54.10],
          [10.4, 54.10],
        ],
        closed: false,
      },
    ];
    const group = buildLandmaskMesh(chains, BBOX, ANCHOR);
    expect(group.children.length).toBeGreaterThanOrEqual(1);
  });
});
