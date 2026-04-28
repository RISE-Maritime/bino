# Spike: Headless rendering in Node

## Why

The Bino design vision (`docs/bino_design_vision.md`) assumes the headless Node service can run the same Three.js renderer as the browser viewer. The doc treats `headless-gl` / Node WebGPU as a tooling pick, but in practice this is the highest-risk assumption in v0.1: if no path gives reliable Three.js rendering in Docker with usable readback rates, the v0.1 plan needs to be replanned around browser-only-first with a deferred headless service.

## Goal

Prove or disprove that a Three.js scene can render headlessly in Node, in Docker, with framebuffer + depth readback at usable rates.

Output is a written verdict with numbers (`results.md`), not production code.

## Acceptance criteria

- Renders a non-trivial scene (a few thousand triangles, one textured plane, basic lighting) in a clean Docker container with no X server.
- Reads back an RGBA framebuffer (camera proxy).
- Reads back a depth buffer or runs a separate depth pass (lidar proxy — confirms we can extract per-pixel range, which is what the lidar kernel will actually consume).
- Hits ≥10 Hz at 1920×1080 on a typical workstation GPU.
- Container builds from a public base image with standard NVIDIA Docker setup; no manual GPU driver wrangling.

## Backends to test, in order

1. **`headless-gl`** (`gl` on npm) + Three.js `WebGLRenderer`. Old, WebGL 1 only, mostly unmaintained — but actually works in Docker. Baseline.
2. **`@kmamal/gl`** — maintained fork of `headless-gl`. Same API, newer.
3. **Headless Chromium** (Playwright) running the viewer code unchanged, with a CDP path to extract pixel + depth buffers. Heavier process model, but if perf is acceptable it makes the "one codebase, two execution environments" claim maximally real.
4. **Node WebGPU** via the `webgpu` npm package (Dawn bindings) + Three.js `WebGPURenderer`. Exploratory — bleeding edge, may not work yet. Skip if 1–3 already give a clear answer.

## Out of scope

- Zenoh, the DSL, scene compiler, sensor kernels.
- Anything resembling the real `@bino/core`.
- "Make it pretty" — the scene exists only to stress the renderer.

## Time box

~1 day. If none of 1–3 is viable in a day, that is itself the answer; replan v0.1 around browser-only-first with a deferred headless service.

## Layout

```
spikes/headless-render/
  PLAN.md                  ← this file
  candidates/
    headless-gl/
    kmamal-gl/
    chromium/
    webgpu/
  docker/
  results.md               ← the verdict
```

## Status

**Complete — see `results.md` for the verdict.** Ran 2026-04-28 on
software rendering (the devcontainer was launched without
`NVIDIA_DRIVER_CAPABILITIES=graphics`, so the GPU passthrough only
exposed compute caps; `results.md` documents the one-line fix).
All four candidates were exercised. Recommendation: `@kmamal/gl` for
v0.1, plan to migrate to Node WebGPU at v0.4.
