# Architecture

Developer architecture documentation for Bino, a maritime perception sensor
emulator. For the full design rationale, see [the design vision](internal/design-vision.md).

## Design principles

- **The renderer is incidental; the scene definition and sensor library are the
  product.** Engines come and go. A clear DSL and well-specified sensor models
  outlast any particular rendering backend.
- **One codebase, two execution environments.** The Node headless service and
  the browser viewer run the same TypeScript modules. There is no parallel
  rendering pipeline and no risk of drift between what the sim computes and what
  the viewer shows.
- **Pose injection is the only input.** Bino never computes dynamics. Entity
  poses arrive over Zenoh from external sources (FMI co-simulation, real-world
  AIS/GNSS, scripted waypoints). The three V&V modes fall out of one
  architecture instead of three separate code paths.
- **Performance escape hatches, not performance foundations.** TypeScript is the
  foundation because it must run in Node and browsers. Rust/WASM appears behind
  well-defined kernel interfaces only where it earns its keep.
- **Geo-registration is first-class.** Every scene has a WGS84 anchor. Local
  sandbox scenarios can ignore it, but mixed-reality inject mode requires real
  coordinates.

## Package structure

Three npm packages plus a Rust kernel workspace.

### @bino/core (`packages/core/`)

Pure TypeScript library. No I/O, no renderer instantiation. Exported modules:

- `dsl.ts` -- Zod schemas for scenario YAML
- `compile.ts` -- scenario validation and compilation
- `scene.ts` -- Three.js scene graph construction (`buildScene`)
- `camera.ts` -- camera kernel (WebGL render-to-texture)
- `lidar-wasm.ts` -- lidar WASM BVH ray-cast kernel
- `radar.ts` -- radar WASM kernel wrapper
- `clock.ts` -- clock abstractions (wall, stepped, barrier, external_fmi stub)
- `env.ts` -- EnvironmentSnapshot per-tick payload
- `sensor.ts` -- SensorKernel interface
- `geo.ts` -- WGS84/ENU coordinate transforms
- `terrain.ts` -- coastline + bathymetry loaders
- `landmask.ts` -- filled land polygon generation
- `buildings.ts` -- OSM building footprint extrusion
- `seamarks.ts` -- OSM seamark placement
- `overpass.ts` -- Overpass API client
- `sea.ts` -- Gerstner wave ShaderMaterial
- `sky.ts` -- Preetham sky model + solar position
- `assets.ts` -- parametric hull generation + asset registry
- `pose.ts` -- PoseStream interface

### @bino/node (`packages/node/`)

Headless Node service. Key files:

- `cli.ts` -- CLI entry point (`bino-node <scenario.yaml> [--zenoh ...]`)
- `service.ts` -- `createNodeService()` orchestrating renderer + kernels + publishers
- `runner.ts` -- `BinoRunner` with per-sensor scheduling based on `rate_hz` and `phase_offset_s`
- `tick-source.ts` -- what advances the deterministic loop: free-running, or a tick barrier it acknowledges
- `publisher.ts` -- Keelson sensor data publishers (camera, lidar, radar)
- `headless-gl.ts` -- `@kmamal/gl` WebGL context setup

### @bino/viewer (`packages/viewer/`)

SvelteKit browser app. Same @bino/core, same kernels, browser WebGL.

- `src/lib/viewer.ts` -- `mountViewer()`, canvas rendering loop, sensor preview rendering
- `src/lib/zenoh.ts` -- Zenoh-WS subscriber
- `src/lib/scripted.ts` -- fallback scripted pose generator
- `src/routes/+page.svelte` -- main viewer page with preview panels

### kernels/ (Rust workspace)

Two crates, each compiling to both native (`cargo build`) and WASM (`--target wasm32-unknown-unknown`):

- `kernels/radar/` -- marine radar v1 (K-distribution clutter, antenna pattern, weather attenuation)
- `kernels/lidar/` -- BVH ray-cast lidar (two-tree design)

WASM artifacts land in `packages/core/wasm/` via `wasm-bindgen --target bundler`.

## Data flow

Pipeline from scenario YAML to sensor output:

```
scenario.yaml
    |  parse + validate (Zod)
    v
compileScenario()
    |  terrain fetch (if configured)
    v
buildScene()           -> THREE.Scene + entity map
    |
    v
BinoRunner             per-sensor scheduling (rate_hz, phase_offset_s)
    |
    |---> CameraKernel.step()   -> CameraFrame (RGBA pixels)
    |---> LidarKernel.step()    -> LidarFrame (XYZ point cloud)
    +---> RadarKernel.step()    -> RadarSweep (intensity spokes)
            |
            v
        Keelson encode + Zenoh publish
```

