import type { Scenario } from "@bino/core";

// v0.1 demo scenario — Kiel approach, one tanker (ego) + one ferry,
// bow camera + main lidar. Same shape as the smoke test but in the
// viewer's flat module so we can swap to a fetched YAML at v0.2.
export const v01Scenario: Scenario = {
  name: "kiel_demo",
  anchor: { lat: 54.37, lon: 10.185, height: 0 },
  vessels: [
    {
      id: "ego",
      model: "tanker_120m",
      pose_source: { type: "zenoh", topic: "ego/pose" },
      sensors: [
        {
          id: "bow_camera",
          type: "camera",
          mount: { x: 20, y: 8, z: 0 },
          fov_deg: 90,
          resolution: [640, 480],
          rate_hz: 10,
          phase_offset_s: 0,
          exposure_time_s: 0,
        },
        {
          id: "stbd_lidar",
          type: "lidar",
          mount: { x: 0, y: 15, z: 8 },
          channels: 32,
          range_m: 200,
          rate_hz: 10,
          phase_offset_s: 0,
          azimuths: 256,
          fov_h_deg: 360,
        },
        {
          id: "port_lidar",
          type: "lidar",
          mount: { x: 0, y: 15, z: -8 },
          channels: 32,
          range_m: 200,
          rate_hz: 10,
          phase_offset_s: 0,
          azimuths: 256,
          fov_h_deg: 360,
        },
        {
          id: "main_radar",
          type: "radar_marine",
          mount: { x: 0, y: 35, z: 0 },
          range_m: 2000,
          rotation_rate_hz: 0.4,
          phase_offset_s: 0,
          beam_width_deg: 1.2,
          spokes_per_rev: 360,
          range_bins: 200,
        },
      ],
    },
    {
      id: "ferry",
      model: "ferry_60m",
      pose_source: { type: "zenoh", topic: "ferry/pose" },
      sensors: [],
    },
  ],
  modes: { rendering: "replace", clock: "wall", determinism: "relaxed" },
  environment: {
    sea_state: {
      significant_wave_height: 1.2,
      peak_period: 6.5,
      direction_deg: 215,
      spectrum: "pierson_moskowitz",
    },
    wind: { speed: 8.5, direction_deg: 220 },
    time_of_day: "12:00",
    visibility_m: 8000,
    rain_rate_mm_h: 0,
  },
  terrain: {
    bbox: [10.05, 54.28, 10.25, 54.38] as [number, number, number, number],
    landmask: true,
    buildings: true,
    seamarks: true,
  },
};
