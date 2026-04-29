# Bino — implementation plan

Companion to `docs/bino_design_vision.md`. The vision is the *what* and
*why*; this is the *in what order* and *what's risky*. Updated as we go.

**Status anchor (2026-04-29):** v0.1 + v0.2 both closed —
`docs/v01_retrospective.md`, `docs/v02_retrospective.md`. Bino now
publishes synthetic camera + lidar on canonical Keelson topics
(`image_raw` / `point_cloud` via `@rise-maritime/keelson-js`) and
subscribes to `frame_transform` for vessel poses, full-duplex.
`bino-node --zenoh ws://...` is end-to-end working; the live e2e
gates on `BINO_ZENOH_URL` and runs against the
`tests/zenoh-router/` Alpine container. **Next up: v0.3 marine radar
v0** — Rust enters the codebase.

---

## Sequencing principle

Every step ends in a working system. We don't build core fully, then
node, then viewer — we build the **thinnest possible vertical slice**
first (a vessel poses arrive on Zenoh and a placeholder cube moves in
both renderers), and only then thicken any one layer.

---

## v0.1 — End-to-end skeleton ✅ CLOSED 2026-04-29

Closed-state paper trail in `docs/v01_retrospective.md`. The task list
below is preserved for reference; all 16 tasks shipped, with the
specific deviations and decisions captured in the retrospective.

Goal (achieved, with one carry-forward): a single vessel moves under
externally-injected poses and is visible from both `@bino/node` and
`@bino/viewer`, with one camera and one lidar producing data each
frame. No terrain, no sea, no radar. **Carry-forward:** the live Zenoh
round-trip (third-party publisher feeding both consumers in lock-step)
moves into v0.2 — see #v0.2-11.

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

## v0.2 — Sensor publishing ✅ CLOSED 2026-04-29

Closed-state paper trail in `docs/v02_retrospective.md`. The task list
below is preserved for reference; 10 of 11 tasks shipped (stretch #9
deferred to v0.3). Spike outcomes resolved on Day 0 of v0.2 work and
materially simplified the rest of the plan — see retrospective.

Goal: camera frames and lidar point clouds published on Keelson topics
that mirror real sensor topics, so a downstream consumer can swap real
for synthetic without code changes. Plus closing the live Zenoh
round-trip carried forward from v0.1, and migrating the existing
pose path off ad-hoc JSON onto the same Keelson stack.

### Spike outcomes (resolved 2026-04-29)

The three pre-v0.2 spikes resolved together via a focused upstream
investigation; verdicts inline rather than as separate spike folders.

- **S4 — Keelson schema audit. ✅ Resolved, no proposal needed.**
  Keelson defines well-known subjects backed by Foxglove protobuf
  schemas, all wrapped in a Keelson Envelope (protobuf carrying
  enclosed/received timestamps + payload bytes):
  - **Camera (raw):** subject `image_raw` → `foxglove.RawImage`
    (bytes, width, height, encoding, step, timestamp, frame_id).
  - **Camera (compressed):** subject `image_compressed` →
    `foxglove.CompressedImage` (JPEG/PNG/WebP bytes, format,
    timestamp, frame_id). v0.3+ option.
  - **Lidar:** subject `point_cloud` → `foxglove.PointCloud` (packed
    `bytes data` + a `repeated PackedElementField fields` describing
    the per-point byte layout, plus origin pose, point_stride,
    timestamp, frame_id).
  - **Pose:** subject `frame_transform` → `foxglove.FrameTransform`
    (parent_frame_id, child_frame_id, translation, rotation,
    timestamp). This is the canonical pose subject — replaces v0.1's
    ad-hoc JSON wire format.
  - Topic key shape: `{base_path}/@v0/{entity_id}/pubsub/{subject}/{source_id}`.
  - **TS SDK ships:** `@rise-maritime/keelson-js` (npm,
    `0.5.0`/`0.5.1-rc.x`). High-level API:
    `construct_pubSub_key()`, `enclose()` / `uncover()`,
    `encodePayloadFromTypeName()` / `decodePayloadFromTypeName()`,
    `getSubjectSchema()`. Foxglove protos generated via `ts-proto`
    are bundled.
