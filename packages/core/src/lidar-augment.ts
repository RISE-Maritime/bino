// Inject-augment merge for lidar: append Bino's synthetic points to a real
// point cloud, preserving the real cloud's exact byte layout. Pure functions —
// see docs/internal/inject-augment.md.
//
// Unlike radar (per-bin max), lidar merge is concatenation: a point cloud is
// sparse, so the synthetic returns are simply added to the real ones. The only
// subtlety is fidelity — the real cloud may carry per-point fields beyond xyz
// (intensity, ring, time). Dropping them would corrupt the real points for a
// consumer that uses them, so synthetic points are packed into the *real*
// cloud's stride/field layout (xyz at the real offsets, other bytes zero) and
// the real bytes are left untouched.

import { PackedElementField_NumericType } from "./keelson-sdk.js";
import type { PointCloudField } from "./keelson.js";

const FLOAT32 = PackedElementField_NumericType.FLOAT32;

/** Byte offsets of the x/y/z fields within a point's stride, or null if the
 *  cloud doesn't expose all three as FLOAT32 (in which case synthetic points
 *  can't be safely packed into its layout and the caller should forward real). */
export function xyzFieldOffsets(
  fields: ReadonlyArray<PointCloudField>,
): [number, number, number] | null {
  let x: number | undefined;
  let y: number | undefined;
  let z: number | undefined;
  for (const f of fields) {
    if (f.type !== FLOAT32) continue;
    if (f.name === "x") x = f.offset;
    else if (f.name === "y") y = f.offset;
    else if (f.name === "z") z = f.offset;
  }
  if (x === undefined || y === undefined || z === undefined) return null;
  return [x, y, z];
}

/**
 * Concatenate `synthCount` synthetic points (xyz interleaved in `synthPoints`)
 * onto a real point cloud's raw buffer, in the real cloud's stride. Real bytes
 * are copied verbatim; each appended point writes only its xyz floats at
 * `xyzOffsets`, leaving every other field zero. Returns the combined buffer.
 */
export function appendSyntheticPoints(
  realData: Uint8Array,
  pointStride: number,
  xyzOffsets: readonly [number, number, number],
  synthPoints: Float32Array,
  synthCount: number,
): Uint8Array {
  const out = new Uint8Array(realData.byteLength + synthCount * pointStride);
  out.set(realData, 0);
  const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
  const [ox, oy, oz] = xyzOffsets;
  for (let i = 0; i < synthCount; i++) {
    const base = realData.byteLength + i * pointStride;
    view.setFloat32(base + ox, synthPoints[i * 3 + 0]!, true);
    view.setFloat32(base + oy, synthPoints[i * 3 + 1]!, true);
    view.setFloat32(base + oz, synthPoints[i * 3 + 2]!, true);
  }
  return out;
}
