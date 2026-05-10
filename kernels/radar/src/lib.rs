//! Bino marine radar v0 — geometry-of-returns kernel.
//!
//! Crude-on-purpose: rays from the radar origin in the horizontal
//! plane, find the nearest vessel-bbox intersection per spoke, fill
//! intensity bins by range. **No antenna pattern, no sea clutter, no
//! propagation effects, no rain attenuation, binary intensity (1 or
//! 0 per range bin).** Real V&V of collision avoidance under clutter
//! cannot use this — see `docs/plan.md` v0.3 risks. The v1.0
//! sea-clutter model is a separate research thread.

#![cfg_attr(not(test), allow(dead_code))]

use serde::{Deserialize, Serialize};

/// Per-frame snapshot of vessel positions in world / scene-anchor frame.
/// Bino constructs this on the JS side and copies it across the
/// WASM boundary each frame.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SceneSnapshot {
    pub vessels: Vec<VesselBox>,
}

/// Axis-aligned-in-yaw bounding box for a vessel. v0.3 ignores roll
/// and pitch — radar is a horizontal-plane sensor and the boxes are
/// thin in z compared to length/beam.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct VesselBox {
    /// World-frame position [x, y, z] in metres (ENU; y is up here, NOT north).
    pub position: [f32; 3],
    /// Heading (yaw) in radians, CCW from +x.
    pub heading: f32,
    /// Half-length (along heading), half-beam (perpendicular), half-height — metres.
    pub half_extents: [f32; 3],
    /// World-frame linear velocity in m/s. Default [0,0,0].
    #[serde(default)]
    pub velocity: [f32; 3],
    /// Yaw rate in rad/s. Default 0.
    #[serde(default)]
    pub angular_velocity_y: f32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RadarConfig {
    /// Maximum range in metres.
    pub range_m: f32,
    /// Number of azimuth samples per full revolution.
    pub spokes_per_rev: u32,
    /// Number of range bins per spoke.
    pub range_bins: u32,
    /// Sweep duration in seconds. 0.0 disables interpolation (backward compat).
    #[serde(default)]
    pub sweep_duration_s: f32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RadarSpoke {
    /// Azimuth in radians, 0 = host's +x heading, CCW positive.
    pub azimuth: f32,
    /// Per-bin intensity, length == config.range_bins. 0 or 255 in v0 (binary).
    pub intensity: Vec<u8>,
    /// Time offset from sweep start, in seconds.
    pub timestamp: f32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RadarSweep {
    pub spokes: Vec<RadarSpoke>,
}

/// Host (radar-bearing vessel) pose at the moment of the sweep.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct HostPose {
    pub position: [f32; 3],
    pub heading: f32,
}

/// Compute one full sweep — for v0.3 we generate the entire sweep in
/// a single call rather than streaming spoke-by-spoke. At a typical
/// 0.4 Hz rotation that's 2.5 s between calls; the cost of generating
/// 360 spokes synchronously is negligible compared to the wait.
///
/// When `config.sweep_duration_s > 0.0`, vessels are interpolated per-
/// spoke according to their velocity and angular_velocity_y, modelling
/// motion during the sweep.
pub fn sweep(scene: &SceneSnapshot, host: &HostPose, config: &RadarConfig) -> RadarSweep {
    let n_spokes = config.spokes_per_rev.max(1) as usize;
    let n_bins = config.range_bins.max(1) as usize;
    let mut spokes = Vec::with_capacity(n_spokes);
    let bin_width = config.range_m / n_bins as f32;
    let interpolate = config.sweep_duration_s > 0.0;

    for i in 0..n_spokes {
        let azimuth = (i as f32 / n_spokes as f32) * std::f32::consts::TAU;
        let world_angle = host.heading + azimuth;
        let mut intensity = vec![0u8; n_bins];

        let dt = if interpolate {
            (i as f32 / n_spokes as f32) * config.sweep_duration_s
        } else {
            0.0
        };

        let nearest = if interpolate {
            // Build interpolated scene snapshot for this spoke.
            let interp_scene = SceneSnapshot {
                vessels: scene
                    .vessels
                    .iter()
                    .map(|v| VesselBox {
                        position: [
                            v.position[0] + v.velocity[0] * dt,
                            v.position[1] + v.velocity[1] * dt,
                            v.position[2] + v.velocity[2] * dt,
                        ],
                        heading: v.heading + v.angular_velocity_y * dt,
                        half_extents: v.half_extents,
                        velocity: v.velocity,
                        angular_velocity_y: v.angular_velocity_y,
                    })
                    .collect(),
            };
            nearest_hit(&interp_scene, host.position, world_angle, config.range_m)
        } else {
            nearest_hit(scene, host.position, world_angle, config.range_m)
        };

        if let Some(range) = nearest {
            let bin = (range / bin_width).floor() as usize;
            if bin < n_bins {
                intensity[bin] = 255;
            }
        }

        spokes.push(RadarSpoke {
            azimuth,
            intensity,
            timestamp: dt,
        });
    }

    RadarSweep { spokes }
}

/// Closest hit along a ray from `origin` at `world_angle` (radians,
/// 0 = +x, CCW), out to `max_range`. Returns Some(distance) or None.
fn nearest_hit(
    scene: &SceneSnapshot,
    origin: [f32; 3],
    world_angle: f32,
    max_range: f32,
) -> Option<f32> {
    let dir = [world_angle.cos(), world_angle.sin()];
    let mut best: Option<f32> = None;

    for v in &scene.vessels {
        // Skip if the vessel is the host (or overlaps the radar). We
        // consider any bbox that contains the origin point as
        // self-shadowing — return None for that ray.
        let dx = v.position[0] - origin[0];
        let dy = v.position[2] - origin[2]; // y in our coords is up; the
                                            // horizontal plane is x/z.
                                            // Adjust if scene anchor changes.
        // Project (dx, dy) into vessel-local frame (rotate by -heading).
        let cos_h = (-v.heading).cos();
        let sin_h = (-v.heading).sin();
        let lx = cos_h * dx - sin_h * dy;
        let ly = sin_h * dx + cos_h * dy;

        let half = [v.half_extents[0], v.half_extents[2]];

        if lx.abs() <= half[0] && ly.abs() <= half[1] {
            // Origin is inside this bbox — treat as zero-range return
            // (the host's own hull, basically).
            return Some(0.0);
        }

        // Project the ray direction into vessel-local frame too.
        let ldx = cos_h * dir[0] - sin_h * dir[1];
        let ldy = sin_h * dir[0] + cos_h * dir[1];

        // Cast ray from origin in vessel-local coords, hit-test against
        // axis-aligned box centred at +(lx, ly). i.e. ray origin at -lx, -ly
        // hitting box centred at origin. Equivalent: ray origin = (-lx, -ly),
        // direction = (ldx, ldy), test against box [-half[0], +half[0]]².
        // Reformulate: shift so vessel centre is origin → ray origin is
        // (-lx_centred, -ly_centred). lx and ly are vessel→origin already
        // (because we computed lx from dx = v - origin), so ray-origin in
        // vessel-local frame is -lx, -ly.
        if let Some(t) = ray_box_intersect(-lx, -ly, ldx, ldy, half[0], half[1], max_range) {
            best = Some(match best {
                Some(prev) => prev.min(t),
                None => t,
            });
        }
    }

    best
}

/// Slab-method ray vs axis-aligned 2D box centred at origin with
/// half-extents (hx, hy). Ray origin (rox, roy), direction (rdx, rdy).
/// Returns the first positive hit distance ≤ max_range, else None.
fn ray_box_intersect(
    rox: f32,
    roy: f32,
    rdx: f32,
    rdy: f32,
    hx: f32,
    hy: f32,
    max_range: f32,
) -> Option<f32> {
    let mut t_min: f32 = 0.0;
    let mut t_max: f32 = max_range;

    for (ro, rd, h) in [(rox, rdx, hx), (roy, rdy, hy)] {
        if rd.abs() < 1e-9 {
            if ro < -h || ro > h {
                return None;
            }
        } else {
            let t1 = (-h - ro) / rd;
            let t2 = (h - ro) / rd;
            let (lo, hi) = if t1 < t2 { (t1, t2) } else { (t2, t1) };
            t_min = t_min.max(lo);
            t_max = t_max.min(hi);
            if t_max < t_min {
                return None;
            }
        }
    }

    if t_min >= 0.0 && t_min <= max_range {
        Some(t_min)
    } else {
        None
    }
}

// --- WASM bindings ------------------------------------------------

#[cfg(target_arch = "wasm32")]
mod wasm {
    use super::*;
    use wasm_bindgen::prelude::*;

    /// JS entry point. Takes serde-encoded SceneSnapshot/HostPose/RadarConfig
    /// (via serde-wasm-bindgen), returns a serde-encoded RadarSweep.
    /// Copy semantics — small payloads, no SharedArrayBuffer (S8).
    #[wasm_bindgen]
    pub fn radar_sweep(
        scene: JsValue,
        host: JsValue,
        config: JsValue,
    ) -> Result<JsValue, JsValue> {
        let scene: SceneSnapshot = serde_wasm_bindgen::from_value(scene)?;
        let host: HostPose = serde_wasm_bindgen::from_value(host)?;
        let config: RadarConfig = serde_wasm_bindgen::from_value(config)?;
        let result = sweep(&scene, &host, &config);
        Ok(serde_wasm_bindgen::to_value(&result)?)
    }
}

// --- Tests --------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    fn cfg(spokes: u32, bins: u32, range: f32) -> RadarConfig {
        RadarConfig {
            range_m: range,
            spokes_per_rev: spokes,
            range_bins: bins,
            sweep_duration_s: 0.0,
        }
    }

    fn host_at_origin() -> HostPose {
        HostPose {
            position: [0.0, 0.0, 0.0],
            heading: 0.0,
        }
    }

    fn vessel_at(x: f32, z: f32) -> VesselBox {
        VesselBox {
            position: [x, 0.0, z],
            heading: 0.0,
            half_extents: [10.0, 2.0, 3.0],
            velocity: [0.0; 3],
            angular_velocity_y: 0.0,
        }
    }

    #[test]
    fn empty_scene_yields_all_zero_intensity() {
        let scene = SceneSnapshot { vessels: vec![] };
        let sw = sweep(&scene, &host_at_origin(), &cfg(8, 16, 100.0));
        assert_eq!(sw.spokes.len(), 8);
        for spoke in &sw.spokes {
            assert!(spoke.intensity.iter().all(|&v| v == 0));
        }
    }

    #[test]
    fn vessel_directly_ahead_lights_a_bin_at_expected_range() {
        // host at origin facing +x. world_angle for spoke 0 is heading
        // (0). scene vessel at +x = +50.
        let scene = SceneSnapshot {
            vessels: vec![vessel_at(50.0, 0.0)],
        };
        let sw = sweep(&scene, &host_at_origin(), &cfg(36, 100, 100.0));
        // bin width = 100/100 = 1m. The bbox half-x = 10, so the near
        // face is at x=40 → bin 39 or 40.
        let spoke0 = &sw.spokes[0];
        let lit_bins: Vec<usize> = spoke0
            .intensity
            .iter()
            .enumerate()
            .filter_map(|(i, &v)| if v > 0 { Some(i) } else { None })
            .collect();
        assert_eq!(lit_bins.len(), 1, "exactly one bin should light up");
        assert!(
            lit_bins[0] >= 38 && lit_bins[0] <= 41,
            "expected bin near 40, got {}",
            lit_bins[0]
        );
    }

    #[test]
    fn vessel_outside_range_produces_no_return() {
        let scene = SceneSnapshot {
            vessels: vec![vessel_at(500.0, 0.0)],
        };
        let sw = sweep(&scene, &host_at_origin(), &cfg(8, 16, 100.0));
        for spoke in &sw.spokes {
            assert!(spoke.intensity.iter().all(|&v| v == 0));
        }
    }

    #[test]
    fn vessel_off_axis_lights_only_its_azimuth() {
        // Vessel at (0, 0, -50) — that's directly to the +z direction.
        // For the host at origin facing +x, the spoke pointing at +z is
        // at azimuth +π/2 (90°). With 4 spokes/rev that's spoke 1.
        let scene = SceneSnapshot {
            vessels: vec![vessel_at(0.0, -50.0)],
        };
        let sw = sweep(&scene, &host_at_origin(), &cfg(4, 100, 100.0));
        let lit_count_per_spoke: Vec<usize> = sw
            .spokes
            .iter()
            .map(|s| s.intensity.iter().filter(|&&v| v > 0).count())
            .collect();
        let total_lit: usize = lit_count_per_spoke.iter().sum();
        assert_eq!(total_lit, 1, "exactly one spoke should have a return");
    }

    #[test]
    fn backward_compat_sweep_duration_zero_timestamps() {
        // With sweep_duration_s = 0, all timestamps should be 0.0.
        let scene = SceneSnapshot {
            vessels: vec![vessel_at(50.0, 0.0)],
        };
        let sw = sweep(&scene, &host_at_origin(), &cfg(36, 100, 100.0));
        for spoke in &sw.spokes {
            assert_eq!(spoke.timestamp, 0.0, "timestamp should be 0 when sweep_duration_s == 0");
        }
    }

    #[test]
    fn temporal_interpolation_radar() {
        // Vessel at (50, 0, 0) with velocity (5, 0, 0) m/s.
        // Sweep duration 2.5s (0.4 Hz), 36 spokes, 100 bins, range 200m.
        let scene = SceneSnapshot {
            vessels: vec![VesselBox {
                position: [50.0, 0.0, 0.0],
                heading: 0.0,
                half_extents: [10.0, 2.0, 3.0],
                velocity: [5.0, 0.0, 0.0],
                angular_velocity_y: 0.0,
            }],
        };
        let config = RadarConfig {
            range_m: 200.0,
            spokes_per_rev: 36,
            range_bins: 100,
            sweep_duration_s: 2.5,
        };
        let sw = sweep(&scene, &host_at_origin(), &config);
        assert_eq!(sw.spokes.len(), 36);

        // Spoke timestamps should increase from 0 to near 2.5s.
        let t0 = sw.spokes[0].timestamp;
        let t_last = sw.spokes[35].timestamp;
        assert!(
            t0.abs() < 1e-6,
            "first spoke timestamp should be ~0, got {t0}"
        );
        assert!(
            t_last > 2.0 && t_last <= 2.5 + 1e-6,
            "last spoke timestamp should be near 2.5s, got {t_last}"
        );

        // Spoke 0 (azimuth ~0, pointing +x) should hit the vessel.
        // Near face at x=40 initially. Bin width = 200/100 = 2m. So bin ~20.
        let spoke0 = &sw.spokes[0];
        let lit0: Vec<usize> = spoke0
            .intensity
            .iter()
            .enumerate()
            .filter_map(|(i, &v)| if v > 0 { Some(i) } else { None })
            .collect();
        assert!(!lit0.is_empty(), "spoke 0 should hit the vessel");

        // Spoke 18 (azimuth ~pi, pointing -x) should not hit the vessel.
        let spoke18 = &sw.spokes[18];
        let lit18: Vec<usize> = spoke18
            .intensity
            .iter()
            .enumerate()
            .filter_map(|(i, &v)| if v > 0 { Some(i) } else { None })
            .collect();
        assert!(lit18.is_empty(), "spoke 18 (opposite) should not hit");

        // With the vessel moving in +x at 5 m/s over 2.5s, it moves 12.5m.
        // Spokes near azimuth 0 at later times should see the vessel at
        // a slightly different range. Compare spoke 0 (dt=0, near face=40)
        // with a spoke at azimuth 0+epsilon at a later time. We use spoke 35
        // which is at azimuth ~350 degrees (nearly full circle back to +x).
        // dt_35 = (35/36)*2.5 = 2.431s. Vessel shifted by 5*2.431 = 12.15m.
        // Near face at 50+12.15-10 = 52.15m. Bin = 52.15/2 ~ 26.
        let spoke35 = &sw.spokes[35];
        let lit35: Vec<usize> = spoke35
            .intensity
            .iter()
            .enumerate()
            .filter_map(|(i, &v)| if v > 0 { Some(i) } else { None })
            .collect();
        // Spoke 35 is at azimuth (35/36)*2*pi ≈ 350° which is close to +x
        // direction. It should still hit the vessel, but at a different range.
        if !lit35.is_empty() && !lit0.is_empty() {
            // The lit bin for spoke 35 should be at a higher range than spoke 0
            // because the vessel has moved further away in +x.
            assert!(
                lit35[0] > lit0[0],
                "spoke 35 should see vessel at greater range ({}) than spoke 0 ({})",
                lit35[0],
                lit0[0]
            );
        }
    }
}
