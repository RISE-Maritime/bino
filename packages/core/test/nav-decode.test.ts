import { describe, expect, it } from "vitest";
import { decodeLocationFixEnvelope, decodeTimestampedFloatEnvelope } from "../src/keelson.js";
import { encodePayloadFromTypeName, enclose, Envelope } from "../src/keelson-sdk.js";

// Build an enclosed envelope the way a real keelson producer would, so the
// decoders are exercised against the actual wire format rather than a mock.
function envelope(typeName: string, payload: object, at: Date): Uint8Array {
  const payloadBytes = encodePayloadFromTypeName(typeName, payload)!;
  return Envelope.encode(enclose(payloadBytes, at)).finish();
}

describe("decodeLocationFixEnvelope", () => {
  it("roundtrips lat/lon/altitude/time", () => {
    const at = new Date(1_700_000_000_000);
    const bytes = envelope(
      "foxglove.LocationFix",
      { timestamp: at, frameId: "gnss", latitude: 54.321, longitude: 10.145, altitude: 3.5 },
      at,
    );
    const fix = decodeLocationFixEnvelope(bytes);
    expect(fix).not.toBeNull();
    expect(fix!.lat).toBeCloseTo(54.321, 6);
    expect(fix!.lon).toBeCloseTo(10.145, 6);
    expect(fix!.altitude).toBeCloseTo(3.5, 6);
    expect(fix!.time).toBeCloseTo(1_700_000_000, 3);
  });

  it("returns null on garbage", () => {
    expect(decodeLocationFixEnvelope(new Uint8Array([1, 2, 3]))).toBeNull();
  });
});

describe("decodeTimestampedFloatEnvelope", () => {
  it("roundtrips value/time (heading)", () => {
    const at = new Date(1_700_000_001_500);
    const bytes = envelope("keelson.TimestampedFloat", { timestamp: at, value: 127.5 }, at);
    const tf = decodeTimestampedFloatEnvelope(bytes);
    expect(tf).not.toBeNull();
    expect(tf!.value).toBeCloseTo(127.5, 4);
    expect(tf!.time).toBeCloseTo(1_700_000_001.5, 3);
  });

  it("returns null on garbage", () => {
    expect(decodeTimestampedFloatEnvelope(new Uint8Array([9, 9]))).toBeNull();
  });
});
