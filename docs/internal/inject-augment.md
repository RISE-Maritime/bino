# Inject-augment: merging synthetic returns into a live sensor stream

_Status: design + initial implementation. Scope: radar and lidar. Camera is
explicitly out of scope (see [Camera](#why-camera-is-out-of-scope))._

## What this adds

Today `modes.rendering: inject` makes Bino render synthetic objects only (no
sky/sea/terrain) and publish them on Keelson topics that are _frame- and
phase-compatible_ with a real sensor. The actual merge of real + synthetic into
one stream was left to an unbuilt downstream component, so inject mode was only
the source half of a pipeline.

Inject-augment closes that: Bino subscribes to the **real** sensor stream off the
Keelson bus, adds its synthetic returns into it, and republishes a single
**augmented** stream. The thing under test consumes the augmented topic and sees
real returns with a ghost target merged in.

This keeps the renderer core unchanged ("pose injection is the only input to the
renderer"). Ingestion + merge is a separate stage that is only active in inject
mode — Bino remains a bus participant, never inline on the raw real topic. If
Bino dies, the real topic keeps flowing and consumers can fall back to it; only
the augmented stream stops. The augmented stream is the test artifact, not the
production data path.

## Why radar and lidar only — and why camera is out

The merge is only honest where the modality is **additive / occlusion-free**:

- **Radar** — real returns are signal-additive; a synthetic and a real return in
  the same range/azimuth bin combine by `max` with no depth reasoning. This is
  where in-Bino merge earns its keep, because alignment (spokes, azimuth bins,
  range bins, rotation phase) is fiddly and Bino owns the spoke model.
- **Lidar** — a point cloud is sparse; "merge" is concatenation of two
  `point_cloud` messages in the same frame. No occlusion to resolve. Correct, but
  cheap — the value is packaging, not algorithm.

### Why camera is out of scope

Compositing a synthetic object into a live image with correct occlusion needs a
**depth buffer of the real scene** — to know the ghost is behind the real pier or
in front of the real ferry. Bino does not have it and cannot get it without
rendering the real world, which is `replace` mode. The best achievable without
real depth is naive over-compositing (synthetic always on top, mismatched
lighting/exposure), which in a V&V tool is worse than nothing: it looks valid and
silently invalidates the test. This is not fixable by moving the merge into Bino —
the depth information does not exist on either side. Camera-inject routes to
`replace` mode with a real background plate, which is a different and much larger
feature. Do not conflate the two.

## Geometry: derive from the stream, DSL as fallback

Each `keelson.RadarSpoke` on the wire carries `azimuth`, `range` (= `range_m`),
its `intensity` data array (whose **length is `range_bins`**), and a timestamp.
So the inbound stream is self-describing for the two parameters that drive
bin-merge. The rule:

| Parameter         | Source                                     | On mismatch                                     |
| ----------------- | ------------------------------------------ | ----------------------------------------------- |
| `range_m`         | **derived** per-spoke (`spoke.range`)      | adapt — re-render/resample synthetic to it      |
| `range_bins`      | **derived** per-spoke (`intensity.length`) | adapt — resample synthetic to it                |
| `spokes_per_rev`  | derivable over one revolution              | validate after first rev; throw on disagreement |
| mount / beamwidth | not on the wire                            | document as user responsibility (GIGO)          |

`range_m` and `range_bins` are **derived, not validated-and-thrown**, on purpose:
a real marine radar carries `range` on _every_ spoke precisely because the
operator changes range scale during normal operation (0.5 / 1.5 / 3 / 6 / 12 nm).
A hard throw on range mismatch would kill the test the first time someone twists
the range knob. Bino tracks `spoke.range` and renders/resamples its synthetic
returns into that grid. (This is _not_ the "silent resample to hide a config
error" trap — Bino controls its own synthetic geometry, so resampling its own
output onto a self-describing real grid is well-defined.)

The DSL radar fields (`range_m`, `range_bins`, `spokes_per_rev`) become the
**fallback** used until a real stream is connected — advisory, not authoritative.

The un-observable params (antenna height/mount `z`, beam width) have no referent
on the bus, so they cannot be policed; a wrong mount silently places injected
returns at the wrong elevation. Documented, not guarded.

## Timing: no internal clock — event-driven on the trigger message

In `replace` / `inject_all`, Bino owns the clock and `phase_offset_s` schedules
sensor frames off Bino's time. **Augment-inject has no Bino clock.** The inbound
real message is the trigger and carries its own time:

```
real spoke arrives ─► sample poses at spoke.time ─► get synthetic return for
                      spoke.azimuth ─► merge intensities ─► republish carrying
                      the real spoke's timestamp + frame_id
```

Nothing free-runs; every output is caused by a corresponding real input. Three
things keep "operate on the latest data" from introducing a _different_ timing
error:

### 1. Sample poses at the spoke's timestamp, not "latest pose held"

Two async streams feed this: the real spoke stream (trigger) and the
`frame_transform` pose stream for ego + ghost. They arrive at independent rates
and latencies. Using whatever pose arrived last samples the ghost geometry at the
wrong instant, and at range that smears the synthetic return's azimuth/bin. So
the augmenter keeps a short **time-keyed pose history** (`PoseSampler`) and
samples it at the incoming spoke's own timestamp — interpolating position and
slerping orientation between bracketing samples, holding at the ends. The wire
already preserves per-spoke absolute time for exactly this reason (motion
de-distortion of a rotating sweep).

### 2. Render once per revolution, index per spoke

Spokes arrive at hundreds/sec (`spokes_per_rev × rotation_rate_hz`), but the
radar kernel renders **one scene snapshot per revolution** (ADR-002: intra-sweep
timestamps are interpolation, not independent samples). We do not re-raycast the
Three.js scene per spoke. The loop:

- render the synthetic revolution **once** (poses sampled at the revolution's
  start time), into a `RadarFrame` of evenly-spaced spokes;
- for each incoming real spoke, **index into that frame by azimuth** (O(1), since
  synthetic spokes are evenly spaced and sorted) and merge;
- re-render the revolution when a new real revolution begins (azimuth wrap).

This gives per-spoke output latency without per-spoke render cost, and matches
the real radar's own snapshot-per-rev behaviour.

### 3. Keep-up is explicit: forward real, count it

Event-driven is not unbounded. If merge can't finish within the inter-spoke
budget the right failure for a V&V tool is to **forward the real spoke
un-augmented and increment a dropped-spoke counter** — a bounded, visible
artifact — rather than accumulate latency that silently invalidates the run. The
augment loop has exactly one such branch.

## Module layout

| Concern                                      | Where                         | Tested as    |
| -------------------------------------------- | ----------------------------- | ------------ |
| bin-wise merge + range-aware resample        | `core/src/radar-augment.ts`   | pure unit    |
| azimuth → synthetic spoke index              | `core/src/radar-augment.ts`   | pure unit    |
| sample-at-time pose history                  | `core/src/pose-sampler.ts`    | pure unit    |
| subscribe → sample → index → merge → publish | `node/src/radar-augmenter.ts` | mock session |

The renderer is injected into the augmenter as a `renderRevolution(time, geom)
=> RadarFrame` seam, so the merge/index logic is testable without GL and the node
wiring supplies the real renderer-backed callback. Note the derived `geom` passed
to the renderer is an _optimisation_, not a correctness requirement: even if the
synthetic revolution is rendered on the DSL/fallback grid, `mergeSpokeIntensity`
resamples it onto the real spoke's grid and `nearestSpokeByAzimuth` tolerates any
synthetic spoke count, so the merge stays correct. Rendering at the derived geom
just avoids the resample.

## DSL surface

Inject-augment is opt-in per radar sensor via one explicit field — `augment_source`,
the real `radar_spoke` key to subscribe to and merge into:

```yaml
sensors:
  - id: nav_radar
    type: radar_marine
    # ... geometry (used as fallback until derived from the stream) ...
    emit: spoke
    augment_source: platform/@v0/radar/pubsub/radar_spoke/real
```

Explicit, not convention-derived: the real sensor's key is a deployment fact, not
something to infer from Bino's own identity. When set, this sensor is driven by
the inbound real stream (no runner clock) and its resolved output key carries the
merged stream. Compile-time guards (`compile.ts`): `augment_source` is rejected
outside inject mode, and rejected if it equals the sensor's own output key (a
feedback loop).

## Service/CLI wiring

`createNodeService` (`node/src/service.ts`) detects radar sensors with
`augment_source`, builds their kernel but routes it to a `RadarAugmentBuild`
instead of the runner schedule + publisher (so no synthetic-only stream is
emitted on the output key), and returns a shared `PoseSampler`. The
`renderRevolution` closure samples that sampler at the spoke time, applies the
poses to the shared scene, and renders one revolution synchronously — so the
runner's own pose application can't interleave mid-render.

The CLI (`node/src/cli.ts`) **tees** the pose stream: the runner consumes one
branch (driving its other sensors at its own cadence), and the `PoseSampler` is
fed from the other. Each augment build is wired to a `RadarAugmenter` over the
zenoh session (subscribe + publish) and run alongside `runner.frames()`. On
shutdown the augmenters are stopped and their `(augmented, forwarded)` counts
logged. A runnable example is `scenarios/v07_inject_augment.yaml` (needs a zenoh
router and a real radar publishing on the `augment_source` key).

## Verification

Two layers, split by what each can run:

- **Integration test** (`node/test/augment-integration.test.ts`) — runs anywhere,
  no GL. Wires the production `teePoseStream` → `PoseSampler` → `createRadarAugmenter`
  chain together with a non-GL stand-in for the Three.js raycast (a `renderRevolution`
  that samples the sampler exactly as the service closure does). It asserts the
  headline behaviour: across two revolutions at different times, each merged spoke
  carries the ghost sampled **at that revolution's time** (not the latest pose
  held), proving the tee feed, sample-at-spoke-time, per-rev render, azimuth index,
  and merge compose correctly. This is the regression test later features ride on.
- **Loopback harness** (`node/scripts/augment-loopback.mjs`) — for a GL host. Plays
  the real side (ego/ghost poses + an empty rotating `radar_spoke` stream on the
  `augment_source` key), runs against `bino-node scenarios/v07_inject_augment.yaml`,
  and subscribes to the augmented output to confirm a synthetic ghost return is
  merged in at the expected bearing. Covers the one thing the integration test
  can't: the actual GL render and a live zenoh round-trip.

## Ground-truth co-publish

Bino is the only component that holds both the injected stimulus and the merged
output, so it co-publishes the **true** state of the injected targets — the
feature that most justifies doing the merge in Bino rather than downstream. Once
per revolution, alongside the merged spokes, the augmenter publishes a
`ground_truth` message (subject `ground_truth`, keyed under the same sensor
identity → e.g. `bino/@v0/ego/pubsub/ground_truth/nav_radar`): one
`foxglove.FrameTransform` per injected target, in the **same frame as the merged
stream** (`parentFrameId` = the real spoke's `frame_id`), with the target placed
in the radar's bow-relative cartesian frame (`x` along the bow, `y` to starboard,
`z` up). A consumer recovers polar truth with `range = hypot(x, y)`,
`bearing = atan2(y, x)` and scores: "I injected a target at this range/bearing —
did a detection appear there in the merged stream?"

The truth is computed (`groundTruthTargets`, pure) in the kernel's own convention
(`azimuth = atan2(dz, dx) − host.heading`, range = `hypot(dx, dz)`), so a truth
bearing lines up with the spoke that would contain the target by construction.
Targets beyond range are dropped. The service closure gathers every vessel except
the sensor's host and reads its posed world position; because it runs immediately
after `renderRevolution` at the same time, the scene is already posed correctly.
Orientation/extent are identity for now (point targets) — a future refinement.

## Lidar augment

The lidar analogue of the radar path, and strictly simpler: a point cloud is
sparse and self-describing (stride + fields on the wire), so there is no bin
grid, azimuth index, or geometry to derive. Each real `point_cloud` is the
trigger; Bino samples poses at the frame's time, renders one synthetic cloud,
and **concatenates** it into the real cloud, republishing on the sensor's own
`point_cloud` key carrying the real frame's timestamp + `frame_id`. Enabled by
`augment_source` on a `lidar` sensor (same validation as radar).

The one subtlety is fidelity. The merge does **not** xyz-normalise the real
cloud — that would drop per-point fields (intensity, ring, time) the consumer may
rely on, corrupting the real points for V&V. Instead `appendSyntheticPoints`
copies the real buffer verbatim and packs synthetic points into the real cloud's
own stride (xyz at the real field offsets via `xyzFieldOffsets`, other bytes
zero). If the real cloud doesn't expose FLOAT32 x/y/z, synthetic points can't be
packed safely, so the augmenter forwards the real cloud unchanged and counts it —
the same explicit keep-up fallback as radar. (Ground-truth co-publish is radar's
bow-relative form; the lidar equivalent is a follow-up.)

## Out of this iteration

- **End-to-end GL + zenoh run.** The integration tests cover the wiring (radar
  merge + ground truth, lidar concat) and the Docker/Xvfb smoke test covers the
  GL raycast, but the two have not yet been run together on a GL host with a live
  router. Run the loopback harness there (above) — it drives both the radar and
  lidar real streams and reports merged ghost bearing, ground-truth range/bearing,
  and synthetic lidar point counts.
- Ground-truth co-publish for lidar (radar-only today).
- Ground-truth orientation + extent (currently point targets, identity rotation).
