# Bino

*A maritime perception sensor emulator for verification & validation*

---

![Bino viewer — Kiel approach scenario with camera, lidar, and radar preview panels](docs/images/viewer-kiel.png)

Bino is a 3D world renderer and synthetic perception sensor emulator
for maritime applications. It produces real-time **camera**, **lidar**,
and **marine radar** data from injected pose streams — driving a
simulated world from external sources (FMI co-simulation, real-world
feeds, scripted scenarios) rather than computing dynamics itself.

## Key features

- **Three sensor types** — camera (WebGL render-to-texture), lidar
  (BVH ray-cast in Rust/WASM), marine radar (K-distribution sea
  clutter, Gaussian antenna pattern, ITU-R P.838 rain attenuation)
- **Three V&V modes** — replace (fully synthetic), inject (synthetic
  objects in real sensor stream), inject-all (HIL/SIL with external
  clock)
- **One codebase, two environments** — the same TypeScript modules run
  in a headless Node service (for production V&V) and a browser viewer
  (for demos and debugging)
- **YAML scenario DSL** — declarative scene definitions validated by
  Zod schemas at compile time
- **Keelson/Zenoh integration** — sensor output published on topics
  that mirror real sensor interfaces; consumers swap synthetic for real
  without code changes
- **Deterministic mode** — frame-index-driven clock and seeded PRNG
  for bit-for-bit reproducible V&V runs
- **Real-world terrain** — OSM coastline, GMRT bathymetry, building
  footprints, seamarks, Gerstner wave synthesis
- **Performance escape hatches** — Rust/WASM kernels for lidar and
  radar; TypeScript everywhere else

## Quick start

```bash
pnpm install && pnpm build

# Browser viewer (standalone, no external infrastructure)
pnpm -C packages/viewer dev          # http://localhost:5173

# Headless service
node packages/node/dist/cli.js scenarios/v04_kiel.yaml
```

See the [tutorial](docs/tutorial.md) for a full walkthrough including
Zenoh integration and scenario authoring.

## Architecture

```mermaid
graph LR
    subgraph External
        FMI[FMI co-sim]
        AIS[Real AIS/GNSS]
        HIL[HIL test rig]
    end

    subgraph Bino
        DSL["Scenario DSL<br/>(YAML + Zod)"] --> Compiler["Scene compiler"]
        Compiler --> Core["@bino/core<br/>Three.js scene<br/>Sensor kernels<br/>Clock control"]
        FMI & AIS & HIL -->|"Pose stream<br/>(Zenoh)"| Core
        Core --> Node["@bino/node<br/>Headless service"]
        Core --> Viewer["@bino/viewer<br/>Browser app"]
        Node -->|"Keelson topics"| Output["Synthetic sensor<br/>streams"]
    end
```

Three packages share a single rendering core:

| Package | Role |
|---------|------|
| **@bino/core** | Pure TypeScript library — DSL, scene compiler, sensor kernels, geo helpers |
| **@bino/node** | Headless Node service in Docker — subscribes poses, publishes sensor data |
| **@bino/viewer** | SvelteKit browser app — same scene, same kernels, live preview |

Rust/WASM sensor kernels live in `kernels/` (radar + lidar), compiled
to both native crates and WASM modules.

## Sensor models

| Sensor | Approach | Key references |
|--------|----------|---------------|
| **Camera** | WebGL render-to-texture | -- |
| **Lidar** | BVH ray-cast (Rust/WASM) | Moller-Trumbore, median-split AABB tree |
| **Marine radar** | Geometry-of-returns + physics layers | Ward 1981 (K-distribution), Nathanson (sigma-0), ITU-R P.838-3 (rain) |

Detailed theory and equations in [docs/sensor-models/](docs/sensor-models/).

## Documentation

| Document | Description |
|----------|-------------|
| [Tutorial](docs/tutorial.md) | Quick-start walkthrough — clone to sensor output in 10 minutes |
| [User guide](docs/user-guide.md) | Full operational reference — CLI, Docker, Zenoh, modes |
| [DSL reference](docs/dsl-reference.md) | Complete scenario YAML field reference |
| [Architecture](docs/architecture.md) | Package structure, data flow, build system, testing |
| [Radar model](docs/sensor-models/radar.md) | K-distribution clutter, antenna pattern, rain attenuation |
| [Lidar model](docs/sensor-models/lidar.md) | BVH ray-cast, two-tree design, temporal interpolation |
| [Camera model](docs/sensor-models/camera.md) | WebGL pipeline, exposure model |
| [Environment](docs/sensor-models/environment.md) | Sea surface, terrain sources, sky, geo-registration |

## Project structure

```
bino/
├── packages/
│   ├── core/          @bino/core — DSL, scene, kernels (pure TS)
│   ├── node/          @bino/node — headless service, Docker
│   └── viewer/        @bino/viewer — SvelteKit browser app
├── kernels/
│   ├── radar/         Rust marine radar kernel
│   └── lidar/         Rust BVH ray-cast kernel
├── scenarios/         YAML scenario files + templates
├── docs/              Documentation suite
└── tests/             Integration test infrastructure
```
