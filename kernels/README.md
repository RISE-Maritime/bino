# Bino sensor kernels (Rust)

Cargo workspace containing the performance-critical sensor kernels.
Each crate compiles to both a native library (`cargo build`) and a WASM
module (`--target wasm32-unknown-unknown` + `wasm-bindgen`).

## Crates

| Crate         | Purpose |
|---------------|---------|
| `radar/`      | Marine radar v1 — geometry-of-returns, K-distribution sea clutter, Gaussian antenna pattern, ITU-R P.838 rain attenuation |
| `lidar/`      | BVH ray-cast lidar — two-tree design (static terrain + dynamic vessels), Moller-Trumbore triangle intersection |

## Build

```bash
# WASM (artifacts land in packages/core/wasm/)
pnpm kernels:build

# Native tests
cd kernels && cargo test --release
```

The `wasm-bindgen-cli` version must match the crate dependency exactly
(currently 0.2.120).

## Documentation

- [Radar sensor model](../docs/sensor-models/radar.md) — K-distribution theory, σ₀ model, rain attenuation
- [Lidar sensor model](../docs/sensor-models/lidar.md) — BVH structure, ray intersection algorithms, performance
- [ADR-001: Lidar kernel architecture](../docs/adr/001-lidar-kernel.md) — WASM vs GL depth-pass decision
