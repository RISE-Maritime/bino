# Bino

_A maritime perception sensor emulator for verification & validation_

---

## What it is

Bino is a 3D world renderer and synthetic perception sensor emulator for maritime applications. It produces real-time camera, lidar, and marine radar data from injected pose streams — driving a simulated world from external sources (FMI co-simulation, real-world feeds, scripted scenarios) rather than computing dynamics itself.

The primary use cases are verification and validation of maritime perception, sensor fusion, and autonomy stacks: comparing a perception pipeline's output against ground truth, injecting synthetic objects into a real sensor stream to test edge cases, and running fully synthetic SIL/HIL/BIL scenarios when no real environment is available.

The name reflects the dual-view nature of the system: the same world rendered through two lenses, a headless service for production V&V runs and a browser viewer for inspection and demonstration. Both eyes see the same thing because they share a single underlying scene definition and rendering core.

---

## Design principles

**The renderer is incidental; the scene definition and sensor library are the product.** Engines come and go. A clear DSL and well-specified sensor models outlast any particular rendering backend, and they're what makes the system useful to other tools in the ecosystem.

**One codebase, two execution environments.** The Node service and the browser viewer run literally the same TypeScript modules. There is no "reconstruction" of scene state in the browser, no parallel rendering pipeline, no risk of drift between what the sim computes and what the viewer shows. They are the same renderer, instantiated twice.

**Pose injection is the only input.** Bino never computes ship dynamics, hydrodynamics, or environmental forcing. Entity poses arrive over Zenoh from external sources. The same topic shape works for FMI co-simulation, real-world AIS/GNSS feeds, and scripted traffic — which is what makes the three V&V modes fall out naturally rather than requiring three separate code paths.

**Performance escape hatches, not performance foundations.** TypeScript is the foundation because it has to run in Node and in browsers and be authored fluidly with LLM tooling. Rust/WASM appears behind well-defined kernel interfaces where it's faster, where it's shareable with the rest of the Rust ecosystem, or where the algorithm deserves a real language.

**Geo-registration is first-class.** The world has a real lat/lon anchor. Local sandbox scenarios can ignore it, but every scene can ground itself in real coordinates if it wants to, and mixed-reality scenarios require it.

---

## Use cases

Three V&V modes, distinguished by where entity poses come from and what background the renderer draws:

**Replace mode.** Fully synthetic world. Ego vessel and traffic poses come from FMI co-simulation. Background terrain, sea surface, and traffic are all rendered. Ground truth is available because the simulator owns the world.

**Inject mode.** Real ship at sea with real sensors. Bino renders only synthetic objects — a ghost vessel, a virtual buoy, an obstacle that isn't really there — into the otherwise-real sensor stream. Background terrain and sea surface are not rendered. Synthetic returns are merged with real returns downstream. Requires geo-registration and tight time synchronization with real sensor scan/exposure phases.

**Inject-all mode.** SIL/HIL/BIL setups with no real environment. Functionally identical to replace mode, but with the clock slaved to an external HIL trigger rather than wall time, stricter determinism guarantees, and binary sensor protocol bridges where required.

The same scene definition serves all three modes; the differences are in mode flags, clock source, and which entities the renderer draws.

---

## Architecture

### High-level shape

```
              ┌─ FMI co-sim ──────┐
              │                   │
              │   Real AIS/GNSS ──┼──► Pose stream  ─┐
              │                   │   (Zenoh topic)  │
              │   HIL test rig ───┘                  │
              │                                      ▼
              │                            ┌──────────────────┐
   Scene DSL  │                            │ Bino core        │
   (YAML/TS)  ┼──► Scene compiler ────────►│ • Three.js scene │
              │                            │ • Sensor modules │
              │                            │ • Mode flags     │
              │                            │ • Clock control  │
              │                            └────┬─────────┬───┘
              │                                 │         │
              │                                 ▼         ▼
              │                           Headless     Browser
              │                           Node         viewer
              │                           service      (SvelteKit)
              │                                 │
              │                                 ▼
              │                       Synthetic sensor streams
              │                       on Keelson topics that
              │                       mirror real sensor topics
```

### The three packages

`@bino/core` — TypeScript library. DSL types (Zod schemas), scene compiler, sensor module interfaces, geo-registration helpers, Three.js scene construction. Pure functions and data structures; no I/O, no rendering driver instantiation. This is the piece that has independent value and lives forever.

`@bino/node` — Node service. Wraps core, drives a headless renderer (via `headless-gl` or WebGPU on Node), subscribes to Zenoh pose streams, publishes synthetic sensor data on Keelson topics, runs in Docker. This is the V&V production target.

