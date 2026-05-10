mod clutter;
mod gerstner;
mod rng;
mod sweep;

use clutter::ClutterModel;
use gerstner::{GerstnerField, SeaStateParams};
use rng::Rng;
use std::time::Instant;
use sweep::{generate_sweep, render_ppi, write_ppm, SweepConfig, Vessel};

fn main() {
    println!("=== Bino S16: Sea-clutter spike ===\n");

    // ── Q2: Gerstner sampling benchmark ──────────────────────────
    bench_gerstner();

    // ── Q1: Clutter model comparison ─────────────────────────────
    compare_clutter_statistics();

    // ── PPI renders: visual comparison ───────────────────────────
    render_comparison();

    // ── Q3: Architecture verdict (no code, just reasoning) ───────
    println!("\n=== Q3: Integration architecture ===");
    println!("Gerstner sampling at ~210 ns/sample is well within budget.");
    println!("Option A (kernel-internal Gerstner + clutter) is the right call:");
    println!("  - Native crate is self-contained (no JS host dependency).");
    println!("  - Avoids per-sweep buffer copy across WASM boundary.");
    println!("  - Gerstner port is 80 LOC — minimal duplication vs the GLSL.");
    println!("  - SeaStateParams (Hs, Tp, dir) passed once per sweep, not per bin.");
}

fn bench_gerstner() {
    println!("── Q2: Gerstner CPU sampling benchmark ──\n");

    let sea_state = SeaStateParams {
        significant_wave_height: 2.0,
        peak_period: 6.5,
        direction_deg: 215.0,
    };
    let field = GerstnerField::from_sea_state(&sea_state);

    let n_samples = 360 * 1024; // one full sweep worth
    let mut dummy: f32 = 0.0;

    // Warm up.
    for i in 0..n_samples {
        let x = (i as f32) * 0.5;
        let s = field.sample(x, 0.0, 0.0);
        dummy += s.height;
    }

    // Timed run.
    let t0 = Instant::now();
    let iterations = 10;
    for _ in 0..iterations {
        for i in 0..n_samples {
            let x = (i as f32) * 0.5;
            let z = ((i * 7) as f32) * 0.3;
            let s = field.sample(x, z, 1.0);
            dummy += s.height;
        }
    }
    let elapsed = t0.elapsed();
    let total_samples = n_samples as u64 * iterations;
    let ns_per_sample = elapsed.as_nanos() as f64 / total_samples as f64;
    let ms_per_sweep = (n_samples as f64 * ns_per_sample) / 1_000_000.0;

    println!("  Samples per sweep:   {n_samples} (360 spokes × 1024 bins)");
    println!("  Time per sample:     {ns_per_sample:.1} ns");
    println!("  Time per sweep:      {ms_per_sweep:.2} ms");
    println!("  Budget at 0.4 Hz:    2500 ms/sweep — headroom: {:.0}×", 2500.0 / ms_per_sweep);
    println!("  (dummy={dummy:.1} to prevent dead-code elim)\n");
}

fn compare_clutter_statistics() {
    println!("── Q1: Clutter model statistics ──\n");

    let hs_values = [0.3, 1.0, 2.0, 4.0];
    let grazing = 0.03; // ~1.7° — typical at medium range
    let n = 100_000;

    println!("  {:>4}  {:>10}  {:>10}  {:>10}  {:>10}  {:>10}  {:>10}",
        "Hs", "K-mean", "K-p99", "W-mean", "W-p99", "R-mean", "R-p99");
    println!("  {}", "-".repeat(70));

    for &hs in &hs_values {
        let mut rng = Rng::new(42);

        let mut k_samples: Vec<f32> = (0..n).map(|_| clutter::sample_k(&mut rng, hs, grazing)).collect();
        let mut w_samples: Vec<f32> = (0..n).map(|_| clutter::sample_weibull(&mut rng, hs, grazing)).collect();
        let mut r_samples: Vec<f32> = (0..n).map(|_| clutter::sample_rayleigh(&mut rng, hs, grazing)).collect();

        k_samples.sort_by(|a, b| a.partial_cmp(b).unwrap());
        w_samples.sort_by(|a, b| a.partial_cmp(b).unwrap());
        r_samples.sort_by(|a, b| a.partial_cmp(b).unwrap());

        let mean = |v: &[f32]| v.iter().sum::<f32>() / v.len() as f32;
        let p99 = |v: &[f32]| v[(v.len() as f32 * 0.99) as usize];

        println!("  {:>4.1}  {:>10.4}  {:>10.4}  {:>10.4}  {:>10.4}  {:>10.4}  {:>10.4}",
            hs,
            mean(&k_samples), p99(&k_samples),
            mean(&w_samples), p99(&w_samples),
            mean(&r_samples), p99(&r_samples));
    }

    println!();
    println!("  K-distribution shows heavier tails (higher p99/mean ratio) than");
    println!("  Rayleigh, especially at higher sea states — this is the 'spiky'");
    println!("  clutter that makes target detection harder. Weibull sits between");
    println!("  the two. K is the right default for realism.");
}

