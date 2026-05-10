# v0.2 retrospective

**Closed:** 2026-04-29 (same calendar day as v0.1, same intensive
work session).
**Companion:** `docs/internal/plan.md` (v0.2 section), `docs/internal/v01-retrospective.md`,
`docs/internal/design-vision.md`.

This is the paper trail for v0.2: what landed, where the plan was
wrong, the surprises (mostly happy), the architectural decisions that
emerged, and the new risks to carry into v0.3.

---

## Acceptance — did v0.2 deliver?

**Yes, fully.** v0.2's headline goal was *sensor publishing on Keelson
topics*, plus closing v0.1's deferred live Zenoh round-trip. Both
shipped.

What's automated and verified:

- `bino-node scenarios/v01_smoke.yaml --zenoh ws://...` is **full
  duplex**: subscribes to `frame_transform` for vessel poses, runs the
  per-sensor scheduler, publishes `image_raw` (RGBA) and `point_cloud`
  on per-sensor Keelson topic keys at the configured `rate_hz`. Live
  smoke against the local zenoh-router container produced 43 frames
  in 5s, both sensors firing each tick.
- Vitest e2e (`zenoh-e2e.test.ts`, gated on `BINO_ZENOH_URL`):
  synthetic publisher → bino service → consumer subscribers asserting
  per-sensor rate, content advancement, non-zero lidar counts. Closes
  the v0.1 carry-forward.
- Browser viewer (`@bino/viewer`) renders camera frustum + lidar fan
  overlays as wireframe pyramids, surfaces stale entities in the
  header after 5s of pose silence, optionally subscribes to live
  Zenoh poses via `?zenoh=ws://...` URL param.

What's deferred deliberately:

- **#9 stretch: sensor preview pane** — picture-in-picture of the bow
  camera's actual rendered output. Cheap, opt-in, not on critical
  path. Carries forward to v0.3.

Test totals at close: 56 in `@bino/core`, 16 in `@bino/node` (1 GL +
2 live-Zenoh tests gated on env vars), 1 Playwright in `@bino/viewer`.
12 commits since v0.1.

---

## Spike outcomes

All three pre-v0.2 spikes resolved on Day 0 of v0.2 work via a focused
upstream investigation rather than separate spike folders — the
verdicts were sharp enough to act on immediately.

| spike | outcome |
|-------|---------|
| **S4 — Keelson schema audit** | ✅ Much better than expected. Existing schemas via `@rise-maritime/keelson-js`@0.5.0 (npm) — `image_raw` / `image_compressed` / `point_cloud` / `frame_transform`, all foxglove protobuf inside a Keelson Envelope. Topic key convention `{base}/@v0/{entity}/pubsub/{subject}/{source}`. **No proposal, no negotiation.** |
| **S5 — Camera frame codec** | ✅ Collapsed by user feedback. Same-node deployment + `image_raw` accepting raw RGBA natively means raw is right for v0.2. `image_compressed` deferred to v0.3+ if remote-consumer use case appears. |
| **S6 — `zenohd` in CI** | ✅ Resolved via `tests/zenoh-router/`: Alpine + libgcc + the `zenoh-bridge-remote-api` 1.9.0 binary (zenohd statically linked with the plugin, the standalone form the eclipse-zenoh org publishes on every zenoh-ts release). Cleaner than wrestling the plugin .so + the `eclipse/zenoh:latest` image. |

---

## What landed vs the plan

