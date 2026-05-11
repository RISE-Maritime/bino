import * as THREE from "three";
import type { Anchor } from "./dsl.js";
import type { SeamarkData } from "./overpass.js";
import { geodeticToEnu } from "./geo.js";

// IALA-A buoy colors (Region A: Europe, Africa, Asia, Australia)
const RED = 0xcc2222;
const GREEN = 0x22aa22;
const YELLOW = 0xddcc22;
const WHITE = 0xeeeeee;
const GRAY = 0x888888;

interface SeamarkStyle {
  color: number;
  geometry: "buoy" | "beacon" | "light" | "marker";
}

const TYPE_STYLES: Record<string, SeamarkStyle> = {
  buoy_lateral: { color: RED, geometry: "buoy" },
  "buoy_lateral:port": { color: RED, geometry: "buoy" },
  "buoy_lateral:starboard": { color: GREEN, geometry: "buoy" },
  buoy_cardinal: { color: YELLOW, geometry: "buoy" },
  buoy_safe_water: { color: WHITE, geometry: "buoy" },
  buoy_special_purpose: { color: YELLOW, geometry: "buoy" },
  buoy_isolated_danger: { color: RED, geometry: "buoy" },
  beacon_lateral: { color: GREEN, geometry: "beacon" },
  beacon_cardinal: { color: YELLOW, geometry: "beacon" },
  light_major: { color: WHITE, geometry: "light" },
  light_minor: { color: WHITE, geometry: "light" },
  landmark: { color: GRAY, geometry: "beacon" },
};

function styleForType(type: string, tags: Record<string, string>): SeamarkStyle {
  // Check for lateral buoy with category for port/starboard color
  if (type === "buoy_lateral") {
    const cat = tags["seamark:buoy_lateral:category"];
    if (cat === "port") return { color: RED, geometry: "buoy" };
    if (cat === "starboard") return { color: GREEN, geometry: "buoy" };
  }
  return TYPE_STYLES[type] ?? { color: GRAY, geometry: "marker" };
}

// Shared geometries (created once, instanced per seamark)
let buoyGeom: THREE.BufferGeometry | null = null;
let beaconGeom: THREE.BufferGeometry | null = null;
let lightGeom: THREE.BufferGeometry | null = null;
let markerGeom: THREE.BufferGeometry | null = null;

function getBuoyGeometry(): THREE.BufferGeometry {
  if (!buoyGeom) {
    const body = new THREE.CylinderGeometry(1.2, 1.0, 2.5, 8);
    const top = new THREE.ConeGeometry(0.8, 1.5, 8);
    top.translate(0, 2.0, 0);
    buoyGeom = mergeTwo(body, top);
    body.dispose();
    top.dispose();
  }
  return buoyGeom;
}

function getBeaconGeometry(): THREE.BufferGeometry {
  if (!beaconGeom) {
    const post = new THREE.CylinderGeometry(0.3, 0.3, 6, 6);
    post.translate(0, 3, 0);
    const top = new THREE.SphereGeometry(0.8, 8, 6);
    top.translate(0, 6.5, 0);
    beaconGeom = mergeTwo(post, top);
    post.dispose();
    top.dispose();
  }
  return beaconGeom;
}

function getLightGeometry(): THREE.BufferGeometry {
  if (!lightGeom) {
    const tower = new THREE.CylinderGeometry(0.5, 0.7, 10, 8);
    tower.translate(0, 5, 0);
    const lamp = new THREE.SphereGeometry(1.0, 8, 6);
    lamp.translate(0, 10.5, 0);
    lightGeom = mergeTwo(tower, lamp);
    tower.dispose();
    lamp.dispose();
  }
  return lightGeom;
}

function getMarkerGeometry(): THREE.BufferGeometry {
  if (!markerGeom) {
    markerGeom = new THREE.SphereGeometry(1.0, 8, 6);
    markerGeom.translate(0, 1.0, 0);
  }
  return markerGeom;
}

function mergeTwo(a: THREE.BufferGeometry, b: THREE.BufferGeometry): THREE.BufferGeometry {
  const posA = a.attributes["position"]! as THREE.BufferAttribute;
  const posB = b.attributes["position"]! as THREE.BufferAttribute;
  const normA = a.attributes["normal"] as THREE.BufferAttribute | undefined;
  const normB = b.attributes["normal"] as THREE.BufferAttribute | undefined;

  const totalVerts = posA.count + posB.count;
  const positions = new Float32Array(totalVerts * 3);
  positions.set(posA.array as Float32Array, 0);
  positions.set(posB.array as Float32Array, posA.count * 3);

  const normals = new Float32Array(totalVerts * 3);
  if (normA) normals.set(normA.array as Float32Array, 0);
  if (normB) normals.set(normB.array as Float32Array, posA.count * 3);

  const indices: number[] = [];
  if (a.index) {
    for (let i = 0; i < a.index.count; i++) indices.push(a.index.array[i]!);
  }
  if (b.index) {
    for (let i = 0; i < b.index.count; i++) indices.push(b.index.array[i]! + posA.count);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  if (indices.length > 0) geom.setIndex(indices);
  return geom;
}

function getGeometryForStyle(style: SeamarkStyle): THREE.BufferGeometry {
  switch (style.geometry) {
    case "buoy":
      return getBuoyGeometry();
    case "beacon":
      return getBeaconGeometry();
    case "light":
      return getLightGeometry();
    case "marker":
      return getMarkerGeometry();
  }
}

export function buildSeamarksMesh(seamarks: SeamarkData[], anchor: Anchor): THREE.Group {
  const group = new THREE.Group();
  group.name = "seamarks";

  for (const sm of seamarks) {
    const style = styleForType(sm.type, sm.tags);
    const geom = getGeometryForStyle(style);
    const mat = new THREE.MeshStandardMaterial({ color: style.color, roughness: 0.6 });
    const mesh = new THREE.Mesh(geom, mat);

    const enu = geodeticToEnu({ lat: sm.lat, lon: sm.lon, height: 0 }, anchor);
    mesh.position.set(enu.e, 0, -enu.n);
    mesh.name = `seamark-${sm.type}`;

    group.add(mesh);
  }

  return group;
}
