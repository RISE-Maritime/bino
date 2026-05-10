/// Sea-clutter statistical models for marine radar.
///
/// Three models compared in this spike:
///   1. K-distribution (Ward 1981) — compound: Rayleigh speckle × Gamma texture
///   2. Weibull — empirical two-parameter fit
///   3. Bulk-Hs-only — σ₀ from sea state, Rayleigh speckle only (simplest)
///
/// All models produce a per-range-bin intensity sample given:
///   - range (m) from radar
///   - grazing angle (rad) at that range
///   - sea-state parameters (Hs primarily)

use crate::rng::Rng;

/// Mean σ₀ (radar cross-section per unit area, linear scale) as a
/// function of sea state and grazing angle. Empirical fit inspired
/// by Nathanson's tables (X-band, HH polarization, ~9.4 GHz).
///
/// This is a simplified model — real σ₀ depends on frequency,
/// polarization, wind speed, and look direction relative to wind.
/// Good enough for the spike; v1.0 can use proper GIT tables.
fn mean_sigma0(hs: f32, grazing_rad: f32) -> f32 {
    // σ₀ increases with sea state and grazing angle.
    // Rough fit to Nathanson Table 7-2 (X-band, HH, upwind):
    //   σ₀(dB) ≈ -40 + 10·log10(Hs+0.1) + 15·log10(sin(ψ)+0.01)
    // We work in linear scale.
    let hs_clamped = hs.max(0.01);
    let sin_psi = grazing_rad.sin().max(0.001);
    let sigma_db = -40.0 + 10.0 * hs_clamped.log10() + 15.0 * sin_psi.log10();
    10.0_f32.powf(sigma_db / 10.0)
}

/// Grazing angle from radar height and slant range.
pub fn grazing_angle_flat(radar_height: f32, range: f32) -> f32 {
    if range <= 0.0 {
        return std::f32::consts::FRAC_PI_2;
    }
    (radar_height / range).atan()
}

// ── K-distribution (Ward model) ──────────────────────────────────

/// K-distribution shape parameter ν from sea state. Lower ν = spikier
/// clutter (rough seas). Empirical fit:
///   ν ≈ 30 / (Hs + 0.5) for Hs in [0, 6] → ν in [5, 60]
/// Ward (1981) reports ν ~ 1-50 depending on conditions. Our fit
/// gives moderate spikiness at typical sea states.
fn k_shape(hs: f32) -> f32 {
    (30.0 / (hs.max(0.0) + 0.5)).clamp(1.0, 100.0)
}

/// Sample one K-distributed clutter value.
///   K = sqrt(Gamma(ν, 1/ν) · Exponential(1)) · sqrt(2·σ₀)
///
/// The K-distribution is the product of a Gamma-distributed texture
/// (slowly varying, correlated in time — but we treat as i.i.d. per
/// bin for this spike) and Rayleigh-distributed speckle.
pub fn sample_k(rng: &mut Rng, hs: f32, grazing_rad: f32) -> f32 {
    let sigma0 = mean_sigma0(hs, grazing_rad);
    let nu = k_shape(hs);

    // Gamma texture: mean = 1, shape = ν → scale = 1/ν
    let texture = rng.gamma(nu) / nu;
    // Rayleigh speckle: exponential(1) gives |z|² for complex Gaussian
    let speckle = rng.exponential(1.0);
    // Intensity (power) = texture × speckle × mean_power
    let power = texture * speckle * sigma0;
    // Return amplitude (sqrt of power) — maps more naturally to 0-255.
    power.sqrt()
}

// ── Weibull ──────────────────────────────────────────────────────

/// Weibull shape parameter from sea state. Higher Hs → lower shape
/// (heavier tail). Empirical:
///   shape ≈ 2.0 + 3.0 / (Hs + 0.5) for Hs in [0, 6] → shape in [2.5, 8]
/// shape=2 is Rayleigh; lower = spikier.
fn weibull_shape(hs: f32) -> f32 {
    (2.0 + 3.0 / (hs.max(0.0) + 0.5)).clamp(1.5, 20.0)
}

/// Sample one Weibull-distributed clutter value.
///   W = scale · (-ln(U))^(1/shape)
pub fn sample_weibull(rng: &mut Rng, hs: f32, grazing_rad: f32) -> f32 {
    let sigma0 = mean_sigma0(hs, grazing_rad);
    let shape = weibull_shape(hs);
    // Scale chosen so E[W²] ∝ σ₀.
    let scale = sigma0.sqrt();
    let u = rng.uniform().max(1e-10);
    scale * (-u.ln()).powf(1.0 / shape)
}

// ── Bulk-Hs-only (Rayleigh baseline) ────────────────────────────

/// Rayleigh-distributed clutter — simplest possible model.
/// Intensity is exponential(1/σ₀), amplitude is sqrt.
pub fn sample_rayleigh(rng: &mut Rng, hs: f32, grazing_rad: f32) -> f32 {
    let sigma0 = mean_sigma0(hs, grazing_rad);
    let power = rng.exponential(1.0) * sigma0;
    power.sqrt()
}

// ── Clutter model enum for sweep generation ─────────────────────

#[derive(Clone, Copy, Debug)]
pub enum ClutterModel {
    KDistribution,
    Weibull,
    Rayleigh,
}

impl ClutterModel {
    pub fn sample(self, rng: &mut Rng, hs: f32, grazing_rad: f32) -> f32 {
        match self {
            ClutterModel::KDistribution => sample_k(rng, hs, grazing_rad),
            ClutterModel::Weibull => sample_weibull(rng, hs, grazing_rad),
            ClutterModel::Rayleigh => sample_rayleigh(rng, hs, grazing_rad),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sigma0_increases_with_sea_state() {
        let s1 = mean_sigma0(0.5, 0.05);
        let s2 = mean_sigma0(2.0, 0.05);
        let s3 = mean_sigma0(4.0, 0.05);
        assert!(s2 > s1, "σ₀ should increase with Hs");
        assert!(s3 > s2, "σ₀ should increase with Hs");
    }

    #[test]
    fn sigma0_increases_with_grazing_angle() {
        let s1 = mean_sigma0(2.0, 0.01);
        let s2 = mean_sigma0(2.0, 0.1);
        assert!(s2 > s1, "σ₀ should increase with grazing angle");
    }

    #[test]
    fn k_samples_are_positive() {
        let mut rng = Rng::new(42);
        for _ in 0..1_000 {
            let v = sample_k(&mut rng, 2.0, 0.05);
            assert!(v >= 0.0);
        }
    }

    #[test]
    fn rough_sea_has_higher_mean_clutter() {
        let mut rng = Rng::new(42);
        let n = 10_000;
        let calm: f32 = (0..n).map(|_| sample_k(&mut rng, 0.3, 0.05)).sum::<f32>() / n as f32;
        let rough: f32 = (0..n).map(|_| sample_k(&mut rng, 3.0, 0.05)).sum::<f32>() / n as f32;
        assert!(rough > calm * 1.5, "rough sea ({rough}) should have much higher mean clutter than calm ({calm})");
    }
}
