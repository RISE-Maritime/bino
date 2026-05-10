/// Sweep generator — produces a full radar revolution with clutter.
///
/// Extends the v0.3 geometry-of-returns with per-bin clutter from
/// the sea surface. Vessel returns are still binary (255) — clutter
/// sits underneath as a continuous intensity floor.

use crate::clutter::{self, ClutterModel};
use crate::gerstner::{GerstnerField, SeaStateParams};
use crate::rng::Rng;
use std::f32::consts::TAU;

pub struct SweepConfig {
    pub range_m: f32,
    pub spokes_per_rev: u32,
    pub range_bins: u32,
    pub radar_height_m: f32,
    pub sea_state: SeaStateParams,
    pub model: ClutterModel,
    pub time: f32,
    pub seed: u64,
    /// Include Gerstner wave-field sampling for per-cell grazing angle.
    /// When false, uses flat-earth grazing angle only (bulk-Hs test).
    pub use_wave_field: bool,
}

pub struct Spoke {
    pub azimuth: f32,
    pub intensity: Vec<f32>,
}

pub struct Sweep {
    pub spokes: Vec<Spoke>,
}

/// Simple vessel for the spike — position + radius (circle, not bbox).
pub struct Vessel {
    pub x: f32,
    pub z: f32,
    pub radius: f32,
}

pub fn generate_sweep(cfg: &SweepConfig, vessels: &[Vessel]) -> Sweep {
    let n_spokes = cfg.spokes_per_rev as usize;
    let n_bins = cfg.range_bins as usize;
    let bin_width = cfg.range_m / n_bins as f32;
    let mut rng = Rng::new(cfg.seed);

    let wave_field = if cfg.use_wave_field {
        Some(GerstnerField::from_sea_state(&cfg.sea_state))
    } else {
        None
    };

    let hs = cfg.sea_state.significant_wave_height;
    let mut spokes = Vec::with_capacity(n_spokes);

    for i in 0..n_spokes {
        let azimuth = (i as f32 / n_spokes as f32) * TAU;
        let cos_a = azimuth.cos();
        let sin_a = azimuth.sin();

        let mut intensity = Vec::with_capacity(n_bins);

        for j in 0..n_bins {
            let range = (j as f32 + 0.5) * bin_width;
            let world_x = cos_a * range;
            let world_z = sin_a * range;

            // Grazing angle — either from wave field or flat earth.
            let grazing = if let Some(ref field) = wave_field {
                let sample = field.sample(world_x, world_z, cfg.time);
                let effective_height = cfg.radar_height_m - sample.height;
                if effective_height <= 0.0 {
                    0.0
                } else {
                    (effective_height / range).atan()
                }
            } else {
                clutter::grazing_angle_flat(cfg.radar_height_m, range)
            };

            // Clutter sample.
            let clutter_amp = cfg.model.sample(&mut rng, hs, grazing);

            // Check vessel returns — any vessel overlapping this bin?
            let mut vessel_hit = false;
            for v in vessels {
                let dx = world_x - v.x;
                let dz = world_z - v.z;
                if dx * dx + dz * dz <= v.radius * v.radius {
                    vessel_hit = true;
                    break;
                }
            }

            let value = if vessel_hit {
                1.0 // Max intensity for vessel returns.
            } else {
                clutter_amp
            };

            intensity.push(value);
        }

        spokes.push(Spoke { azimuth, intensity });
    }

    Sweep { spokes }
}

/// Render a sweep to a PPI (Plan Position Indicator) image.
/// Returns an RGB image as (width, height, Vec<[u8; 3]>).
pub fn render_ppi(sweep: &Sweep, size: u32, max_intensity: f32) -> (u32, u32, Vec<[u8; 3]>) {
    let n = size as usize;
    let center = n / 2;
    let mut pixels = vec![[0u8; 3]; n * n];

    let n_spokes = sweep.spokes.len();
    let n_bins = if n_spokes > 0 {
        sweep.spokes[0].intensity.len()
    } else {
        return (size, size, pixels);
    };

    // For each pixel, find the corresponding spoke and bin.
    for py in 0..n {
        for px in 0..n {
            let dx = px as f32 - center as f32;
            let dy = py as f32 - center as f32;
            let r = (dx * dx + dy * dy).sqrt();
            let max_r = center as f32;
            if r > max_r {
                continue;
            }

            let bin_f = (r / max_r) * n_bins as f32;
            let bin = (bin_f as usize).min(n_bins - 1);

            let mut angle = dy.atan2(dx);
            if angle < 0.0 {
                angle += TAU;
            }
            let spoke_f = (angle / TAU) * n_spokes as f32;
            let spoke = (spoke_f as usize) % n_spokes;

            let raw = sweep.spokes[spoke].intensity[bin];
            let normalized = (raw / max_intensity).clamp(0.0, 1.0);

            // Green phosphor PPI look.
            let brightness = (normalized.sqrt() * 255.0) as u8;
            pixels[py * n + px] = [0, brightness, brightness / 4];
        }
    }

    (size, size, pixels)
}

/// Write a PPM (P6) image file.
pub fn write_ppm(path: &str, width: u32, height: u32, pixels: &[[u8; 3]]) -> std::io::Result<()> {
    use std::io::Write;
    let mut f = std::fs::File::create(path)?;
    write!(f, "P6\n{width} {height}\n255\n")?;
    for px in pixels {
        f.write_all(px)?;
    }
    Ok(())
}
