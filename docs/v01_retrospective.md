# v0.1 retrospective

**Closed:** 2026-04-29.
**Span:** ~2 days, including the headless-render spike.
**Companion:** `docs/plan.md` (the plan we set out to deliver),
`docs/bino_design_vision.md` (the goalposts).

This is the paper trail for v0.1: what landed, where the plan was wrong,
the bugs we shook out, the decisions taken in flight, and the new risks
to carry into v0.2.

---

## Acceptance — did v0.1 deliver?

The plan's acceptance:

> A `pnpm bino-node scenarios/v01_smoke.yaml` and a `pnpm dev` viewer,
> fed by a third-party Zenoh publisher, both show the ego vessel
> moving in lock-step.

Partial yes. What's automated and verified:

- `bino-node scenarios/v01_smoke.yaml [--zenoh ws://...]` loads, parses,
  builds the scene, opens an `@kmamal/gl` headless context (in Docker
  via Xvfb), runs the camera + lidar kernels at sensor rate, optionally
  subscribes to Zenoh.
- `pnpm dev` viewer mounts a SvelteKit page, builds the same scene from
  the same `@bino/core` helpers, runs the same kernels in the browser,
  optionally subscribes to Zenoh-WS, and falls back to a deterministic
  scripted trajectory when no broker is configured.
