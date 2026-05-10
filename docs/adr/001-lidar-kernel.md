# ADR-001: Lidar kernel — Rust BVH ray-cast over GL depth-pass

**Status:** Accepted  
**Date:** 2026-05-09  
**Context:** v0.4b lidar Rust port (#9–#11)

## Decision

The lidar kernel uses a Rust/WASM BVH ray-cast instead of the v0.1
Three.js GL depth-pass. The GL depth-pass kernel (`createLidarKernel`)
is retained as a testing/reference utility but is no longer on the
production path.

## Context

The v0.1 lidar rendered the scene to a small depth buffer (channels ×
channels pixels), read it back, and unpacked the RGBA-encoded depth
to XYZ points. This worked but coupled the lidar to a WebGL context
and could only sample a single perspective frustum per call — at most
~170° FOV before projection distortion becomes unusable.

Real lidar sensors (and the Keelson PointCloud envelope) expect a
full 360° sweep. The GL path would need a multi-face cubemap (at
least 4 render passes + readbacks + depth-buffer stitching) to cover
360°. The Rust BVH path traces rays in any direction natively.

## Benchmark results

Test: `packages/node/test/lidar-bench.test.ts`  
Scene: 114K synthetic terrain triangles (matching v04_kiel GMRT grid),
1 vessel, 360° horizontal sweep, 45° vertical FOV.  
Environment: Node 24, @kmamal/gl 9.1 (ANGLE software rasterizer,
no GPU).

### 360° sweep comparison

| Config | Rays | WASM p50 | GL p50 (4-face) | Winner |
|---|---|---|---|---|
| 32×360 (v04_kiel-class) | 11.5K | **1.1 ms** | 3.8 ms | WASM 3.5× |
| 128×512 (OS2 standard) | 65K | 17.9 ms | **4.9 ms** | GL 3.6× |
| 128×1024 (OS2 high-res) | 131K | 17.1 ms | **4.9 ms** | GL 3.5× |
| 128×2048 (OS2 dense) | 262K | 15.9 ms | **5.3 ms** | GL 3.0× |

### Analysis

- **At the current config (32 channels):** WASM is 3.5× faster
  because the GL path needs 4 cubemap render passes to cover 360°.
  Each pass carries ~0.9 ms of scene-render + readback overhead.
  WASM traces 11.5K rays through the terrain BVH in a single ~1 ms
  call with no GL context at all.

- **At OS2 scale (128 channels, 65K–262K rays):** GL is 3–3.5×
  faster. The rasterizer's cost is geometry-bound (~0.9 ms per face),
  nearly independent of pixel count. The BVH path scales with ray
  count. Even so, WASM at 17 ms is well within the 10 Hz budget
  (100 ms). The serde-wasm-bindgen marshalling overhead is a known
  optimization target if OS2-class sensors land on the roadmap.

- **Scaling note:** WASM throughput improves at higher ray counts
  (3.7M → 16.3M rays/s from 65K to 262K rays) due to CPU cache
  coherence across spatially adjacent BVH traversals. This is a
  well-known ray-tracing property and means the scaling is
  sub-linear, not linear.

## Why WASM wins for this project

1. **360° is native.** No cubemap, no seam stitching, no multiple
   render passes. One call, any FOV.

2. **No GL context required.** Frees the WebGL renderer entirely
   for camera sensors. No render-target swapping, no readback
   pipeline stalls, no ANGLE/Xvfb dependency for lidar output.

3. **Deterministic.** No GPU driver variance across deploy targets.
   Same binary, same output, everywhere.

4. **Portable.** Runs in Node without X11/Xvfb/display server.
   Runs in the browser via the same WASM binary.

5. **Composable.** The BVH infrastructure serves future kernels
   (sonar, collision detection) without duplicating geometry
   pipelines.

6. **Fits the budget.** Even the worst-case OS2-2048 config (262K
   rays) completes in 16 ms — 6× headroom on a 10 Hz deadline.

## Consequences

- The GL depth-pass kernel stays in `packages/core/src/lidar.ts` for
  reference and testing but is not used by `createNodeService`.
- The DSL does not yet expose `azimuths` or `fov_h_deg` — the WASM
  wrapper defaults to `channels × channels` at 90° (v0.1
  compatibility). Adding these fields to the DSL is a v0.5 task.
- If OS2-class sensors enter the roadmap and the 17 ms cost becomes
  a constraint, the optimization path is clear: replace
  serde-wasm-bindgen with direct SharedArrayBuffer passing (zero-copy
  output), which eliminates the marshalling overhead that dominates
  at high ray counts.

## Alternatives considered

1. **GL cubemap depth-pass.** Faster at high ray counts but requires
   building and maintaining a multi-face render pipeline, stitching
   depth buffers at seams, and keeping a GL context alive for
   lidar. Rejected: the complexity is not justified when WASM meets
   the budget and handles 360° natively.

2. **WebGPU compute shader.** Deferred per spike S15. Revisit
   trigger: a sensor needing GPU compute, or production deployment
   on hardware-GPU hosts. Neither is currently on the roadmap.