- **S5 — Camera frame codec. ✅ Collapsed.** Deployment is
  same-node (Bino's `@bino/node` Docker container co-located with the
  consuming system), so bandwidth is not the binding constraint;
  Keelson's `image_raw` schema accepts raw RGBA natively. v0.2
  publishes raw `RawImage` only. `image_compressed` (JPEG/WebP)
  becomes a v0.3+ option if a remote-consumer use case appears.
- **S6 — `zenohd` + remote-api plugin in CI. ✅ Resolved.**
  `tests/zenoh-router/` ships an Alpine-based image that wraps
  `zenoh-bridge-remote-api` 1.9.0 (the standalone bridge binary the
  eclipse-zenoh org publishes alongside every `zenoh-ts` release —
  `zenohd` statically linked with the plugin). Compose file binds
  `127.0.0.1:10000` for the WS endpoint, plus 8000 (REST) and 7447
  (peer protocol) for debug. `packages/node/scripts/probe-zenoh.mjs`
  does a publish-subscribe roundtrip; `packages/node/test/zenoh-live.test.ts`
  is the vitest equivalent gated on `BINO_ZENOH_URL`. **Bonus
  finding:** Node 22's built-in `WebSocket` is enough — the `ws`
  polyfill `nodered-contrib-zenoh` injects is no longer needed
  (zenoh-ts README is outdated on this point). #6's polyfill check
  collapses.

### Conventions adopted from upstream patterns

Investigation of `nodered-contrib-zenoh` (Node) and `crowsnest-dev`
(browser) settled the open API choices:

- **Publishers use `session.put(keyExpr, buffer, options)` directly.**
  Don't `declarePublisher()` ahead of time; just `put()` per frame.
  Both upstream projects do it this way.
- **Subscribers use `declareSubscriber()` + the async-iterator
  receiver** (`for await (const sample of receiver())`). Already what
  v0.1 does; no change.
