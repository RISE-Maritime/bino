# v0.3 retrospective

**Closed:** 2026-04-29 (third milestone closed in the same intensive
session as v0.1 and v0.2).
**Companion:** `docs/internal/plan.md` (v0.3 section + new env-modelling
cross-cutting thread), `docs/internal/v01-retrospective.md`,
`docs/internal/v02-retrospective.md`, `docs/internal/design-vision.md`.

This is the paper trail for v0.3 — Rust enters the codebase. What
landed, where the plan was wrong, the toolchain surprises, the
architectural decisions, and the new risks for v0.4.

---

## Acceptance — did v0.3 deliver?

**Yes, fully.** v0.3's headline goal was *PPI-style radar from a
geometry-of-returns kernel, Rust from the start, exposed as both a
WASM module and a native crate, with a viewer PPI overlay*. All four
clauses shipped.

What's automated and verified:

- **Live e2e (`zenoh-e2e.test.ts`, gated on `BINO_ZENOH_URL`):**
  synthetic publisher → bino service with full sensor stack → consumer
  probes for camera, lidar, **and radar**. Asserts radar fires at
  `rotation_rate_hz=2.0` (≥3 sweeps in 3 s) with the configured
  `spokes_per_rev=90` per sweep.
- **Native cargo test** in `kernels/radar/`: 4 tests covering empty
  scene, on-axis hit, off-axis hit, out-of-range filtering. `cargo
  test --release` green.
- **WASM integration tests** in `@bino/core`: 4 vitest tests load the
  built `.wasm` and exercise `createRadarKernel` against real Three.js
  scene graphs. Confirms the JS↔WASM marshalling for SceneSnapshot /
  HostPose / RadarConfig.
- **Browser viewer**: max-range ring overlay in 3D + 2D PPI panel
  bottom-right corner; updates live as ferry traverses the radar
  field. Visually verified.
- **Live full-duplex CLI**: `bino-node scenarios/v01_smoke.yaml --zenoh
  ws://...` runs all three sensors, publishes camera/lidar/radar on
  canonical Keelson topics. Verified live with consumer probes.

Test totals at close: 58 in `@bino/core` (incl. 4 radar-WASM + 1 radar
encode/decode), 16 in `@bino/node` (e2e covers radar), 1 Playwright in
`@bino/viewer`, 4 native cargo tests in `kernels/radar/`.

**Stretch task #9 from v0.2 (sensor preview pane) still deferred** —
v0.3 added enough sensor-overlay UI work that this fits more cleanly
with v0.5+ scenario-authoring polish.

---

## Spike outcomes

All four pre-v0.3 spikes resolved on Day 0 of v0.3 work. The radar
work itself was meaningfully smaller because all the unknowns had
been settled up front.

| spike | outcome |
|-------|---------|
| **S7 — Rust toolchain** | ✅ `wasm-bindgen` + cargo direct, no `wasm-pack`. `cdylib + rlib` crate-type lets one crate target both native and `wasm32-unknown-unknown`. `wasm-bindgen-cli` pinned to `0.2.120` to match the crate. Lock-step pinning is the only real gotcha. |
| **S8 — Memory model** | ✅ Copy-each-frame via `serde-wasm-bindgen`. Per-frame payload is ~150 KB worst case; the marshalling cost is negligible compared to the 2.5 s between sweeps at 0.4 Hz. SharedArrayBuffer's COOP/COEP infrastructure isn't worth taking on for radar. |
| **S9 — Keelson radar schema** | ✅ `radar_spoke: keelson.RadarSpoke` and `radar_sweep: keelson.RadarSweep` already shipped. `@rise-maritime/keelson-js@0.5.0` already includes the generated payload classes at `dist/payloads/RadarReading.{js,d.ts}`. Same encode/decode pattern as v0.2's image_raw / point_cloud. |
| **S10 — Native+wasm dual-target tests** | ✅ Resolved in line with the kernel work itself. `cargo test --release` runs the native path; `pnpm test` in `@bino/core` runs the WASM path through vitest+vite-plugin-wasm. Both green at close. |

---

## What landed vs the plan

10 of 10 numbered v0.3 tasks shipped (the plan tracked them as 17
sub-items grouped into 10 task-tracker entries). Per-task:

