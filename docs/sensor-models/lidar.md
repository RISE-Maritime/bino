# Lidar Sensor Model — Theory and Physics

## Overview

The Bino lidar sensor model produces synthetic point clouds via BVH-accelerated ray casting executed in a WASM kernel. The acceleration structure uses a two-tree design: a static terrain BVH built once at scenario load and a dynamic vessel BVH rebuilt per frame (or per azimuth column during temporal interpolation). All output points are expressed in the sensor-local coordinate frame.

## BVH Acceleration Structure

The bounding volume hierarchy is constructed top-down using axis-aligned bounding boxes (AABBs) in world-frame coordinates.

- **Split heuristic:** At each node, compute the AABB of primitive centroids, select the axis of maximum spread, and split at the median centroid along that axis.
- **Leaf threshold:** Nodes with 4 or fewer primitives become leaves; no further subdivision.
- **Traversal:** Stack-based iterative traversal with a fixed 64-level stack. At each internal node, the near child (closer entry distance along the ray) is pushed second so it is visited first, enabling early termination when a hit is found closer than the far child's entry distance.
- **Bounding volumes:** Every node stores a world-frame AABB that envelopes all primitives in its subtree.

## Ray Intersection Algorithms

Three primitive intersection tests are used.

### Ray-AABB (Slab Method)

For each axis `i in {x, y, z}`, compute entry and exit distances:

```
inv_dir_i = 1.0 / dir_i
t1_i = (aabb_min_i - origin_i) * inv_dir_i
t2_i = (aabb_max_i - origin_i) * inv_dir_i
t_min_i = min(t1_i, t2_i)
t_max_i = max(t1_i, t2_i)
```

The intersection interval is `[t_min, t_max]` where `t_min = max(t_min_x, t_min_y, t_min_z)` and `t_max = min(t_max_x, t_max_y, t_max_z)`. A hit occurs when `t_max >= t_min` and `t_min >= 0`. The returned distance is `t_min`.

### Ray-OBB (Oriented Bounding Box)

Transform the ray into the vessel-local frame using the transpose of the vessel's row-major 3x3 rotation matrix:

```
local_origin = R^T * (ray_origin - obb_center)
local_dir    = R^T * ray_dir
```

Then apply the slab-method AABB test against the OBB's `half_extents` (i.e., the local-frame AABB is `[-half_extents, +half_extents]`).

### Ray-Triangle (Moller-Trumbore)

Given triangle vertices `V0, V1, V2`:

```
E1 = V1 - V0
E2 = V2 - V0
P  = dir x E2
det = E1 . P
```

If `|det|` is near zero the ray is parallel to the triangle plane. Otherwise:

```
T = origin - V0
u = (T . P) / det
Q = T x E1
v = (dir . Q) / det
t = (E2 . Q) / det
```

A hit is valid when `u >= 0`, `v >= 0`, `u + v <= 1`, and `t` is within `[0, max_t]`. No backface culling is applied -- lidar returns from terrain regardless of triangle winding order.

## Two-Tree Design

### Terrain BVH

Built once at scenario load from `TerrainTriangle` geometry. Triangle meshes originate from the OSM coastline landmask and GMRT bathymetry data. The BVH is stored in thread-local storage and persists for the WASM kernel's lifetime.

### Vessel BVH

Built per frame from `VesselObb` positions. Typical vessel counts are at most 100, yielding microsecond build times. When temporal interpolation is active, the vessel BVH is rebuilt per azimuth column to reflect interpolated positions.

### Query Strategy

Each ray is tested against both trees. The terrain BVH is queried first. If terrain is hit at distance `t_terrain`, this value is used as `max_t` for the subsequent vessel BVH query, enabling early subtree pruning of distant vessel nodes. The final reported hit is the nearest intersection across both trees.

## Temporal Interpolation

When the scan configuration specifies `sweep_duration_s > 0`, vessel motion is interpolated across the sweep:

- **Time offset** per azimuth column: `dt = (azimuth_index / azimuths) * sweep_duration_s`
- **Position interpolation:** `center' = center + velocity * dt`
- **Rotation interpolation:** yaw delta applied as `R_y(angular_velocity_y * dt) * R_current`, where `R_y(theta)` is the standard Y-axis rotation matrix:

```
R_y(theta) = [ cos(theta)  0  sin(theta) ]
             [     0        1      0      ]
             [-sin(theta)  0  cos(theta) ]
```

The vessel BVH is rebuilt for each azimuth column (microsecond cost at typical vessel counts). Per-hit timestamps are emitted, recording each hit's time offset from sweep start.

## Sampling Geometry

Rays are cast on a uniform grid of `channels x azimuths` directions.

**Elevation angle** (edge-inclusive mapping):

```
elev = (c / (channels - 1) - 0.5) * fov_v_deg
```

When `channels == 1`, the elevation is fixed at 0.

**Azimuth angle** (edge-inclusive mapping):

```
az = (a / (azimuths - 1) - 0.5) * fov_h_deg
```

**Sensor-local ray direction** (+x right, +y up, -z forward; Three.js camera convention):

```
dir = ( cos(elev) * sin(az),
        sin(elev),
       -cos(elev) * cos(az) )
```

**World-space direction:** `world_dir = R_sensor * local_dir`, where `R_sensor` is the row-major 3x3 rotation matrix of the sensor pose.

## Performance

Benchmark results (114K terrain triangles, v04_kiel scenario):

| Config           | WASM ray-cast |
| ---------------- | ------------- |
| 32 ch x 360 az   | 1.1 ms        |
| 128 ch x 1024 az | 17 ms         |

All configurations are well within the 10 Hz frame budget (100 ms). See `packages/node/test/lidar-bench.test.ts` for the full benchmark suite.

## Output Format

- **Points:** `Float32Array`, XYZ interleaved in sensor-local frame, densely packed (misses are excluded, not zero-filled).
- **Count:** Integer number of hits, which may be less than `channels x azimuths`.
- **Timestamps:** `Float32Array`, per-hit time offset from sweep start. Empty when `sweep_duration_s == 0`.
- **Publication:** Encoded as a Keelson `PointCloud` message (foxglove.PointCloud schema with PackedElementField layout).

## Known Limitations

- No noise model: range measurements are exact, and no intensity estimation is performed.
- No atmospheric attenuation: rain, fog, and other weather conditions do not affect returns.
- No per-channel timing skew: all channels within an azimuth column fire simultaneously.
- No multi-return: only the single nearest hit per ray is reported.
- Vessel geometry is OBB-only: hull shape is approximated as a box, not a detailed mesh.
- No beam divergence or spot-size modelling: rays are infinitesimally thin.
