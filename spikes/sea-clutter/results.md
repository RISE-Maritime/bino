# S16 results — sea-clutter model for marine radar

**Date:** 2026-05-10
**Time spent:** ~3 hours (well within 2-day box)

## Summary

All three spike questions resolved. The prototype generates
physically-motivated sea clutter at 44 ms/sweep (57× under
the 0.4 Hz budget), K-distribution is the right model, and
the kernel should own Gerstner + clutter internally (Option A).

---

## Q1 verdict: K-distribution

**Ship it.** K-distribution (Ward 1981) — Rayleigh speckle ×
Gamma texture — is the right default. Findings:

### Statistical comparison (100K samples, grazing ≈ 1.7°)

| Hs  | K-mean  | K-p99   | W-mean  | W-p99   | R-mean  | R-p99   |
|-----|---------|---------|---------|---------|---------|---------|
| 0.3 | 0.0003  | 0.0009  | 0.0004  | 0.0005  | 0.0003  | 0.0008  |
| 1.0 | 0.0006  | 0.0016  | 0.0007  | 0.0011  | 0.0006  | 0.0015  |
| 2.0 | 0.0009  | 0.0023  | 0.0009  | 0.0016  | 0.0009  | 0.0022  |
| 4.0 | 0.0013  | 0.0034  | 0.0013  | 0.0026  | 0.0013  | 0.0031  |

- **K has the heaviest tail** (p99/mean ≈ 2.6× at Hs=4), matching
  the "spiky clutter" phenomenology real perception systems must
  handle. Weibull is lighter (p99/mean ≈ 2.0×). Rayleigh sits
  between the two (p99/mean ≈ 2.4×) but without the texture
  component that drives burst-like returns.
- **PPI renders confirm visual difference:** K-distribution produces
  occasional bright speckles above the noise floor that Weibull
  smooths out. These spikes are what make CFAR detection algorithms
  necessary in real radar — preserving them matters for V&V.
- **Weibull is not worth shipping alongside K.** The computational
  cost is similar (both need a Gamma or power-law sample), and
  Weibull's lighter tail makes it less representative. Drop it.
- **Rayleigh stays as the receiver-noise floor.** Every bin gets
  thermal noise (Rayleigh); sea clutter from the K-distribution
  adds on top. The v1.0 kernel should model both: `intensity =
  max(vessel_return, clutter_k + noise_rayleigh)`.

### Mean σ₀ model

The spike's empirical σ₀(Hs, ψ) formula (Nathanson-inspired,
X-band HH) is adequate for the prototype:

    σ₀(dB) ≈ -40 + 10·log₁₀(Hs) + 15·log₁₀(sin(ψ))

For v1.0, replace with proper GIT (Georgia Tech) tables keyed by
`(frequency_ghz, polarization, sea_state, grazing_angle, look_vs_wind)`.
The interface is the same — a function `(Hs, ψ) → σ₀` — so the
swap is mechanical.

### K-distribution shape parameter

    ν ≈ 30 / (Hs + 0.5)   →   ν ∈ [5, 60] for Hs ∈ [0, 6]

Lower ν = spikier (more Gamma texture variance). This fit gives
plausible behavior; real calibration from measured data is a v1.0+
refinement.

---

## Q2 verdict: Gerstner CPU sampling — fast but unnecessary

**Gerstner port works, but per-cell wave sampling adds negligible
visual benefit. Ship with flat-earth grazing angle; keep the
Gerstner evaluator for future use.**

### Benchmark

- **52.8 ns/sample** (4-component Gerstner, release build)
- **19.5 ms/sweep** at 360×1024 (Gerstner only, no clutter)
- **43.7 ms/sweep** full (Gerstner + K-distribution + vessel check)
- **Budget: 2500 ms** at 0.4 Hz → **57× headroom**

### Wave-field vs flat-earth comparison

The PPI renders for `moderate_k_waves` and `moderate_k_flat` are
visually indistinguishable. Why: at radar height 35 m and range
up to 12 km, the flat-earth grazing angle is atan(35/r) ≈ 0.003–
0.17 rad. The Gerstner perturbation to effective height is ±Hs/4
≈ ±0.5 m on a 35 m baseline — a ~1.4% modulation. The clutter
model's stochastic variation swamps this signal.

