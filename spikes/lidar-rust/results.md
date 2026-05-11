# Spike S14: Lidar Rust port algorithm — verdict

**Spike date:** 2026-04-29
**Time spent:** ~45 min.

## Headline

**Naive linear ray-vs-AABB scan handles up to ~100 boxes per
frame at v0.4b's lidar ray budget. With v0.4a terrain present
(thousands of triangles), it does not. BVH is required for v0.4b
the moment terrain enters the scene.**

The cost claim ("Rust ray-cast beats GL depth-pass") **stands** —
at v0.3 ray budgets and entity counts, both approaches are
sub-millisecond, so the choice is by code-cleanliness, not perf.
At v0.4 with terrain, GL depth-pass cost grows with rendered
triangle count; BVH ray-cast grows with `log(triangles)`. v0.4b
should land BVH directly, not start with linear scan and add BVH
later.

## Numbers (synthetic ray-vs-AABB benchmark)

```
scenario                   rays    boxes         ms     rays/s
----------------------------------------------------------------
v0.3-radar-equiv            360       10       0.01   61.5M
v0.3-lidar-only           11520       10       0.18   63.5M
v0.3-lidar-full           11520      100       1.52    7.6M
v0.4b-with-terrain        11520     5000      86.21    0.13M
v0.4b-dense-terrain       11520    60000     909.69    0.013M
```

Read: at the v0.4b lidar's full ray budget (32 channels × 360
azimuth = 11,520 rays/sweep, 10 sweeps/sec → 115k rays/sec):

- **0-100 entity boxes:** linear scan delivers a sweep in ~1.5 ms.
  Trivial.
- **5k boxes (≈ a small terrain triangulation):** 86 ms/sweep =
  ~11 Hz. Marginal.
- **60k boxes (≈ a 50 m grid over a 10 km bbox):** 910 ms/sweep =
  1.1 Hz. **Breaks acceptance.**

A standard binary-AABB BVH gives O(log N) traversal vs O(N), so
60k boxes traversed in ~16 levels rather than 60,000 — a ~4000×
factor on paper. v0.4b #11's measured benchmark will say what it
actually delivers.

(Tests run on the devcontainer's x86_64 single core, release build,
no SIMD-specific tuning.)

## Decisions locked

### 1. BVH library: roll our own (not `parry3d`)

`parry3d` is the de-facto Rust collision library, but it brings
collision-detection features and dependencies (`nalgebra`,
`simba`, `arrayvec`, `slab`, ...) we don't use. For a
binary-AABB-tree with single-ray-vs-tree traversal, the algorithm
is ~150 LOC of Rust:

- Build: top-down median-split along the longest axis.
- Traverse: stack-based, near-child-first, prune by current `t_max`.

Net dependency cost: zero new deps in `kernels/lidar/`.

### 2. BVH lifecycle: per-domain, not per-frame

- **Static terrain** is built into a BVH **once** at scenario load
  time and serialized to the WASM kernel via the existing
  copy-each-frame channel (just doesn't change between frames).
- **Moving entities** (vessels) are rebuilt every frame from
  their bbox positions. With ≤100 vessels, build cost is
  microseconds.
- A ray traverses **both BVHs** and takes the nearer hit. Two
  separate BVHs avoids invalidating the terrain tree when only
  vessels move.

This keeps the per-frame cost bounded by the moving-entity count,
not by the (potentially huge) static terrain count.

### 3. Memory model: copy-each-frame, like v0.3 radar

Per-frame payload:

- moving-entity bboxes: ≤100 × 24 bytes ≈ 2.4 KB
- host pose: ~32 bytes
- config: <100 bytes

= ~3 KB/frame at 10 Hz = 30 KB/sec marshalling. Trivial.

The terrain BVH (~60k AABBs serialized as ~24 bytes/node) ≈ 1.4 MB
is a **one-time** copy at kernel init, not per-frame. Keeps S8's
copy-each-frame story clean.

SharedArrayBuffer's COOP/COEP infrastructure cost still doesn't
buy anything here.

### 4. Algorithm

- Ray-AABB: standard slab method (already in `kernels/radar` —
  lift the helper).
- BVH traversal: stack-based, near-child-first, with current best
  `t` as upper bound for pruning.
- Per-pixel output: nearest hit's range bin gets full intensity
  (binary, like v0.3 radar). v0.5+ can graduate to per-bin
  cumulative intensity.

## Code sketch for v0.4b #9

```rust
struct BvhNode {
    aabb: Aabb,
    left: u32,         // child index, or u32::MAX for leaf
    right_or_count: u32, // for leaves: triangle count starting at first_tri
    first_tri: u32,
}

pub struct Bvh {
    nodes: Vec<BvhNode>,
    triangles: Vec<TriangleAabb>,
}

impl Bvh {
    pub fn build(triangles: Vec<TriangleAabb>) -> Self { /* top-down median split */ }

    pub fn nearest_hit(&self, ray: &Ray, max_t: f32) -> Option<f32> {
        let mut stack = [0u32; 64];
        let mut sp = 1;
        let mut best = max_t;
        while sp > 0 {
            sp -= 1;
            let node = &self.nodes[stack[sp] as usize];
            if ray_aabb(ray, &node.aabb, best).is_none() { continue; }
            if node.left == u32::MAX {
                /* leaf — test triangles */
            } else {
                /* push children, near-first */
            }
        }
        if best < max_t { Some(best) } else { None }
    }
}
```

## What this verdict doesn't settle

- **Actual perf vs the GL depth-pass.** v0.4b #11's benchmark.
  This spike's claim "Rust beats GL once terrain is in the scene"
  is theoretical; the measurement is the v0.4b deliverable.
- **BVH heuristics.** Median split is fine to start; SAH (Surface
  Area Heuristic) is a future optimization. v0.4b should
  benchmark median-split first and only invest in SAH if it's
  measurably hurting.
- **Triangle vs AABB primitives.** This spike used AABBs
  exclusively. For terrain we'll have actual triangles; the BVH
  leaves should hold triangle indices and the leaf test does
  ray-triangle intersection (Möller-Trumbore, ~30 LOC). The BVH
  _bounding_ AABBs stay the same. Adds maybe 100 more LOC to v0.4b
  #9.

## Acceptance vs the spike plan

| criterion                       | result                                  |
| ------------------------------- | --------------------------------------- |
| BVH library decision            | ✓ — roll our own                        |
| BVH lifecycle decision          | ✓ — terrain at init, vessels per-frame  |
| Scene geometry handoff decision | ✓ — copy-each-frame                     |
| Cost claim sanity check         | ✓ — naive 86 ms at 5k boxes; BVH needed |
| Code sketch for v0.4b #9        | ✓                                       |
