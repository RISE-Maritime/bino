# Quick-start tutorial

Get from clone to seeing sensor output in under 10 minutes.

## Prerequisites

- **Node.js 22** (pinned in `.nvmrc` to 22.22.2). Install via [nvm](https://github.com/nvm-sh/nvm):
  ```
  nvm install && nvm use
  ```
- **pnpm 9.15.0** via corepack:
  ```
  corepack enable && corepack prepare pnpm@9.15.0 --activate
  ```
- **Rust toolchain** with the wasm32 target:
  ```
  rustup target add wasm32-unknown-unknown
  ```
- **wasm-bindgen-cli** (must match the crate version exactly):
  ```
  cargo install wasm-bindgen-cli@0.2.120
  ```
- **Docker** (optional, for the headless service container and Zenoh router)

## Build

```bash
git clone <repo> && cd bino
pnpm install
pnpm build
```

`pnpm build` compiles the Rust radar and lidar kernels to WASM, then
builds all three TypeScript packages (`@bino/core`, `@bino/node`,
`@bino/viewer`).

## Run the browser viewer

```bash
pnpm -C packages/viewer dev
```

Open <http://localhost:5173>. The viewer starts in standalone mode with a
scripted circular trajectory -- no external infrastructure needed. You
will see a 3D maritime scene with animated sea surface, vessels, and
preview panels for each sensor (camera, lidar, radar PPI) in the
bottom-right corner.

## Run the headless service

In a separate terminal:

```bash
pnpm -C packages/node build
node packages/node/dist/cli.js scenarios/v04_kiel.yaml
```

This runs the same rendering pipeline headlessly, producing sensor data
for each configured sensor at its configured rate.

## Connect via Zenoh

For full-duplex pose injection and sensor publishing:

```bash
# Start the Zenoh router
docker compose -f tests/zenoh-router/docker-compose.yml up -d

# Run headless service with Zenoh
node packages/node/dist/cli.js scenarios/v04_kiel.yaml --zenoh ws://127.0.0.1:10000

# Open viewer with Zenoh connection
# http://localhost:5173/?zenoh=ws://127.0.0.1:10000
```

## Understand a scenario file

Open `scenarios/v04_kiel.yaml`. The key sections are:

- **anchor** -- WGS84 origin of the local ENU frame (Kiel harbour).
- **environment** -- sea state (Pierson-Moskowitz spectrum), wind, time
  of day, visibility, rain rate.
- **terrain** -- bounding box for OSM coastline and GMRT bathymetry
  fetch. First run takes a few seconds; subsequent runs use the cache.
- **vessels** -- ego vessel with three sensors (camera, lidar, radar) and
  a traffic vessel. Each vessel references a Zenoh topic for pose input.
- **modes** -- rendering mode (`replace`), clock source (`wall`),
  determinism level (`relaxed`).

See the [DSL reference](dsl-reference.md) for complete field
documentation.

## Write your own scenario

1. Copy an existing scenario:
   ```bash
   cp scenarios/v04_kiel.yaml scenarios/my_scenario.yaml
   ```
2. Change the anchor to a different port (latitude/longitude).
3. Adjust sea state, add or remove vessels.
4. Validate:
   ```bash
   pnpm validate:scenarios
   ```

Four templates in `scenarios/templates/` provide starting points for
common situations: port approach, archipelago transit, congested
anchorage, and lock entry.

## Run tests

```bash
pnpm test                    # all packages
pnpm -C packages/core test   # core only
cd kernels && cargo test      # Rust kernels
pnpm typecheck               # type-check all packages
```

## Next steps

- [DSL reference](dsl-reference.md) -- complete YAML field reference
- [Sensor models](sensor-models/) -- physics documentation for each sensor
- [Architecture decisions](adr/) -- design rationale (ADRs)