`@bino/viewer` — SvelteKit app. Wraps core, renders to browser canvas, subscribes to Zenoh-WS for live poses and sensor outputs. Identical scene logic to the Node service. This is the demo and debug target. Also runs standalone in browser-only mode for stakeholder demos with no backend.

### The sensor kernel boundary

Sensor models live behind a `SensorKernel` interface that takes a scene snapshot plus a pose and returns sensor data. The interface is batch-oriented: one call per sensor frame, with everything the kernel needs serialized into a flat buffer it can process without further JS round-trips.

```ts
interface SensorKernel<Config, Output> {
  configure(config: Config): void;
  step(scene: SceneSnapshot, pose: Pose, time: number): Output;
}
```

Implementations can be pure TypeScript or Rust-compiled-to-WASM behind the same interface. The `core` package ships TypeScript reference implementations; the `kernels` workspace (separate Rust crate) ships optimized versions for hot paths.

### What's Rust, what's TypeScript

Rust/WASM, scoped narrowly to where it earns its keep:

- Lidar ray-cast kernel
- Radar returns kernel (including future sea-clutter and antenna-pattern work)
- Point cloud post-processing
- Geo math (proj, ENU/ECEF) — folded in once Rust is already present
  TypeScript everywhere else:

- DSL definition and validation (Zod)
- Scene graph and Three.js renderer
- IO / Zenoh client
- Orchestration, lifecycle, configuration
  Rust kernels are also compilable as native crates, which means the same lidar return kernel that runs in the browser can be called from offline analysis pipelines — useful for things like validating a perception stack against a logged voyage using identical math.

### The DSL

YAML for authoring, validated by Zod schemas, compiled to a typed scene graph. A first-cut shape:

```yaml
scenario:
  name: kiel_approach_2

  anchor:
    lat: 54.3233
    lon: 10.1394
    height: 0.0

  environment:
    sea_state:
      significant_wave_height: 1.2
      peak_period: 6.5
      direction_deg: 215
      spectrum: pierson_moskowitz
    wind:
      speed: 8.5
      direction_deg: 220
    time_of_day: "20:30"
    visibility_m: 8000

  terrain:
    coastline:
      source: osm
      bbox: [10.05, 54.28, 10.25, 54.38]
    bathymetry:
      source: emodnet
      bbox: [10.05, 54.28, 10.25, 54.38]

  vessels:
    - id: ego
      model: tanker_120m
      pose_source:
        type: zenoh
        topic: keelson/ego/nav/pose
      sensors:
        - id: bow_camera
          type: camera
          mount: { x: 110, y: 0, z: 28, yaw_deg: 0 }
          fov_deg: 90
          resolution: [1920, 1080]
          rate_hz: 10
        - id: main_lidar
          type: lidar
          mount: { x: 100, y: 0, z: 30 }
          channels: 64
          range_m: 200
          rate_hz: 10
        - id: marine_radar
          type: radar_marine
          mount: { x: 80, y: 0, z: 35 }
          range_m: 12000
          rotation_rate_hz: 0.4
          beam_width_deg: 1.2

    - id: traffic_01
      model: ferry_60m
      pose_source:
        type: scripted
        waypoints:
          - { time: 0, lat: 54.330, lon: 10.150 }
          - { time: 600, lat: 54.318, lon: 10.135 }

  buoys:
    - { id: kiel_n, type: cardinal_north, lat: 54.325, lon: 10.142 }

  modes:
    rendering: replace # replace | inject | inject_all
    clock: external_fmi # external_fmi | wall | stepped
    determinism: strict
```

A few properties of this design that matter:

- `pose_source` per entity is the seam between the three V&V modes. Same DSL, different sources.
- `anchor` plus per-entity lat/lon keeps geo-registration first-class without forcing it.
- `mount` blocks are local-frame transforms in the entity's body frame, so sensor rigs are decoupled from where the vessel is.
- `modes` at the bottom carries the V&V mode, clock source, and determinism flags.

### Authoring workflow

The DSL is designed for both human authoring and LLM authoring. A `bino-scenario` skill documents:

- The asset library (named ship models, buoy types, port templates)
- Common scenario templates (port approach, archipelago transit, lock entry, congested anchorage)
- Mode/clock/determinism flags and when each applies
- Geo-anchor conventions (where to find lat/lon for a real port, how to verify a bbox)
  A prompt like _"WAPS vessel transiting the Kiel Canal eastbound at 8 knots, two ferries crossing, buoy field at the Holtenau lock approach, dusk, sea state 3"_ compiles to a working YAML in one pass.

The scenario library lives in git, which makes V&V test suites text-diffable and reviewable like any other code artifact.

### Geo-registration and terrain

