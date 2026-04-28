# Bino — implementation plan

Companion to `docs/bino_design_vision.md`. The vision is the *what* and
*why*; this is the *in what order* and *what's risky*. Updated as we go.

**Status anchor (2026-04-28):** headless-render spike complete
(`spikes/headless-render/`) → `@kmamal/gl` chosen for v0.1, software
rendering accepted for now (≥10 Hz cleared even on llvmpipe).
`@bino/core` scaffolded with DSL schemas, ENU geo helpers, the
`SensorKernel` interface, and a stub scene compiler. Three.js not yet
depended on. No Zenoh integration yet.

---

## Sequencing principle

Every step ends in a working system. We don't build core fully, then
node, then viewer — we build the **thinnest possible vertical slice**
first (a vessel poses arrive on Zenoh and a placeholder cube moves in
both renderers), and only then thicken any one layer.

---

## v0.1 — End-to-end skeleton

Goal: a single vessel moves under externally-injected poses and is
visible from both `@bino/node` and `@bino/viewer`, with one camera and
one lidar producing data each frame. No terrain, no sea, no radar.

### Spikes that should land before committing the v0.1 schedule

These are short investigations whose outcome could reshape v0.1. Each
is its own time-boxed spike under `spikes/`, ending in a verdict file.

- **S1 — Zenoh JS/TS client maturity.** The design doc names Zenoh as
  the only input but doesn't pin a client. The `@eclipse-zenoh/zenoh-ts`
  package (or whichever is current) needs to be exercised in *both*
  Node and the browser, with the same `subscribe(topic, handler)` shape,
  before either `@bino/node` or `@bino/viewer` is wired to it. If the
  client is Node-only or browser-only, the "one codebase, two
  execution environments" claim takes its first asterisk and we need
  a transport-abstraction seam earlier than planned. **Time box: ~1 day.**
- **S2 — Three.js version pin.** Spike used r160. Decide whether to
  lock to r160 (matches benchmark numbers) or move to current. Bumping
  early is cheaper than bumping mid-v0.4 when the WebGPU migration
  starts. **Time box: ~2 hours.**
- **S3 — YAML loader & schema-error UX.** Pick `yaml` vs `js-yaml`,
  decide how Zod errors surface to scenario authors. Author experience
  matters because the scenario library is one of the durable artifacts.
  **Time box: ~2 hours.**

### Tasks, in dependency order

The graph: `core` work blocks `node` and `viewer`; `node` and `viewer`
are independent of each other once core lands.

#### 1. `@bino/core` — scene + kernels (pure)

1. **`buildScene(compiled)`** — pure function returning
   `{ scene: THREE.Scene, entities: Map<string, Object3D> }`. Vessels
   become placeholder boxes positioned at the anchor (ENU origin)
   until the asset pipeline lands. Adds `three` to core's deps.
2. **`PoseStream` interface** — async iterator yielding
   `{ entityId, pose, time }`. Plus a `MemoryPoseStream` for tests.
   No Zenoh imports in core.
3. **Camera kernel reference impl** — TS, implements `SensorKernel`.
   Uses a `WebGLRenderTarget`, returns RGBA `Uint8Array` plus
   intrinsics. Same code path Node and browser will both call.
