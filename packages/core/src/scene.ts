import * as THREE from "three";
import type { CompiledScene } from "./compile.js";
import type { Mount, Sensor, Vessel } from "./dsl.js";

export interface BuiltScene {
  scene: THREE.Scene;
  entities: Map<string, THREE.Object3D>;
}

export function buildScene(compiled: CompiledScene): BuiltScene {
  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const sun = new THREE.DirectionalLight(0xffffff, 1.0);
  sun.position.set(50, 100, 50);
  scene.add(sun);

  const entities = new Map<string, THREE.Object3D>();
  for (const vessel of compiled.vessels) {
    const group = buildVessel(vessel);
    scene.add(group);
    entities.set(vessel.id, group);
  }
  return { scene, entities };
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