**Per-cell wave sampling would matter if:**
- Radar height were much lower (e.g., 5 m on a small craft)
- Sea state were extreme (Hs > 5 m)
- We modelled wave-crest shadowing (far-range bins masked by
  intervening crests) — a geometric effect, not statistical

None of these are v1.0 requirements. The Gerstner evaluator is
~80 LOC in Rust and already written; keep it in the kernel for
the eventual shadowing model, but default to flat-earth grazing
for the clutter distribution.

---

## Q3 verdict: Option A — kernel-internal

**Pass `SeaClutterConfig` as a new field alongside `RadarConfig`.
Kernel owns Gerstner + clutter internally.**

Reasons:
1. **Native crate stays self-contained.** The `bino-radar` crate is
   designed to work standalone for offline log analysis. If clutter
   depends on a JS-provided height buffer, the native path breaks.
2. **No per-sweep buffer copy.** Wave heights at 360×1024 × 4 bytes
   = 1.4 MB/sweep across the WASM boundary — 10× larger than the
   current scene snapshot (~3 KB). Unnecessary when the kernel can
   sample internally in 19 ms.
3. **Minimal duplication.** The Gerstner math is ~80 LOC in Rust
   vs ~90 lines in the GLSL shader. The two serve different purposes
   (CPU sampling vs GPU displacement) and diverging slightly is fine
   — they share the `componentsFor()` parameterization, which stays
   in `@bino/core` and feeds both paths.
4. **Clean API boundary.** The WASM entry point grows one argument:
   ```rust
   pub fn radar_sweep(scene, host, config, sea_clutter_config) -> RadarSweep
   ```
   `SeaClutterConfig` is a small struct (~40 bytes): Hs, Tp,
   direction, radar_height, and a model selector. Passed once per
   sweep.

---

## Architecture sketch for v1.0 integration

```
RadarConfig          (existing: range_m, spokes_per_rev, range_bins, sweep_duration_s)
 + beam_width_deg    (new — for antenna pattern, separate spike)
 + ...

SeaClutterConfig     (new)
  hs: f32            (significant_wave_height from DSL)
  tp: f32            (peak_period)
  direction_deg: f32
  radar_height_m: f32
  enabled: bool      (false → no clutter, backward compat)

sweep() internals:
  1. For each spoke:
     a. Compute azimuth (existing)
     b. For each range bin:
        - Flat-earth grazing angle: atan(h/r)
        - K-distributed clutter sample from (Hs, ψ)
        - Rayleigh thermal noise floor
        - Vessel geometry-of-returns check (existing)
        - intensity[bin] = max(vessel_return, clutter + noise)
     c. (Future: antenna pattern convolution across spoke)
  2. Return RadarSweep with continuous intensity (f32 or u8)
```

**Breaking change:** intensity goes from binary (0/255) to
continuous. The Keelson `RadarSpoke` schema already supports
arbitrary byte layouts via `PackedElementField`, so the wire
format is fine. The PPI viewer needs a display-range adjustment.

---

## Files produced

- `src/gerstner.rs` — Rust port of sea.ts Gerstner evaluator (liftable to `kernels/radar/`)
- `src/clutter.rs` — K-distribution, Weibull, Rayleigh samplers + σ₀ model
- `src/rng.rs` — xoshiro128+ PRNG (liftable; no external dep needed)
- `src/sweep.rs` — full sweep generator with clutter + PPI renderer
- `out/ppi_*.png` — visual comparison (9 calm/moderate/rough × 3 models + 2 wave/flat)

## What's left for v1.0 implementation (not this spike)

- Integrate into `kernels/radar/src/lib.rs` (the production kernel)
- WASM boundary: add `SeaClutterConfig` to `radar_sweep()` binding
- JS side: extract sea-state params from `EnvironmentSnapshot`, pass to kernel
- DSL: no changes needed — `environment.sea_state` already has Hs, Tp, direction
- Antenna pattern: separate spike (S17), adds `beam_width_deg` convolution
- Weather attenuation: ITU-R P.838 range-dependent loss factor — straightforward
- GIT σ₀ tables: replace the Nathanson approximation with proper lookup
- Temporal correlation: K-distribution texture should be correlated across
  consecutive sweeps (slow-varying Gamma process), not i.i.d. per frame
