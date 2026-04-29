import type { Scenario } from "@bino/core";

// v0.1 demo scenario — Kiel approach, one tanker (ego) + one ferry,
// bow camera + main lidar. Same shape as the smoke test but in the
// viewer's flat module so we can swap to a fetched YAML at v0.2.
export const v01Scenario: Scenario = {
  name: "kiel_demo",
  anchor: { lat: 54.3233, lon: 10.1394, height: 0 },
  vessels: [
    {
      id: "ego",
      model: "tanker_120m",
      pose_source: { type: "zenoh", topic: "ego/pose" },
      sensors: [
        {
          id: "bow_camera",
          type: "camera",
          mount: { x: 20, y: 0, z: 8 },
          fov_deg: 90,
          resolution: [640, 480],
          rate_hz: 10,
        },
        {
          id: "main_lidar",
          type: "lidar",
          mount: { x: 20, y: 0, z: 8 },
          channels: 32,
          range_m: 200,
          rate_hz: 10,
        },
        {
          id: "main_radar",
          type: "radar_marine",
          mount: { x: 0, y: 0, z: 35 },
          range_m: 2000,
          rotation_rate_hz: 0.4,
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
};
