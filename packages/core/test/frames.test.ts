import { describe, expect, it } from "vitest";
import { enuToScene, sceneToEnu, geodeticToScene } from "../src/frames.js";
import type { Anchor } from "../src/dsl.js";

describe("ENU ↔ three.js scene frame", () => {
  it("maps East→+X, Up→+Y, North→−Z", () => {
    const expectVec = (got: number[], want: number[]) => {
      want.forEach((w, i) => expect(got[i]).toBeCloseTo(w, 9));
    };
    expectVec(enuToScene({ e: 1, n: 0, u: 0 }), [1, 0, 0]); // East → +X
    expectVec(enuToScene({ e: 0, n: 0, u: 1 }), [0, 1, 0]); // Up → +Y
    expectVec(enuToScene({ e: 0, n: 1, u: 0 }), [0, 0, -1]); // North → −Z
  });

  it("round-trips ENU → scene → ENU", () => {
    const enu = { e: 123.5, n: -47.25, u: 8.0 };
    const back = sceneToEnu(enuToScene(enu));
    expect(back.e).toBeCloseTo(enu.e, 9);
    expect(back.n).toBeCloseTo(enu.n, 9);
    expect(back.u).toBeCloseTo(enu.u, 9);
  });

  it("places a point north of the anchor at −Z", () => {
    const anchor: Anchor = { lat: 54.32, lon: 10.14, height: 0 };
    // ~100 m due north (lat increases), same lon.
    const north = geodeticToScene({ lat: 54.32 + 100 / 111_320, lon: 10.14, height: 0 }, anchor);
    expect(north[0]).toBeCloseTo(0, 1); // no east offset
    expect(north[2]).toBeLessThan(0); // north → −Z
    expect(Math.abs(north[2])).toBeCloseTo(100, 0); // ~100 m
  });

  it("places a point east of the anchor at +X", () => {
    const anchor: Anchor = { lat: 54.32, lon: 10.14, height: 0 };
    const east = geodeticToScene(
      { lat: 54.32, lon: 10.14 + 100 / (111_320 * Math.cos((54.32 * Math.PI) / 180)), height: 0 },
      anchor,
    );
    expect(east[0]).toBeGreaterThan(0); // east → +X
    expect(Math.abs(east[0])).toBeCloseTo(100, 0);
    expect(east[2]).toBeCloseTo(0, 1); // no north offset
  });
});
