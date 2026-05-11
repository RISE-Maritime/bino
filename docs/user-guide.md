# User Guide

Complete operational reference for the Bino maritime perception sensor
emulator.

## Installation

### Node.js and pnpm

Bino requires Node.js 22 (pinned to 22.22.2 in `.nvmrc`). Install via
nvm:

```bash
nvm install && nvm use
```

pnpm 9.15.0 via corepack:

```bash
corepack enable && corepack prepare pnpm@9.15.0 --activate
```

### Rust toolchain

Required for building the WASM sensor kernels (radar and lidar):

```bash
rustup target add wasm32-unknown-unknown
cargo install wasm-bindgen-cli@0.2.120
```

The `wasm-bindgen-cli` version must exactly match the `wasm-bindgen`
crate version (0.2.120). A mismatch produces a build-time error.

### Full build

```bash
pnpm install
pnpm build          # kernels:build + pnpm -r build
pnpm test           # verify
pnpm typecheck      # type-check all packages
```

`pnpm build` first compiles the Rust workspace (`kernels/`) to
`wasm32-unknown-unknown`, then runs `wasm-bindgen` to produce JS/WASM
bundles in `packages/core/wasm/`, and finally builds the three
TypeScript packages.

---

## Headless service (`@bino/node`)

### CLI usage

```
bino-node <scenario.yaml> [--zenoh ws://host:port]
```

Without `--zenoh`, the service uses `MemoryPoseStream` (scripted poses,
no external input). Useful for testing the rendering pipeline in
isolation.

With `--zenoh`, the service subscribes to `frame_transform` topics for
vessel poses and publishes sensor outputs on Keelson topics.

### Docker

Build (from the repository root):

```bash
docker build -t bino-node -f packages/node/docker/Dockerfile .
```

Run with software rendering (Xvfb + ANGLE):

```bash
docker run --rm -v "$PWD/scenarios:/scenarios" bino-node /scenarios/v04_kiel.yaml
```

Run with GPU acceleration (requires nvidia-container-toolkit):

```bash
docker run --rm --gpus all \
  -e NVIDIA_DRIVER_CAPABILITIES=graphics,compute,utility,display \
  -v "$PWD/scenarios:/scenarios" bino-node /scenarios/v04_kiel.yaml
```

The Docker image is based on `node:22.22.2-bookworm-slim` and includes
Xvfb for headless X11. GPU acceleration is optional -- the bundled
ANGLE software rasterizer handles typical workloads.

---

## Browser viewer (`@bino/viewer`)

The viewer is a SvelteKit application sharing `@bino/core` with the
headless service.

### Development server

```bash
pnpm -C packages/viewer dev     # http://localhost:5173
```

### URL parameters

| Parameter | Example                | Effect                                                   |
| --------- | ---------------------- | -------------------------------------------------------- |
| `zenoh`   | `ws://127.0.0.1:10000` | Connect to a Zenoh router for live poses and sensor data |

### Controls

- Orbit: left mouse drag
- Pan: right mouse drag
- Zoom: scroll wheel

### Preview panels

The bottom-right corner shows per-sensor previews:

- **Camera** -- rendered frame at the configured resolution
- **Lidar** -- top-down point cloud projection
- **Radar** -- PPI sweep with intensity mapping

### Standalone mode

Without a `?zenoh` parameter, the viewer runs with scripted poses
(circular trajectory). Useful for demos and development without
infrastructure.

---

## Scenario authoring

Scenarios are YAML files validated by Zod schemas defined in
`packages/core/src/dsl.ts`. See the [DSL reference](dsl-reference.md)
for complete field documentation.

### Validation

```bash
pnpm validate:scenarios
```

Runs Zod validation against all `.yaml` files in `scenarios/` and
`scenarios/templates/`.

### Example scenarios

| File              | Purpose                                                      |
| ----------------- | ------------------------------------------------------------ |
| `v01_smoke.yaml`  | Minimal smoke test                                           |
| `v04_kiel.yaml`   | Full environment: sea state, terrain, camera + lidar + radar |
| `v05_kiel.yaml`   | Extended Kiel scenario                                       |
| `v06_inject.yaml` | Inject mode with strict determinism, no terrain              |
| `v06_strict.yaml` | Replace mode with strict determinism and terrain             |

### Templates

Four templates in `scenarios/templates/` provide starting points:

- `port_approach.yaml` -- Gothenburg outer port approach
- `archipelago_transit.yaml` -- Stockholm archipelago
- `congested_anchorage.yaml` -- Singaporean anchorage
- `lock_entry.yaml` -- Canal lock approach

---

## V&V modes

### Rendering modes

**Replace** -- fully synthetic world. Ego vessel and traffic poses come
from external sources. All terrain, sea, and entities are rendered.
Ground truth is available. This is the default mode.

**Inject** -- synthetic objects only (ghost vessels, virtual buoys).
Background terrain and sea surface are suppressed. Designed for
overlaying synthetic returns onto real sensor feeds. Requires
geo-registration and time synchronization with the real system.