- **Browser session = singleton via Svelte store** (mirroring
  `crowsnest-dev`'s React Context pattern) populated from a
  `VITE_ZENOH_WS_URL` env var. No automatic reconnect — fail visibly,
  let the user retry.
- **Stale detection in viewer:** mark a subscription "stale" after
  ~5s of silence. Cheap and useful; landing as part of #9 below.
- **Encode/decode goes through `keelson-js`,** not hand-rolled.
  `enclose(bytes)` before publish; `uncover(bytes)` before decode;
  `encodePayloadFromTypeName(schema, obj)` /
  `decodePayloadFromTypeName(schema, bytes)` for the foxglove protos.

### Tasks, in dependency order

`core` work blocks both `node` and `viewer`; viewer overlays are
independent of node publishing; the live e2e (#10) caps the milestone.

#### 1. `@bino/core` — keelson wiring + per-sensor scheduling

1. **`@rise-maritime/keelson-js` integration.** Add as dep. Build
   thin wrappers around the SDK that match Bino's existing types:
   `encodePoseUpdate(update) → { keyExpr, bytes }`,
   `encodeCameraFrame(frame, sensorMeta) → { keyExpr, bytes }`,
   `encodePointCloud(frame, sensorMeta) → { keyExpr, bytes }`, plus
   matching decoders. Each wrapper handles: protobuf-encode the
   foxglove payload, `enclose()` the result into a Keelson Envelope,
   construct the topic key. Decoders run in reverse for tests.
   Replaces v0.1's `decodePoseMessage` / JSON path.
2. **Pose subscriber migration.** `createZenohPoseStream` switches
   from JSON-decode to `decodePoseMessage` (now a Keelson-aware
   wrapper around `frame_transform`). Keep the `MemoryPoseStream`
   path identical — no wire format involved.
3. **Per-sensor scheduling.** Refactor the runner so each kernel has
   its own `nextFireTime` derived from `rate_hz`; the loop ticks
   faster than any single sensor and fires only those whose phase is
   up. Move the runner from `@bino/node` to `@bino/core` so the
   viewer's standalone mode can adopt it at v0.3+.

#### 2. `@bino/node` — publishers

4. **Camera publisher.** Per-camera-sensor: subscribes to the
   runner's per-sensor frame events, encodes via
   `encodeCameraFrame()`, publishes via `session.put()`. Topic key
   from `construct_pubSub_key(...)`.
5. **Lidar publisher.** Same shape with `encodePointCloud()`.
6. **Service wiring.** `createNodeService` accepts an optional
   Zenoh session; when provided, the runner's per-sensor outputs
   flow into publishers. CLI `--zenoh ws://...` activates both pose
   subscription *and* sensor publishing — full duplex.
7. ~~**Node WebSocket polyfill check.**~~ ✅ Resolved by S6 — Node 22's
   built-in `WebSocket` works against `zenoh-bridge-remote-api`. No
   polyfill needed.

#### 3. `@bino/viewer` — sensor footprints + robustness

8. **Camera frustum overlay.** Per-camera-sensor frustum lines (a
   thin pyramid showing FOV) drawn into the third-person view. Helps
   operators see what each bow camera "sees" without rendering the
   full frame.
9. **Lidar fan + stale detection.** Per-lidar-sensor fan of rays at
   the configured `range_m`. Plus the stale-detection pattern from
   `crowsnest-dev`: per-source last-message timestamp, mark stale at
   5s, surface in the header next to the source label.
10. **(Stretch) Sensor preview pane.** Picture-in-picture of one
    sensor's actual rendered output (the camera kernel's pixels).
    Opt-in via UI toggle — viewer should never auto-subscribe to
    camera topics, only its own local kernel output. Drops to v0.3
    if v0.2 runs long.

#### 4. Glue

11. **Live Zenoh round-trip e2e.** Using S6's `zenohd` side service:
    a synthetic publisher emits `frame_transform` updates on
    `keelson/@v0/ego/pubsub/frame_transform/sim` and same for
    `ferry`; the `bino-node` Docker service subscribes, ticks the
    runner, publishes `image_raw` and `point_cloud` topics; a test
    consumer subscribes to those and asserts (a) per-sensor rate
    matches `rate_hz` ±10%, (b) frame contents advance over time,
    (c) the Playwright-driven viewer at the same `ws://` URL
    renders the same vessels in lock-step. This closes both the v0.1
    carry-forward *and* v0.2's main acceptance.
12. **DSL grows topic-override fields.** `publish_topic_override:
    string` per sensor (default derived from vessel.id + sensor.id +
    Keelson convention). No codec/quality fields needed in v0.2 —
    raw RGBA only.

### v0.2 acceptance

- A test consumer subscribes to `image_raw` and `point_cloud` topics,
  decodes via `keelson-js`, and confirms (a) Envelope timestamps
  advance, (b) RawImage dimensions match scenario, (c) PointCloud
  contains the expected point count.
- Per-sensor publish rate honors `rate_hz` per the runner's new
  scheduler.
- `bino-node --zenoh ws://...` is full-duplex: subscribes to
  `frame_transform` for vessel poses, publishes camera + lidar.
- Live e2e (#11) green in CI, including the viewer's Zenoh-WS
  subscription path.

### v0.2 risks worth flagging now

- **Pose-format migration is a breaking change for any v0.1
  consumer.** Practically, there are no v0.1 consumers in production;
  but the v01_smoke.yaml topic names (e.g., `keelson/ego/nav/pose`)
  predate the schema audit and need updating to the
  `keelson/@v0/ego/pubsub/frame_transform/sim` shape.
- **`@rise-maritime/keelson-js` is at 0.5.x with active RCs.** Pin
  to a stable version (`0.5.0` exact) and audit the changelog before
  bumping. Their API surface is small enough that breakage would be
  obvious.
- **Cross-backend pixel divergence becomes user-visible.** v0.1
  hashed for "did the frame change" — robust to small drift between
  Node ANGLE and Chromium. v0.2 publishes raw bytes; consumers
  comparing across backends will see drift. Not a v0.2 blocker — fix
  is renderer-config discipline at v0.6.
- **Per-sensor jitter under load.** If one kernel's encode misses
  its deadline, default behavior is "drop the frame, log it." Revisit
  when determinism matters at v0.6.
- **Bandwidth claim is localhost-only.** Documented assumption: the
  Bino container runs on the same node as the consuming system.
  Anything else needs `image_compressed` (v0.3+).
- **Per-sensor jitter under load.** If a slow encoder makes one sensor
  miss its deadline, do we drop the frame or fire late? Default
  v0.2 behavior: drop, log. Revisit when determinism matters.
- **Browser viewer subscribing to camera topics is wasteful.** A
  1080p camera over WebSocket is hostile to a browser. v0.2 viewer
  subscribes to *poses* (cheap) and renders sensor *footprints*
  (cheap); subscribing to actual frames is opt-in and discouraged
  outside debug builds.

---

## v0.3 — Marine radar v0

Goal: PPI-style radar returns from a geometry-of-returns kernel
(ASVSim-style approximation), Rust from the start, exposed as both a
WASM module and a native crate. Browser viewer gets a PPI overlay.
The native-crate path lets the same kernel run in offline log
analysis pipelines — a deliberately concrete payoff for going Rust
early.

### Spike outcomes (resolved 2026-04-29, before v0.3 work begins)

- **S7 — Rust toolchain. ✅ Resolved: `wasm-bindgen` + cargo direct,
  no `wasm-pack`.** Single crate compiles to both native (`cargo
  build`) and wasm32 (`cargo build --target wasm32-unknown-unknown` +
  `wasm-bindgen-cli` for JS glue). Conditional bindings via
  `#[cfg(target_arch = "wasm32")]`. `wasm-pack` is a meta-tool that
  bundles wasm-bindgen + a publish path we don't need; sticking to
  bare cargo + wasm-bindgen-cli keeps the build script auditable.
- **S8 — JS↔WASM memory model. ✅ Resolved: copy-each-frame.** v0.3
  radar throughput is ~150 KB/s peak (360 spokes × 1024 range bins ×
  0.4 Hz sweep rate). Trivial. SharedArrayBuffer requires COOP/COEP
  headers in the browser viewer and serialization protocol design we
  don't want to take on now. Revisit at v0.4 when the lidar's larger
  ray budget makes copies hurt.
- **S9 — Keelson radar schema. ✅ Resolved.** `radar_spoke:
  keelson.RadarSpoke` (per-beam: timestamp, frame_id, pose, azimuth
  in rad, range, PackedElementField[] for intensity layout, packed
  bytes) and `radar_sweep: keelson.RadarSweep` (a `repeated
  RadarSpoke spokes`). `@rise-maritime/keelson-js` already ships the
  generated payload classes at `dist/payloads/RadarReading.{js,d.ts}`.
  Same encode/decode pattern as v0.2's image_raw / point_cloud.
- **S10 — Native + wasm dual-target test infra. Pending — ~half day.**
  Native: `cargo test` from inside `kernels/`. WASM: vitest loads the
  built `.wasm` + bindgen JS, runs the same test scenarios. Set up
  CI matrix that runs both.

### Tasks, in dependency order

#### 1. `kernels/` Rust workspace setup

1. **Cargo workspace skeleton.** `kernels/Cargo.toml` (workspace),
   `kernels/radar/` member crate with `Cargo.toml` declaring
   `crate-type = ["cdylib", "rlib"]` for dual targets. Add
   `wasm-bindgen` + `serde` + `serde-wasm-bindgen` as deps. Pin
   `wasm-bindgen-cli` version to match the crate.
2. **Build script.** Root `package.json` script `kernels:build` runs
   `cargo build --release --target wasm32-unknown-unknown` then
   `wasm-bindgen --target bundler --out-dir packages/core/src/wasm`
   (or wherever Vite + tsc can pick it up). `pnpm -r build` calls it
   first when it's stale. Native build (`cargo build --release` plain)
   for the offline-analysis crate path.

#### 2. Radar kernel (Rust)

3. **`SceneSnapshot` input structs.** Plain `serde`-derive structs
   for what the kernel sees per frame: host pose, list of vessel
   bounding boxes (position, heading, dimensions). Pure data — same
   shape native and WASM.
4. **`RadarConfig` input** matching the DSL `radar_marine` config:
   range_m, rotation_rate_hz, beam_width_deg, spokes_per_rev (derived
   or explicit).
5. **Geometry-of-returns implementation.** For each spoke azimuth:
   ray from radar origin in the horizontal plane, find nearest
   bbox-intersection from the snapshot's vessels, fill intensity bins
   by range. ASVSim simplifications: binary intensity (no antenna
   pattern), no sea clutter, no rain, no propagation effects. Make
   the simplifications loud in code comments — we don't want a
   downstream perception team thinking this is realistic radar.
6. **`step()` entry point** consumes a copied scene snapshot,
   produces a packed `RadarSweep` (or partial spokes per tick if the
   sweep takes multiple ticks). Native API: `pub fn step(...) ->
   RadarSweep`. WASM API: same, with `#[wasm_bindgen]` and serde
   conversions for the JS side.
7. **Native unit tests.** "ego at origin, ferry at (0, 100) bow-on,
   spoke at azimuth=0 has return at range≈100." Cargo test, runs
   without WASM.

#### 3. JS-side wiring

8. **WASM loader in `@bino/core`.** Thin wrapper around the
   wasm-bindgen-generated module that exposes
   `createRadarKernel({ scene, sensorNode, config })` matching the
   pattern of camera + lidar kernels. Builds the SceneSnapshot from
   Three.js objects each frame; calls into WASM; returns a frame the
   runner can publish.
9. **Vitest integration test.** Loads the built `.wasm`, exercises a
   simple scenario, asserts output structure. Gated on
   `kernels:build` having run.

#### 4. DSL + Keelson encoder

10. **`RadarSensor` Zod schema.** New variant on the `Sensor`
    discriminated union. Fields: `range_m`, `rotation_rate_hz`,
    `beam_width_deg`, `spokes_per_rev`, optional `publish_topic_override`.
11. **`encodeRadarSweep` / `decodeRadarSweepEnvelope` in keelson.ts.**
    Same shape as the camera/lidar encoders. `radar_sweep` topic on
    `{base}/@v0/{vessel}/pubsub/radar_sweep/{sensor}`.

#### 5. Service + publisher integration

12. **`createNodeService` recognizes `radar_marine` sensors,**
    instantiates radar kernels alongside camera/lidar, schedules
    them at `rotation_rate_hz`, publishes via the sensor publisher.
13. **DSL update for `v01_smoke.yaml`** (or new `v03_radar.yaml`):
    add a `marine_radar` sensor at the masthead.

#### 6. Viewer PPI overlay

14. **PPI rendering in viewer.** A round overlay panel in a viewer
    corner, showing the most-recent sweep as polar plot. Probably a
    canvas2d sub-element rather than a Three.js texture — simpler,
    and the PPI is conventionally 2D anyway. Subscribes locally to
    its own kernel's output (no Zenoh for the overlay).
15. **Frustum-style overlay** for the radar sensor in the third-person
    view (a wedge showing beam width + range), analogous to camera
    frustum and lidar fan.

#### 7. Glue + acceptance

16. **Live e2e extension.** v0.2's `zenoh-e2e.test.ts` grows a
    radar-topic consumer; assert `radar_sweep` arrives at the
    rotation_rate_hz and contains the expected spoke count.
17. **Manual viewer demo run-through.** Browser shows the PPI sweep
    updating, frustum overlay visible alongside camera/lidar.

### v0.3 acceptance

- A `radar_marine` sensor in the DSL produces sweeps at its
  `rotation_rate_hz`, published on canonical Keelson topics, decoded
  by a probe consumer.
- The native crate runs `cargo test` green.
- The viewer's PPI overlay shows the sweep updating live, with returns
  visibly correlating to other vessels' positions.
- Live e2e (#16) green: synthetic publisher → bino service (with
  radar) → consumer probes for camera + lidar + radar all roundtrip.

### v0.3 risks worth flagging now

- **Build chain reliability.** wasm-bindgen-cli must match the
  wasm-bindgen crate version exactly. CI needs to lock both, and
  contributors need a documented `rustup` + `cargo install` path.
  Plan to pin via `rust-toolchain.toml` in `kernels/`.
- **WASM cold-start cost.** First `kernel.step()` call triggers
  module instantiation (~tens of ms). For a sensor at 0.4 Hz
  rotation that's a 4% one-time hit; real systems with 30 Hz radar
  would feel it more. Pre-warm in `createRadarKernel`.
- **The geometry-of-returns approximation is crude — call it loudly.**
  No antenna pattern, no sea clutter, no propagation, binary
  intensity. Real V&V of collision-avoidance under clutter cannot use
  this. Document as v0.3 limitation; the v1.0 sea-clutter model is a
  research thread.
- **PPI overlay performance budget.** Drawing 360 polar lines per
  sweep on canvas2d is fine; doing it as a Three texture pass is
  more authentic but eats render budget. Default to canvas2d unless
  someone needs the texture.
- **Native crate distribution.** Spec'd as "available for offline
  analysis." Means the `kernels/radar` crate should be publishable
  to crates.io eventually, with a stable Rust API. Keep the public
  Rust surface minimal and documented from the start.

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