4. **Lidar kernel reference impl** — depth pass with
   `MeshDepthMaterial(RGBADepthPacking)` (the spike's pattern), decode
   to ranges, return a point cloud. Channel sampling is uniform azimuth
   for v0.1; realistic lidar patterns wait for v0.4.
5. **Clock abstraction** — `Clock` interface (`wall`, `stepped`,
   `external`). Only `wall` and `stepped` actually implemented at v0.1;
   `external_fmi` is a stub that throws so the DSL accepts it.

#### 2. `@bino/node` — headless service

6. **Package skeleton.** Depends on `@bino/core`, `@kmamal/gl`, `three`.
   Entry point `bino-node <scenario.yaml>`.
7. **Headless renderer wrapper.** Instantiates `@kmamal/gl`-backed
   `WebGLRenderer`, calls `buildScene`, calls the kernels each tick.
   Logs frame counts + per-stage ms (reuse the spike's bench harness
   shape — keep it visible during dev).
8. **Zenoh subscriber.** Driven by S1's outcome. Implements
   `PoseStream` over Zenoh, one subscription per vessel.
9. **Dockerfile.** Adapt the spike's `docker/Dockerfile`. The WSL2
   bind-mount workaround is dev-only — production path is the
   `nvidia-container-toolkit` invocation already documented in
   `spikes/headless-render/results.md`.
10. **Smoke test.** Synthetic Zenoh publisher + the node service in
    Docker, asserts ego pose updates produce updated camera frames
    (frame hashes change between ticks).

#### 3. `@bino/viewer` — browser

11. **SvelteKit skeleton.** Vite-based. One page with a Three.js
    canvas.
12. **Scene mount.** Calls `buildScene`, instantiates browser
    `WebGLRenderer`, drives the same camera/lidar kernels.
13. **Zenoh-WS subscriber.** Same client, WebSocket transport. Same
    `PoseStream` interface.
14. **Standalone mode.** A "no backend" toggle that drives poses from
    a built-in scripted source — needed for stakeholder demos and
    cheap to add since `MemoryPoseStream` already exists.

#### 4. Glue

15. **Test scenario.** `scenarios/v01_smoke.yaml` — one tanker, one
    camera, one lidar, anchored at Kiel. Used by the integration test.
16. **End-to-end test.** A script that boots the node service, opens
    the viewer in headless Chromium, publishes poses, asserts frame
    count and viewer visibility.

### v0.1 acceptance

- A `pnpm bino-node scenarios/v01_smoke.yaml` and a `pnpm dev` viewer,
  fed by a third-party Zenoh publisher, both show the ego vessel
  moving in lock-step.
- Camera and lidar kernels emit data each frame in both environments;
  frame contents differ slightly (cross-backend determinism is not a
  v0.1 goal — see risk below) but topologically match.
- Docker image builds clean, runs the smoke test in CI.

### v0.1 risks worth flagging now

- **Zenoh client portability** — addressed by S1.
- **Cross-backend numeric divergence.** The spike found color-hash
  drift between `@kmamal/gl` (Node ANGLE) and Chromium (Mesa
  llvmpipe). For v0.1 this is fine — both clear ≥10 Hz, and consumers
  shouldn't depend on bit-identity yet. Worth pinning down before
  v0.6's determinism mode.
- **Pose-stream cadence vs render cadence.** Poses arrive at whatever
  rate the publisher chooses; the renderer ticks at the sensor rate.
  v0.1 takes the latest pose at tick time (zero-order hold). Anything
  fancier (interpolation, extrapolation, time-aligned sampling)
  belongs in v0.6 with the determinism work.
- **Zod 3 vs Zod 4.** Pinned to ^3.23 today. Migration is mostly a
  rename pass; not urgent.

---

## v0.2 — Sensor publishing

Goal: camera frames and lidar point clouds published on Keelson topics
that mirror the real sensor topics, so a downstream consumer can swap
real for synthetic without code changes.

- Pick the codec for camera frames (raw RGBA / JPEG / H.264 chunks?
  Keelson's existing camera topic shape decides this).
- Lidar point clouds — Keelson PCL-equivalent shape.
- Per-sensor publish rate independent of render rate (already implied
  by the v0.1 clock work).
- Browser viewer learns to render sensor *footprints* as overlays
  (camera frustum, lidar fan).
- Smoke test extends to: real-style consumer subscribes, gets data,
  decodes it.

**Open question:** is there an existing Keelson camera-topic schema we
should match exactly? If yes, encode-side is a one-week task; if not,
we propose one and that's a multi-week negotiation.

---

## v0.3 — Marine radar v0

Goal: PPI-style radar returns from a geometry-of-returns kernel
(ASVSim-style approximation), Rust from the start.

- New workspace: `kernels/` (separate Rust crate), built as both WASM
  and a native crate.
- WASM module exposed through a `SensorKernel<RadarConfig, RadarOutput>`
  binding in `@bino/core`.
- Browser viewer adds a PPI overlay.
- Native-crate path lets the same kernel run in offline log analysis
  pipelines (a deliberately concrete payoff for going Rust early).

**Decision to lock before starting:** wasm-bindgen vs wasm-pack vs
hand-rolled, and how the JS side hands the scene buffer in (shared
memory vs copy-each-frame). Affects perf and ergonomics for every
future Rust kernel.

---

## v0.4 — Terrain, sea, perf pass

Two threads:

1. **Terrain & sea surface.** OSM coastline loader, EMODnet bathymetry,
   Gerstner-wave sea shader. Scene compiler in core gains a terrain
   stage. Tile streaming is still v2; v0.4 loads a fixed bbox.
2. **Lidar perf.** TS lidar kernel almost certainly bottlenecks once
   real terrain is in the scene. Port to Rust/WASM behind the existing
   `SensorKernel` interface — no API change for consumers.
3. **WebGPU evaluation.** The headless-render spike flagged Three.js
   r160's WebGPU pipeline as not-yet-drop-in. Re-evaluate against
   current Three. If WebGPU is now stable, migrate `@bino/node`'s
   renderer; else defer to v0.5 or beyond.

---

## v0.5 — Scenarios & authoring

- Asset library (named ship models, buoy types, port templates) lives
  in a separate repo / package, versioned independently.
- Scenario template library (port approach, archipelago transit, etc.).
- `bino-scenario` Claude Code skill with the asset library and
  templates baked in.
- Schema-validated CI for the scenario repo (Zod schemas from
  `@bino/core` are the single source of truth).

**Open question — locked here, not v0.1:** where do the ship models
actually come from? Hand-authored glTF for v0.5 is the path of least
resistance; procedural-from-principal-dimensions is the long answer.

---

## v0.6 — Inject & inject-all modes

- Object-only rendering path (skip terrain, skip sea — entity render
  pass only). The scene compiler already discriminates by `modes`.
- External clock sources: FMI3 master integration, HIL trigger.
- Determinism guarantees: bit-for-bit across runs, with documented
  renderer-config constraints.
- Time-sync with real sensor scan/exposure phases (radar rotation
  phase, camera shutter timing, lidar revolution phase).

This is also where cross-backend numeric divergence becomes a real
problem, not a flagged risk. May force the headless service onto a
specific renderer config (no MSAA, fixed precision modes) and the
browser viewer to a "non-strict" rendering option for live debugging.

---

## v1.0 — Marine radar v1

- Sea-clutter model — its own research thread, may deserve a paper.
- Antenna-pattern convolution.
- Weather attenuation (rain/fog).
- Full documentation as a standalone artifact other simulators can
  consume.

---

## Cross-cutting threads (run in parallel with the version work)

- **Test infrastructure.** Vitest for unit, Playwright for the viewer
  e2e (already a spike dep). CI from v0.1.
- **Determinism.** Stays informal until v0.6, but every renderer
  config decision should be made with "could this be deterministic
  later" in mind. Document what we'd have to give up.
- **WebGPU.** Tracked as a v0.4 evaluation (above). Note: the spike
  found Node WebGPU is already faster than WebGL on software, so once
  Three.js's r160-vs-current WebGPU gap closes, the migration is mostly
  upside.
- **Asset pipeline.** The longest open question. v0.1–v0.4 use
  placeholder geometry. v0.5 ships hand-authored glTF for two or three
  representative hulls. Procedural hulls is a v2+ research thread.

---

## What's deliberately *not* on this plan

Mirrors the design doc's non-goals, restated as scope discipline:

- Photorealism — not a goal at any version on this plan.
- Ship dynamics / hydrodynamics — never. They live elsewhere.
- A second renderer in the browser — viewer always renders the same
  scene the sim renders, using the same code.
- ROS bridges — downstream user concern.
- Full-mission bridge simulation.

If a feature request slides in that pulls toward any of the above, it
goes to a separate repo, not into Bino.
