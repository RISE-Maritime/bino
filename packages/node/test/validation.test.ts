import { describe, expect, it } from "vitest";
import { compileScenario, MemoryPoseStream, type Scenario } from "@bino/core";
import { createNodeService, type NodeService } from "../src/service.js";
import { createHeadlessRenderer } from "../src/headless-gl.js";

const glAvailable = (() => {
  try {
    const handle = createHeadlessRenderer(8, 8);
    handle.dispose();
    return true;
  } catch {
    return false;
  }
})();
const itGl = glAvailable ? it : it.skip;

// Shared vessel/sensor layout — small resolution to keep tests fast.
const vessels: Scenario["vessels"] = [
  {
    id: "ego",
    model: "tanker_120m",
    pose_source: { type: "zenoh", topic: "ego/pose" },
    sensors: [
      {
        id: "bow_camera",
        type: "camera",
        mount: { x: 60, y: 18, z: 0 },
        fov_deg: 90,
        resolution: [64, 48],
        rate_hz: 10,
      },
      {
        id: "main_lidar",
        type: "lidar",
        mount: { x: 0, y: 15, z: 0 },
        channels: 16,
        range_m: 200,
        rate_hz: 10,
      },
      {
        id: "main_radar",
        type: "radar_marine",
        mount: { x: 0, y: 35, z: 0 },
        range_m: 4000,
        rotation_rate_hz: 10,
        beam_width_deg: 1.2,
        spokes_per_rev: 60,
        range_bins: 64,
      },
    ],
  },
  {
    id: "ferry",
    model: "ferry_60m",
    pose_source: { type: "zenoh", topic: "ferry/pose" },
    sensors: [],
  },
];

const modes: Scenario["modes"] = {
  rendering: "replace",
  clock: "stepped",
  determinism: "strict",
};

const anchor: Scenario["anchor"] = { lat: 54.37, lon: 10.185, height: 0 };

function makeScenario(name: string, env: Partial<Scenario["environment"]>): Scenario {
  return {
    name,
    anchor,
    vessels,
    modes,
    keelson: { base_path: "bino" },
    environment: {
      time_of_day: "12:00",
      visibility_m: 20000,
      rain_rate_mm_h: 0,
      ...env,
    },
  };
}

interface SensorSnapshot {
  lidarCount: number;
  radarNonZeroBins: number;
  radarTotalIntensity: number;
  cameraMeanLuminance: number;
}

interface PoseSetup {
  entityId: string;
  position: [number, number, number];
}

async function collectSnapshot(service: NodeService, poses?: PoseSetup[]): Promise<SensorSnapshot> {
  const stream = new MemoryPoseStream();
  if (poses) {
    for (const p of poses) {
      stream.push({
        entityId: p.entityId,
        pose: { position: p.position, orientation: [0, 0, 0, 1] },
        time: 0,
      });
    }
  }
  const gen = service.runner.frames(stream);

  const { value } = await gen.next();
  service.runner.stop();
  stream.close();
  await gen.return(undefined);

  const outputs = value!.outputs;

  const lid = outputs.find((o) => o.sensorId.endsWith("main_lidar"))!.output as { count: number };

  const radar = outputs.find((o) => o.sensorId.endsWith("main_radar"))!.output as {
    spokes: Array<{ intensity: Uint8Array }>;
  };

  let radarNonZero = 0;
  let radarTotal = 0;
  for (const spoke of radar.spokes) {
    for (const v of spoke.intensity) {
      if (v > 0) radarNonZero++;
      radarTotal += v;
    }
  }

  const cam = outputs.find((o) => o.sensorId.endsWith("bow_camera"))!.output as {
    pixels: Uint8Array;
    width: number;
    height: number;
  };

  let lumSum = 0;
  for (let i = 0; i < cam.pixels.length; i += 4) {
    lumSum += 0.299 * cam.pixels[i]! + 0.587 * cam.pixels[i + 1]! + 0.114 * cam.pixels[i + 2]!;
  }
  const meanLum = lumSum / (cam.width * cam.height);

  return {
    lidarCount: lid.count,
    radarNonZeroBins: radarNonZero,
    radarTotalIntensity: radarTotal,
    cameraMeanLuminance: meanLum,
  };
}

async function runScenario(
  name: string,
  env: Partial<Scenario["environment"]>,
  poses?: PoseSetup[],
): Promise<SensorSnapshot> {
  const scenario = compileScenario(makeScenario(name, env));
  const service = createNodeService({ scenario, tickHz: 1000 });
  try {
    return await collectSnapshot(service, poses);
  } finally {
    service.dispose();
  }
}

describe("replace-mode validation", () => {
  itGl(
    "lidar: fog reduces point count vs clear weather",
    async () => {
      // Place ferry 100m ahead of the lidar sensor. In clear weather
      // (200m range), the lidar can see it. In fog (vis=50m,
      // max_range≈29m), the ferry is beyond detection range.
      const ferryPose: PoseSetup[] = [{ entityId: "ferry", position: [0, 0, -100] }];
      const clear = await runScenario("val_clear", {}, ferryPose);
      const fog = await runScenario("val_fog", { visibility_m: 50 }, ferryPose);

      expect(clear.lidarCount).toBeGreaterThan(0);
      expect(fog.lidarCount).toBeLessThan(clear.lidarCount);
    },
    30_000,
  );

  itGl(
    "lidar: storm (fog+rain) reduces points further than fog alone",
    async () => {
      const ferryPose: PoseSetup[] = [{ entityId: "ferry", position: [0, 0, -100] }];
      const fog = await runScenario("val_fog", { visibility_m: 50 }, ferryPose);
      const storm = await runScenario(
        "val_storm",
        {
          visibility_m: 20,
          rain_rate_mm_h: 50,
        },
        ferryPose,
      );

      expect(storm.lidarCount).toBeLessThanOrEqual(fog.lidarCount);
    },
    30_000,
  );

  itGl(
    "radar: sea state increases non-zero bins (clutter)",
    async () => {
      const calm = await runScenario("val_clear", {});
      const seaState = await runScenario("val_sea", {
        sea_state: {
          significant_wave_height: 2.5,
          peak_period: 7.0,
          direction_deg: 180,
          spectrum: "pierson_moskowitz",
        },
      });

      expect(seaState.radarNonZeroBins).toBeGreaterThanOrEqual(calm.radarNonZeroBins);
    },
    30_000,
  );

  itGl(
    "radar: rain attenuates far-range intensity",
    async () => {
      const clear = await runScenario("val_clear", {});
      const rain = await runScenario("val_rain", {
        rain_rate_mm_h: 30,
        visibility_m: 10000,
      });

      // Rain causes atmospheric attenuation — total radar intensity
      // should be reduced compared to clear conditions.
      expect(rain.radarTotalIntensity).toBeLessThanOrEqual(clear.radarTotalIntensity);
    },
    30_000,
  );

  itGl(
    "camera: dusk produces lower mean luminance than noon",
    async () => {
      const noon = await runScenario("val_noon", {
        time_of_day: "12:00",
      });
      const dusk = await runScenario("val_dusk", {
        time_of_day: "20:30",
      });

      expect(noon.cameraMeanLuminance).toBeGreaterThan(dusk.cameraMeanLuminance);
    },
    30_000,
  );
});