**Inject-all** -- like replace but with an external clock source and
strict determinism. For SIL/HIL/BIL setups where reproducibility is
required.

### Clock sources

| Value          | Behaviour                                                                   |
| -------------- | --------------------------------------------------------------------------- |
| `wall`         | Real-time wall clock. Default for interactive use.                          |
| `stepped`      | Frame-index-driven clock. Deterministic; required for `strict` determinism. |
| `external_fmi` | FMI3 master clock. Stub -- not yet implemented.                             |

### Determinism levels

| Value     | Behaviour                                                                                                                |
| --------- | ------------------------------------------------------------------------------------------------------------------------ |
| `strict`  | Bit-for-bit reproducibility across runs. Requires `stepped` clock. Renderer config is locked (no MSAA, fixed precision). |
| `relaxed` | No reproducibility guarantees. Suitable for live demos and development.                                                  |

To set up a fully deterministic run, combine `clock: stepped` with
`determinism: strict`. See `scenarios/v06_strict.yaml` for a working
example.

---

## Keelson integration

Bino publishes sensor data on
[Keelson](https://github.com/RISE-Maritime/keelson) topics, allowing
downstream consumers to swap synthetic for real sensor data without code
changes.

### Topic structure

```
{base}/@v0/{vessel_id}/pubsub/{subject}/{sensor_id}
```

### Subjects

| Sensor       | Subject           | Schema                  |
| ------------ | ----------------- | ----------------------- |
| Camera       | `image_raw`       | foxglove.RawImage       |
| Lidar        | `point_cloud`     | foxglove.PointCloud     |
| Radar        | `radar_sweep`     | keelson.RadarSweep      |
| Pose (input) | `frame_transform` | foxglove.FrameTransform |

### Zenoh router

The test router at `tests/zenoh-router/` ships
`zenoh-bridge-remote-api` 1.9.0:

```bash
docker compose -f tests/zenoh-router/docker-compose.yml up -d
```

Endpoints (all bound to `127.0.0.1`):

| Port  | Protocol                                 |
| ----- | ---------------------------------------- |
| 10000 | WebSocket (remote-api, used by zenoh-ts) |
| 7447  | Zenoh peer protocol (TCP)                |
| 8000  | REST plugin (useful for debugging)       |

Verify the router is running:

```bash
curl http://127.0.0.1:8000/@/local
```

### Version pinning

The bridge version (1.9.0) must match `@eclipse-zenoh/zenoh-ts` in
the project dependencies. Rust has no stable ABI, so version skew
between the bridge and the JS client causes silent protocol
incompatibility. Bump both together.

---

## Troubleshooting

### wasm-bindgen version mismatch

```
error: expected wasm-bindgen version 0.2.120, found X.Y.Z
```

Install the matching CLI version:

```bash
cargo install wasm-bindgen-cli@0.2.120
```

### GL context errors in Node

```
Error: Could not create GL context
```

The `@kmamal/gl` package requires X11 libraries. The Docker image
includes them. On bare Linux, install:

```bash
apt-get install libx11-6 libxext6 libxcb1 libxau6 libxdmcp6
```

For headless operation, Xvfb provides a virtual display.

### Terrain fetch failures

```
Error: Overpass API request failed
```

OSM coastline and GMRT bathymetry data are fetched at scene compile
time. Check network connectivity. Cached data is stored in
`~/.cache/bino/`. The first run for a given bounding box takes
approximately 4 seconds; cached runs take around 5 ms.

### Zenoh connection refused

Ensure the router is running and the version matches (1.9.0). Check
with:

```bash
docker compose -f tests/zenoh-router/docker-compose.yml ps
curl http://127.0.0.1:8000/@/local
```

If the curl succeeds but the application fails to connect, verify the
WebSocket URL format: `ws://127.0.0.1:10000`.

### Scenario validation errors

```bash
pnpm validate:scenarios
```

If validation fails, check the error output against the
[DSL reference](dsl-reference.md). Common issues:

- Missing required fields (`name`, `anchor`, `modes`)
- Invalid enum values (e.g., `rendering: inject_all` instead of
  `inject-all`)
- Sensor-specific fields on the wrong sensor type

---

## Project structure

```
bino/
  kernels/              Rust workspace (radar + lidar WASM kernels)
  packages/
    core/               @bino/core -- scene graph, DSL, sensor pipeline
    node/               @bino/node -- headless service + CLI
    viewer/             @bino/viewer -- SvelteKit browser app
  scenarios/            Scenario YAML files
    templates/          Reusable scenario templates
  tests/
    zenoh-router/       Docker Compose for the Zenoh test router
  docs/
    sensor-models/      Physics documentation per sensor
    adr/                Architecture decision records
    dsl-reference.md    Complete YAML field reference
```

---

## Further reading

- [Quick-start tutorial](tutorial.md) -- get running in 10 minutes
- [DSL reference](dsl-reference.md) -- complete YAML field reference
- [Sensor models](sensor-models/) -- physics documentation for camera,
  lidar, radar, and environment
- [Architecture decisions](adr/) -- design rationale (ADRs)
