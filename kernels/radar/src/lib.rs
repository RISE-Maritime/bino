//! Bino marine radar v1 — sea clutter, antenna pattern, weather.
//!
//! v0.3 was geometry-of-returns only (binary intensity, no physics).
//! v1.0 adds K-distribution sea clutter (Ward 1981), Gaussian
//! antenna-pattern convolution, and ITU-R P.838 rain attenuation.
//! See `spikes/sea-clutter/results.md` for the spike that motivated
//! these choices.

mod antenna;
mod clutter;
mod gerstner;
mod rng;
mod weather;

use serde::{Deserialize, Serialize};

// ── Scene & host types (unchanged from v0.3) ─────────────────────

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SceneSnapshot {
    pub vessels: Vec<VesselBox>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct VesselBox {
    pub position: [f32; 3],
    pub heading: f32,
    pub half_extents: [f32; 3],
    #[serde(default)]
    pub velocity: [f32; 3],
    #[serde(default)]
    pub angular_velocity_y: f32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RadarConfig {
    pub range_m: f32,
    pub spokes_per_rev: u32,
    pub range_bins: u32,
    #[serde(default)]
    pub sweep_duration_s: f32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct HostPose {
    pub position: [f32; 3],
    pub heading: f32,
}

// ── v1.0 environment config ──────────────────────────────────────

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct RadarEnvironment {
    #[serde(default)]
    pub sea_clutter: Option<SeaClutterConfig>,
    #[serde(default)]
    pub antenna: Option<AntennaConfig>,
    #[serde(default)]
    pub weather: Option<WeatherConfig>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SeaClutterConfig {
    pub hs: f32,
    pub radar_height_m: f32,
    pub enabled: bool,
    pub sweep_index: u32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AntennaConfig {
    pub beam_width_deg: f32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct WeatherConfig {
    pub rain_rate_mm_h: f32,
    #[serde(default = "default_frequency")]
    pub frequency_ghz: f32,
}

fn default_frequency() -> f32 {
    9.4
}

// ── Output types ─────────────────────────────────────────────────

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RadarSpoke {
    pub azimuth: f32,
    pub intensity: Vec<u8>,
    pub timestamp: f32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RadarSweep {
    pub spokes: Vec<RadarSpoke>,
}

// ── Sweep generation ─────────────────────────────────────────────

const VESSEL_INTENSITY: f32 = 1.0;
const NOISE_FLOOR: f32 = 1e-8;

pub fn sweep(
    scene: &SceneSnapshot,
    host: &HostPose,
    config: &RadarConfig,
    env: Option<&RadarEnvironment>,
) -> RadarSweep {
    let n_spokes = config.spokes_per_rev.max(1) as usize;
    let n_bins = config.range_bins.max(1) as usize;
    let bin_width = config.range_m / n_bins as f32;
    let interpolate = config.sweep_duration_s > 0.0;

    let env = env.cloned().unwrap_or_default();
    let has_clutter = env.sea_clutter.as_ref().is_some_and(|c| c.enabled && c.hs > 0.0);

    let mut rng = if has_clutter {
        let idx = env.sea_clutter.as_ref().unwrap().sweep_index;
        Some(rng::Rng::new(idx as u64 ^ 0xB190_CADA_5EED_0001))
    } else {
        None
    };

    // Raw f32 buffer: spoke-major, [spoke][bin].
    let mut raw = vec![0.0_f32; n_spokes * n_bins];
    let mut timestamps = vec![0.0_f32; n_spokes];

    for i in 0..n_spokes {
        let azimuth = (i as f32 / n_spokes as f32) * std::f32::consts::TAU;
        let world_angle = host.heading + azimuth;

        let dt = if interpolate {
            (i as f32 / n_spokes as f32) * config.sweep_duration_s
        } else {
            0.0
        };
        timestamps[i] = dt;

        let offset = i * n_bins;

        for j in 0..n_bins {
            let range = (j as f32 + 0.5) * bin_width;

            // Sea clutter.
            if has_clutter {
                let sc = env.sea_clutter.as_ref().unwrap();
                let grazing = clutter::grazing_angle_flat(sc.radar_height_m, range);
                let rng = rng.as_mut().unwrap();
                let clutter_amp = clutter::sample_k(rng, sc.hs, grazing);
                let noise_amp = clutter::sample_noise(rng, NOISE_FLOOR);
                raw[offset + j] = clutter_amp + noise_amp;
            }
        }

        // Vessel geometry-of-returns.
        let nearest = if interpolate {
            let interp_scene = interpolate_scene(scene, dt);
            nearest_hit(&interp_scene, host.position, world_angle, config.range_m)
        } else {
            nearest_hit(scene, host.position, world_angle, config.range_m)
        };

        if let Some(range) = nearest {
            let bin = (range / bin_width).floor() as usize;
            if bin < n_bins {
                raw[offset + bin] = raw[offset + bin].max(VESSEL_INTENSITY);
            }
        }
    }

    // Antenna pattern convolution.
    if let Some(ref ant) = env.antenna {
        if ant.beam_width_deg > 0.0 {
            antenna::convolve_azimuth(&mut raw, n_spokes, n_bins, ant.beam_width_deg);
        }
    }

    // Weather attenuation.
    if let Some(ref wx) = env.weather {
        if wx.rain_rate_mm_h > 0.0 {
            for i in 0..n_spokes {
                let offset = i * n_bins;
                weather::attenuate_spoke(
                    &mut raw[offset..offset + n_bins],
                    config.range_m,
                    wx.rain_rate_mm_h,
                    wx.frequency_ghz,
                );
            }
        }
    }

    // Normalize f32 → u8.
    let spokes = if has_clutter || env.antenna.is_some() {
        normalize_sweep(&raw, n_spokes, n_bins, &timestamps)
    } else {
        // No clutter/antenna — preserve v0.3 binary behavior.
        binary_sweep(&raw, n_spokes, n_bins, &timestamps)
    };

    RadarSweep { spokes }
}

fn interpolate_scene(scene: &SceneSnapshot, dt: f32) -> SceneSnapshot {
    SceneSnapshot {
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
    }
}

/// Auto-scale continuous intensity to 0-255. Vessel returns pin at
/// 255; clutter maps to 0-200 proportionally.
fn normalize_sweep(
    raw: &[f32],
    n_spokes: usize,
    n_bins: usize,
    timestamps: &[f32],
) -> Vec<RadarSpoke> {
    // Find max non-vessel intensity for dynamic range.
    let max_clutter = raw
        .iter()
        .copied()
        .filter(|&v| v < VESSEL_INTENSITY)
        .fold(0.0_f32, f32::max)
        .max(1e-12);

    let clutter_scale = 200.0 / max_clutter;

    (0..n_spokes)
        .map(|i| {
            let azimuth = (i as f32 / n_spokes as f32) * std::f32::consts::TAU;
            let offset = i * n_bins;
            let intensity: Vec<u8> = (0..n_bins)
                .map(|j| {
                    let v = raw[offset + j];
                    if v >= VESSEL_INTENSITY {
                        255
                    } else {
                        (v * clutter_scale).clamp(0.0, 200.0) as u8
                    }
                })
                .collect();
            RadarSpoke {
                azimuth,
                intensity,
                timestamp: timestamps[i],
            }
        })
        .collect()
}

/// Binary output for backward compat (no clutter, no antenna).
fn binary_sweep(
    raw: &[f32],
    n_spokes: usize,
    n_bins: usize,
    timestamps: &[f32],
) -> Vec<RadarSpoke> {
    (0..n_spokes)
        .map(|i| {
            let azimuth = (i as f32 / n_spokes as f32) * std::f32::consts::TAU;
            let offset = i * n_bins;
            let intensity: Vec<u8> = (0..n_bins)
                .map(|j| if raw[offset + j] > 0.0 { 255 } else { 0 })
                .collect();
            RadarSpoke {
                azimuth,
                intensity,
                timestamp: timestamps[i],
            }
        })
        .collect()
}

// ── Geometry-of-returns (unchanged from v0.3) ────────────────────

fn nearest_hit(
    scene: &SceneSnapshot,
    origin: [f32; 3],
    world_angle: f32,
    max_range: f32,
) -> Option<f32> {
    let dir = [world_angle.cos(), world_angle.sin()];
    let mut best: Option<f32> = None;

    for v in &scene.vessels {
        let dx = v.position[0] - origin[0];
        let dy = v.position[2] - origin[2];
        let cos_h = (-v.heading).cos();
        let sin_h = (-v.heading).sin();
        let lx = cos_h * dx - sin_h * dy;
        let ly = sin_h * dx + cos_h * dy;

        let half = [v.half_extents[0], v.half_extents[2]];

        if lx.abs() <= half[0] && ly.abs() <= half[1] {
            return Some(0.0);
        }

        let ldx = cos_h * dir[0] - sin_h * dir[1];
        let ldy = sin_h * dir[0] + cos_h * dir[1];

        if let Some(t) = ray_box_intersect(-lx, -ly, ldx, ldy, half[0], half[1], max_range) {
            best = Some(match best {
                Some(prev) => prev.min(t),
                None => t,
            });
        }
    }

    best
}

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

// ── WASM bindings ────────────────────────────────────────────────

#[cfg(target_arch = "wasm32")]
mod wasm {
    use super::*;
    use wasm_bindgen::prelude::*;

    #[wasm_bindgen]
    pub fn radar_sweep(
        scene: JsValue,
        host: JsValue,
        config: JsValue,
        env_config: JsValue,
    ) -> Result<JsValue, JsValue> {
        let scene: SceneSnapshot = serde_wasm_bindgen::from_value(scene)?;
        let host: HostPose = serde_wasm_bindgen::from_value(host)?;
        let config: RadarConfig = serde_wasm_bindgen::from_value(config)?;
        let env: Option<RadarEnvironment> = serde_wasm_bindgen::from_value(env_config).ok();
        let result = sweep(&scene, &host, &config, env.as_ref());
        Ok(serde_wasm_bindgen::to_value(&result)?)
    }
}

// ── Tests ────────────────────────────────────────────────────────

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

    fn sea_env(hs: f32, idx: u32) -> RadarEnvironment {
        RadarEnvironment {
            sea_clutter: Some(SeaClutterConfig {
                hs,
                radar_height_m: 35.0,
                enabled: true,
                sweep_index: idx,
            }),
            antenna: None,
            weather: None,
        }
    }

    // ── v0.3 backward compat ──

    #[test]
    fn backward_compat_no_env() {
        let scene = SceneSnapshot { vessels: vec![] };
        let sw = sweep(&scene, &host_at_origin(), &cfg(8, 16, 100.0), None);
        assert_eq!(sw.spokes.len(), 8);
        for spoke in &sw.spokes {
            assert!(spoke.intensity.iter().all(|&v| v == 0));
        }
    }

    #[test]
    fn backward_compat_vessel_hit() {
        let scene = SceneSnapshot {
            vessels: vec![vessel_at(50.0, 0.0)],
        };
        let sw = sweep(&scene, &host_at_origin(), &cfg(36, 100, 100.0), None);
        let spoke0 = &sw.spokes[0];
        let lit: Vec<usize> = spoke0
            .intensity
            .iter()
            .enumerate()
            .filter_map(|(i, &v)| if v > 0 { Some(i) } else { None })
            .collect();
        assert_eq!(lit.len(), 1);
        assert!(lit[0] >= 38 && lit[0] <= 41, "expected bin near 40, got {}", lit[0]);
        assert_eq!(spoke0.intensity[lit[0]], 255);
    }

    #[test]
    fn backward_compat_outside_range() {
        let scene = SceneSnapshot {
            vessels: vec![vessel_at(500.0, 0.0)],
        };
        let sw = sweep(&scene, &host_at_origin(), &cfg(8, 16, 100.0), None);
        for spoke in &sw.spokes {
            assert!(spoke.intensity.iter().all(|&v| v == 0));
        }
    }

    #[test]
    fn backward_compat_off_axis() {
        let scene = SceneSnapshot {
            vessels: vec![vessel_at(0.0, -50.0)],
        };
        let sw = sweep(&scene, &host_at_origin(), &cfg(4, 100, 100.0), None);
        let total: usize = sw.spokes.iter().map(|s| s.intensity.iter().filter(|&&v| v > 0).count()).sum();
        assert_eq!(total, 1);
    }

    #[test]
    fn backward_compat_timestamps_zero() {
        let scene = SceneSnapshot {
            vessels: vec![vessel_at(50.0, 0.0)],
        };
        let sw = sweep(&scene, &host_at_origin(), &cfg(36, 100, 100.0), None);
        for spoke in &sw.spokes {
            assert_eq!(spoke.timestamp, 0.0);
        }
    }

    // ── Clutter tests ──

    #[test]
    fn clutter_produces_continuous_output() {
        let scene = SceneSnapshot { vessels: vec![] };
        let c = cfg(36, 64, 6000.0);
        let sw = sweep(&scene, &host_at_origin(), &c, Some(&sea_env(2.0, 42)));

        // With clutter enabled, output should be continuous (many
        // distinct intensity levels), not binary (only 0 and 255).
        let mut distinct: std::collections::HashSet<u8> = std::collections::HashSet::new();
        for spoke in &sw.spokes {
            for &v in &spoke.intensity {
                distinct.insert(v);
            }
        }
        assert!(
            distinct.len() > 10,
            "clutter should produce many intensity levels, got {}",
            distinct.len()
        );
    }

    #[test]
    fn clutter_near_vs_far() {
        let scene = SceneSnapshot { vessels: vec![] };
        let env = sea_env(2.0, 42);
        let sw = sweep(&scene, &host_at_origin(), &cfg(36, 128, 12000.0), Some(&env));

        let near_mean: f64 = sw.spokes.iter()
            .flat_map(|s| s.intensity[..16].iter())
            .map(|&v| v as f64)
            .sum::<f64>() / (sw.spokes.len() * 16) as f64;

        let far_mean: f64 = sw.spokes.iter()
            .flat_map(|s| s.intensity[112..].iter())
            .map(|&v| v as f64)
            .sum::<f64>() / (sw.spokes.len() * 16) as f64;

        assert!(
            near_mean > far_mean,
            "near bins ({near_mean:.1}) should be brighter than far ({far_mean:.1})"
        );
    }

    #[test]
    fn vessel_above_clutter() {
        let scene = SceneSnapshot {
            vessels: vec![vessel_at(3000.0, 0.0)],
        };
        let env = sea_env(2.0, 42);
        let sw = sweep(&scene, &host_at_origin(), &cfg(360, 128, 6000.0), Some(&env));

        let spoke0 = &sw.spokes[0];
        let vessel_bin = spoke0.intensity.iter().position(|&v| v == 255);
        assert!(vessel_bin.is_some(), "vessel should produce a 255 return");
    }

    #[test]
    fn deterministic_seeded_sweep() {
        let scene = SceneSnapshot { vessels: vec![] };
        let env = sea_env(2.0, 42);
        let c = cfg(36, 64, 6000.0);

        let sw1 = sweep(&scene, &host_at_origin(), &c, Some(&env));
        let sw2 = sweep(&scene, &host_at_origin(), &c, Some(&env));

        for (s1, s2) in sw1.spokes.iter().zip(sw2.spokes.iter()) {
            assert_eq!(s1.intensity, s2.intensity, "same seed should produce identical output");
        }
    }

    // ── Antenna tests ──

    #[test]
    fn antenna_spreads_point_target() {
        let scene = SceneSnapshot {
            vessels: vec![vessel_at(3000.0, 0.0)],
        };
        let env = RadarEnvironment {
            sea_clutter: None,
            antenna: Some(AntennaConfig { beam_width_deg: 5.0 }),
            weather: None,
        };
        let sw = sweep(&scene, &host_at_origin(), &cfg(360, 64, 6000.0), Some(&env));

        let spoke0 = &sw.spokes[0];
        let spoke1 = &sw.spokes[1];
        let spoke10 = &sw.spokes[10];

        let max0: u8 = *spoke0.intensity.iter().max().unwrap();
        let max1: u8 = *spoke1.intensity.iter().max().unwrap();
        let max10: u8 = *spoke10.intensity.iter().max().unwrap();

        assert!(max0 > 0, "center spoke should have return");
        assert!(max1 > 0, "adjacent spoke should have spread");
        assert_eq!(max10, 0, "far spoke should have no spread");
    }

    // ── Weather tests ──

    #[test]
    fn weather_attenuates_far_range() {
        let scene = SceneSnapshot { vessels: vec![] };
        let env = RadarEnvironment {
            sea_clutter: Some(SeaClutterConfig {
                hs: 2.0,
                radar_height_m: 35.0,
                enabled: true,
                sweep_index: 42,
            }),
            antenna: None,
            weather: Some(WeatherConfig {
                rain_rate_mm_h: 20.0,
                frequency_ghz: 9.4,
            }),
        };
        let env_no_rain = RadarEnvironment {
            weather: None,
            ..env.clone()
        };

        let c = cfg(36, 128, 12000.0);
        let with_rain = sweep(&scene, &host_at_origin(), &c, Some(&env));
        let no_rain = sweep(&scene, &host_at_origin(), &c, Some(&env_no_rain));

        // Far bins should be dimmer with rain.
        let far_rain: f64 = with_rain.spokes.iter()
            .flat_map(|s| s.intensity[112..].iter())
            .map(|&v| v as f64)
            .sum::<f64>();
        let far_clear: f64 = no_rain.spokes.iter()
            .flat_map(|s| s.intensity[112..].iter())
            .map(|&v| v as f64)
            .sum::<f64>();

        assert!(
            far_rain < far_clear * 0.5,
            "rain should significantly reduce far-range intensity: rain={far_rain:.0} clear={far_clear:.0}"
        );
    }

    // ── Temporal interpolation (carried from v0.6) ──

    #[test]
    fn temporal_interpolation_radar() {
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
        let sw = sweep(&scene, &host_at_origin(), &config, None);
        assert_eq!(sw.spokes.len(), 36);

        let t0 = sw.spokes[0].timestamp;
        let t_last = sw.spokes[35].timestamp;
        assert!(t0.abs() < 1e-6);
        assert!(t_last > 2.0 && t_last <= 2.5 + 1e-6);

        let lit0: Vec<usize> = sw.spokes[0].intensity.iter().enumerate()
            .filter_map(|(i, &v)| if v > 0 { Some(i) } else { None }).collect();
        assert!(!lit0.is_empty(), "spoke 0 should hit the vessel");

        let lit18: Vec<usize> = sw.spokes[18].intensity.iter().enumerate()
            .filter_map(|(i, &v)| if v > 0 { Some(i) } else { None }).collect();
        assert!(lit18.is_empty(), "spoke 18 (opposite) should not hit");
    }
}