The plan named 11 numbered v0.2 tasks (re-numbered after the audit
collapsed #1's encoder work and added the pose migration as #2). All
ten core tasks shipped; the stretch task didn't.

| # | Plan                                       | Reality                                                                                                                                   |
|---|--------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------|
| 1 | keelson-js integration (encoders/decoders) | Landed as `src/keelson.ts` in `@bino/core`. Three pose/camera/lidar encode-decode pairs + topic-key helpers + `KeelsonNaming`. 8 roundtrip tests. |
| 2 | Pose subscriber → frame_transform           | Landed. Subscriber tags entityId from topic, not payload — see "Decisions in flight". v0.1 JSON helpers deleted (no compat shim).         |
| 3 | Per-sensor scheduling                      | Landed. `BinoRunner` now takes `ScheduledKernel[]` (sensorId + rate_hz + kernel). Phase advancement uses floor-of-overshoot to recover cleanly after stalls. |
| 4 | Camera publisher                            | + #5 collapsed into one `createSensorPublisher` (mechanically symmetric — only the encoder differs).                                      |
| 5 | Lidar publisher                             | (see #4)                                                                                                                                  |
| 6 | Service wiring + WS polyfill check          | First half landed. Second half — **WS polyfill was a no-op**: Node 22's built-in `WebSocket` works against `zenoh-bridge-remote-api`. zenoh-ts README is outdated; `nodered-contrib-zenoh`'s `ws` polyfill no longer needed. |
| 7 | Camera frustum overlay                      | Landed via `THREE.CameraHelper(kernel.camera)`.                                                                                            |
| 8 | Lidar fan + stale detection                 | Landed. Lidar viz uses the **same** `CameraHelper` recolored cyan against the lidar's depth-pass camera — Three's helper happens to fit both. Stale detection per-entity after 5s of pose silence, surfaced in header. |
| 9 | Stretch: sensor preview pane                | **Deferred to v0.3.**                                                                                                                      |
| 10 | Live Zenoh round-trip e2e                  | Landed as `zenoh-e2e.test.ts`, gated on `BINO_ZENOH_URL`. Full duplex: synthetic publisher → service → consumer probes. Closes v0.1 carry-forward. |
| 11 | DSL `publish_topic_override`                | Landed. Optional per-sensor field; bypasses `construct_pubSub_key` for non-Keelson deployments. Trade-off (loss of real-Keelson-tool interop) documented in schema. |

---

## Decisions taken in flight

These weren't in the plan; surfacing them so the next person doesn't
re-litigate.

- **Pose path migrated to Keelson too, not just sensor outputs.** The
  schema audit revealed v0.1's JSON pose wire format defeated the
  goal of "swap real for synthetic without code changes" — if the
  pose path stayed JSON, only sensor outputs would swap. Migrating
  poses to `frame_transform` unified the entire pipeline on one wire
  format. Touched `@bino/core`'s `decodePoseEnvelope` + the v01_smoke
  scenario topic names + the existing test fakes.
- **Subscriber tags entityId from the topic, not the payload's
  `child_frame_id`.** The Keelson topic key is authoritative for
  "which vessel"; tolerating mismatched payloads keeps the runner
  robust against misconfigured publishers. Documented in a dedicated
  test.
- **Camera + lidar publishers in one module, not two.** They differ
  only in encoder. Splitting into separate "camera publisher" /
  "lidar publisher" classes would have duplicated the dispatch
  plumbing for no benefit. Plan tasks #4 and #5 collapsed in commit.
- **`session.put()` directly, not `declarePublisher()`.** Both
  upstream patterns (`nodered-contrib-zenoh` and `crowsnest-dev`)
  publish this way. Saves a layer of state.
- **`CameraHelper` for both camera frustum AND lidar fan.** Initially
  considered building a custom lidar helper (cone wireframe) but
  Three's `CameraHelper` against the lidar's depth-pass camera draws
  exactly the FOV pyramid we want. Recolored cyan to distinguish from
  camera (white). Single class, two visual languages.
- **Stretch #9 deferred without ceremony.** Sensor preview pane is
  cheap (kernels already produce browser-side pixels, only wiring is
  missing) but truly stretch — v0.2 acceptance is met without it,
  and the picture-in-picture UI work fits more cleanly with the v0.3
  radar PPI overlay than as a v0.2 polish.

---

## What we learned about the stack

- **`zenoh-bridge-remote-api` is the right Docker target.** The
  standalone bridge binary (zenohd statically linked with the plugin)
  is what eclipse-zenoh publishes on every zenoh-ts release. Alpine +
  `libgcc` (for the musl unwind symbols) + the binary = ~30 MB image
  that Just Works. The alternative — `eclipse/zenoh:latest` + the
  plugin .so — needs version-matched musl artifacts that aren't on
  GitHub releases under the obvious URL.
- **`@rise-maritime/keelson-js` is solid** and has a high-level API
  that hides the protobuf plumbing. Only ergonomic annoyance: it
  doesn't re-export the `Envelope` value class from its public index
  — `enclose()` returns the value but encoding it to wire bytes
  needs `Envelope.encode(env).finish()`. We deep-import from
  `@rise-maritime/keelson-js/dist/Envelope.js`. Brittle to package
  restructuring; flagged in a code comment.
- **Node 22's built-in `WebSocket` is enough.** zenoh-ts's README
  ("currently compatible with browsers, but not with Node.js due to
  WebSocket library limitations") is outdated; `nodered-contrib-zenoh`
  injects a `ws` polyfill that's no longer needed.
- **Three's `CameraHelper` is unexpectedly versatile.** Built for
  perspective debug, it works as a full sensor-FOV visualizer for any
  sensor whose model is a perspective frustum. We get camera +
  forward-looking-depth-lidar viz for free.
- **pnpm workspace package resolution is strict about CWD.** Running
  `node` against a script that imports `@bino/core` only resolves
  when CWD is inside a workspace package that lists it as a dep.
  Probe scripts had to live in `packages/node/scripts/` rather than
  `tests/zenoh-router/`. Annoying but workable.
- **per-sensor phase recovery using `floor((now - nextFire) / period) + 1`
  matters for slow encoders.** Without it, a paused encoder that
  unblocks would fire N times back-to-back trying to drain the
  backlog. Floor-of-overshoot lets the scheduler skip ahead cleanly.

---

## New risks for v0.3

v0.3 is marine radar v0 — Rust enters the codebase. The risks
sharpened through v0.2 work:

1. **Rust toolchain decisions.** `wasm-bindgen` vs `wasm-pack` vs
   hand-rolled, plus the JS↔WASM memory model (shared linear memory
   vs copy-each-frame). Affects perf and ergonomics for every future
   Rust kernel (lidar at v0.4, point-cloud post-processing). The
   design doc flagged this; v0.3 needs to actually settle it.
2. **Cross-backend pixel divergence is now user-visible.** v0.1's
   smoke just hashed for "did the frame change." v0.2 publishes raw
   bytes; consumers comparing Node-rendered camera frames against
   browser-rendered ones will see drift. Not a v0.2 blocker — fix is
   renderer-config discipline at v0.6 — but consumers will start
   noticing once anyone subscribes from outside Bino.
3. **Per-sensor publish rate jitter under load not measured.** The
   runner schedules cleanly in synthetic tests (SteppedClock); on a
   real machine with encoder + publisher + render contending, slow
   encoders could throw the rate off. Worth measuring before v0.3
   adds another expensive kernel (radar).
4. **Lidar's "forward-looking depth-camera" approximation gets
   thinner as scenes complexify.** v0.4 plans to port lidar to a Rust
   ray-cast kernel. With v0.3 introducing the WASM toolchain, there's
   pressure to pull that forward — building two Rust kernels in v0.4
   when one already exists in v0.3 would be cheaper than two
   separate efforts.
5. **The `@rise-maritime/keelson-js` deep-import is a small but real
   tech-debt item.** If v0.5+ adds a third encode/decode site (the
   radar at v0.3 may be the second), lifting a single
   `envelopeBytes()` helper into a thin Bino-side wrapper module
   becomes cleaner than spreading deep imports.
6. **Stretch #9 (sensor preview pane) carries forward.** Useful for
   the v0.3 radar PPI overlay anyway — both want the same UI pattern
   (small canvas in a corner showing sensor output).

Already-known risks v0.2 didn't change: pose-cadence vs render-cadence
(still v0.6), Zod 3→4 (still pinned), WebGPU migration timing (still
v0.4 evaluation), asset pipeline (still v0.5).
