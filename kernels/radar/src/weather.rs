/// Weather attenuation — ITU-R P.838 rain attenuation model.
///
/// Applies range-dependent signal loss from precipitation.
/// Two-way path loss: intensity *= 10^(-2·α·range_km / 10)

/// Specific attenuation α (dB/km) for rain at a given frequency
/// and rain rate. Simplified ITU-R P.838-3 power-law fit:
///   α = k · R^a
/// where R is rain rate (mm/h), k and a depend on frequency and
/// polarization.
///
/// Coefficients for X-band (9.4 GHz), horizontal polarization:
///   k_H ≈ 0.0101, a_H ≈ 1.276
/// Source: ITU-R P.838-3, Table 1, interpolated to 9.4 GHz.
pub fn specific_attenuation_db_km(rain_rate_mm_h: f32, frequency_ghz: f32) -> f32 {
    if rain_rate_mm_h <= 0.0 {
        return 0.0;
    }

    // Power-law coefficients (k, a) by frequency band.
    // Simplified: linear interpolation between standard ITU-R points.
    let (k, a) = itu_r_coefficients(frequency_ghz);
    k * rain_rate_mm_h.powf(a)
}

/// Two-way attenuation factor (linear, 0..1) at a given range.
pub fn attenuation_factor(range_m: f32, rain_rate_mm_h: f32, frequency_ghz: f32) -> f32 {
    if rain_rate_mm_h <= 0.0 {
        return 1.0;
    }
    let alpha = specific_attenuation_db_km(rain_rate_mm_h, frequency_ghz);
    let range_km = range_m / 1000.0;
    let loss_db = 2.0 * alpha * range_km;
    10.0_f32.powf(-loss_db / 10.0)
}

/// Apply rain attenuation to a spoke's intensity buffer in-place.
pub fn attenuate_spoke(intensity: &mut [f32], range_m: f32, rain_rate_mm_h: f32, frequency_ghz: f32) {
    if rain_rate_mm_h <= 0.0 {
        return;
    }
    let n_bins = intensity.len();
    let bin_width = range_m / n_bins as f32;
    let alpha = specific_attenuation_db_km(rain_rate_mm_h, frequency_ghz);

    for (j, val) in intensity.iter_mut().enumerate() {
        let r_km = ((j as f32 + 0.5) * bin_width) / 1000.0;
        let loss_db = 2.0 * alpha * r_km;
        *val *= 10.0_f32.powf(-loss_db / 10.0);
    }
}

/// ITU-R P.838-3 coefficients (k, a) for horizontal polarization.
/// Exact values at standard frequencies; linearly interpolated between.
fn itu_r_coefficients(freq_ghz: f32) -> (f32, f32) {
    // Table points: (freq_GHz, k_H, a_H)
    const TABLE: &[(f32, f32, f32)] = &[
        (1.0,   0.0000387, 0.912),
        (3.0,   0.000650,  1.121),
        (6.0,   0.00175,   1.308),
        (10.0,  0.0101,    1.276),
        (15.0,  0.0367,    1.154),
        (20.0,  0.0751,    1.099),
        (30.0,  0.187,     1.021),
        (50.0,  0.536,     0.873),
    ];

    if freq_ghz <= TABLE[0].0 {
        return (TABLE[0].1, TABLE[0].2);
    }
    if freq_ghz >= TABLE[TABLE.len() - 1].0 {
        let last = TABLE[TABLE.len() - 1];
        return (last.1, last.2);
    }

    for i in 0..TABLE.len() - 1 {
        let (f0, k0, a0) = TABLE[i];
        let (f1, k1, a1) = TABLE[i + 1];
        if freq_ghz >= f0 && freq_ghz <= f1 {
            let t = (freq_ghz - f0) / (f1 - f0);
            // Log-interpolate k (varies over orders of magnitude).
            let k = (k0.ln() + t * (k1.ln() - k0.ln())).exp();
            let a = a0 + t * (a1 - a0);
            return (k, a);
        }
    }

    (0.0101, 1.276) // X-band fallback
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn no_rain_no_attenuation() {
        assert_eq!(attenuation_factor(5000.0, 0.0, 9.4), 1.0);
    }

    #[test]
    fn attenuation_increases_with_range() {
        let near = attenuation_factor(1000.0, 10.0, 9.4);
        let far = attenuation_factor(10000.0, 10.0, 9.4);
        assert!(far < near, "far ({far}) should be more attenuated than near ({near})");
    }

    #[test]
    fn heavy_rain_kills_far_range() {
        let factor = attenuation_factor(12000.0, 50.0, 9.4);
        assert!(factor < 0.01, "heavy rain at 12 km should heavily attenuate: {factor}");
    }

    #[test]
    fn x_band_moderate_rain_reasonable() {
        // ITU-R P.838 at 9.4 GHz, 10 mm/h: α ≈ 0.1-0.3 dB/km.
        let alpha = specific_attenuation_db_km(10.0, 9.4);
        assert!(alpha > 0.05 && alpha < 1.0, "X-band 10 mm/h: expected 0.1-0.3 dB/km, got {alpha}");
    }
}