## SensorKernel pattern

The conceptual interface (not an enforced TypeScript interface due to
heterogeneous configs/outputs):

```typescript
interface SensorKernel<Config, Output> {
  configure(config: Config): void;
  step(scene: SceneSnapshot, pose: Pose, time: number): Output;
}
```

Each sensor type implements this differently. Camera uses a WebGL render target.
Lidar and radar use WASM kernels with `serde-wasm-bindgen` marshalling. The
runner calls each kernel at its configured rate.

See individual sensor model docs: [camera](sensor-models/camera.md),
[lidar](sensor-models/lidar.md), [radar](sensor-models/radar.md),
[environment](sensor-models/environment.md).

## Rust/WASM boundary

- **Data marshalling:** `serde-wasm-bindgen` converts JS objects to Rust structs.
- **Strategy:** copy-each-frame (not SharedArrayBuffer -- avoids COOP/COEP complexity).
- **Payload sizes:** radar ~150 KB/sweep, lidar scene snapshot ~3 KB/frame.
- **Artifacts:** `packages/core/wasm/{radar,lidar}_bg.wasm` (~116 KB + ~127 KB).
- **Build:** `pnpm kernels:build` runs `cargo build --target wasm32-unknown-unknown` + `wasm-bindgen`.
- **Version pinning:** `wasm-bindgen-cli` must exactly match the crate dependency (0.2.120).

## Clock and determinism

- `WallClock`: real-time, non-deterministic.
- `SteppedClock`: frame-index-driven, deterministic. Time advances by `1/rate_hz` per tick.
- **Strict determinism:** SteppedClock + frame-index-seeded PRNG in the radar
  kernel (`seed = sweep_index XOR 0xB190_CADA_5EED_0001`) + renderer config
  locking (no MSAA, fixed precision).
- **Phase offsets:** `phase_offset_s` per sensor shifts the fire schedule,
  enabling interleaved sensor timing.

## Terrain pipeline

1. `loadCoastline(bbox)` -- Overpass API for `natural=coastline`, chain stitching, ENU transform.
2. `loadBathymetry(bbox)` -- GMRT GridServer GeoTIFF, parsed via `geotiff.js`, vertex grid.
3. `generateLandmask(coastline, bbox)` -- close chains, earcut triangulation, extrusion.
4. `loadBuildings(bbox, anchor)` -- Overpass building footprints, `building:levels * 3m` extrusion.
5. `loadSeamarks(bbox, anchor)` -- Overpass seamark features, placeholder geometry.

All data cached per-bbox in `~/.cache/bino/{osm,gmrt}/`.

## Build system

- **Monorepo:** pnpm workspaces (`packages/*`)
- **Rust:** Cargo workspace (`kernels/`)
- **Key scripts:**
  - `pnpm build` -- full build (kernels + all packages)
  - `pnpm test` -- all tests
  - `pnpm typecheck` -- type-check all packages
  - `pnpm kernels:build` -- WASM build only
  - `pnpm kernels:test` -- Rust tests only
  - `pnpm validate:scenarios` -- validate all YAML scenarios
- **Node:** 22 (pinned in `.nvmrc`)
- **pnpm:** 9.15.0 (pinned in `package.json`)

## Testing

- **Unit/integration:** Vitest (all TS packages). Config per package in
  `vitest.config.ts` with `vite-plugin-wasm` + `vite-plugin-top-level-await`.
- **Rust native:** `cargo test` in `kernels/`.
- **Browser E2E:** Playwright for viewer (`packages/viewer/e2e/`).
- **Zenoh integration:** gated on `BINO_ZENOH_URL` env var. Requires the test
  router from `tests/zenoh-router/`.
- **Scenario validation:** `pnpm validate:scenarios` runs Zod validation on all
  YAML files.

## Internal documentation

Development paper trail in `docs/internal/`:

- [Design vision](internal/design-vision.md) -- the "what and why"
- [Implementation plan](internal/plan.md) -- v0.1 through v1.0 sequencing and risk notes
- [v0.1 retrospective](internal/v01-retrospective.md)
- [v0.2 retrospective](internal/v02-retrospective.md)
- [v0.3 retrospective](internal/v03-retrospective.md)

Architecture decisions:

- [ADR-001: Lidar kernel architecture](adr/001-lidar-kernel.md) -- WASM ray-cast vs GL depth-pass
