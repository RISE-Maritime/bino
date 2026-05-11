# @bino/core

Pure TypeScript library for Bino — the maritime perception sensor
emulator. Contains the scenario DSL, scene compiler, sensor kernel
interfaces, and geo-registration helpers. No I/O, no rendering driver
instantiation.

Both `@bino/node` (headless service) and `@bino/viewer` (browser app)
depend on this package. Sensor kernels backed by Rust/WASM also live
here as thin TypeScript wrappers around the built `.wasm` modules.

## Exported modules

| Module       | Purpose                                     |
| ------------ | ------------------------------------------- |
| `dsl`        | Zod schemas for scenario YAML               |
| `compile`    | Scenario validation and compilation         |
| `scene`      | Three.js scene graph construction           |
| `camera`     | Camera kernel (WebGL render-to-texture)     |
| `lidar`      | Lidar GL depth-pass kernel (reference impl) |
| `lidar-wasm` | Lidar WASM kernel wrapper                   |
| `radar`      | Radar WASM kernel wrapper                   |
| `clock`      | Clock abstractions (wall, stepped)          |
| `env`        | EnvironmentSnapshot per-tick payload        |
| `sensor`     | SensorKernel interface                      |
| `geo`        | WGS84/ENU coordinate transforms             |
| `terrain`    | Coastline + bathymetry loaders              |
| `sea`        | Gerstner wave ShaderMaterial                |
| `sky`        | Preetham sky model + solar position         |
| `assets`     | Parametric hull generation + asset registry |
| `pose`       | PoseStream interface                        |

## Usage

```typescript
import { compileScenario, buildScene, createCameraKernel } from "@bino/core";
```

## Documentation

- [Architecture](../../docs/architecture.md)
- [Sensor models](../../docs/sensor-models/)
- [DSL reference](../../docs/dsl-reference.md)
