/// Minimal xoshiro128+ PRNG — no external dependency. Deterministic,
/// seedable, fast. Good enough for Monte Carlo clutter sampling.

pub struct Rng {
    s: [u32; 4],
}

impl Rng {
    pub fn new(seed: u64) -> Self {
        // SplitMix64 to expand seed into state.
        let mut z = seed;
        let mut s = [0u32; 4];
        for slot in &mut s {
            z = z.wrapping_add(0x9e3779b97f4a7c15);
            let mut x = z;
            x = (x ^ (x >> 30)).wrapping_mul(0xbf58476d1ce4e5b9);
            x = (x ^ (x >> 27)).wrapping_mul(0x94d049bb133111eb);
            x ^= x >> 31;
            *slot = x as u32;
        }
        Self { s }
    }

    fn next_u32(&mut self) -> u32 {
        let result = self.s[0].wrapping_add(self.s[3]);
        let t = self.s[1] << 9;
        self.s[2] ^= self.s[0];
        self.s[3] ^= self.s[1];
        self.s[1] ^= self.s[2];
        self.s[0] ^= self.s[3];
        self.s[2] ^= t;
        self.s[3] = self.s[3].rotate_left(11);
        result
    }

    /// Uniform f32 in [0, 1).
    pub fn uniform(&mut self) -> f32 {
        (self.next_u32() >> 8) as f32 / (1u32 << 24) as f32
    }

    /// Standard normal via Box-Muller.
    pub fn normal(&mut self) -> f32 {
        let u1 = self.uniform().max(1e-10);
        let u2 = self.uniform();
        (-2.0 * u1.ln()).sqrt() * (std::f32::consts::TAU * u2).cos()
    }

    /// Exponential distribution with rate λ.
    pub fn exponential(&mut self, lambda: f32) -> f32 {
        let u = self.uniform().max(1e-10);
        -u.ln() / lambda
    }

    /// Gamma distribution (shape α, scale 1) via Marsaglia-Tsang.
    /// α must be > 0. For α < 1 we use the Ahrens-Dieter boost.
    pub fn gamma(&mut self, alpha: f32) -> f32 {
        if alpha < 1.0 {
            return self.gamma(alpha + 1.0) * self.uniform().max(1e-10).powf(1.0 / alpha);
        }
        let d = alpha - 1.0 / 3.0;
        let c = 1.0 / (9.0 * d).sqrt();
        loop {
            let x = self.normal();
            let v = 1.0 + c * x;
            if v <= 0.0 {
                continue;
            }
            let v = v * v * v;
            let u = self.uniform().max(1e-10);
            if u < 1.0 - 0.0331 * (x * x) * (x * x) {
                return d * v;
            }
            if u.ln() < 0.5 * x * x + d * (1.0 - v + v.ln()) {
                return d * v;
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn uniform_in_range() {
        let mut rng = Rng::new(42);
        for _ in 0..10_000 {
            let u = rng.uniform();
            assert!((0.0..1.0).contains(&u));
        }
    }

    #[test]
    fn normal_mean_near_zero() {
        let mut rng = Rng::new(42);
        let n = 50_000;
        let sum: f32 = (0..n).map(|_| rng.normal()).sum();
        let mean = sum / n as f32;
        assert!(mean.abs() < 0.05, "mean was {mean}");
    }

    #[test]
    fn gamma_positive() {
        let mut rng = Rng::new(42);
        for _ in 0..1_000 {
            let g = rng.gamma(2.0);
            assert!(g > 0.0);
        }
    }
}