A WGS84 anchor pose defines the local ENU frame for the scene. Entity positions can be given in either local ENU coordinates or lat/lon (the compiler converts). Coastline geometry comes from OpenStreetMap, bathymetry from EMODnet (or equivalent regional source), both pulled at compile time and cached. Tile-based streaming is a v2 concern; v0 loads a fixed bbox.

For mixed-reality (inject) mode, geo-registration is what allows a synthetic vessel placed at a specific lat/lon to appear in the right position in a real sensor's field of view.

---

## Roadmap

The order is chosen so each step produces a working system and each derisks the next.

**v0.1 — End-to-end skeleton.** DSL parser + minimal scene compiler (anchor, one vessel, one camera, one lidar, no terrain). TypeScript-only sensor kernels. Pose-injection bridge from Zenoh. Headless Node service in Docker. Browser viewer with the same scene rendered live. By the end of this step, a single vessel moves under FMI control and is visible from both renderer instances.

**v0.2 — Sensor publishing.** Camera frames and lidar point clouds published as Keelson topics with appropriate codecs. Topic structure matches real sensor topics so consumers can swap synthetic for real without changes. Browser viewer renders sensor footprints as overlays.

**v0.3 — Marine radar v0.** Geometry-of-returns kernel (ASVSim-style approximation), Rust from the start, exposed as both a WASM module and a native crate. Radar PPI overlay in the viewer.

**v0.4 — Terrain and sea surface.** OSM coastline loader, EMODnet bathymetry, Gerstner wave shader for the sea. Performance pass on the lidar kernel — likely the moment to port from TypeScript to Rust/WASM.

**v0.5 — Scenario library and authoring skill.** Asset library, scenario templates, `bino-scenario` Claude Code skill, schema-validated CI for the scenario repo.

**v0.6 — Inject and inject-all modes.** Object-only rendering, external clock sources, determinism guarantees. Time-sync with real sensor scan phases.

**v1.0 — Marine radar v1.** Sea-clutter model, antenna pattern convolution, weather attenuation. Documented well enough to be useful as a standalone artifact for other simulators.

---

## Non-goals

- **Photorealism.** Camera output is "good enough for a perception network to consume," not training-grade. If photorealism becomes a requirement later, the rendering driver is replaceable behind the scene-graph layer.
- **Ship dynamics or hydrodynamics.** These live in MARMOR/GRANIT/ANKARE and arrive over FMI3 or Zenoh. Bino does not compute them, ever.
- **Full-mission bridge simulation.** Bino is not a replacement for Wärtsilä Voyage or Kongsberg K-Sim. It is a perception sensor emulator with a viewer; bridge instrumentation, helm controls, and crew workflows are out of scope.
- **A second renderer in the browser.** The viewer renders the same scene the sim renders, using the same code. If a future feature needs a different view (radar PPI, sensor-fusion debug overlay, AIS-on-chart), that's a domain-specific dashboard, deliberately not a renderer of the world.
- **ROS integration.** Zenoh/Keelson is the data plane. ROS bridges are a downstream user concern, not part of Bino itself.

---

## Open questions

- **Asset pipeline.** Where do ship models come from? Hand-authored glTF, procedural from principal dimensions, or a small library of representative hulls? v0 can ship with two or three hand-authored models; the longer answer matters once the asset library grows.
- **Sea-clutter fidelity.** How much radar physics is enough? The geometry-of-returns v0 will not satisfy serious autonomy V&V for collision avoidance in clutter. The v1 sea-clutter model is a research project in its own right and may deserve a separate paper.
- **Determinism guarantees.** Bit-for-bit determinism across runs is achievable but constrains the renderer config. How strict does the V&V use case actually need? Worth pinning down before v0.6.
- **HIL binary protocols.** If real radar processors need to be fed in their native binary format, what's the bridge architecture? Probably a separate concern from Bino proper, but the topic shapes need to support it.
- **Determinism vs. wall-time rendering trade-offs in the browser viewer.** When watching a determinism-strict run live, the viewer needs to honor the sim's clock, not its own. Mechanically simple, worth specifying.

---

## Why this shape, in one paragraph

Bino's job is narrow — render a world and emit synthetic sensor data — and the requirements set (FOSS, single workstation, programmatic authoring, browser-viewable, three V&V modes) lines up unusually well with a TypeScript-and-WebGL stack rather than a traditional robotics simulator. The big design moves are: keep the scene definition and sensor library as the durable artifact and let the renderer be incidental; run the same code in Node and the browser so the viewer can never drift from the sim; treat Rust/WASM as a performance escape hatch rather than a foundation; and make pose injection the only input so the three V&V modes fall out of one architecture instead of three.
