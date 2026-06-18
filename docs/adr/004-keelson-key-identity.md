# ADR-004: Per-emitter keelson key identity — mandatory `base_path`, cascading entity/source

**Status:** Accepted — implemented 2026-06-18
**Date:** 2026-06-18
**Context:** Follow-up to ADR-002. Make every keelson key segment Bino
touches — on both the pose-input and sensor-output paths —
deliberately configurable rather than implicitly derived.

## Decision

A keelson pub/sub key has the shape

```
{base_path}/@v0/{entity_id}/pubsub/{subject}/{source_id}[/@target/{target_id}]
```

Bino resolves the four _identity_ segments (`base_path`, `entity_id`,
`source_id`, `target_id`) through a single cascade, the same rules for
input (pose) and output (sensor) keys. `subject` and the `@v0` version
are always **derived**, never user-set.

1. **`base_path` is mandatory at scenario level — no default.** Bino
   emits onto a shared bus; a silent default (`bino`) is exactly how
   synthetic data collides with, or is mistaken for, real data. Forcing
   an explicit realm declaration removes that footgun. It is declared
   once (`scenario.keelson.base_path`) and inherited by every emitter;
   inheritance from a _required_ field is still fully explicit — there is
   no hidden value anywhere. Per-emitter override stays optional.

2. **One `base_path` cascade serves both directions.** The earlier
   input-default (`keelson`) / output-default (`bino`) split encoded a
   single workflow — running synthetic alongside real data and wanting
   them separable on the wire — as if it were a structural law. It is
   not: inject mode actively wants output and input under the _same_
   realm, and pure-synthetic dev wants one realm for everything. So
   `base_path` is a single value cascading scenario → vessel →
   (pose | sensor). The compare-against-real split is recovered by a
   one-line override on the pose source.

3. **`entity_id` cascades vessel → emitter, defaulting to the vessel
   id.** It names the _platform_ publishing the data. For own-ship it is
   the same whether publishing GNSS pose or camera frames, so it is set
   once on the vessel and inherited by both the pose subscription and the
   sensor outputs. Observed traffic overrides it on the pose source (the
   _receiver_ platform, not the contact).

4. **`source_id` is per-emitter.** It names the source on the platform.
   Sensor outputs default it to the **sensor id**; the pose source states
   it explicitly (e.g. `gnss_compass`, `ais`).

5. **`target_id` is input-side only.** `@target` means "data _about_
   observed entity X" — correct for a received nav report on a contact,
   a category error on a raw `image_raw` / `point_cloud` /
   `radar_sweep`, which observe the whole scene, not one target. It stays
   on the `keelson_nav` pose source and is **not** offered on sensor
   outputs. (If derived track/detection subjects are added later,
   `@target` belongs on _those_, not on the raw sensor.)

6. **`subject` and `@v0` are never user-set.** Subjects are fixed by
   direction and type (`location_fix` / `heading_true_north_deg` /
   `pitch_deg` / `roll_deg` in; `image_raw` / `point_cloud` /
   `radar_sweep` out); the version is fixed by the SDK. This is what
   keeps every resolved key a well-formed keelson key — the property a
   raw `publish_topic_override` string cannot guarantee.

7. **`publish_topic_override` remains the final escape hatch.** If set on
   a sensor it wins outright and skips identity resolution entirely — the
   only way to emit a deliberately non-keelson key. Structured identity
   is the grammar-safe normal path; the override is the labelled exit.

## Resolution rules

| segment     | input (pose `keelson_nav`)              | output (sensor)                           |
| ----------- | --------------------------------------- | ----------------------------------------- |
| `base_path` | pose → vessel → scenario (**required**) | sensor → vessel → scenario (**required**) |
| `entity_id` | pose → vessel, default vessel id        | sensor → vessel, default vessel id        |
| `source_id` | pose source (explicit)                  | sensor, default sensor id                 |
| `target_id` | pose source only (observed traffic)     | — (not offered)                           |
| `subject`   | derived (4 nav subjects)                | derived from sensor type                  |
| version     | fixed `@v0`                             | fixed `@v0`                               |

