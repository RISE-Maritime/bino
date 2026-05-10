/// CPU-side Gerstner wave evaluator — Rust port of the GLSL in
/// `packages/core/src/sea.ts`. Available for future wave-crest
/// shadowing; v1.0 uses flat-earth grazing angle per S16 verdict.

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
pub struct GerstnerField {
    components: [WaveComponent; N_WAVES],
}

pub struct WaveSample {
    pub height: f32,
    pub normal: [f32; 3],
}

impl GerstnerField {
    pub fn from_sea_state(hs: f32, peak_period: f32, direction_deg: f32) -> Self {
        let t = peak_period;
        let dir_rad = direction_deg * PI / 180.0;
        let peak_wavelength = G * t * t / TAU;
        let a = hs / 4.0;

        let dx = dir_rad.cos();
        let dz = dir_rad.sin();

        let components = [
            WaveComponent { amplitude: a, wavelength: peak_wavelength, dir_x: dx, dir_z: dz, steepness: 0.5 },
            WaveComponent { amplitude: a * 0.6, wavelength: peak_wavelength * 0.5, dir_x: dx * 0.92 - dz * 0.39, dir_z: dz * 0.92 + dx * 0.39, steepness: 0.4 },
            WaveComponent { amplitude: a * 0.4, wavelength: peak_wavelength * 0.25, dir_x: dx * 0.71 - dz * 0.71, dir_z: dz * 0.71 + dx * 0.71, steepness: 0.3 },
            WaveComponent { amplitude: a * 0.3, wavelength: peak_wavelength * 0.7, dir_x: -dz, dir_z: dx, steepness: 0.2 },
        ];

        Self { components }
    }

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

        let nx = binormal[1] * tangent[2] - binormal[2] * tangent[1];
        let ny = binormal[2] * tangent[0] - binormal[0] * tangent[2];
        let nz = binormal[0] * tangent[1] - binormal[1] * tangent[0];
        let len = (nx * nx + ny * ny + nz * nz).sqrt();
        let normal = if len > 1e-12 {
            [nx / len, ny / len, nz / len]
        } else {
            [0.0, 1.0, 0.0]
        };

        WaveSample { height: displaced_y, normal }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn calm_sea_is_flat() {
        let field = GerstnerField::from_sea_state(0.0, 5.0, 0.0);
        let s = field.sample(100.0, 200.0, 1.0);
        assert!(s.height.abs() < 1e-6);
        assert!((s.normal[1] - 1.0).abs() < 1e-6);
    }

    #[test]
    fn rough_sea_has_nonzero_height() {
        let field = GerstnerField::from_sea_state(2.0, 6.5, 215.0);
        let mut max_h: f32 = 0.0;
        for i in 0..100 {
            let s = field.sample(i as f32 * 10.0, 0.0, 0.0);
            max_h = max_h.max(s.height.abs());
        }
        assert!(max_h > 0.1);
    }
}