| section | landed? | notes |
|---------|---------|-------|
| 1 — Cargo workspace skeleton | ✅ | `kernels/Cargo.toml` + `kernels/radar/`. Single source, two targets. `rust-toolchain.toml` pins 1.95 + wasm32. |
| 2 — pnpm `kernels:build` script | ✅ | Plain `cd kernels && cargo build --target wasm32 && wasm-bindgen --target bundler ...`. No `wasm-pack`. Output to `packages/core/wasm/` (sibling to src/dist) so the same relative import works in both source and built code. |
| 3-5 — SceneSnapshot, RadarConfig, geometry-of-returns | ✅ | Per-spoke ray-bbox intersection in the horizontal plane, slab method. Binary intensity (255 or 0) per range bin. ASVSim simplifications loud in the doc-comment header. |
| 6-7 — `step()` + native unit tests | ✅ | `pub fn sweep(scene, host, config) -> RadarSweep`. WASM entry is a separate `#[cfg(target_arch = "wasm32")]` shim doing serde marshalling. 4 native tests. |
| 8-9 — WASM loader + vitest integration | ✅ | `createRadarKernel` matches the camera/lidar pattern. WASM module instance is shared across all radar kernels (module-scoped). 4 vitest integration tests passing the kernel real Three.js scene graphs. |
| 10-11 — RadarSensor DSL + radar_sweep encoder | ✅ | DSL field is `rotation_rate_hz`, not `rate_hz` — domain-specific naming kept visible in scenarios. `encodeRadarSweep` / `decodeRadarSweepEnvelope` follow the v0.2 pattern. |
| 12-13 — Service + scenario integration | ✅ | Service maps `sensor.rotation_rate_hz` → `ScheduledKernel.rate_hz` for the runner. `v01_smoke.yaml` gains a masthead radar. |
| 14-15 — PPI overlay + radar wedge | ✅, **but not as planned**: see "Decisions in flight" — the 3D overlay is a max-range ring (LineLoop), not a beam-width wedge. At 1.2° beam width a wedge would be invisible at the third-person camera distance. Honest deviation. |
| 16-17 — e2e + manual viewer demo | ✅ | e2e adds radar consumer alongside camera/lidar; ran live against the local zenoh-router and confirmed radar arrived at the expected cadence. |

---

## Decisions taken in flight

- **WASM artifacts location: `packages/core/wasm/` (sibling to src/dist).**
  Initially put them in `src/wasm/` but `tsc` doesn't copy non-TS
  files to dist, so the built code's relative imports resolved
  wrong. Sibling location lets both source-resolved (vitest) and
  built-resolved (production) paths point to the same artifacts.
- **3D radar overlay is a max-range ring, not a beam-width wedge.**
  Plan said "wedge frustum-style overlay (a wedge showing beam width
  + range)." With `beam_width_deg=1.2`, a 1.2° wedge at 2 km is a
  thin sliver invisible against the third-person camera at ~100 m
  distance. The max-range LineLoop conveys "this radar reaches this
  far"; the actual sweep is in the PPI panel where it's visible.
- **PPI is canvas2d, not a Three.js texture.** Plan listed both
  options. canvas2d is cheaper per frame and the PPI is conventionally
  2D anyway. Texture-based PPI (compositable into the 3D scene) is a
  v1.0 concern when antenna pattern visualization gets serious.
- **Radar kernel `dispose()` is a no-op.** No GL/DOM resources to
  free; the WASM module instance is module-scoped and shared across
  kernels. Lifecycle matters less than for camera/lidar.
- **DSL field naming inconsistency: `rotation_rate_hz` for radar,
  `rate_hz` for camera/lidar.** Kept domain-specific name visible in
  scenarios because radar's "rate" *is* its antenna rotation rate.
  Camera/lidar `rate_hz` is generic. Service.ts bridges. Document
  the inconsistency rather than hide it.
- **Native crate name `bino-radar` matches future crates.io
  expectations** — no `bino_radar` or `bino_kernel_radar` prefix
  variants. If we publish, the namespace is open.
- **`@bino/core` had to grow `vite-plugin-wasm`** because vitest now
  loads WASM transitively when testing modules that touch the radar
  module. So did `@bino/node`. The viewer already had it for
  `zenoh-ts`. Pattern: any package whose vitest setup touches a
  WASM-importing module needs the plugin.

---

## What we learned about the stack

