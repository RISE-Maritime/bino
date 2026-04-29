import * as THREE from "three";
import type { CompiledScene } from "./compile.js";
import type { Mount, Sensor, Vessel } from "./dsl.js";
import { buildTerrainMesh, type TerrainData } from "./terrain.js";
import { createSeaSurface, type SeaSurfaceHandle } from "./sea.js";
import { createSky, type SkyHandle } from "./sky.js";

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

  let skyHandle: SkyHandle | undefined;
  if (opts.sky !== false) {
    skyHandle = createSky(compiled.environment, compiled.anchor);
    scene.add(skyHandle.sky);
    scene.add(skyHandle.sun);
    scene.add(skyHandle.ambient);
  } else {
    // Fallback: the v0.1 default lighting kept for tests / sky=false
    // callers.
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(50, 100, 50);
    scene.add(sun);
  }

  let terrainGroup: THREE.Group | undefined;
  if (opts.terrain) {
    terrainGroup = buildTerrainMesh(opts.terrain, compiled.anchor);
    scene.add(terrainGroup);
  }

  let seaHandle: SeaSurfaceHandle | undefined;
  if (opts.sea !== false) {
    seaHandle = createSeaSurface(compiled.environment);
    scene.add(seaHandle.mesh);
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

function buildVessel(vessel: Vessel): THREE.Object3D {
  const group = new THREE.Group();
  group.name = vessel.id;
  group.userData = { model: vessel.model };

  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(20, 4, 6),
    new THREE.MeshStandardMaterial({ color: 0x808080 }),
  );
  hull.name = `${vessel.id}__placeholder_hull`;
  group.add(hull);

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
