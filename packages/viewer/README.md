# @bino/viewer

SvelteKit browser application for Bino — renders the same scene as
`@bino/node` using the same `@bino/core` modules. Provides a 3D
viewport with per-sensor preview panels (camera frame, lidar top-down
projection, radar PPI sweep).

## Development

```bash
pnpm dev     # http://localhost:5173
```

## URL parameters

- `?zenoh=ws://host:port` — connect to a Zenoh router for live pose
  injection and sensor data

Without `?zenoh`, the viewer runs in standalone mode with scripted
vessel poses.

## Controls

- Orbit: left mouse drag
- Pan: right mouse drag
- Zoom: scroll wheel

## Documentation

- [User guide](../../docs/user-guide.md)
- [Tutorial](../../docs/tutorial.md)
- [Architecture](../../docs/architecture.md)
