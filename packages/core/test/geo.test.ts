import { describe, expect, it } from "vitest";
import { geodeticToEnu } from "../src/geo.js";

const KIEL = { lat: 54.3233, lon: 10.1394, height: 0 };

describe("geodeticToEnu", () => {
  it("returns ~zero at the anchor itself", () => {
    const enu = geodeticToEnu(KIEL, KIEL);
    expect(enu.e).toBeCloseTo(0, 6);
    expect(enu.n).toBeCloseTo(0, 6);
    expect(enu.u).toBeCloseTo(0, 6);
  });

  it("places a point ~111m due north for +0.001 deg latitude", () => {
    const point = { ...KIEL, lat: KIEL.lat + 0.001 };
    const enu = geodeticToEnu(point, KIEL);
    expect(enu.e).toBeCloseTo(0, 1);
    expect(enu.n).toBeGreaterThan(110);
    expect(enu.n).toBeLessThan(112);
    expect(enu.u).toBeCloseTo(0, 1);
  });

  it("places a point east of the anchor at +lon", () => {
    const point = { ...KIEL, lon: KIEL.lon + 0.001 };
    const enu = geodeticToEnu(point, KIEL);
    expect(enu.e).toBeGreaterThan(0);
    expect(enu.n).toBeCloseTo(0, 0);
  });

  it("encodes height as +up", () => {
    const enu = geodeticToEnu({ ...KIEL, height: 42 }, KIEL);
    expect(enu.u).toBeCloseTo(42, 3);
    expect(enu.e).toBeCloseTo(0, 3);
    expect(enu.n).toBeCloseTo(0, 3);
  });
});