- Docker smoke (`@bino/node`'s `smoke.test.ts`) asserts that *pose
  updates change camera frame hashes* — the entire pump → kernel →
  render → readback pipe is exercised on real software-rendered GL.
- Playwright e2e asserts the viewer ticks frames in headless Chromium.

What's *not* automated and was deferred deliberately:

- A live Zenoh round-trip with a third-party publisher and both
  consumers (node + viewer) showing the ego vessel moving in lock-step.
  This needs `zenohd` with the remote-api plugin running in CI, which
  is itself a bit of test-infrastructure work. Bumped to v0.2 (see
  *New risks* below).

Tests at close: 48 in `@bino/core`, 9 in `@bino/node` (+ 2 GL-gated
that pass inside the Docker image but are skipped on this WSL2 host),
1 Playwright e2e in `@bino/viewer`. 21 commits, ~1.5 KLoC across all
three packages.

---

## What landed vs the plan

The plan numbered 16 v0.1 tasks. All 16 shipped. Notes per task on
where reality diverged from the plan:

| #   | Plan                       | What actually happened                                                                                                              |
|-----|----------------------------|-------------------------------------------------------------------------------------------------------------------------------------|
| S1  | Zenoh portability spike    | Skipped — user confirmed `zenoh-ts` works in both Node and browser from prior experience.                                           |
| S2  | Three.js version pin spike | 5-minute decision: pin `0.160.1` to match the headless-render spike's benchmarked numbers.                                          |
| S3  | YAML loader / Zod-error UX | Picked `yaml` over `js-yaml` (better TS types). Error UX is "prefix file path" only — investing more belongs to v0.5 authoring work.|
| 1   | `buildScene`               | Landed as planned. Added `three` as both `peerDependency` and `devDependency` for tests.                                            |
| 2   | `PoseStream` + Memory impl | Landed. `applyPoseUpdate` came along free; not in the original plan but obviously required.                                          |
| 3   | Camera kernel              | Landed, but the abstract `SensorKernel<Config, Output>` interface from the design doc *did not* fit the TS impl. Deferred unification — see "Decisions in flight". |
| 4   | Lidar kernel               | Landed. Split out `decodeDepthToPoints` as a pure function so the orchestration and the math test independently.                    |
| 5   | Clock abstraction          | Landed minimally. `external_fmi` throws (DSL accepts it; v0.6 implements).                                                          |
| 6   | `@bino/node` skeleton      | Landed. Required pinning the workspace to Node 22 because `@kmamal/gl` ships no Node 24 prebuilt. Added `.nvmrc`.                   |
| 7   | Headless renderer wrapper  | Landed split as `headless-gl.ts` (driver instantiation) + `runner.ts` (pure scheduler) + `service.ts` (integration). Tests cover the schedule logic without GL. |
| 8   | Zenoh subscriber           | Landed. Mid-stream **moved to `@bino/core`** when `@bino/viewer` also needed it — see "Decisions in flight".                        |
| 9   | Dockerfile                 | Landed slimmer than the spike's Dockerfile (removed everything Chromium/Dawn-related, since v0.1 is `@kmamal/gl` only).              |
| 10  | Smoke test                 | Landed as a vitest test, not a Docker-orchestrated bash script. Surfaces real bugs (see below) — the test paid for itself immediately.|
| 11  | SvelteKit skeleton         | Landed on Svelte 5 runes + static adapter. Required adding `vite-plugin-wasm` later for #13.                                        |
| 12  | Scene mount in viewer      | Landed as a third-person debug camera. **Not** the bow-camera output — that's a v0.2 sensor-preview feature.                         |
| 13  | Zenoh-WS subscriber        | Landed. Refactored to share code with `@bino/node` via `@bino/core`. Required `vite-plugin-top-level-await`.                        |
| 14  | Standalone scripted mode   | Landed. Default behavior when no `?zenoh=` URL param.                                                                               |
| 15  | Test scenario YAML         | Landed at `scenarios/v01_smoke.yaml`.                                                                                               |
| 16  | End-to-end integration     | **Scope-reduced**: Playwright covers the viewer; the full node-and-viewer-fed-by-Zenoh story is bumped to v0.2.                     |

---

## Real bugs the work surfaced

Both found by `@bino/node`'s smoke test (#10), both fixed in the same
commit:

1. **Three.js r160 + Node main thread `self`.** `WebGLRenderer.dispose()`
   calls `_animation.stop()` unconditionally, but `WebGLAnimation`'s
   internal context is only wired when `typeof self !== 'undefined'`.
   Node main thread leaves `self` undefined, so both `start()` and
   `stop()` dereference `null.cancelAnimationFrame`. The headless-render
   spike never disposed renderers, so it never hit this. Fix:
   `globalThis.self = globalThis` plus `requestAnimationFrame` /
   `cancelAnimationFrame` stubs in `headless-gl.ts`.
2. **Runner first-tick race.** The pose-pump task and the runner's
   frames generator ran concurrently, but the generator's first tick
   ran to its first `yield` synchronously after spawning the pump —
   the pump's `await iter.next()` microtask hadn't drained yet, so the
   first rendered frame saw stale entity transforms. Subsequent ticks
   were fine because of `await this.wait()`. Fix: a `setImmediate`
   yield at the top of each tick lets the pump apply queued updates
   before kernels read transforms.

A third issue surfaced but is *not* a bug — placing a sensor mount
inside the bounding box of the v0.1 placeholder hull (`(0,0,5)` inside
a `20×4×6` box at vessel origin) self-occludes the camera. The
smoke-test scenario was authored sloppily; real DSL examples mount the
bow camera ~110m forward of the vessel center on a 120m tanker. Fixed
the smoke scenario; documented a "place sensors outside the hull
bbox" reminder. Layer-masking or per-vessel render filtering is a
proper v0.4-or-later refinement.

---

## Decisions taken in flight

These weren't in the plan. Each was a judgment call worth recording so
the next person doesn't relitigate them.

- **Don't force the v0.1 TS kernels into the abstract `SensorKernel<Config, Output>`
  interface.** The interface assumed `step(scene, pose, time)` with a
  flat scene snapshot — fine for a future Rust ray-cast lidar that
  consumes a serialized buffer, awkward for a TS kernel that orchestrates
  a `THREE.WebGLRenderer`. Each kernel exports its own `step(time)`
  shape; the abstract interface stays as the forward contract for the
  Rust port at v0.4.
- **Keep `@bino/core` renderer-driver-agnostic.** Camera/lidar kernels
  take a `WebGLRenderer` they didn't construct. `@kmamal/gl` lives in
  `@bino/node`; canvas instantiation lives in `@bino/viewer`. The
  design doc's "no I/O, no rendering driver instantiation" rule held
  up well.
- **Lift the Zenoh subscriber from `@bino/node` to `@bino/core`.** It's
  generic over a `ZenohSessionLike` interface and uses `decodePoseMessage`
  (already in core); both Node and browser want it. Mid-stream refactor
  triggered when `@bino/viewer` reached for it at #13.
- **Viewer renders a third-person debug camera, not the bow camera
  output.** The kernels still run in-browser (proves the same-code
  claim) but their output is for stats today; sensor-preview overlays
  are v0.2.
- **Defer the live-Zenoh e2e to v0.2.** The Playwright e2e covers the
  viewer-only path. Closing the Zenoh round-trip needs a `zenohd`
  in CI, which is enough scaffolding to deserve a v0.2 spike.

---

## What we learned about the stack

- `@kmamal/gl` v9 + Node 22 + a slim Bookworm base (just `libx11-6`,
  `libxext6`, `libxcb1`, `libxau6`, `libxdmcp6`, `libstdc++6`, plus
  `xvfb`) is enough to run the spike's bench numbers in Docker. No
  `mesa-vulkan-drivers` required for the v0.1 scope. The spike's
  Dockerfile was generously over-equipped for the headless-render
  exploration; production `@bino/node` is leaner.
- Three.js's `MeshStandardMaterial` works fine with WebGL1, but its
  default lighting intensities produce very dark output on
  software-rendered headless contexts. Visible enough for hash-based
  smoke assertions; not enough for a "good-looking" viewer render
  yet. Fixed in the viewer with a sensible scene background, not yet
  addressed for the bow-camera output.
- WSL2 devcontainer + WSLg's X server + `@kmamal/gl` ⇒ no GL.
  The X socket exists in `/tmp/.X11-unix/` but `connect()` returns
  `ECONNREFUSED`. Either install `xvfb` in the devcontainer
  `postCreateCommand` (one apt line) or rely on the Docker image for
  GL-real testing. We chose the latter; it's tolerable.
- SvelteKit 2 + Svelte 5 runes + static adapter is the right shape
  for the viewer. SSR is off (`+layout.ts` exports `ssr = false`),
  prerender on. The page is a single-route SPA that hydrates the
  Three.js canvas client-side.
- `zenoh-ts` 1.9 works in both Node and browser, but the browser
  bundle requires `vite-plugin-wasm` + `vite-plugin-top-level-await`
  to handle its WASM-backed key-expression module. Documented in the
  viewer's `vite.config.ts`.

---

## New risks to carry into v0.2

The original plan called these out for later versions; v0.1 either
sharpened them or surfaced new ones.

1. **Keelson topic schemas for synthetic camera + lidar.** v0.2's
   headline feature is publishing on Keelson topics. If those schemas
   already exist in the Keelson ecosystem we just match them; if not
   we propose them, which is a multi-week negotiation. **Calls for a
   pre-v0.2 audit (S4 below).**
2. **Codec / encoding choice for camera frames.** Raw RGBA at 1080p10
   is ~62 MB/s per camera — fine on a localhost Zenoh, painful over
   any real link. JPEG/WebP/H.264 encode each have CPU and latency
   costs. **Pre-v0.2 spike (S5).**
3. **Test infra for real Zenoh round-trip.** Closing the v0.1
   acceptance fully — third-party publisher + node + viewer — needs
   `zenohd` with the `remote-api` plugin available to CI. **Pre-v0.2
   spike (S6).**
4. **Per-sensor publish rate.** v0.1's runner ticks at the highest
   sensor rate and runs every kernel each tick. v0.2 publishes — at
   the wrong rate this either floods the bus or undersamples. The
   `rate_hz` field in the DSL is *configured* but not yet *honored*
   per-sensor. Schedulable in v0.2 without architectural changes.
5. **Cross-backend pixel divergence becomes user-visible.** The spike
   already flagged that `@kmamal/gl` (Node ANGLE) and Chromium produce
   slightly different pixels for the same scene. v0.1 hashed for
   "did the frame change", which is robust. v0.2 publishes raw
   frames; consumers comparing Node-rendered output against browser
   may see drift. Real concern but bounded — fix is renderer-config
   discipline, the v0.6 determinism work.
6. **Placeholder hull self-occlusion is a usability footgun for
   scenario authors.** Currently mitigated by careful mount placement;
   long-term wants either layer-masking or geometry that doesn't
   close around the sensor mount points. Defer; revisit when real
   ship models arrive at v0.5.

Already-known risks the plan listed that v0.1 didn't change:
pose-cadence vs render-cadence (still v0.6), Zod 3→4 (still pinned),
WebGPU migration timing (still v0.4 evaluation).
