/// Antenna pattern — Gaussian main-lobe convolution.
///
/// Convolves each range bin's intensity across azimuth with a
/// Gaussian kernel whose FWHM = beam_width_deg. Operates on the
/// raw f32 intensity buffer after clutter + vessel returns are
/// computed, before final normalization.

/// Convolve intensity in-place across the azimuth dimension.
/// `raw` is a flat `[spokes × bins]` buffer in spoke-major order.
pub fn convolve_azimuth(raw: &mut [f32], n_spokes: usize, n_bins: usize, beam_width_deg: f32) {
    if beam_width_deg <= 0.0 || n_spokes == 0 || n_bins == 0 {
        return;
    }

    let spoke_width_deg = 360.0 / n_spokes as f32;
    let sigma_deg = beam_width_deg / 2.355; // FWHM → σ
    let sigma_spokes = sigma_deg / spoke_width_deg;

    // Kernel radius in spokes (±2σ covers 95%).
    let radius = (2.0 * sigma_spokes).ceil() as usize;
    if radius == 0 {
        return;
    }

    // Pre-compute Gaussian weights.
    let mut weights = Vec::with_capacity(2 * radius + 1);
    let mut sum = 0.0_f32;
    for di in -(radius as i32)..=(radius as i32) {
        let w = (-0.5 * (di as f32 / sigma_spokes).powi(2)).exp();
        weights.push(w);
        sum += w;
    }
    for w in &mut weights {
        *w /= sum;
    }

    // Temporary buffer for one range ring at a time.
    let mut ring_in = vec![0.0_f32; n_spokes];
    let mut ring_out = vec![0.0_f32; n_spokes];

    for bin in 0..n_bins {
        for spoke in 0..n_spokes {
            ring_in[spoke] = raw[spoke * n_bins + bin];
        }

        for spoke in 0..n_spokes {
            let mut acc = 0.0_f32;
            for (wi, di) in (-(radius as i32)..=(radius as i32)).enumerate() {
                let src = (spoke as i32 + di).rem_euclid(n_spokes as i32) as usize;
                acc += ring_in[src] * weights[wi];
            }
            ring_out[spoke] = acc;
        }

        for spoke in 0..n_spokes {
            raw[spoke * n_bins + bin] = ring_out[spoke];
        }
    }
}

/// Apply antenna gain to vessel returns at a specific azimuth offset
/// from beam center. Returns the one-way voltage gain (0..1).
pub fn beam_gain(offset_deg: f32, beam_width_deg: f32) -> f32 {
    let sigma_deg = beam_width_deg / 2.355;
    (-0.5 * (offset_deg / sigma_deg).powi(2)).exp()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn identity_when_beam_covers_all() {
        let n_spokes = 8;
        let n_bins = 4;
        let mut raw = vec![1.0_f32; n_spokes * n_bins];
        convolve_azimuth(&mut raw, n_spokes, n_bins, 360.0);
        for v in &raw {
            assert!((v - 1.0).abs() < 0.01, "uniform input should stay ~1.0");
        }
    }

    #[test]
    fn point_target_spreads() {
        let n_spokes = 360;
        let n_bins = 1;
        let mut raw = vec![0.0_f32; n_spokes];
        raw[0] = 1.0;

        convolve_azimuth(&mut raw, n_spokes, n_bins, 5.0);

        assert!(raw[0] > raw[1], "center should be brightest");
        assert!(raw[1] > 0.01, "neighbor should have spread");
        assert!(raw[10] < 0.01, "far spoke should be near zero");

        let sum: f32 = raw.iter().sum();
        assert!((sum - 1.0).abs() < 0.01, "energy should be conserved: {sum}");
    }
}
