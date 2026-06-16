import * as THREE from "three";
import type { Anchor } from "./dsl.js";
import type { BuildingData } from "./overpass.js";
import { geodeticToEnu } from "./geo.js";
import type { VesselBox } from "./radar.js";

const BUILDING_COLOR = 0xb8b0a0;
const BUILDING_Y = 0.5; // base sits on landmask level

export function buildBuildingsMesh(buildings: BuildingData[], anchor: Anchor): THREE.Group {
  const group = new THREE.Group();
  group.name = "buildings";

  const material = new THREE.MeshStandardMaterial({
    color: BUILDING_COLOR,
    roughness: 0.85,
    flatShading: true,
  });

  const geometries: THREE.BufferGeometry[] = [];

  for (const bldg of buildings) {
    const geom = extrudeBuilding(bldg, anchor);
    if (geom) geometries.push(geom);
  }

  if (geometries.length === 0) return group;

  // Merge all building geometries into a single draw call
  const merged = mergeGeometries(geometries);
  if (merged) {
    const mesh = new THREE.Mesh(merged, material);
    mesh.name = "buildings-merged";
    mesh.position.y = BUILDING_Y;
    group.add(mesh);
  }

  for (const g of geometries) g.dispose();

  return group;
}

function extrudeBuilding(bldg: BuildingData, anchor: Anchor): THREE.BufferGeometry | null {
  if (bldg.polygon.length < 3) return null;

  const enuPoints = bldg.polygon.map(([lon, lat]) =>
    geodeticToEnu({ lat, lon, height: 0 }, anchor),
  );

  const shape = new THREE.Shape();
  shape.moveTo(enuPoints[0]!.e, enuPoints[0]!.n);
  for (let i = 1; i < enuPoints.length; i++) {
    shape.lineTo(enuPoints[i]!.e, enuPoints[i]!.n);
  }
  shape.closePath();

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: bldg.heightM,
    bevelEnabled: false,
  });
  // ExtrudeGeometry extrudes in Z; rotate so depth becomes Y (up)
  geom.rotateX(-Math.PI / 2);

  return geom;
}

function mergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  if (geometries.length === 0) return null;
  if (geometries.length === 1) return geometries[0]!.clone();

  let totalVerts = 0;
  for (const g of geometries) {
    totalVerts += g.attributes["position"]!.count;
  }

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const indices: number[] = [];
  let vertOffset = 0;

  for (const g of geometries) {
    const pos = g.attributes["position"]!;
    const norm = g.attributes["normal"];
    const count = pos.count;

    for (let i = 0; i < count * 3; i++) {
      positions[vertOffset * 3 + i] = (pos.array as Float32Array)[i]!;
    }
    if (norm) {
      for (let i = 0; i < count * 3; i++) {
        normals[vertOffset * 3 + i] = (norm.array as Float32Array)[i]!;
      }
    }

    if (g.index) {
      for (let i = 0; i < g.index.count; i++) {
        indices.push(g.index.array[i]! + vertOffset);
      }
    }

    vertOffset += count;
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  merged.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  if (indices.length > 0) {
    merged.setIndex(indices);
  }

  return merged;
}

export function buildingsToObstacles(buildings: BuildingData[], anchor: Anchor): VesselBox[] {
  return buildings.map((bldg) => {
    const enu = bldg.polygon.map(([lon, lat]) => geodeticToEnu({ lat, lon, height: 0 }, anchor));
    const es = enu.map((p) => p.e);
    const ns = enu.map((p) => p.n);
    const minE = Math.min(...es),
      maxE = Math.max(...es);
    const minN = Math.min(...ns),
      maxN = Math.max(...ns);
    const halfX = Math.max((maxE - minE) / 2, 0.5);
    const halfZ = Math.max((maxN - minN) / 2, 0.5);
    const halfY = bldg.heightM / 2;
    return {
      position: [(minE + maxE) / 2, BUILDING_Y + halfY, -((minN + maxN) / 2)] as [
        number,
        number,
        number,
      ],
      heading: 0,
      half_extents: [halfX, halfY, halfZ] as [number, number, number],
    };
  });
}
