/// CPU-side Gerstner wave evaluator — Rust port of the GLSL in
/// `packages/core/src/sea.ts`. 4-component trochoidal waves driven
/// by sea-state parameters (Hs, Tp, direction).

use std::f32::consts::{PI, TAU};

const G: f32 = 9.81;
const N_WAVES: usize = 4;

#[derive(Clone, Debug)]
pub struct WaveComponent {
    pub amplitude: f32,
    pub wavelength: f32,
    pub dir_x: f32,
    pub dir_z: f32,
    pub steepness: f32,
}

#[derive(Clone, Debug)]
pub struct SeaStateParams {
    pub significant_wave_height: f32,
    pub peak_period: f32,
    pub direction_deg: f32,
}

#[derive(Clone, Debug)]
pub struct GerstnerField {
    components: [WaveComponent; N_WAVES],
}

#[derive(Clone, Debug)]
pub struct WaveSample {
    pub height: f32,
    pub normal: [f32; 3],
}

impl GerstnerField {
    pub fn from_sea_state(ss: &SeaStateParams) -> Self {
        let hs = ss.significant_wave_height;
        let t = ss.peak_period;
        let dir_rad = ss.direction_deg * PI / 180.0;
        let peak_wavelength = G * t * t / TAU;
        let a = hs / 4.0; // Hs ≈ 4σ

        let dx = dir_rad.cos();
        let dz = dir_rad.sin();

        // Same 4 components as sea.ts: componentsFor().
        let components = [
            WaveComponent {
                amplitude: a * 1.0,
                wavelength: peak_wavelength,
                dir_x: dx,
                dir_z: dz,
                steepness: 0.5,
            },
            WaveComponent {
                amplitude: a * 0.6,
                wavelength: peak_wavelength * 0.5,
                dir_x: dx * 0.92 + -dz * 0.39,
                dir_z: dz * 0.92 + dx * 0.39,
                steepness: 0.4,
            },
            WaveComponent {
                amplitude: a * 0.4,
                wavelength: peak_wavelength * 0.25,
                dir_x: dx * 0.71 + -dz * 0.71,
                dir_z: dz * 0.71 + dx * 0.71,
                steepness: 0.3,
            },
            WaveComponent {
                amplitude: a * 0.3,
                wavelength: peak_wavelength * 0.7,
                dir_x: -dz,
                dir_z: dx,
                steepness: 0.2,
            },
        ];

        Self { components }
    }

    /// Sample wave height and surface normal at world position (x, z)
    /// at time t. Matches the GLSL vertex shader math exactly.
    pub fn sample(&self, x: f32, z: f32, t: f32) -> WaveSample {
        let mut displaced_y: f32 = 0.0;
        let mut tangent = [1.0f32, 0.0, 0.0];
        let mut binormal = [0.0f32, 0.0, 1.0];

        for c in &self.components {
            let k = TAU / c.wavelength;
            let omega = (G * k).sqrt();
            let phase = k * (c.dir_x * x + c.dir_z * z) - omega * t;
            let cos_p = phase.cos();
            let sin_p = phase.sin();

            displaced_y += c.amplitude * sin_p;

            let wa = k * c.amplitude;
            let q = c.steepness;
            tangent[0] += -q * c.dir_x * c.dir_x * wa * sin_p;
            tangent[1] += c.dir_x * wa * cos_p;
            tangent[2] += -q * c.dir_x * c.dir_z * wa * sin_p;

            binormal[0] += -q * c.dir_x * c.dir_z * wa * sin_p;
            binormal[1] += c.dir_z * wa * cos_p;
            binormal[2] += -q * c.dir_z * c.dir_z * wa * sin_p;
        }

        // normal = normalize(cross(binormal, tangent))
        let nx = binormal[1] * tangent[2] - binormal[2] * tangent[1];
        let ny = binormal[2] * tangent[0] - binormal[0] * tangent[2];
        let nz = binormal[0] * tangent[1] - binormal[1] * tangent[0];
        let len = (nx * nx + ny * ny + nz * nz).sqrt();
        let normal = if len > 1e-12 {
            [nx / len, ny / len, nz / len]
        } else {
            [0.0, 1.0, 0.0]
        };

        WaveSample {
            height: displaced_y,
            normal,
        }
    }

    /// Grazing angle (radians) of a ray from `origin_height` above the
    /// local wave surface at position (x, z, t), looking toward the
    /// surface. Returns angle between the ray and the local tangent
    /// plane (0 = parallel to surface, π/2 = straight down).
    pub fn grazing_angle(&self, x: f32, z: f32, t: f32, origin_height: f32) -> f32 {
        let s = self.sample(x, z, t);
        let ray_y = origin_height - s.height;
        if ray_y <= 0.0 {
            return 0.0;
        }
        // The surface normal points mostly up. Grazing angle is the
        // complement of the angle between the incoming ray and the
        // surface normal. For a radar at height h looking at range r,
        // the ray direction is approximately (-r_hat, -h/r, 0) but
        // for a horizontal-plane radar the vertical component is just
        // h/range. We simplify: grazing angle ≈ atan(h / range) for
        // the geometry, modulated by the local surface tilt.
        //
        // For this spike we return the angle between the "down" ray
        // and the tangent plane, which is asin(dot(ray_down, normal)).
        // At long range this approaches atan(h/r).
        s.normal[1].asin().max(0.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn calm_sea_is_flat() {
        let field = GerstnerField::from_sea_state(&SeaStateParams {
            significant_wave_height: 0.0,
            peak_period: 5.0,
            direction_deg: 0.0,
        });
        let s = field.sample(100.0, 200.0, 1.0);
        assert!(s.height.abs() < 1e-6);
        assert!((s.normal[1] - 1.0).abs() < 1e-6); // straight up
    }

    #[test]
    fn rough_sea_has_nonzero_height() {
        let field = GerstnerField::from_sea_state(&SeaStateParams {
            significant_wave_height: 2.0,
            peak_period: 6.5,
            direction_deg: 215.0,
        });
        let mut max_h: f32 = 0.0;
        for i in 0..100 {
            let x = i as f32 * 10.0;
            let s = field.sample(x, 0.0, 0.0);
            max_h = max_h.max(s.height.abs());
        }
        assert!(max_h > 0.1, "rough sea should produce visible waves");
    }
}
