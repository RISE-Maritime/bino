import { describe, expect, it } from "vitest";
import { solarPosition, createSky } from "../src/sky.js";

describe("solarPosition", () => {
  it("places the sun ~highest at noon for Kiel", () => {
    const noon = solarPosition("12:00", 54.32);
    const morning = solarPosition("08:00", 54.32);
    const evening = solarPosition("18:00", 54.32);
    expect(noon.elevation).toBeGreaterThan(morning.elevation);
    expect(noon.elevation).toBeGreaterThan(evening.elevation);
  });

  it("yields negative elevation at midnight (Kiel)", () => {
    const midnight = solarPosition("00:00", 54.32);
    expect(midnight.elevation).toBeLessThan(0);
  });

  it("noon elevation matches the simplified-model peak (~59° at lat 54.32)", () => {
    const { elevation } = solarPosition("12:00", 54.32);
    const elDeg = (elevation * 180) / Math.PI;
    expect(elDeg).toBeGreaterThan(55);
    expect(elDeg).toBeLessThan(62);
  });

  it("rejects invalid time_of_day strings", () => {
    expect(() => solarPosition("noon", 54.32)).toThrow();
  });
});

describe("createSky", () => {
  const KIEL = { lat: 54.32, lon: 10.14, height: 0 };
  const env = { time_of_day: "12:00", visibility_m: 20000 };

  it("produces a Sky mesh + sun directional + ambient light", () => {
    const handle = createSky(env, KIEL);
    expect(handle.sky).toBeDefined();
    expect(handle.sun.isDirectionalLight).toBe(true);
    expect(handle.ambient.isAmbientLight).toBe(true);
    handle.dispose();
  });

  it("setEnvironment refreshes the sun position", () => {
    const handle = createSky({ ...env, time_of_day: "12:00" }, KIEL);
    const noonY = handle.sun.position.y;
    handle.setEnvironment({ ...env, time_of_day: "06:00" }, KIEL);
    const morningY = handle.sun.position.y;
    expect(noonY).toBeGreaterThan(morningY);
    handle.dispose();
  });

  it("dims the sun when below the horizon", () => {
    const day = createSky({ ...env, time_of_day: "12:00" }, KIEL);
    const night = createSky({ ...env, time_of_day: "00:00" }, KIEL);
    expect(day.sun.intensity).toBeGreaterThan(night.sun.intensity);
    day.dispose();
    night.dispose();
  });
});
