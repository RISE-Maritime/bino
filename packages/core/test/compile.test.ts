import { describe, expect, it, vi } from "vitest";
import { compileScenario } from "../src/compile.js";
import { Keelson } from "../src/dsl.js";

const minimal = (overrides: Record<string, unknown> = {}) => ({
  name: "minimal",
  anchor: { lat: 54.3233, lon: 10.1394, height: 0 },
  vessels: [
    {
      id: "ego",
      model: "tanker_120m",
      pose_source: { type: "zenoh", topic: "ego/pose" },
      sensors: [],
    },
  ],
  modes: { rendering: "replace", clock: "wall", determinism: "relaxed" },
  keelson: { base_path: "bino" },
  ...overrides,
});

describe("compileScenario", () => {
  it("validates and returns a typed scene", () => {
    const scene = compileScenario(minimal());
    expect(scene.name).toBe("minimal");
    expect(scene.vessels).toHaveLength(1);
  });

  it("throws on invalid input", () => {
    expect(() => compileScenario({ name: "broken" })).toThrow();
  });

  it("requires a keelson base_path — no default (ADR-004)", () => {
    expect(() => Keelson.parse({})).toThrow();
    const noKeelson = minimal();
    delete (noKeelson as Record<string, unknown>).keelson;
    expect(() => compileScenario(noKeelson)).toThrow();
  });

  it("carries the keelson base_path through to the compiled scene", () => {
    const scene = compileScenario(minimal({ keelson: { base_path: "myorg" } }));
    expect(scene.keelson.base_path).toBe("myorg");
  });

  it("throws when strict determinism is combined with wall clock", () => {
    expect(() =>
      compileScenario(
        minimal({ modes: { rendering: "replace", clock: "wall", determinism: "strict" } }),
      ),
    ).toThrow("strict determinism requires stepped clock (got 'wall')");
  });

  it("throws when strict determinism is combined with external_fmi clock", () => {
    expect(() =>
      compileScenario(
        minimal({ modes: { rendering: "replace", clock: "external_fmi", determinism: "strict" } }),
      ),
    ).toThrow("strict determinism requires stepped clock (got 'external_fmi')");
  });

  it("accepts strict determinism with stepped clock", () => {
    const scene = compileScenario(
      minimal({ modes: { rendering: "replace", clock: "stepped", determinism: "strict" } }),
    );
    expect(scene.modes.determinism).toBe("strict");
    expect(scene.modes.clock).toBe("stepped");
  });

  it("warns when inject mode is used without strict determinism", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      compileScenario(
        minimal({ modes: { rendering: "inject", clock: "wall", determinism: "relaxed" } }),
      );
      expect(warnSpy).toHaveBeenCalledWith(
        "[bino] inject mode without strict determinism is unusual — inject typically requires tight time-sync",
      );
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("does not warn for inject mode with strict determinism", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      compileScenario(
        minimal({ modes: { rendering: "inject", clock: "stepped", determinism: "strict" } }),
      );
      expect(warnSpy).not.toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });
});

describe("compileScenario — inject-augment", () => {
  const radarVessel = (radar: Record<string, unknown>) => ({
    id: "ego",
    model: "cargo_90m",
    pose_source: { type: "zenoh", topic: "ego/pose" },
    sensors: [
      {
        id: "nav_radar",
        type: "radar_marine",
        mount: { x: 0, y: 30, z: 0 },
        range_m: 4000,
        rotation_rate_hz: 0.4,
        beam_width_deg: 1.5,
        spokes_per_rev: 360,
        range_bins: 256,
        emit: "spoke",
        ...radar,
      },
    ],
  });
  const injectStrict = { rendering: "inject", clock: "stepped", determinism: "strict" };

  it("accepts augment_source pointing at a distinct real topic in inject mode", () => {
    const scene = compileScenario(
      minimal({
        modes: injectStrict,
        vessels: [radarVessel({ augment_source: "platform/@v0/radar/pubsub/radar_spoke/real" })],
      }),
    );
    const sensor = scene.vessels[0]!.sensors[0]!;
    expect(sensor.type === "radar_marine" && sensor.augment_source).toBe(
      "platform/@v0/radar/pubsub/radar_spoke/real",
    );
  });

  it("rejects augment_source outside inject mode", () => {
    expect(() =>
      compileScenario(
        minimal({
          modes: { rendering: "replace", clock: "wall", determinism: "relaxed" },
          vessels: [radarVessel({ augment_source: "platform/real/radar_spoke" })],
        }),
      ),
    ).toThrow(/only valid in inject mode/);
  });

  it("rejects augment_source equal to the sensor's own output key (feedback loop)", async () => {
    const { resolveOutputIdentity, radarSpokeTopicKey } = await import("../src/keelson.js");
    const ownKey = radarSpokeTopicKey(
      resolveOutputIdentity({ scenarioBasePath: "bino", vesselId: "ego", sensorId: "nav_radar" }),
    );
    expect(() =>
      compileScenario(
        minimal({ modes: injectStrict, vessels: [radarVessel({ augment_source: ownKey })] }),
      ),
    ).toThrow(/feedback loop/);
  });

  const lidarVessel = (lidar: Record<string, unknown>) => ({
    id: "ego",
    model: "cargo_90m",
    pose_source: { type: "zenoh", topic: "ego/pose" },
    sensors: [
      {
        id: "main_lidar",
        type: "lidar",
        mount: { x: 0, y: 20, z: 0 },
        channels: 16,
        range_m: 200,
        rate_hz: 10,
        ...lidar,
      },
    ],
  });

  it("accepts lidar augment_source in inject mode", () => {
    const scene = compileScenario(
      minimal({
        modes: injectStrict,
        vessels: [lidarVessel({ augment_source: "platform/@v0/lidar/pubsub/point_cloud/real" })],
      }),
    );
    const sensor = scene.vessels[0]!.sensors[0]!;
    expect(sensor.type === "lidar" && sensor.augment_source).toBe(
      "platform/@v0/lidar/pubsub/point_cloud/real",
    );
  });

  it("rejects lidar augment_source equal to its own point_cloud key (feedback loop)", async () => {
    const { resolveOutputIdentity, lidarTopicKey } = await import("../src/keelson.js");
    const ownKey = lidarTopicKey(
      resolveOutputIdentity({ scenarioBasePath: "bino", vesselId: "ego", sensorId: "main_lidar" }),
    );
    expect(() =>
      compileScenario(
        minimal({ modes: injectStrict, vessels: [lidarVessel({ augment_source: ownKey })] }),
      ),
    ).toThrow(/feedback loop/);
  });
});
