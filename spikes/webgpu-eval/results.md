# Spike S15: WebGPU re-evaluation — verdict

**Spike date:** 2026-04-29
**Time spent:** ~1 hour.
**Three version tested:** 0.184.0 (vs r160 in the v0.1 spike).
**WebGPU binding tested:** `webgpu` npm 0.4.0 (Dawn).

## Headline

**Defer WebGPU migration.** The blocker has shifted but is still
real: webgpu 0.4.0 loads cleanly in Bookworm (the v0.1 spike's
`GLIBCXX_3.4.32` issue is fixed), but Dawn still needs a Vulkan
runtime (`libvulkan.so.1` + an ICD). Without it, `WebGPURenderer.init`
falls back to a WebGL2 path that doesn't work in pure Node.

More importantly: **with v0.3 radar and v0.4b lidar both moving to
WASM kernels, WebGPU's main appeal — GPU compute for ray-casting —
becomes moot.** The remaining argument for WebGPU is camera
rendering perf, which isn't a bottleneck. The migration cost
(setup complexity, polyfill maintenance, parallel test paths)
outweighs the benefit.

v0.4b #12 closes as "evaluated, not migrated. Revisit at v0.5+ if
WebGPU compute pulls its weight for a new sensor."

## What broke and where

```
[webgpu] native binding loaded                    ✓ (was the v0.1 blocker)
[three] WebGPURenderer resolved                   ✓
[three] WebGPURenderer.init failed: ...
  Warning: Couldn't load Vulkan: libvulkan.so.1: cannot open shared object file
  THREE.WebGPURenderer: WebGPU is not available, running under WebGL2 backend
  Cannot read properties of null (reading 'getSupportedExtensions')
```

The fallback-to-WebGL2 is Three's polite handling, but the WebGL2
path needs a real WebGL context (one we'd have to wire from
@kmamal/gl), at which point we're back where we started.

## What changed since v0.1's WebGPU evaluation

| concern | v0.1 (r160) | v0.4 (r184) |
|---------|-------------|-------------|
| `webgpu` npm GLIBCXX issue | ✗ blocked | ✓ resolved |
| `MeshDepthMaterial(RGBADepthPacking)` support | ✗ rejected | ? not reachable |
| Vulkan runtime required | yes | yes |
| Camera-frame readback API | `readRenderTargetPixels` | `readRenderTargetPixelsAsync` (renamed) |
| Polyfill burden in Node | self/window/canvas/raf/cancelraf | self/window/canvas/raf/cancelraf + `document.createElementNS` |

The ergonomic surface improved a little (cleaner error messages,
async readback). The fundamental setup required to actually run is
unchanged: you need Vulkan + a working GPU (or SwiftShader as a
software-Vulkan fallback, which would itself need installing).

## Why the cost-benefit math now favours "defer"

v0.1's plan called for v0.4 to evaluate WebGPU because at that
point we expected:
- Lidar (v0.4) needing GPU compute for ray-casting.
- Camera rendering being on the critical path.

What actually happened:
- v0.3 took the lidar/radar in a **completely different
  direction** — Rust+WASM kernels with copy-each-frame marshalling.
  Lidar's BVH ray-cast (v0.4b #9) needs zero GPU.
- Camera rendering at 1080p10 has been comfortable on
  software-rendered `@kmamal/gl` since v0.1; it's not a bottleneck.

So the *actual* benefits of moving to WebGPU at v0.4 are:
- Slightly faster camera rendering on hardware GPU.
- Marginally simpler shader authoring (WGSL > GLSL).
- Future-proofing.

The *actual* costs are:
- Vulkan + Dawn runtime in production Docker.
- Parallel polyfill maintenance.
- Diverging from the headless-render spike's blessed path.
- Browser viewer would need its own WebGPU setup (and `vite-plugin-wasm`
  + `vite-plugin-top-level-await` already pull weight).

The math doesn't justify it for v0.4. **The WASM kernel path is
strictly the same architectural decision a WebGPU-compute lidar
would have been, but stays runtime-portable** — same Rust crate
serves Bino, native CLI tools, and any future wasm-host.

## Acceptance vs the spike plan

| criterion | result |
|-----------|--------|
| Working WebGPU camera-render in Node | ✗ — Vulkan unavailable |
| Working depth-pass equivalent | ✗ — couldn't reach |
| Yes/defer verdict | ✓ — **defer** |

## Concrete recommendation for v0.4b #12

**Close as deferred.** Update `docs/plan.md` v0.4b #12 to record
the deferral with a pointer to this verdict. Note the
revisit-trigger:

> "Reopen WebGPU evaluation if (a) a sensor needs GPU compute for
> its kernel, OR (b) production Bino runs on hardware-GPU hosts
> where camera rendering becomes the critical path. Neither is
> currently on the roadmap."
