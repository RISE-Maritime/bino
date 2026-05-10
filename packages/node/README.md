# @bino/node

Headless Node.js service for Bino — drives `@bino/core` sensor kernels
without a browser, publishes synthetic sensor data on Keelson topics,
and subscribes to Zenoh pose streams.

## CLI

```bash
bino-node <scenario.yaml> [--zenoh ws://host:port]
```

Without `--zenoh`, the service runs with no external pose input (useful
for testing the rendering pipeline). With `--zenoh`, it subscribes to
`frame_transform` topics and publishes camera, lidar, and radar output.

## Docker

```bash
# Build (context = repo root)
docker build -t bino-node -f packages/node/docker/Dockerfile .

# Run with software rendering
docker run --rm -v "$PWD/scenarios:/scenarios" bino-node /scenarios/v04_kiel.yaml

# Run with GPU
docker run --rm --gpus all \
  -e NVIDIA_DRIVER_CAPABILITIES=graphics,compute,utility,display \
  -v "$PWD/scenarios:/scenarios" bino-node /scenarios/v04_kiel.yaml
```

The image includes Xvfb for headless X11. GPU acceleration is optional.

## Documentation

- [User guide](../../docs/user-guide.md)
- [Tutorial](../../docs/tutorial.md)
- [Architecture](../../docs/architecture.md)
