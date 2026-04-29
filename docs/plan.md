# Bino — implementation plan

Companion to `docs/bino_design_vision.md`. The vision is the *what* and
*why*; this is the *in what order* and *what's risky*. Updated as we go.

**Status anchor (2026-04-29):** v0.1 closed — `docs/v01_retrospective.md`.
All three packages shipping: `@bino/core` (DSL + scene + camera/lidar
kernels + ENU geo + Zenoh helper), `@bino/node` (CLI + headless service
+ Docker), `@bino/viewer` (SvelteKit + scripted/Zenoh modes).
Software rendering verified end-to-end in Docker; Playwright e2e
covers the viewer-only path. Live Zenoh round-trip is the headline
deferred item from v0.1, picked up in v0.2 below.

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

## v0.2 — Sensor publishing

Goal: camera frames and lidar point clouds published on Keelson topics
that mirror real sensor topics, so a downstream consumer can swap real
for synthetic without code changes. Plus closing the live Zenoh
round-trip carried forward from v0.1.

### Spikes that should land before committing the v0.2 schedule

Each is its own time-boxed investigation under `spikes/`, ending in a
verdict file. These are the unknowns whose outcomes shape the task
graph.

- **S4 — Keelson schema audit.** Does a Keelson topic schema for
  synthetic-camera frames already exist? For lidar point clouds? If
  yes, we match it exactly and encode-side is straightforward. If no,
  we propose one — which is a multi-week negotiation, not v0.2 scope.
  This is the longest pole. **Time box: ~0.5 day investigation; the
  negotiation outcome may force re-planning.**
- **S5 — Camera frame codec.** Raw RGBA at 1080p10 is ~62 MB/s per
  camera — fine on localhost Zenoh, painful over any real link. JPEG,
  WebP, and H.264 each trade CPU/latency for bandwidth. Bench all
  three against realistic frame content, on the same software-rendered
  Node baseline as the headless-render spike. The verdict feeds the
  encoder API in #2 and the DSL fields in #12. **Time box: ~1 day.**
- **S6 — `zenohd` + remote-api plugin in CI.** The live round-trip
  (#11) needs `zenohd` running with the `remote-api` plugin enabled
  and reachable on a `ws://` locator. Wire it up as a docker-compose
  side service for vitest/Playwright. **Time box: ~half a day.**

### Tasks, in dependency order

The graph: `core` encoder + scheduler work blocks `node` publisher
work; viewer overlays are independent of node; the live e2e (#11)
caps the milestone.

#### 1. `@bino/core` — encoders + per-sensor scheduling

1. **Per-sensor scheduling.** Today's `BinoRunner` ticks at the highest
   sensor rate and fires every kernel each tick. Refactor to give each
   kernel its own `nextFireTime` derived from the sensor's `rate_hz`;
   the loop ticks faster than any single sensor and fires only the
   sensors whose phase is up. Pure scheduler change — same kernel
   interface. Move from `@bino/node`'s runner into `@bino/core` once it
   stops being node-specific (the viewer's standalone mode can use it
   too at v0.3+).
2. **Camera frame encoder.** `encodeCameraFrame(frame, opts)`
   producing the wire bytes per S5's verdict. Decode helper for tests.
   Pure function; no Zenoh, no I/O.
3. **Lidar point-cloud encoder.** Same shape, per S4's PCL/Foxglove
   choice.
4. **Sensor-publish types.** `SensorPublisher` interface analogous to
   `ZenohSessionLike`/`ZenohSubscriberLike` already in core — minimal
   shape so node can wire `zenoh-ts` Publisher behind it and tests can
   stub.

#### 2. `@bino/node` — publishers

5. **Camera publisher.** Given a Zenoh session, a sensor config, an
   encoder, and a topic, publishes encoded frames at the configured
   rate. Wires per-sensor scheduling output → encoder → publisher.
6. **Lidar publisher.** Same shape, point-cloud encoder.
7. **Service wiring.** `createNodeService` grows a `publish: boolean`
   (or implicit when a Zenoh session is provided) so the runner emits
   publish calls rather than only logging. CLI `--zenoh` activates
   both pose subscription *and* sensor publishing.

#### 3. `@bino/viewer` — sensor footprints

8. **Camera frustum overlay.** Per-camera-sensor frustum lines (a
   thin pyramid showing FOV) drawn into the third-person view. Helps
   operators see what each bow camera "sees" without rendering the
   full frame.
9. **Lidar fan overlay.** Per-lidar-sensor fan of rays (or a
   semi-transparent cone) at the configured `range_m`.
10. **(Stretch) Sensor preview pane.** Picture-in-picture showing one
    sensor's actual rendered output (the camera kernel's pixels).
    Drops to v0.3 if v0.2 runs long; the kernels already produce these
    in the browser, only the wiring is missing.

#### 4. Glue

11. **Live Zenoh round-trip e2e.** Closes the v0.1 carry-forward.
    Using S6's `zenohd` side service: a synthetic publisher emits
    poses on `keelson/ego/nav/pose` and `keelson/ferry/nav/pose`; the
    `bino-node` Docker service subscribes, ticks the runner, publishes
    camera + lidar topics; a test consumer subscribes to those and
    asserts (a) frame rate matches `rate_hz`, (b) frame contents
    advance, (c) the Playwright-driven viewer at the same `ws://`
    URL renders the same vessels in lock-step. This is the v0.2
    acceptance.
12. **DSL grows codec + topic fields.** Likely the camera/lidar DSL
    needs `encoding: ...` and `quality: 0..100` (camera), explicit
    `publish_topic: ...` (defaults derivable from vessel.id +
    sensor.id but real deployments will want override). Driven by S4
    + S5 verdicts.

### v0.2 acceptance

- A test consumer subscribes to the Keelson camera and lidar topics
  and decodes the wire format defined by S4. Frame rate matches each
  sensor's `rate_hz`; frame contents change as the vessels move.
- The `bino-node` Docker container with `--zenoh ws://...` both
  *consumes* poses and *publishes* sensor data — full duplex.
- Live e2e (#11) runs green in CI, including the viewer's
  Zenoh-WS subscription path that v0.1 only exercised manually.

### v0.2 risks worth flagging now

- **Keelson schema availability.** S4's outcome can rewrite the task
  graph. If no synthetic-sensor schema exists, v0.2 might pivot to
  proposing one (writing the spec, getting Keelson buy-in) and
  publishing actual bytes drops to v0.3.
- **Codec CPU cost on software-rendered baseline.** A 1080p10 JPEG
  encode in pure JS plausibly bottlenecks the runner before render
  does. `sharp`, `node-canvas`, or a WASM JPEG codec each have
  different cost profiles. S5 lands the verdict.
- **Cross-backend pixel divergence becomes user-visible.** v0.1
  hashed for "did the frame change" — robust to small drift between
  Node ANGLE and Chromium. v0.2 publishes raw bytes; consumers
  comparing across backends will see drift. It's a real concern but
  not a v0.2 blocker — the fix is renderer-config discipline at v0.6.
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
