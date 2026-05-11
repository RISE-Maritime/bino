# Spike S14: Lidar Rust port algorithm

## Why

v0.4b ports the v0.1 TS lidar kernel (GL depth-pass) to Rust. The
algorithms are _different_: depth-pass renders the whole scene
through the lidar's perspective camera and reads back depth bytes;
ray-cast iterates rays-vs-geometry on the CPU. The retro for v0.3
flagged this as the milestone's biggest research risk: a Rust
ray-cast that's _slower_ than the GL depth-pass would defeat the
entire architectural claim.

Settle, at the algorithm level:

- **BVH library.** `parry3d` (Bevy ecosystem) vs roll-our-own
  AABB-tree.
- **BVH lifecycle.** Per-frame rebuild vs cache-with-deltas.
- **Scene geometry handoff.** Copy-each-frame vs SharedArrayBuffer.
- **Cost claim sanity check.** With realistic ray budget
  (32 channels × 360 azimuth × 10 Hz = 115k rays/sec) and a
  realistic terrain triangle count (10 km × 10 km bbox at 50 m
  grid = ~58k triangles after triangulation), is naive linear
  scan plausibly fast enough? If yes, BVH becomes optimization
  rather than necessity.

## Acceptance

- A verdict on each of the four decisions above.
- A tiny Rust prototype that times ray-AABB intersection across a
  synthetic scene to validate the cost claim within an order of
  magnitude.
- A code sketch that v0.4b #9 can lift / extend.

## Out of scope

- Building the actual lidar kernel. That's v0.4b #9-10.
- Benchmarking against the GL depth-pass. That's v0.4b #11.
- Tuning BVH heuristics. v0.4b can profile and tune.

## Time box

Half a day (compressed from ~1 day in plan because the desk-research
content is large; the prototype is small).
