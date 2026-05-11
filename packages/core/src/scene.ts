import * as THREE from "three";
import type { CompiledScene } from "./compile.js";
import type { Mount, Sensor, Vessel } from "./dsl.js";
import { buildTerrainMesh, type TerrainData } from "./terrain.js";
import { createSeaSurface, type SeaSurfaceHandle } from "./sea.js";
import { createSky, type SkyHandle } from "./sky.js";
import { loadModel } from "./assets.js";

export interface BuiltScene {
  scene: THREE.Scene;
  entities: Map<string, THREE.Object3D>;
  /** Reference to the terrain group, if buildScene was passed
   *  prepared terrain data. */
  terrain?: THREE.Group;
  /** Reference to the sea-surface handle, if buildScene was
   *  configured to add one. The runner calls `sea.setTime(t)` per
   *  tick to animate. */
  sea?: SeaSurfaceHandle;
  /** Reference to the sky handle, if buildScene was configured to
   *  add one. Holds sun + ambient lights as well. */
  sky?: SkyHandle;
}

export interface BuildSceneOptions {
  terrain?: TerrainData;
  /** Add a Gerstner sea surface driven by compiled.environment.sea_state.
   *  Default: true. Pass `false` to suppress. */
  sea?: boolean;
  /** Add a Three.Sky + sun directional light tied to
   *  compiled.environment.time_of_day. Default: true. Pass `false`
   *  to fall back to the v0.1 default ambient + fixed directional. */
  sky?: boolean;
}

export function buildScene(compiled: CompiledScene, opts: BuildSceneOptions = {}): BuiltScene {
  const scene = new THREE.Scene();

  // Derive effective flags: inject mode forces entities-only (no sky,
  // sea, or terrain) regardless of opts.
  const inject = compiled.modes.rendering === "inject";
  const addSky = !inject && opts.sky !== false;
  const addSea = !inject && opts.sea !== false;
  const addTerrain = !inject && !!opts.terrain;

  let skyHandle: SkyHandle | undefined;
  if (addSky) {
    skyHandle = createSky(compiled.environment, compiled.anchor);
    scene.add(skyHandle.sky);
    scene.add(skyHandle.sun);
    scene.add(skyHandle.ambient);
  } else {
    // Fallback: the v0.1 default lighting kept for tests / sky=false
    // callers, and for inject mode so entities are still visible.
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(50, 100, 50);
    scene.add(sun);
  }

  let terrainGroup: THREE.Group | undefined;
  if (addTerrain) {
    terrainGroup = buildTerrainMesh(opts.terrain!, compiled.anchor);
    scene.add(terrainGroup);
  }

  let seaHandle: SeaSurfaceHandle | undefined;
  if (addSea) {
    // Wave plane stays small + dense so per-segment wave resolution
    // is good near the viewer.
    seaHandle = createSeaSurface(compiled.environment);
    scene.add(seaHandle.mesh);
    // Coarse horizon-ocean filler covers the rest of the bbox (4
    // verts, no waves) so the wave plane's edge doesn't show the
    // seabed beyond it. v0.5+ can replace with proper LOD or a
    // skybox horizon trick.
    if (opts.terrain) {
      const horizon = buildHorizonOcean(opts.terrain);
      scene.add(horizon);
    }
  }

  const entities = new Map<string, THREE.Object3D>();
  for (const vessel of compiled.vessels) {
    const group = buildVessel(vessel);
    scene.add(group);
    entities.set(vessel.id, group);
  }

  const built: BuiltScene = { scene, entities };
  if (terrainGroup) built.terrain = terrainGroup;
  if (seaHandle) built.sea = seaHandle;
  if (skyHandle) built.sky = skyHandle;
  return built;
}

function buildHorizonOcean(terrain: TerrainData): THREE.Mesh {
  const bbox = terrain.bathymetry.bbox;
  const dLat = bbox[3] - bbox[1];
  const dLon = bbox[2] - bbox[0];
  const heightM = dLat * 111_320;
  const widthM = dLon * 111_320 * Math.cos(((bbox[1] + dLat / 2) * Math.PI) / 180);
  const size = Math.max(widthM, heightM) + 8_000;
  const geom = new THREE.PlaneGeometry(size, size, 1, 1);
  geom.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x0a1e35,
    roughness: 0.7,
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.name = "horizon-ocean";
  mesh.position.y = -0.1; // just below the wave plane (y=0)
  return mesh;
}

function buildVessel(vessel: Vessel): THREE.Object3D {
  const group = new THREE.Group();
  group.name = vessel.id;
  group.userData = { model: vessel.model };

  const hullGroup = loadModel(vessel.model);
  hullGroup.name = `${vessel.id}__hull`;
  group.add(hullGroup);

  for (const sensor of vessel.sensors) {
    group.add(buildSensor(sensor));
  }
  return group;
}

function buildSensor(sensor: Sensor): THREE.Object3D {
  const node = new THREE.Object3D();
  node.name = sensor.id;
  node.userData = { sensorType: sensor.type, config: sensor };
  applyMount(node, sensor.mount);
  return node;
}

function applyMount(node: THREE.Object3D, mount: Mount): void {
  node.position.set(mount.x, mount.y, mount.z);
  const yaw = ((mount.yaw_deg ?? 0) * Math.PI) / 180;
  const pitch = ((mount.pitch_deg ?? 0) * Math.PI) / 180;
  const roll = ((mount.roll_deg ?? 0) * Math.PI) / 180;
  node.rotation.set(roll, pitch, yaw, "ZYX");
}