## Example

```yaml
scenario:
  name: keelson_nav_demo
  anchor: { lat: 54.3700, lon: 10.1850, height: 0.0 }
  keelson:
    base_path: bino # REQUIRED — no default. Inherited by all emitters.
  vessels:
    - id: ego
      model: tanker_120m
      keelson:
        entity_id: ego_platform # shared platform identity (defaults to vessel id)
      pose_source:
        type: keelson_nav
        source_id: gnss_compass # base_path & entity_id inherited
      sensors:
        - id: bow_camera
          type: camera
          mount: { x: 60, y: 18, z: 0 }
          fov_deg: 90
          resolution: [640, 480]
          rate_hz: 10
          keelson: { source_id: cam_fwd } # override source; base_path & entity inherited
        - id: main_radar
          type: radar_marine
          mount: { x: 0, y: 35, z: 0 }
          range_m: 4000
          rotation_rate_hz: 0.4
          beam_width_deg: 1.2
          spokes_per_rev: 360
          range_bins: 256 # no keelson block → all inherited / derived
    - id: contact_1
      model: ferry_60m
      pose_source:
        type: keelson_nav
        entity_id: ais_receiver # the receiving platform, not the contact
        source_id: ais
        target_id: mmsi_245060000 # @target — input side only
      sensors: []
```

Resolved keys:

```
# ego pose input (realm bino, entity inherited)
bino/@v0/ego_platform/pubsub/location_fix/gnss_compass
bino/@v0/ego_platform/pubsub/heading_true_north_deg/gnss_compass
bino/@v0/ego_platform/pubsub/pitch_deg/gnss_compass
bino/@v0/ego_platform/pubsub/roll_deg/gnss_compass

# ego sensor outputs (realm bino, entity inherited)
bino/@v0/ego_platform/pubsub/image_raw/cam_fwd
bino/@v0/ego_platform/pubsub/radar_sweep/main_radar

# contact_1 pose input (entity = receiver, @target appended)
bino/@v0/ais_receiver/pubsub/location_fix/ais/@target/mmsi_245060000
bino/@v0/ais_receiver/pubsub/heading_true_north_deg/ais/@target/mmsi_245060000
...                                                   # no sensor outputs
```

## Context

ADR-002 fixed Bino's wire _shape_ (sensor data out, decomposed nav in)
but left key _identity_ implicit: the output realm defaulted to `bino`,
the entity segment was hardwired to the vessel id, the source segment to
the sensor id, and the pose input carried its own separate
`base_path` default of `keelson`. None of it was reachable from config
except the all-or-nothing `publish_topic_override`, which trades away the
keelson grammar (a typo'd subject or version silently breaks downstream
tooling).

Two needs drove revisiting this. **Inject mode** must make synthetic
returns impersonate the real platform's identity — the key-side twin of
ADR-002's per-sensor `frame_id` override — which requires varying
`entity_id` / `source_id` while keeping the key well-formed. And
**targeting a specific keelson deployment** requires choosing the realm
explicitly rather than inheriting `bino`. Both are "vary the identity
segments, keep the grammar," which the structured cascade provides and
the raw override does not.

ADR-002's backlog item 5 ("resolve vestigial `keelson.source_id` /
`parent_frame_id`") was closed by dropping them (commit `109ba49`). This
ADR reintroduces `source_id` — and adds `entity_id` — but as
_per-emitter, cascading, grammar-bound_ fields with a defined role on
live keys, not the vestigial pose-encoding remnants that were removed.

## Consequences

- **Breaking config change.** `scenario.keelson.base_path` becomes
  required and `Keelson` can no longer default on the scenario. All 15
  scenarios under `scenarios/` (none currently declare `base_path`) gain
  a one-line `keelson.base_path`. Roughly 20 test files build scenarios
  via `compileScenario` / `Scenario.parse`; any relying on the `bino`
  default must add the field (ideally via one shared test fixture). The
  change is mechanical; the risk is a missed fixture surfacing as a
  confusing validation error.

