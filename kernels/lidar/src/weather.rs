/// Lidar atmospheric attenuation — Beer-Lambert law.
///
/// Near-IR lidar (~905 nm) attenuation from:
///   - Visibility (Koschmieder): α_vis ≈ 3.91 / V_km  [1/km]
///   - Rain (empirical):         α_rain ≈ 0.01 × R^0.6 [1/km]
///
/// Two-way transmission: τ = exp(−2αR).
/// Points with τ below threshold are dropped.

/// Extinction coefficient (1/m) from visibility and rain rate.
pub fn extinction_coefficient(visibility_m: f32, rain_rate_mm_h: f32) -> f32 {
    let v_km = (visibility_m / 1000.0).max(0.01);
    let alpha_vis = 3.91 / v_km / 1000.0;
    let alpha_rain = if rain_rate_mm_h > 0.0 {
        0.01 * rain_rate_mm_h.powf(0.6) / 1000.0
    } else {
        0.0
    };
    alpha_vis + alpha_rain
}

/// Maximum detection range (m) for a given extinction coefficient and
/// detection threshold. Returns `f32::INFINITY` when alpha is zero.
pub fn max_detection_range(alpha: f32, threshold: f32) -> f32 {
    if alpha <= 0.0 || threshold <= 0.0 || threshold >= 1.0 {
        return f32::INFINITY;
    }
    -threshold.ln() / (2.0 * alpha)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn clear_day_low_extinction() {
        let alpha = extinction_coefficient(20_000.0, 0.0);
        assert!((alpha - 3.91 / 20.0 / 1000.0).abs() < 1e-7);
    }

    #[test]
    fn heavy_fog_high_extinction() {
        let alpha = extinction_coefficient(100.0, 0.0);
        assert!((alpha - 3.91 / 0.1 / 1000.0).abs() < 1e-5);
    }

    #[test]
    fn rain_adds_extinction() {
        let dry = extinction_coefficient(5000.0, 0.0);
        let wet = extinction_coefficient(5000.0, 20.0);
        assert!(wet > dry);
    }

    #[test]
    fn max_range_decreases_with_fog() {
        let clear = max_detection_range(extinction_coefficient(20_000.0, 0.0), 0.01);
        let foggy = max_detection_range(extinction_coefficient(200.0, 0.0), 0.01);
        assert!(foggy < clear);
        assert!(foggy > 0.0);
    }

    #[test]
    fn transmission_boundary_conditions() {
        assert_eq!(max_detection_range(0.0, 0.01), f32::INFINITY);
        assert_eq!(max_detection_range(-1.0, 0.01), f32::INFINITY);
        assert_eq!(max_detection_range(0.001, 0.0), f32::INFINITY);
        assert_eq!(max_detection_range(0.001, 1.0), f32::INFINITY);
    }

    #[test]
    fn max_range_known_value() {
        // α = 0.001 /m, threshold = 0.01
        // R_max = -ln(0.01) / (2 * 0.001) = 4.60517 / 0.002 ≈ 2302.6 m
        let r = max_detection_range(0.001, 0.01);
        assert!((r - 2302.6).abs() < 1.0);
    }
}
