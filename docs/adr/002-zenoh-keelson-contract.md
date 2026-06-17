# ADR-002: Zenoh/Keelson wire contract — sensor-only output, decomposed-nav input

**Status:** Accepted
**Date:** 2026-06-17
**Context:** Revisit of the zenoh/keelson API after the v0.x sensor work

## Decision

Bino's role on the bus is fixed to its design-vision shape: **pose
injection in, sensor data out, nothing else.**

1. **Output is exactly three sensor messages** — `image_raw`
   (`foxglove.RawImage`), `point_cloud` (`foxglove.PointCloud`), and
   `radar_sweep` (`keelson.RadarSweep`). Bino publishes **no** poses,
   no `location_fix`, no ground truth, and **no transforms** — neither a
   dynamic `world→vessel` node nor static `vessel→sensor` mounts.

2. **The sensor message's `frame_id` is the entire spatial interface**
   and is **per-sensor configurable**, independent of the topic-key
   override.

3. **Input gains a keelson-native decomposed-nav `pose_source`** —
   `location_fix` + `heading_true_north_deg` [+ `pitch_deg`/`roll_deg`] —
   which Bino projects through its internal anchor itself. The existing
   single-topic `frame_transform` source is retained for the
   local/FMI-synthetic case. Both feed one internal `PoseStream`.

4. **Decomposed nav is fused latest-wins** in the first iteration,
   behind a swappable `NavFuser` seam, logging the inter-subject time
   skew it ignores.

5. **All coordinate-frame conversion is confined to one module**
   (`frames.ts`). The internal scene/render frame stays three.js Y-up;
   conversion happens only at the keelson boundary on the *input* path.

## Context

The zenoh/keelson surface had drifted into an island. On **input**,
Bino's only `pose_source` was a single `foxglove.FrameTransform` per
vessel, applied raw as three.js Y-up. Research into the keelson repo
(`/tmp/keelson`, RISE-Maritime/keelson) showed that **no keelson
connector ever emits a dynamic pose FrameTransform** — the protocol
spec (§2.2.1 rule 1a) mandates that separable nav quantities are
published as *decomposed scalar subjects* (`location_fix`,
`heading_true_north_deg`, `pitch_deg`, `roll_deg`, …), and
`frame_transform` is reserved for *static* sensor-mount geometry
(published by the `platform` connector). So Bino subscribed to a message
shape nothing in the ecosystem produces, in an axis convention nothing
else uses. A real AIS/GNSS/MAVLink feed driving Bino would have required
an external adapter doing exactly the geo→ENU projection Bino already
contains (`geodeticToEnu`).

On **output**, sensor messages carried a `frame_id` of
`"{vesselId}/{sensorId}"` with `pose: undefined` and no transform tree,
so a consumer could not place returns in any frame.

The instinct to "fix" output by publishing a transform tree was
considered and **rejected**. The decisive question was: *who consumes
Bino, and in what frame?* The primary V&V consumers — the system under
test and a scoring harness — already relate geodetic↔local using their
own nav, exactly as in production; an invented Cartesian `world` anchor
would impose a *second datum* they must discover and reconcile. keelson
deliberately defines no world/datum convention for this reason. The
vessel poses a scorer needs as ground truth are already on the bus,
published by whatever injected them (FMI co-sim, AIS feed) — Bino
re-emitting them would be a redundant, and in inject mode *misleading*,
second copy. Static mount geometry is shared scenario configuration
(the scene definition is the product) or, in inject mode, owned by the
real `platform` connector. None of it is Bino's to publish.

Collapsing output to sensor-only also dissolved the thorniest sub-
problem we had been wrestling with — whether to publish an *estimated*
`world→ego` in inject mode. With no Cartesian world on the wire, there
is no `world→ego` to publish; Bino consumes the real ego nav internally
(to aim its render camera) and merges synthetic returns into the real
sensor's frame purely by stamping a matching `frame_id`.

## Consequences

- **`frame_id` becomes load-bearing.** In inject mode the synthetic
  return must carry the *real platform's* `child_frame_id` to merge
  correctly, so `frame_id` is per-sensor configurable (new DSL field),
  separate from `publish_topic_override` (which only changes the topic
  key). Default remains `"{vesselId}/{sensorId}"`.

- **The sensor data's own internal frame convention is now an implicit
  part of the contract.** Because no transform is published, the
  axis/azimuth convention of the emitted `point_cloud` (currently
  sensor-local, three.js-derived) and `radar_sweep` (azimuth =
  sensor-relative angle) is what a consumer receives. This is presently
  undocumented; documenting and deliberately choosing it (sensor-local
  vs a stated naval convention) is follow-up work, but it does **not**
  require publishing transforms.

- **The output-side naval-convention discussion is superseded.** An
  earlier draft of this revisit proposed publishing the transform tree
  in a naval (X-fwd/Y-stbd/Z-down) body frame to match the `platform`
  connector. With no transform output, that is moot. Axis conversion
  now matters only on the *input* path (decomposed nav → three.js).

- **keelson's own axis inconsistency is reconciled in one place.**
  keelson documents attitude *scalars* as ISO-8855 (`subjects.yaml`)
  while its static FrameTransform tree is naval — a real internal
  inconsistency. Confining all conversion to `frames.ts`, with a
  round-trip property test, keeps it from leaking into the renderer.

- **`keelson.source_id` and `keelson.parent_frame_id` are presently
  vestigial.** They feed only pose encoding, which Bino no longer
  publishes; only `base_path` influences the wire. They are either
  wired into a meaningful role or dropped in a follow-up.

- **Safety split preserved.** Own-ship nav uses bare keys; observed
  traffic uses keelson's `@target/mmsi_*` extension. The decomposed-nav
  `pose_source` honors this distinction so a plain `pubsub/**`
  subscription cannot silently fuse AIS contacts.

## Alternatives considered

1. **Publish a Cartesian `world→vessel→sensor` transform tree** (naval
   body, ENU world root). Rejected: imposes a second datum on consumers
   who already georeference via their own nav, re-creating the island
   problem on the output side; keelson deliberately leaves the
   geodetic↔Cartesian bridge to the consumer. Foxglove 3D
   visualization — the one consumer that genuinely wants a tree — is
   served by an optional, clearly-labeled bridge connector, not by the
   core contract.

2. **Publish ground truth as geodetic `location_fix` per object.**
   Rejected as out of scope: the ground-truth poses are already on the
   bus from the injecting source; Bino is a sensor emulator, not a
   ground-truth republisher.

3. **Keep `frame_transform`-only input, require feeds to adapt.**
   Rejected: forces every real-feed integration to re-implement Bino's
   own geo-projection externally, and leaves Bino unable to ingest the
   decomposed nav that the entire keelson connector ecosystem actually
   produces.

## Implementation backlog

1. Per-sensor `frame_id` override (this ADR's smallest, fully-specified
   item — built first).
2. Decomposed-nav `pose_source` (`location_fix` + `heading` [+ pitch/
   roll]), Bino-side projection, `@target/mmsi_*` for traffic.
3. `NavFuser` seam; latest-wins implementation; skew logging.
4. `frames.ts` input-path axis-conversion module + round-trip tests.
5. Resolve vestigial `keelson.source_id` / `parent_frame_id`.
6. Document the emitted sensor-data frame/azimuth convention.

The per-spoke radar timestamp fix and the keelson-js type-safety /
dist-import consolidation (`keelson-sdk.ts`) landed ahead of this ADR.
