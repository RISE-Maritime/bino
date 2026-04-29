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
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RadarConfig {
    /// Maximum range in metres.
    pub range_m: f32,
    /// Number of azimuth samples per full revolution.
    pub spokes_per_rev: u32,
    /// Number of range bins per spoke.
    pub range_bins: u32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RadarSpoke {
    /// Azimuth in radians, 0 = host's +x heading, CCW positive.
    pub azimuth: f32,
    /// Per-bin intensity, length == config.range_bins. 0 or 255 in v0 (binary).
    pub intensity: Vec<u8>,
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
pub fn sweep(scene: &SceneSnapshot, host: &HostPose, config: &RadarConfig) -> RadarSweep {
    let n_spokes = config.spokes_per_rev.max(1) as usize;
    let n_bins = config.range_bins.max(1) as usize;
    let mut spokes = Vec::with_capacity(n_spokes);
    let bin_width = config.range_m / n_bins as f32;

    for i in 0..n_spokes {
        let azimuth = (i as f32 / n_spokes as f32) * std::f32::consts::TAU;
        let world_angle = host.heading + azimuth;
        let mut intensity = vec![0u8; n_bins];

        let nearest = nearest_hit(scene, host.position, world_angle, config.range_m);
        if let Some(range) = nearest {
            let bin = (range / bin_width).floor() as usize;
            if bin < n_bins {
                intensity[bin] = 255;
            }
        }

        spokes.push(RadarSpoke { azimuth, intensity });
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
}