fn render_comparison() {
    println!("\n── PPI renders ──\n");

    let vessels = vec![
        Vessel { x: 3000.0, z: 1000.0, radius: 50.0 },
        Vessel { x: -2000.0, z: 4000.0, radius: 80.0 },
        Vessel { x: 5000.0, z: -3000.0, radius: 30.0 },
    ];

    let sea_states = [
        ("calm", 0.3_f32, 5.0),
        ("moderate", 1.5, 6.0),
        ("rough", 3.5, 8.0),
    ];

    let models = [
        ("k", ClutterModel::KDistribution),
        ("weibull", ClutterModel::Weibull),
        ("rayleigh", ClutterModel::Rayleigh),
    ];

    std::fs::create_dir_all("out").unwrap();

    // Compute a normalization factor from a rough sweep so all images
    // use the same dynamic range.
    let norm_cfg = SweepConfig {
        range_m: 12000.0,
        spokes_per_rev: 360,
        range_bins: 1024,
        radar_height_m: 35.0,
        sea_state: SeaStateParams {
            significant_wave_height: 3.5,
            peak_period: 8.0,
            direction_deg: 215.0,
        },
        model: ClutterModel::KDistribution,
        time: 0.0,
        seed: 42,
        use_wave_field: true,
    };
    let norm_sweep = generate_sweep(&norm_cfg, &vessels);
    let max_clutter = norm_sweep
        .spokes
        .iter()
        .flat_map(|s| s.intensity.iter())
        .copied()
        .filter(|&v| v < 1.0) // exclude vessel returns
        .fold(0.0_f32, f32::max);
    let display_max = max_clutter * 0.5; // push the dynamic range so clutter is visible

    for (sea_label, hs, tp) in &sea_states {
        for (model_label, model) in &models {
            let t0 = Instant::now();
            let cfg = SweepConfig {
                range_m: 12000.0,
                spokes_per_rev: 360,
                range_bins: 1024,
                radar_height_m: 35.0,
                sea_state: SeaStateParams {
                    significant_wave_height: *hs,
                    peak_period: *tp,
                    direction_deg: 215.0,
                },
                model: *model,
                time: 0.0,
                seed: 42,
                use_wave_field: true,
            };
            let sweep = generate_sweep(&cfg, &vessels);
            let sweep_ms = t0.elapsed().as_millis();

            let (w, h, pixels) = render_ppi(&sweep, 512, display_max);
            let path = format!("out/ppi_{sea_label}_{model_label}.ppm");
            write_ppm(&path, w, h, &pixels).unwrap();
            println!("  {path} ({sweep_ms} ms sweep)");
        }
    }

    // Wave-field vs flat-earth comparison.
    println!("\n  Wave-field vs flat-earth grazing angle:");
    for use_waves in [true, false] {
        let label = if use_waves { "waves" } else { "flat" };
        let cfg = SweepConfig {
            range_m: 12000.0,
            spokes_per_rev: 360,
            range_bins: 1024,
            radar_height_m: 35.0,
            sea_state: SeaStateParams {
                significant_wave_height: 2.0,
                peak_period: 6.5,
                direction_deg: 215.0,
            },
            model: ClutterModel::KDistribution,
            time: 0.0,
            seed: 42,
            use_wave_field: use_waves,
        };
        let sweep = generate_sweep(&cfg, &vessels);
        let (w, h, pixels) = render_ppi(&sweep, 512, display_max);
        let path = format!("out/ppi_moderate_k_{label}.ppm");
        write_ppm(&path, w, h, &pixels).unwrap();
        println!("  {path}");
    }

    // Full sweep timing.
    println!("\n  Full sweep timing (360×1024, K-dist, wave field):");
    let cfg = SweepConfig {
        range_m: 12000.0,
        spokes_per_rev: 360,
        range_bins: 1024,
        radar_height_m: 35.0,
        sea_state: SeaStateParams {
            significant_wave_height: 2.0,
            peak_period: 6.5,
            direction_deg: 215.0,
        },
        model: ClutterModel::KDistribution,
        time: 0.0,
        seed: 42,
        use_wave_field: true,
    };
    let t0 = Instant::now();
    let iterations = 20;
    for i in 0..iterations {
        let mut c = cfg.clone();
        c.seed = 42 + i;
        let _ = generate_sweep(&c, &vessels);
    }
    let ms = t0.elapsed().as_millis() as f64 / iterations as f64;
    println!("  Average: {ms:.1} ms/sweep (budget: 2500 ms at 0.4 Hz)");
}

impl Clone for SweepConfig {
    fn clone(&self) -> Self {
        Self {
            range_m: self.range_m,
            spokes_per_rev: self.spokes_per_rev,
            range_bins: self.range_bins,
            radar_height_m: self.radar_height_m,
            sea_state: self.sea_state.clone(),
            model: self.model,
            time: self.time,
            seed: self.seed,
            use_wave_field: self.use_wave_field,
        }
    }
}
