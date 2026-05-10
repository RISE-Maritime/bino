# Spike S16: Sea-clutter model for marine radar

## Why

v1.0's headline feature is a physically-motivated marine radar — sea
clutter, antenna pattern, weather attenuation. The v0.3 geometry-of-
returns kernel is deliberately crude: binary intensity (0/255), no
sea surface interaction, no antenna pattern. Serious autonomy V&V
for collision avoidance in clutter cannot use it — the plan says so
explicitly.

Sea clutter is the hardest unknown. Antenna patterns and weather
attenuation are well-documented engineering (sinc² main lobe,
ITU-R rain attenuation curves). Sea clutter is a statistical
modelling problem with real research-grade ambiguity: which
distribution (Rayleigh, K, Weibull, compound-Gaussian)? What
drives the texture parameter? How does grazing angle interact
with sea state? Does the wave field geometry matter, or only
bulk Hs/Tp? The answer shapes the entire v1.0 radar architecture.

This spike resolves three questions before committing a v1.0 plan:

### Q1 — Which clutter model?

Candidates:

- **Rayleigh (thermal noise baseline).** Simple, memoryless, one
  parameter (σ). Appropriate for receiver thermal noise and the
  "no clutter" case. Not adequate alone — real sea returns are
  heavier-tailed than Rayleigh at low grazing angles.
- **K-distribution (Ward model).** The standard compound model:
  Rayleigh speckle × Gamma texture. Two parameters: shape (ν) and
  scale. Shape driven by sea state + grazing angle. Well-supported
  in the literature (Ward 1981, Watts 1985, Haykin & Bakker 1991).
  Used by NRL's RLSTAP and most modern radar simulators.
- **Weibull.** Empirical fit, two parameters (shape, scale). Simpler
  to sample than K. Common in ITU-R models. Less physical basis than
  K but often indistinguishable in practice for non-coherent radar.
- **GIT (Georgia Tech) empirical model.** σ₀ tables from sea state
  + frequency + grazing angle + polarization. Not a distribution —
  gives mean σ₀, not per-cell statistics. Often paired with K or
  Weibull for the cell-to-cell variation.

The spike should prototype the K-distribution (it's the standard)
and compare output against a simpler Weibull to see if the
complexity buys visible realism on a PPI.

### Q2 — CPU Gerstner sampling in Rust

The sea shader (`packages/core/src/sea.ts`) evaluates 4-component
Gerstner waves on the GPU. The radar kernel runs on the CPU (Rust/
WASM). For geometry-aware clutter (grazing angle from local wave
slope, wave-crest masking of far-range returns), the kernel needs
wave height and surface normal at arbitrary (x, z, t).

Budget: 360 spokes × 1024 bins × 0.4 Hz = ~148K height samples
per second. Port the 4-component Gerstner evaluator to Rust, bench
the per-sample cost, confirm it fits the sweep budget.

If CPU Gerstner is too expensive or unnecessary (Q1 might show
that bulk sea-state parameters alone drive clutter adequately),
the kernel can skip per-cell wave sampling and use only Hs/Tp.
The spike should try both paths and report which matters visually.

### Q3 — Integration architecture

How does sea state flow into the Rust kernel?

- **Option A:** Pass `SeaClutterConfig` (Hs, Tp, direction, wind
  speed) alongside `RadarConfig`. Kernel does its own Gerstner
  sampling and clutter generation internally.
- **Option B:** Pre-sample wave heights on the JS side, pass a
  height buffer across the WASM boundary per sweep. Kernel
  consumes heights but doesn't own the wave math.

Option A is cleaner (kernel is self-contained, native crate works
standalone) but means duplicating the Gerstner math in Rust.
Option B avoids duplication but couples the kernel to the JS host
and bloats the per-frame copy.

Verdict likely A (the native-crate use case demands self-
containment, and Gerstner is ~30 LOC in Rust), but confirm.

## Acceptance

- A Rust prototype (can be inside `kernels/radar/` or a standalone
  binary in `spikes/sea-clutter/`) that generates a full sweep with:
  - Per-bin clutter intensity (not binary — continuous 0-255 or f32)
    driven by sea state parameters.
  - At least one statistical model (K-distribution preferred).
  - A PPI-style visualization (PPM or ASCII polar plot) showing
    clutter that visually correlates with sea state: heavier seas =
    more near-range clutter, calm seas = mostly noise floor.
- A Rust Gerstner height sampler with a micro-bench: cost per
  sample, total cost per sweep at 360×1024.
- A side-by-side comparison (visual or statistical): K-distribution
  vs Weibull vs bulk-Hs-only, with a one-paragraph verdict on which
  to ship.
- Antenna-pattern convolution is **out of scope** for this spike —
  treat beam as a pencil ray (current behaviour). Antenna pattern is
  a separable follow-up once clutter lands.
- Weather attenuation (rain/fog) is **out of scope** — it layers on
  top of clutter and is straightforward (ITU-R P.838 / P.840).
- `results.md` with verdicts on Q1, Q2, Q3.

## Out of scope

- Antenna pattern (beam width convolution, sidelobe modelling).
- Rain/fog/snow attenuation.
- Doppler effects / coherent processing.
- Multi-bounce / multipath propagation.
- Terrain clutter (land returns) — vessels + sea only.
- WASM build or JS integration — this is a pure Rust prototype.
  Integration into the live kernel is v1.0 implementation work.

## Time box

~2 days. The statistical modelling and Rust prototyping are the
bulk; the Gerstner port is mechanical. If Q1 takes longer than a
day, cut the Weibull comparison and ship K-distribution only with
a note on the trade-off.

## References

- Ward, K.D. (1981). "Compound representation of high-resolution
  sea clutter." Electronics Letters, 17(16).
- Watts, S. (1985). "Radar detection prediction in sea clutter
  using the compound K-distribution model." IEE Proceedings F.
- Nathanson, F.E. (1991). "Radar Design Principles" — Chapter 7
  (sea clutter reflectivity tables by sea state and frequency).
- GPU Gems 1, Ch. 1 (Gerstner wave math — already in sea.ts).