- **Rust 1.95 + wasm-bindgen 0.2.120 + serde-wasm-bindgen 0.6** is
  remarkably ergonomic in 2026. Same crate, two targets, no
  `wasm-pack`, clean serde marshalling for free. The only operational
  constraint is keeping `wasm-bindgen-cli` version-locked to the
  crate version (`cargo install --version 0.2.120 wasm-bindgen-cli`).
- **`wasm-bindgen --target bundler` works in Node 22 directly** —
  Node's experimental WebAssembly ESM import support is enough.
  vite-plugin-wasm handles the same artifact in browsers. One build
  output, two runtimes — pleasant surprise.
- **Cargo workspaces inside a pnpm workspace coexist trivially.**
  They don't know about each other; the pnpm `kernels:build` script
  just shells out to `cargo`. No monorepo-orchestration tool needed
  (turborepo / nx would have been overkill).
- **`cfg(target_arch = "wasm32")`-gated wasm-bindgen layer keeps
  native cargo tests fast** — `cargo test` doesn't compile or
  instantiate any WASM bindings code. Native tests run in
  milliseconds.
- **The placeholder hull bbox approximation is good enough for v0.3
  radar.** The radar kernel reads vessel positions + headings + a
  default `[10, 2, 3]` half-extent for every vessel. Real vessel
  shapes would help precision but the v0.3 acceptance is "returns
  visibly correlate with positions," which this satisfies.

---

## New risks to carry into v0.4

1. **v0.4 is the largest scope of any milestone yet — Terrain + Sea +
   Lidar Rust port + WebGPU evaluation.** Probably needs splitting
   into v0.4a (terrain + sea, the visual/scene work) and v0.4b
   (lidar Rust port + WebGPU eval, the perf work). Plan-time
   decision.
2. **The TS lidar kernel doesn't translate to Rust.** v0.1's lidar
   is GL-bound — it renders a depth pass with Three.js's
   `MeshDepthMaterial(RGBADepthPacking)`. A Rust port would be
   ray-cast-based with no GL involved. **Different algorithm, same
   interface.** v0.4 has to lock the new algorithm (and its
   accuracy / performance trade-offs vs the depth-pass version)
   before porting. May fight the vibe of "just port to Rust."
3. **The `environment` DSL block becomes concrete at v0.4.** The
   design vision already specifies sea_state, wind, time_of_day,
   visibility_m, but v0.1-v0.3 ignored it. v0.4 brings sea_state
   in for the wave shader; once it's compiled into the scene, every
   sensor kernel grows an `EnvironmentSnapshot` input. Cross-cutting
   thread (just added to the plan after the v0.3 demo).
4. **Sensor noise modelling — the conversation that prompted the
   env-modelling thread.** Radar clutter from sea state, camera
   fog/contrast loss, lidar attenuation in rain. Currently planned
   for v1.0 (radar) but really cross-cutting. v0.4 should design
   the EnvironmentSnapshot shape with downstream noise consumers in
   mind, not just the wave shader.
5. **WebGPU re-evaluation at v0.4 stacks on WASM.** v0.3 brought
   WASM in; v0.4 plans a WebGPU pass. Each is its own foundational
   change. Defer WebGPU if v0.4 already feels heavy — there's no
   v0.4 task that strictly needs it.
6. **`bino-radar` native crate is shippable to crates.io but not
   yet shipped.** Once it's published, API stability becomes a
   concern (downstream consumers). Easy to defer; harder to roll
   back. Recommend: don't publish until at least v0.4 lands and the
   `EnvironmentSnapshot` interface settles.
7. **v0.3 didn't measure WASM cold-start or per-frame marshalling
   cost.** Numbers would inform v0.4's lidar port — whether
   copy-each-frame is still fine for tens of thousands of rays per
   tick, or whether SharedArrayBuffer becomes necessary. Worth a
   quick benchmark spike before v0.4 starts.
8. **Stretch v0.2 #9 (sensor preview pane) carries forward yet
   again.** Now better positioned alongside the v0.4 sea/terrain
   visualization work — the picture-in-picture pattern fits
   environmental visualization too.

Already-known risks v0.3 didn't change: pose-cadence vs
render-cadence (still v0.6), Zod 3→4 (still pinned), asset pipeline
(still v0.5), per-sensor jitter under load (still unmeasured).
