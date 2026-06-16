import * as THREE from "three";

/** Shared scene → kernel-input marshalling.
 *
 *  Both the node kernels (`createLidarKernelWasm`, `createRadarKernel`)
 *  and the viewer's Web Worker feeders walk the same scene graph to build
 *  the inputs the WASM kernels expect. This module is the single source
 *  of that logic so the two implementations cannot drift. The only genuine
 *  difference — how a model name maps to a kernel model index — is injected
 *  via the `resolveModelIndex` callback (node re-initialises the WASM model
 *  registry; the viewer posts triangles to its worker). */

export interface VesselInstance {
  model_index: number;
  center: [number, number, number];
  rotation: number[];
  velocity?: [number, number, number];
  angular_velocity_y?: number;
}

export interface VesselBox {
  position: [number, number, number];
  heading: number;
  half_extents: [number, number, number];
  velocity?: [number, number, number];
  angular_velocity_y?: number;
}

/** Lidar sensor pose in the shape the WASM kernel consumes. */
export interface LidarSensorPose {
  origin: [number, number, number];
  rotation: number[];
}

/** Radar sensor pose in the shape the WASM kernel consumes. */
export interface RadarSensorPose {
  position: [number, number, number];
  heading: number;
}

/** Placeholder vessel half-extents until per-model bounds land. */
export const DEFAULT_HALF_EXTENTS: [number, number, number] = [10, 2, 3];

/** Three stores matrices column-major; the WASM kernels expect row-major. */
export function colMajorToRowMajor3x3(m: ArrayLike<number>): number[] {
  return [m[0]!, m[4]!, m[8]!, m[1]!, m[5]!, m[9]!, m[2]!, m[6]!, m[10]!];
}

// Scratch objects reused across calls. Safe because marshalling runs
// synchronously on a single thread, one sensor at a time.
const tmpVec = new THREE.Vector3();
const tmpQuat = new THREE.Quaternion();
const tmpEuler = new THREE.Euler();

/** A scene child is a vessel iff it's a model-bearing Group that isn't
 *  the ego hull the sensor is mounted on. */
function isVesselGroup(child: THREE.Object3D, sensorNode: THREE.Object3D): child is THREE.Group {
  return child instanceof THREE.Group && !!child.userData?.model && child !== sensorNode.parent;
}

/** Resolve a model name to its kernel model index, registering on demand. */
export type ModelIndexResolver = (modelName: string) => number;

/** Marshal lidar vessel instances from the scene. `resolveModelIndex`
 *  maps each model name to its kernel index. */
export function marshalLidarVessels(
  scene: THREE.Scene,
  sensorNode: THREE.Object3D,
  resolveModelIndex: ModelIndexResolver,
): VesselInstance[] {
  const vessels: VesselInstance[] = [];
  for (const child of scene.children) {
    if (!isVesselGroup(child, sensorNode)) continue;
    const modelIndex = resolveModelIndex(child.userData.model as string);
    child.getWorldPosition(tmpVec);
    vessels.push({
      model_index: modelIndex,
      center: [tmpVec.x, tmpVec.y, tmpVec.z],
      rotation: colMajorToRowMajor3x3(child.matrixWorld.elements),
      velocity: child.userData.velocity ?? [0, 0, 0],
      angular_velocity_y: child.userData.angularVelocityY ?? 0,
    });
  }
  return vessels;
}

export function marshalLidarSensorPose(sensorNode: THREE.Object3D): LidarSensorPose {
  sensorNode.getWorldPosition(tmpVec);
  return {
    origin: [tmpVec.x, tmpVec.y, tmpVec.z],
    rotation: colMajorToRowMajor3x3(sensorNode.matrixWorld.elements),
  };
}

/** Marshal radar vessel boxes from the scene. Static obstacles
 *  (buildings) are NOT included here — callers prepend them, since the
 *  node kernel and the viewer worker hold them differently. */
export function marshalRadarVessels(scene: THREE.Scene, sensorNode: THREE.Object3D): VesselBox[] {
  const vessels: VesselBox[] = [];
  for (const child of scene.children) {
    if (!isVesselGroup(child, sensorNode)) continue;
    child.getWorldPosition(tmpVec);
    child.getWorldQuaternion(tmpQuat);
    tmpEuler.setFromQuaternion(tmpQuat, "YXZ");
    vessels.push({
      position: [tmpVec.x, tmpVec.y, tmpVec.z],
      heading: tmpEuler.y,
      half_extents: DEFAULT_HALF_EXTENTS,
      velocity: child.userData.velocity ?? [0, 0, 0],
      angular_velocity_y: child.userData.angularVelocityY ?? 0,
    });
  }
  return vessels;
}

export function marshalRadarSensorPose(sensorNode: THREE.Object3D): RadarSensorPose {
  sensorNode.getWorldPosition(tmpVec);
  sensorNode.getWorldQuaternion(tmpQuat);
  tmpEuler.setFromQuaternion(tmpQuat, "YXZ");
  return { position: [tmpVec.x, tmpVec.y, tmpVec.z], heading: tmpEuler.y };
}