- **New uniqueness validation.** Today `(vessel_id, sensor_id)` is unique
  by construction. Once `entity_id` / `source_id` are free-form, two
  emitters can resolve to the _same_ key and silently clobber each other.
  Compilation must reject duplicate **resolved** keys scenario-wide
  (output keys against each other; pose subscriptions are a separate
  concern but worth the same check).

- **`entity_id` inheritance is a deliberate footgun trade.** Defaulting
  `keelson_nav.entity_id` to the vessel id is DRY for own-ship but means
  a traffic vessel that forgets to override would publish its input pose
  under its _own_ identity instead of the receiver's. Mitigation
  (implemented): a compile-time **warning** when a `keelson_nav` source
  **sets `target_id`** (i.e. observed traffic) yet its `entity_id`
  resolves to the vessel itself — the precise, non-noisy signal that the
  receiving platform was left unset. Own-ship feeds (no `target_id`) never
  trigger it, so legitimate inheritance stays silent. The looser "no
  `target_id` + entity == vessel" phrasing of an earlier draft was dropped
  because it cannot distinguish own-ship from forgotten-traffic and would
  fire on the common correct case.

- **`publish_topic_override` precedence is now explicit:** override wins
  and bypasses resolution; otherwise the cascade applies. Documented so
  the two mechanisms don't read as ambiguous.

## Alternatives considered

1. **Keep direction-specific `base_path` defaults (`keelson` in / `bino`
   out).** Rejected: encodes one niche workflow as structure, blocks the
   trivial "one realm" case inject mode needs, and a silent default is
   the footgun this ADR exists to remove. A one-line override recovers
   the split.

2. **Mandatory `base_path` at _every_ emitter (no inheritance).**
   Rejected: maximally explicit but brutally verbose — every sensor
   restates the realm — and it guts the cascade. Inheritance from a
   required field is already fully explicit.

3. **Expose `target_id` on sensor outputs for symmetry.** Rejected: a
   raw sensor observes the whole scene, not a target; `@target` on
   `image_raw`/`point_cloud`/`radar_sweep` would mint keys that violate
   keelson's data model.

4. **Extend `publish_topic_override` validation instead of structured
   identity.** Rejected: validating a free string against the grammar
   reconstructs the structured form the hard way and still can't express
   "vary one segment, derive the rest." The override stays as the
   non-keelson escape hatch only.

5. **Keep `keelson_nav.entity_id` required (no inheritance).** Still
   open as a fallback to the inheritance footgun above; trades DRY for
   safety. Decision: inherit + validation warning, revisit if the
   warning proves noisy.

## Implementation backlog

All items below landed in the 2026-06-18 implementation.

1. ✅ Schema: `scenario.keelson.base_path` required (dropped default and
   `Keelson.default({})`); added optional `vessel.keelson { entity_id?,
base_path? }` and `sensor.keelson { source_id?, entity_id?, base_path? }`;
   dropped `keelson_nav.base_path`/`entity_id` requirements, added
   inheritance.
2. ✅ Resolution: single cascade resolver (`resolveOutputIdentity` /
   `resolveNavIdentity` in `keelson.ts`), shared by `compile.ts`,
   `service.ts`, and `cli.ts`. Key builders and encoders now take a
   resolved `KeelsonKeyIdentity`.
3. ✅ Validation (`compile.ts`): required `base_path` (schema); unique
   resolved output keys scenario-wide; observed-traffic entity-inheritance
   warning (see consequences for the refined trigger).
4. ✅ Migrated 15 scenarios + 4 templates + test fixtures;
   `validate:scenarios` passes.
5. ✅ DSL-reference: "Planned (ADR-004)" notes promoted to the live schema
   tables.
