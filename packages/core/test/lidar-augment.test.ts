import { describe, expect, it } from "vitest";
import { appendSyntheticPoints, xyzFieldOffsets } from "../src/lidar-augment.js";
import {
  decodePointCloudEnvelope,
  decodePointCloudPayload,
  encodePointCloudPayload,
  type PointCloudField,
} from "../src/keelson.js";
import { PackedElementField_NumericType } from "../src/keelson-sdk.js";

const F32 = PackedElementField_NumericType.FLOAT32;
const U8 = PackedElementField_NumericType.UINT8;

const xyzFields: PointCloudField[] = [
  { name: "x", offset: 0, type: F32 },
  { name: "y", offset: 4, type: F32 },
  { name: "z", offset: 8, type: F32 },
];
// xyz + a uint8 intensity at offset 12, padded to a 16-byte stride.
const xyziFields: PointCloudField[] = [...xyzFields, { name: "intensity", offset: 12, type: U8 }];

function pointsToBytes(pts: number[][], stride: number, intensity?: number[]): Uint8Array {
  const data = new Uint8Array(pts.length * stride);
  const view = new DataView(data.buffer);
  pts.forEach((p, i) => {
    view.setFloat32(i * stride + 0, p[0]!, true);
    view.setFloat32(i * stride + 4, p[1]!, true);
    view.setFloat32(i * stride + 8, p[2]!, true);
    if (intensity) view.setUint8(i * stride + 12, intensity[i]!);
  });
  return data;
}

describe("xyzFieldOffsets", () => {
  it("returns the float32 x/y/z offsets", () => {
    expect(xyzFieldOffsets(xyzFields)).toEqual([0, 4, 8]);
    expect(xyzFieldOffsets(xyziFields)).toEqual([0, 4, 8]);
  });

  it("returns null when a coordinate is missing or not float32", () => {
    expect(xyzFieldOffsets([xyzFields[0]!, xyzFields[1]!])).toBeNull(); // no z
    expect(
      xyzFieldOffsets([xyzFields[0]!, xyzFields[1]!, { name: "z", offset: 8, type: U8 }]),
    ).toBeNull(); // z not float32
  });
});

describe("appendSyntheticPoints", () => {
  it("appends synthetic xyz points after the real buffer (stride 12)", () => {
    const real = pointsToBytes([[1, 2, 3]], 12);
    const synth = new Float32Array([10, 11, 12, 20, 21, 22]);
    const out = appendSyntheticPoints(real, 12, [0, 4, 8], synth, 2);
    expect(out.byteLength).toBe(12 * 3);
    const v = new DataView(out.buffer);
    expect(v.getFloat32(0, true)).toBe(1); // real point untouched
    expect(v.getFloat32(12, true)).toBe(10); // synth 0
    expect(v.getFloat32(24 + 8, true)).toBe(22); // synth 1 z
  });

  it("preserves the real cloud's extra fields and zero-fills synthetic ones", () => {
    const real = pointsToBytes([[1, 2, 3]], 16, [200]); // intensity 200 at offset 12
    const synth = new Float32Array([7, 8, 9]);
    const out = appendSyntheticPoints(real, 16, [0, 4, 8], synth, 1);
    const v = new DataView(out.buffer);
    expect(v.getUint8(12)).toBe(200); // real intensity preserved
    expect(v.getFloat32(16, true)).toBe(7); // synth xyz
    expect(v.getUint8(16 + 12)).toBe(0); // synth intensity zero-filled
  });
});

describe("raw point cloud codec roundtrip", () => {
  it("preserves layout through encode → decode, and xyz is still extractable", () => {
    const data = pointsToBytes(
      [
        [1, 2, 3],
        [4, 5, 6],
      ],
      16,
      [10, 20],
    );
    const e = encodePointCloudPayload(
      { data, pointStride: 16, fields: xyziFields, frameId: "real/lidar", time: 1.5 },
      "out/key",
    );
    const raw = decodePointCloudPayload(e.bytes)!;
    expect(raw.pointStride).toBe(16);
    expect(raw.frameId).toBe("real/lidar");
    expect(raw.time).toBeCloseTo(1.5);
    expect(raw.fields.map((f) => f.name)).toEqual(["x", "y", "z", "intensity"]);

    // The xyz-only decoder still reads the same points despite the wider stride.
    const xyz = decodePointCloudEnvelope(e.bytes)!;
    expect(xyz.count).toBe(2);
    expect([...xyz.points.slice(0, 3)]).toEqual([1, 2, 3]);
    expect([...xyz.points.slice(3, 6)]).toEqual([4, 5, 6]);
  });
});
