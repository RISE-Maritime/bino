# ADR-003: Vessel body-frame convention

**Status:** Accepted
**Date:** 2026-06-17
**Context:** Reconciling the "forward" inconsistency uncovered while fixing the radar

## Decision

The vessel **body frame** is **X-forward (bow), Y-up, Z-starboard**,
right-handed — the three.js-native, Y-up convention the hull geometry and
mounts already imply. Keelson's naval **FRD** (Forward-Right-Down) convention
is treated as a **wire convention**, converted only at the keelson boundary
(`frames.ts`), never internalized.

Concretely:

1. **Body axes:** `+X` = bow, `+Y` = up, `+Z` = starboard. Identity orientation
   = bow along world `+X` (East), level.
2. **Mount angles** rotate in those body axes: **yaw about +Y (up), pitch
   about +Z (starboard, elevation), roll about +X (bow)**. `yaw = 0` aims a
   sensor **over the bow**.
3. **Camera** is aimed: its three.js `−Z` look axis is rotated onto `+X` so a
   zero-yaw camera looks over the bow.
4. **Lidar and radar are 360°-native** and emit in the vessel body frame; they
   are not re-aimed. The **radar azimuth 0 is the bow**, taken from the vessel
   body (not the sensor node), so it is independent of the radar mount.
5. **`navToSceneQuaternion`** maps keelson attitude (`heading_true_north_deg`
   + `pitch_deg`/`roll_deg`) into this body frame; `frames.ts` is the single
   place the naval/ISO-8855 ↔ body conversion lives, alongside ENU↔scene for
   position.

## Context

Bino had **two contradictory definitions of "forward"** glued together with no
conversion layer:

- **Vehicle body frame, +X-forward** — hull models author the bow at `+X`
  (`assets.ts`), and mounts follow (`bow_camera` at `+X`, beam sensors at `±Z`).
- **Graphics look axis, −Z-forward** — a three.js camera looks down its local
  `−Z`, and that idiom propagated into the camera and lidar sensors.

The two are 90° apart in the horizontal plane. Each was internally consistent
in isolation, so the seam only showed where a **runtime bearing in the body
frame meets a sensor** — i.e. the radar, whose azimuth-0 needs the bow. An
earlier fix wrongly set azimuth-0 to `−Z` (following the graphics idiom),
putting the head-up PPI 90° off the visual bow; the corrected fix used `+X`.

The collision also meant a zero-yaw "bow camera" actually looked **abeam**
(`−Z` = port/starboard), and `navToSceneQuaternion` (built on `−Z`) would point
a nav-driven vessel's bow 90° off its heading.

The question was whether to standardize the body frame on keelson's naval FRD
or on the three.js-native Y-up frame. **Y-up won** because:

- three.js is immovably Y-up; an FRD (Z-down) body makes "identity" mean
  *starboard-up*, forces a baked-in roll into every hull and mount, and pushes
  a naval convention through a graphics pipeline that resists it.
- Bino publishes **no body-frame transforms** (ADR-002 — output is sensor data
  only), so the *only* place the naval convention touches Bino is converting
  keelson's attitude scalars on input — one function in `frames.ts`. There is
  no wire-side simplicity to gain by internalizing FRD.

This is the standard robotics split: ENU/Y-up world + body internally, NED/FRD
at the naval boundary.

## Consequences

- **Mount semantics changed.** `applyMount` previously rotated "yaw" about `Z`
  (a latent bug); it now uses body axes (yaw +Y, pitch +Z, roll +X). Scenarios
  that set `yaw_deg` under the old behavior will point differently — but the
  old behavior was wrong, and `yaw = 0` now means the intuitive "over the bow".
- **Camera aiming.** A zero-yaw camera now images over the bow. Existing
  scenarios that relied on the abeam behavior (unlikely; it was a bug) change.
- **Lidar/radar output is body-frame** (`+X` bow / `+Y` up / `+Z` starboard).
  The radar azimuth 0 is the bow for any heading and any radar mount.
- **`navToSceneQuaternion` rebuilt** on `+X`-forward; it and the radar's
  `bowBearingXZ` are cross-checked in tests so a nav-driven vessel and its
  radar agree on the bow.
- **One documented convention** so the next sensor cannot re-introduce the seam.

## Alternatives considered

1. **Adopt keelson naval FRD as the internal body frame.** Rejected: fights the
   Y-up renderer (non-level identity, rotated hulls/mounts, `z`-down authoring)
   for no wire-side gain, since Bino never publishes body-frame transforms. FRD
   stays a boundary conversion.
2. **Leave the seam, document both conventions.** Rejected: it already produced
   two shipped 90° bugs (radar azimuth, would-be nav crabbing). A single body
   convention is the only durable fix.
