/// Sea-clutter model — K-distribution (Ward 1981).
///
/// K = sqrt(Gamma(ν, 1/ν) · Exponential(1)) · sqrt(2·σ₀)
/// σ₀ from Nathanson-inspired empirical fit (X-band HH).
/// Shape parameter ν driven by sea state.

use crate::rng::Rng;

/// Mean radar cross-section per unit area (linear) from sea state
/// and grazing angle. Simplified Nathanson Table 7-2 (X-band, HH).
fn mean_sigma0(hs: f32, grazing_rad: f32) -> f32 {
    let hs_clamped = hs.max(0.01);
    let sin_psi = grazing_rad.sin().max(0.001);
    let sigma_db = -40.0 + 10.0 * hs_clamped.log10() + 15.0 * sin_psi.log10();
    10.0_f32.powf(sigma_db / 10.0)
}

/// K-distribution shape ν from sea state. Lower = spikier.
fn k_shape(hs: f32) -> f32 {
    (30.0 / (hs.max(0.0) + 0.5)).clamp(1.0, 100.0)
}

/// Flat-earth grazing angle from radar height and slant range.
pub fn grazing_angle_flat(radar_height: f32, range: f32) -> f32 {
    if range <= 0.0 {
        return std::f32::consts::FRAC_PI_2;
    }
    (radar_height / range).atan()
}

/// Sample one K-distributed clutter amplitude.
pub fn sample_k(rng: &mut Rng, hs: f32, grazing_rad: f32) -> f32 {
    let sigma0 = mean_sigma0(hs, grazing_rad);
    let nu = k_shape(hs);
    let texture = rng.gamma(nu) / nu;
    let speckle = rng.exponential(1.0);
    (texture * speckle * sigma0).sqrt()
}

/// Sample Rayleigh-distributed thermal noise amplitude.
pub fn sample_noise(rng: &mut Rng, noise_floor: f32) -> f32 {
    (rng.exponential(1.0) * noise_floor).sqrt()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::rng::Rng;

    #[test]
    fn sigma0_increases_with_sea_state() {
        let s1 = mean_sigma0(0.5, 0.05);
        let s2 = mean_sigma0(2.0, 0.05);
        assert!(s2 > s1);
    }

    #[test]
    fn sigma0_increases_with_grazing_angle() {
        let s1 = mean_sigma0(2.0, 0.01);
        let s2 = mean_sigma0(2.0, 0.1);
        assert!(s2 > s1);
    }

    #[test]
    fn k_samples_are_positive() {
        let mut rng = Rng::new(42);
        for _ in 0..1_000 {
            assert!(sample_k(&mut rng, 2.0, 0.05) >= 0.0);
        }
    }

    #[test]
    fn rough_sea_has_higher_mean_clutter() {
        let mut rng = Rng::new(42);
        let n = 10_000;
        let calm: f32 = (0..n).map(|_| sample_k(&mut rng, 0.3, 0.05)).sum::<f32>() / n as f32;
        let rough: f32 = (0..n).map(|_| sample_k(&mut rng, 3.0, 0.05)).sum::<f32>() / n as f32;
        assert!(rough > calm * 1.5, "rough ({rough}) should exceed calm ({calm}) by 1.5×");
    }
}
