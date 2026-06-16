import { describe, expect, it } from "vitest";
import { initLidarWorker, runLidarSweep, runRadarSweep } from "../src/sensor-worker-core.js";

const lidarConfig = {
  channels: 8,
  azimuths: 16,
  fov_v_deg: 90,
  fov_h_deg: 90,
  range_m: 200,
  sweep_duration_s: 0.1,
};

const radarConfig = {
  range_m: 200,
  spokes_per_rev: 36,
  range_bins: 100,
  sweep_duration_s: 1,
};

describe("runLidarSweep", () => {
  it("normalises output to Float32Arrays", () => {
    initLidarWorker([], []);
    const out = runLidarSweep(
      { vessels: [] },
      { origin: [0, 0, 0], rotation: [1, 0, 0, 0, 1, 0, 0, 0, 1] },
      lidarConfig,
      undefined,
    );
    expect(out.points).toBeInstanceOf(Float32Array);
    expect(out.timestamps).toBeInstanceOf(Float32Array);
    expect(out.count).toBe(0); // empty scene → no hits
  });
});

describe("runRadarSweep", () => {
  it("includes static obstacles in the sweep (merge ahead of vessels)", () => {
    const host = { position: [0, 0, 0], heading: 0 };
    const obstacle = { position: [0, 5, -60], heading: 0, half_extents: [10, 5, 10] };

    const withObstacle = runRadarSweep({ vessels: [] }, [obstacle], host, radarConfig, undefined);
    const lit = withObstacle.reduce(
      (sum, s) => sum + s.intensity.reduce((a, b) => a + (b > 0 ? 1 : 0), 0),
      0,
    );
    expect(lit).toBeGreaterThan(0);

    const empty = runRadarSweep({ vessels: [] }, [], host, radarConfig, undefined);
    const litEmpty = empty.reduce(
      (sum, s) => sum + s.intensity.reduce((a, b) => a + (b > 0 ? 1 : 0), 0),
      0,
    );
    expect(litEmpty).toBe(0);
  });

  it("returns spokes with Uint8Array intensity", () => {
    const out = runRadarSweep(
      { vessels: [] },
      [],
      { position: [0, 0, 0], heading: 0 },
      radarConfig,
      undefined,
    );
    expect(out.length).toBe(36);
    expect(out[0]!.intensity).toBeInstanceOf(Uint8Array);
  });
});
