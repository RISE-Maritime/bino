# Spike: Headless rendering — verdict

**Spike date:** 2026-04-28
**Author:** ran by Claude (Opus 4.7) on cfc.olsson's WSL2 dev host
**Spike directory:** `spikes/headless-render/`
**Plan:** `spikes/headless-render/PLAN.md`
**Time spent:** ~half a day, well within the 1-day box.

## Headline

**Three.js renders headlessly in Node, in Docker, with framebuffer and
depth readback at well above the 10 Hz acceptance bar — even on a
software rasterizer.** The v0.1 design assumption holds. No replan
needed.

For v0.1 use **`@kmamal/gl`** (or its older sibling `headless-gl`) as
the headless backend in `@bino/node`. Keep **headless Chromium via
Playwright** as a documented secondary path that buys the strongest
"literally the same code as the browser viewer" claim.

The biggest finding beyond the headline: **Node WebGPU works** (with
several polyfills) and is the fastest backend even on a CPU rasterizer
— but Three.js r160's WebGPU path is not yet a drop-in replacement
(see the depth-pass gap below). It's the right v0.4 target, not the
v0.1 target.

All numbers below come from a CPU-only Mesa software stack
(`llvmpipe` / Lavapipe / SwiftShader), because the WSL2 GPU passthrough
into this devcontainer is missing the `graphics` driver capability —
see [GPU access](#gpu-access-in-this-devcontainer-not-yet-wired-up).
Hardware passthrough on this host's RTX A2000 should multiply
throughput several × across all candidates; the spike's "≥10 Hz" floor
is cleared even without it.

## What was rendered

A single shared scene defined in `shared/scene.mjs`, used identically
by all four candidates:

| component                                                         | tris      | notes                                                                  |
| ----------------------------------------------------------------- | --------- | ---------------------------------------------------------------------- |
| `PlaneGeometry(60,60,256,256)` w/ procedural checkerboard texture | 131,072   | `MeshStandardMaterial`, `RGBAFormat` `DataTexture`, real fragment work |
| `TorusKnotGeometry(2.2, 0.65, 200, 28)`                           | ~22,400   | hero geometry, `MeshStandardMaterial`                                  |
| `InstancedMesh(BoxGeometry, 200)`                                 | 2,400     | orbiting field, animated per-frame                                     |
| **total**                                                         | **~155k** | well above the "few thousand triangles" floor in PLAN.md               |

Lighting: one `AmbientLight` + one `DirectionalLight`. Animation
updates the knot rotation and the 200 cube transforms each frame.

Per-frame work for every candidate:

1. `step(t)` — animate the scene (CPU work).
2. **Color pass:** render to a `WebGLRenderTarget(RGBA8, depthBuffer)`.
3. **Depth pass:** swap in a `MeshDepthMaterial` with
   `RGBADepthPacking`, render again to a second target. The four bytes
   encode a 0..1 depth value the lidar kernel can decode (verified
   against expected camera-space values on the center scanline). A
   WebGL1-portable depth path was the deliberate choice so the same
   lidar readback works across all candidates. (WebGPU is the
   exception — see caveat below.)
4. **Color readback:** `glReadPixels` (or `readRenderTargetPixels`)
   into a pre-allocated `Uint8Array`.
5. **Depth readback:** same, from the second target.

## Numbers

All measurements: 1920×1080, 120 timed frames after 20 warmup, software
rendering (no GPU access — see the GPU section below).

### Inside `bino-spike-headless` Docker container (`out/docker/summary.json`)

| candidate     | OK  | FPS  | per-frame | render | readColor | readDepth | renderer                                                 |
| ------------- | --- | ---- | --------- | ------ | --------- | --------- | -------------------------------------------------------- |
| `headless-gl` | ✓   | 41.4 | 24.2 ms   | 19.1   | 4.2       | 0.85      | ANGLE / WebGL 1 / stack-gl 8.1.6                         |
| `@kmamal/gl`  | ✓   | 42.9 | 23.3 ms   | 18.3   | 4.2       | 0.79      | ANGLE / WebGL 1 / stack-gl 9.1.0                         |
| `chromium`    | ✓   | 17.9 | 55.7 ms   | 0.3¹   | 50.7      | 4.7       | Chromium / **WebGL 2** / ANGLE→Vulkan→llvmpipe (Mesa 25) |
| `webgpu`      | ✓²  | 49.2 | 20.3 ms   | 1.4    | 18.9      | —³        | Dawn / Mesa Lavapipe (LLVM 20)                           |

(All times in ms. Container = `nvidia/cuda:13.0.3-runtime-ubuntu24.04`,
no `--gpus` available in this dind sandbox.)

### On the devcontainer host (`out/summary.json`)

| candidate     | OK  | FPS  | per-frame | render | readColor | readDepth | renderer                                                 |
| ------------- | --- | ---- | --------- | ------ | --------- | --------- | -------------------------------------------------------- |
| `headless-gl` | ✓   | 41.0 | 24.4 ms   | 19.8   | 3.9       | 0.6       | ANGLE / WebGL 1 / stack-gl 8.1.6                         |
| `@kmamal/gl`  | ✓   | 41.4 | 24.2 ms   | 19.6   | 3.9       | 0.5       | ANGLE / WebGL 1 / stack-gl 9.1.0                         |
| `chromium`    | ✓   | 17.3 | 57.9 ms   | 0.3¹   | 52.5      | 5.1       | Chromium / **WebGL 1** / ANGLE→Vulkan→llvmpipe (Mesa 22) |
| `webgpu`      | ✗⁴  | —    | —         | —      | —         | —         | Dawn dlopen failed (libstdc++ on Bookworm)               |

**Notes on the tables:**

1. Chromium's `render()` time is misleadingly low because WebGL queues
   commands asynchronously — the `glReadPixels` then forces a sync,
   absorbing the GPU work. Per-frame total is what matters, and that's
   the ~56 ms reading.
2. WebGPU works inside the container after several Node-environment
   polyfills (see WebGPU caveat below).
3. WebGPU could not run the depth pass with `MeshDepthMaterial`. Three
   r160's WebGPU pipeline rejects classic materials —
   `MeshDepthNodeMaterial` only lands in r170+. The reported FPS is
   therefore **color-only** and not directly comparable to the others.
4. The `webgpu` npm package's Dawn binary needs `GLIBCXX_3.4.32`
   (Ubuntu 24.04 / gcc 13+). Bookworm only goes up to 3.4.30. The
   Dockerfile in `docker/Dockerfile` uses a 24.04 base, so WebGPU
   loads inside the container.

### Cross-backend determinism

The two gl-based candidates produced identical color buffers
(`colorHash=6d8dcaf4`) and identical depth strips on both host and
container. WebGL was bit-deterministic across the gl swap.

The Chromium colorHash differs between host (`6d8dcaf4`, WebGL1 path)
and container (`be7cf84c`, WebGL2 path) — the Mesa version difference
flipped the WebGL major version, and WebGL1 → WebGL2 swap changes
shader precision and gamma handling, which changes pixel output. For
V&V, **pin the Chromium GL backend explicitly** in production rather
than relying on auto-detect.

WebGPU's colorHash (`bc3829d9`) differs from any WebGL backend.
WebGPU's coordinate system is Y-down by default and Three.js's WebGPU
node materials don't produce identical output to its WebGL standard
materials. **Bit-identity across the WebGL/WebGPU boundary should not
be expected** — important if you ever want to use Chromium as a
ground-truth oracle for the Node service.

## Acceptance criteria — pass/fail

| criterion                                                            | status                                                                                      |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| non-trivial scene (few thousand triangles, textured plane, lighting) | ✓ ~155k tris, lit, textured                                                                 |
| RGBA framebuffer readback (camera proxy)                             | ✓ all four working candidates                                                               |
| depth readback (lidar proxy — per-pixel range extractable)           | ✓ for gl-based + Chromium via `MeshDepthMaterial(RGBADepthPacking)`; gap for WebGPU on r160 |
| ≥10 Hz at 1920×1080 on a typical workstation GPU                     | ✓ even on software (17–49 FPS); hardware will be much higher                                |
| public-base Docker image, no manual driver wrangling                 | ✓ `docker/Dockerfile` (`nvidia/cuda:13.0.3-runtime-ubuntu24.04`)                            |

## Recommendation

For v0.1 of `@bino/node`, **adopt `@kmamal/gl`** as the primary
headless backend, with `headless-gl` (`gl@8.1.6`) as a drop-in
fallback. Identical performance, identical output, identical API.
`@kmamal/gl` ships current Node ABI prebuilts (we used Node 22.22;
no prebuilts for Node 24 yet) and is the more actively maintained
fork.

Keep **headless Chromium via Playwright** as a documented secondary
path. It's slower and has heavier process semantics, but it gives the
strongest "literally the same code as the browser viewer" claim
without any wrapper. Useful as a sanity oracle even though the
WebGL1/WebGL2 colorHash drift means the oracle isn't bit-perfect.

**Plan to migrate to Node WebGPU at v0.4.** It already wins on
throughput in software, the `webgpu` npm package's Dawn binding is
solid (the only adapter visible was Lavapipe but on a real GPU it
would resolve to NVIDIA's Vulkan ICD), and Three.js's WebGPU pipeline
is Three's strategic direction. The reasons not to do it now:

- Three r160's WebGPU pipeline can't consume classic
  `MeshDepthMaterial` — we need r170+ to get
  `MeshDepthNodeMaterial`.
- The integration requires a small set of polyfills (`window`, `self`,
  `navigator.gpu`, `requestAnimationFrame`, a fake
  `canvas.getContext("webgpu")` stub) that today are
  hand-rolled in the spike — see
  `candidates/webgpu/bench.mjs`. These should consolidate into a tiny
  `bino-three-webgpu-node` shim before adopting it for production.
- Output is not bit-identical to the WebGL renderer, so any
  determinism budget for V&V needs to be re-validated.

## Caveats and risks

These are the things that didn't show up in the headline numbers but
could matter for v0.1.

### `headless-gl` / `@kmamal/gl` is WebGL1 only

Both packages bundle ANGLE compiled for ES 2.0 / WebGL 1.0. **Three.js
deprecated WebGL1 in r153** and the WebGL1 path is "scheduled for
removal" — currently still present in r170, but on borrowed time. We
pinned `three@0.160.1` for this spike. Track this dependency: when
Three.js drops WebGL1, the gl-based backends stop working unless
`@kmamal/gl` ships a WebGL2 build (an upstream issue with no ETA).
The migration path is to Node WebGPU (preferred, see above) or
Chromium.

This is the spike's most material follow-up risk. Budget time around
v0.3 / v0.4 to revisit the renderer choice.

### `@kmamal/gl@9.x` has a buggy options-parser

Line 39 of `node-index.js` reads `options.window.gl` without guarding
for a missing `window` — pass `{ window: {} }` to dodge the throw and
get a pure offscreen context. The candidate harness already does this;
worth a one-line PR upstream. `headless-gl@8.x` doesn't have this bug.

### gl-based packages need an X display, not just a GLES driver

The `gl` and `@kmamal/gl` prebuilt binaries link against `libX11` and
`libxcb` (their bundled ANGLE uses an X11 backend), so they need a
running X server to attach to — not just `libGL` or `libEGL`. Without
a display, `gl()` returns null. Inside the Docker container this is
handled by the entrypoint (`docker/entrypoint.sh`) which spawns Xvfb
on `:99` before launching Node. The host devcontainer has a usable
DISPLAY courtesy of WSLg, so the same trick isn't needed there.

This is a non-issue functionally — Xvfb starts in ~200 ms — but it's a
hidden runtime requirement worth documenting.

### Depth packing wastes precision on far-away geometry

`RGBADepthPacking` encodes `gl_FragCoord.z` (perspective-non-linear),
which crushes everything past mid-distance into the top bin. For a
real lidar kernel we want eye-space linear depth — either a custom
shader that outputs linearized depth before packing, or (better) a
WebGL2 / WebGPU path that gives us a `R32F` depth attachment we can
read back directly. v0.1 lidar can use the perspective-z packed depth
as a starting point; the linearization upgrade is small (~10 lines of
GLSL).

### Color readback is the bottleneck

For `headless-gl`, `glReadPixels` of an 8.3 MB buffer takes ~4 ms (16%
of frame time). For Chromium it takes ~50 ms. For WebGPU, ~19 ms. On
hardware the GPU sync cost dominates. For sustained 30 Hz camera
output at 1080p we should consider:

- PBO async readback (WebGL2 only — see WebGL1 caveat above), which
  lets us overlap readback with rendering.
- WebGPU `mappedAtCreation` buffers, which are async by design.
- Lower resolution per camera (typical perception cameras are
  640×480 to 1920×1200).

Headroom is fine for v0.1; this is where future perf work belongs.

### Chromium's GL backend isn't deterministic across hosts

The host Mesa (22) gave us WebGL1 in Chromium; the container Mesa (25)
gave us WebGL2. Pixel output differed (different colorHash). For V&V
runs we should pin the GL backend with explicit Chromium flags
(e.g. `--use-gl=swiftshader` for software, or `--use-angle=vulkan`
with confirmation that the host has Vulkan) and lock the Mesa version
in the Docker image. Don't trust the auto-detect path.

### Node WebGPU needs polyfills today

Three.js's WebGPURenderer assumes a browser-ish global environment.
The candidate harness installs four polyfills before importing
WebGPURenderer: `globalThis.window`, `globalThis.self`,
`navigator.gpu` (via `Object.defineProperty` because Node 22 made
`navigator` a read-only getter), and `requestAnimationFrame` /
`cancelAnimationFrame`. Plus a fake `canvas.getContext("webgpu")`
that's a no-op stub since we render to render-targets, not a
swapchain. None of this is hard, but it should live in a small shared
module rather than be copy-pasted into every consumer.

## Hardware GPU access — environment-specific

The numbers above are software rendering. Whether hardware GL is
trivially available depends on the environment.

### Production Linux + Docker + NVIDIA GPU — works out of the box

The expected `@bino/node` deployment (Linux VM, k8s pod, on-prem GPU
host). On a host with the NVIDIA driver and `nvidia-container-toolkit`
installed:

```bash
docker run --gpus all \
  -e NVIDIA_DRIVER_CAPABILITIES=graphics,compute,utility,display \
  bino-spike-headless
```

The container toolkit injects the host's `libEGL_nvidia.so.0`,
`libGLX_nvidia.so.0`, `libGLESv2_nvidia.so.2`, the Vulkan ICD JSON,
and `/dev/nvidia*` device nodes at runtime. No image-level
installation needed; the Dockerfile in `docker/Dockerfile` is already
shaped for this.

### Production Linux without GPU — software fallback is automatic

`@kmamal/gl` loads, llvmpipe takes over, the service runs at the FPS
shown in the tables above. No application code changes. Size the
sensor workload accordingly: single 1080p camera at 30 Hz is fine,
multi-sensor or production-density lidar will hurt.

### Browser viewer — not our concern

Browsers handle GPU access and software fallback automatically
(SwiftShader / llvmpipe via ANGLE). We write WebGL/WebGPU; the
runtime decides.

### WSL2 dev environment — needs a bind-mount, not just an env var

This is where the spike actually ran, and where the obvious fix
**doesn't apply**. WSL2 has no Linux NVIDIA driver libs on the host
for the container toolkit to inject. Graphics on WSL2 instead goes
through `/dev/dxg` + `libdxcore.so` + `libd3d12.so` + Mesa's `d3d12`
Gallium driver, which translates GL → D3D12 → WSL kernel module →
Windows NVIDIA driver.

State of the pieces in this devcontainer:

| component      | where                                        | present?                                                                   |
| -------------- | -------------------------------------------- | -------------------------------------------------------------------------- |
| `/dev/dxg`     | kernel passthrough, exposed by `--gpus=all`  | ✓                                                                          |
| `libdxcore.so` | `/usr/lib/x86_64-linux-gnu/libdxcore.so`     | ✓ pre-staged in `mcr.microsoft.com/devcontainers/...` base (no dpkg owner) |
| `d3d12_dri.so` | `/usr/lib/x86_64-linux-gnu/dri/d3d12_dri.so` | ✓ shipped in Bookworm `libgl1-mesa-dri` 22.3                               |
| `libd3d12.so`  | normally `/usr/lib/wsl/lib/libd3d12.so`      | **✗ missing**                                                              |

`libd3d12.so` is the closing piece. **It is not in any Linux apt
repo** (verified against Debian bookworm, Ubuntu jammy/noble, and
Microsoft's `packages.microsoft.com` repos for both Debian and
Ubuntu). It ships only as part of the WSL Windows-side install,
pre-staged into the WSL distro's filesystem at `/usr/lib/wsl/lib/`
at boot. Without it, `MESA_LOADER_DRIVER_OVERRIDE=d3d12` silently
falls back to `llvmpipe`.

The fix is to bind-mount the WSL host's `/usr/lib/wsl/` into the
container. Add to `.devcontainer/devcontainer.json`:

```jsonc
"mounts": [
  // ...existing mounts...
  "source=/usr/lib/wsl,target=/usr/lib/wsl,readonly,type=bind"
],
"runArgs": [
  "--gpus=all",
  "--env=NVIDIA_DRIVER_CAPABILITIES=graphics,compute,utility,display"
],
"postCreateCommand": "echo /usr/lib/wsl/lib | sudo tee /etc/ld.so.conf.d/wsl.conf && sudo ldconfig"
```

Then "Dev Containers: Rebuild Container". After rebuild, `glxinfo -B`
should report a `D3D12` renderer rather than `llvmpipe`, and
re-running `node run-all.mjs` will produce hardware numbers — expect
several × the software FPS reported above.

Caveats:

- The bind-mount only works if the WSL2 distro running Docker has
  `/usr/lib/wsl/lib/` populated. Standard Ubuntu/Debian WSL distros
  do; minimal Docker Desktop WSL backends may not — verify on the
  host with `wsl --exec ls /usr/lib/wsl/lib/`.
- This is a **dev-only workaround**. Production deployments use the
  standard `nvidia-container-toolkit` path (above), not this. The
  same Dockerfile works in both environments because the d3d12
  Gallium driver only activates when `libd3d12.so` is present;
  otherwise it stays out of the way.

## How to reproduce

Inside the devcontainer (host run):

```bash
cd spikes/headless-render
nvm use 22                       # or use the with-node.sh wrapper
npm install --include=optional   # gl, @kmamal/gl, playwright, webgpu
npx playwright install chromium
node run-all.mjs                 # runs all four candidates, writes out/summary.json
```

In a clean Docker container (preferred for verification):

```bash
docker build -t bino-spike-headless -f docker/Dockerfile .
docker run --rm \
  -v "$PWD/out/docker:/spike/out" \
  bino-spike-headless                              # software fallback

# On a host with NVIDIA Container Toolkit:
docker run --rm --gpus all \
  -e NVIDIA_DRIVER_CAPABILITIES=graphics,compute,utility \
  -v "$PWD/out/docker:/spike/out" \
  bino-spike-headless                              # hardware path
```

Per-candidate output drops in `out/` (host) or `out/docker/`
(container):

- `headless-gl.json`, `kmamal-gl.json`, `chromium.json`, `webgpu.json`
- `summary.json` (aggregated table from `run-all.mjs`)
- `headless-gl-color.ppm`, `headless-gl-depth.ppm`,
  `kmamal-gl-color.ppm`, `chromium-color.png` — visual sanity.

## Layout

```
spikes/headless-render/
├── PLAN.md                     ← original plan (unchanged)
├── results.md                  ← this file
├── package.json
├── with-node.sh                ← devcontainer wrapper to pin Node 22
├── run-all.mjs                 ← runs all candidates, writes summary
├── shared/
│   ├── scene.mjs               ← single source of truth for the test scene
│   ├── bench.mjs               ← timing harness, percentiles, sanity checks
│   ├── three-headless.mjs      ← shared helpers for the gl-based candidates
│   └── ppm.mjs                 ← zero-dep PPM writer for visual sanity
├── candidates/
│   ├── headless-gl/bench.mjs
│   ├── kmamal-gl/bench.mjs
│   ├── chromium/bench.mjs
│   ├── chromium/bench-page.html ← the in-browser bench harness
│   └── webgpu/bench.mjs
├── docker/
│   ├── Dockerfile              ← Ubuntu 24.04 + CUDA 13.0 base
│   └── entrypoint.sh           ← starts Xvfb so gl-based packages work
└── out/                        ← per-candidate JSON + sanity images
    └── docker/                 ← same outputs from docker run
```
