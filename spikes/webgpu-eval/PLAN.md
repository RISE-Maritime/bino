# Spike S15: WebGPU re-evaluation

## Why

The v0.1 headless-render spike evaluated Three.js r160's WebGPU
pipeline and found gaps — specifically, `MeshDepthMaterial(RGBADepthPacking)`
didn't work, which is the exact path our lidar uses.
v0.1 verdict: "Plan to migrate to Node WebGPU at v0.4."

We're at v0.4. Three has bumped many minor versions
(0.160 → 0.184 in npm at the time of writing). Re-test:

- Does `MeshDepthMaterial(RGBADepthPacking)` work in r184's
  WebGPU pipeline?
- Does our camera kernel's basic render-target → readback work?
- Is the Node-side polyfill burden the v0.1 spike documented
  any lighter?

## Acceptance

- A working camera-kernel-equivalent WebGPU render in Node.
- A working depth-pass equivalent (or a clear "still not
  supported" finding).
- `results.md` with a yes-migrate / defer verdict for v0.4b #12.

## Out of scope

- Actually migrating @bino/node. That's v0.4b #12, contingent on
  this verdict.
- Browser-side WebGPU evaluation. Browsers' WebGPU is more mature
  than Node's; the Node story is the binding constraint.

## Time box

Half a day. **Lowest priority of the v0.4 spikes** — v0.4b #12
is itself the plan's only optional task.
