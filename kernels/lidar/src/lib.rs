//! Bino lidar v0 — BVH ray-cast kernel.
//!
//! Two-tree design (per spike S14):
//!   * `TerrainBvh`: built once at scenario load over terrain triangles.
//!   * Per-frame vessel BVH: built each call from `SceneSnapshot.vessels`
//!     (≤100 boxes typical → microsecond build cost).
//!
//! Each ray queries both trees and takes the nearest hit. Hits are
//! emitted as XYZ points into `LidarFrame.points` to drop straight into
//! the existing JS-side `LidarFrame`.
//!
//! Frames:
//!   * **World frame** — ENU with +y up (matches the bino scene + radar).
//!   * **Sensor-local frame** — +x right, +y up, -z forward (matches the
//!     three.js camera convention `lidar.ts` already exposes).
//!
//! No noise, no atmospheric attenuation, no per-channel timing skew —
//! v1.0 territory. v0.4b only needs to be **correct + fast enough to
//! beat the GL depth-pass on terrain-rich scenes**.

#![cfg_attr(not(test), allow(dead_code))]

use serde::{Deserialize, Serialize};

mod bvh;
mod geom;

use bvh::Bvh;
use geom::{mat3_apply, ray_obb, ray_triangle, Ray};

/// Axis-aligned bounding box in world frame.
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct Aabb {
    pub min: [f32; 3],
    pub max: [f32; 3],
}

impl Aabb {
    pub fn empty() -> Self {
        Self {
            min: [f32::INFINITY; 3],
            max: [f32::NEG_INFINITY; 3],
        }
    }

    pub fn union(&self, other: &Aabb) -> Aabb {
        Aabb {
            min: [
                self.min[0].min(other.min[0]),
                self.min[1].min(other.min[1]),
                self.min[2].min(other.min[2]),
            ],
            max: [
                self.max[0].max(other.max[0]),
                self.max[1].max(other.max[1]),
                self.max[2].max(other.max[2]),
            ],
        }
    }

    pub fn centroid(&self) -> [f32; 3] {
        [
            0.5 * (self.min[0] + self.max[0]),
            0.5 * (self.min[1] + self.max[1]),
            0.5 * (self.min[2] + self.max[2]),
        ]
    }

    /// Smallest AABB enclosing every point in `points`. Returns
    /// `Aabb::empty()` for an empty iterator.
    pub fn from_points(points: impl IntoIterator<Item = [f32; 3]>) -> Aabb {
        let mut iter = points.into_iter();
        let first = match iter.next() {
            Some(p) => p,
            None => return Aabb::empty(),
        };
        let mut a = Aabb {
            min: first,
            max: first,
        };
        for p in iter {
            for (axis, &val) in p.iter().enumerate() {
                if val < a.min[axis] {
                    a.min[axis] = val;
                }
                if val > a.max[axis] {
                    a.max[axis] = val;
                }
            }
        }
        a
    }
}

/// Triangle in world frame. Three vertices, no normal — Möller-Trumbore
/// derives what it needs.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TerrainTriangle {
    pub v: [[f32; 3]; 3],
}

/// Oriented bounding box for a moving entity (vessel). `rotation` is
/// row-major 3x3, vessel-local → world. `half_extents` are in vessel-
/// local frame. Distinct from the radar crate's `VesselBox` (which is
/// 2D, yaw-only) — kept separate to make the dimensional difference
/// explicit at call sites.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct VesselObb {
    pub center: [f32; 3],
    pub rotation: [f32; 9],
    pub half_extents: [f32; 3],
    /// World-frame linear velocity in m/s. Default [0,0,0].
    #[serde(default)]
    pub velocity: [f32; 3],
    /// Yaw rate in rad/s. Default 0.
    #[serde(default)]
    pub angular_velocity_y: f32,
}

/// Per-frame scene state. The terrain BVH is built and held separately
/// (one-time cost at scenario load) — this is just the moving entities.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SceneSnapshot {
    pub vessels: Vec<VesselObb>,
}

/// Sensor world-frame placement. `rotation` is row-major 3x3, sensor-
/// local → world. The kernel composes mount + host on the JS side
/// before calling this.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SensorPose {
    pub origin: [f32; 3],
    pub rotation: [f32; 9],
}

/// Lidar resolution + FOV. v0.4b lidar is a uniform-grid sampler over
/// `channels × azimuths` rays; later versions can swap to per-channel
/// rotation patterns (the typical real-lidar geometry).
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LidarConfig {
    pub channels: u32,
    pub azimuths: u32,
    pub fov_v_deg: f32,
    pub fov_h_deg: f32,
    pub range_m: f32,
    /// Sweep duration in seconds (1/rate_hz). 0.0 disables interpolation
    /// for backward compatibility.
    #[serde(default)]
    pub sweep_duration_s: f32,
}

/// Output frame — XYZ interleaved in sensor-local frame, packed densely
/// (no slot for misses). Length = `count * 3`.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LidarFrame {
    pub points: Vec<f32>,
    pub count: u32,
    /// Per-hit timestamp: time offset from sweep start, in seconds.
    /// Length equals `count`. Empty when `sweep_duration_s == 0.0`.
    pub timestamps: Vec<f32>,
}

/// Pre-built terrain BVH owned by the JS-side kernel between sweeps.
pub struct TerrainBvh {
    bvh: Bvh,
    triangles: Vec<TerrainTriangle>,
}

impl TerrainBvh {
    pub fn build(triangles: Vec<TerrainTriangle>) -> Self {
        let aabbs: Vec<Aabb> = triangles
            .iter()
            .map(|t| Aabb::from_points(t.v.iter().copied()))
            .collect();
        let bvh = Bvh::build(&aabbs);
        Self { bvh, triangles }
    }

    pub fn nearest_hit(&self, ray: &Ray, max_t: f32) -> Option<f32> {
        let tris = &self.triangles;
        self.bvh.nearest_hit(ray, max_t, |idx, ray, _best| {
            ray_triangle(ray, &tris[idx as usize].v, max_t)
        })
    }
}

/// World-frame AABB enclosing an OBB. Used as the BVH leaf bound for
/// vessels — the leaf intersect still does the exact OBB test.
fn vessel_world_aabb(v: &VesselObb) -> Aabb {
    // The world-AABB of an OBB has half-extents h_world[i] = sum_j
    // |R[i,j]| * half[j]. With row-major, R[i,j] = rotation[i*3+j].
    let r = &v.rotation;
    let h = &v.half_extents;
    let hx = r[0].abs() * h[0] + r[1].abs() * h[1] + r[2].abs() * h[2];
    let hy = r[3].abs() * h[0] + r[4].abs() * h[1] + r[5].abs() * h[2];
    let hz = r[6].abs() * h[0] + r[7].abs() * h[1] + r[8].abs() * h[2];
    Aabb {
        min: [v.center[0] - hx, v.center[1] - hy, v.center[2] - hz],
        max: [v.center[0] + hx, v.center[1] + hy, v.center[2] + hz],
    }
}

/// Apply a yaw delta (rotation around Y axis) to an existing row-major
/// 3x3 rotation matrix, returning the composed result.
fn apply_yaw_delta(rotation: &[f32; 9], yaw_delta: f32) -> [f32; 9] {
    let (sin_y, cos_y) = yaw_delta.sin_cos();
    // Yaw rotation matrix around Y: Ry = [[cos,0,sin],[0,1,0],[-sin,0,cos]]
    // Result = Ry * R (row-major multiply)
    [
        cos_y * rotation[0] + sin_y * rotation[6],
        cos_y * rotation[1] + sin_y * rotation[7],
        cos_y * rotation[2] + sin_y * rotation[8],
        rotation[3],
        rotation[4],
        rotation[5],
        -sin_y * rotation[0] + cos_y * rotation[6],
        -sin_y * rotation[1] + cos_y * rotation[7],
        -sin_y * rotation[2] + cos_y * rotation[8],
    ]
}

/// Run one full lidar sweep. Generates `channels × azimuths` rays in
/// sensor-local frame, transforms to world, queries terrain + vessel
/// trees, packs hits as XYZ points back in sensor-local frame.
///
/// When `config.sweep_duration_s > 0.0`, vessels are interpolated per-
/// azimuth column according to their velocity and angular_velocity_y,
/// modelling motion during the sweep.
pub fn sweep(
    terrain: &TerrainBvh,
    scene: &SceneSnapshot,
    sensor: &SensorPose,
    config: &LidarConfig,
) -> LidarFrame {
    let chans = config.channels.max(1) as usize;
    let azis = config.azimuths.max(1) as usize;
    let mut points: Vec<f32> = Vec::with_capacity(chans * azis * 3);
    let mut timestamps: Vec<f32> = Vec::new();

    let interpolate = config.sweep_duration_s > 0.0 && !scene.vessels.is_empty();

    // When not interpolating, build one static vessel BVH for the whole
    // sweep — identical to the pre-S16 path.
    let static_vessel_bvh = if !interpolate && !scene.vessels.is_empty() {
        let aabbs: Vec<Aabb> = scene.vessels.iter().map(vessel_world_aabb).collect();
        Some(Bvh::build(&aabbs))
    } else {
        None
    };

    if interpolate {
        timestamps.reserve(chans * azis);
    }

    let fov_v = config.fov_v_deg.to_radians();
    let fov_h = config.fov_h_deg.to_radians();

    // Edge-inclusive sampling: at chans=1 the sample sits at elevation
    // 0; same for azis. Avoids an always-missed sample at FOV edges.
    for c in 0..chans {
        let elev = if chans == 1 {
            0.0
        } else {
            (c as f32 / (chans - 1) as f32 - 0.5) * fov_v
        };
        let (sin_e, cos_e) = elev.sin_cos();
        for a in 0..azis {
            let az = if azis == 1 {
                0.0
            } else {
                (a as f32 / (azis - 1) as f32 - 0.5) * fov_h
            };
            let (sin_a, cos_a) = az.sin_cos();

            // Sensor-local direction: forward = -z, right = +x, up = +y.
            let local_dir = [cos_e * sin_a, sin_e, -cos_e * cos_a];
            let world_dir = mat3_apply(&sensor.rotation, local_dir);
            let ray = Ray::new(sensor.origin, world_dir);

            let t_terrain = terrain.nearest_hit(&ray, config.range_m);
            // Tightening max_t to the terrain hit lets the vessel BVH
            // prune subtrees that lie behind the terrain plane.
            let upper = t_terrain.unwrap_or(config.range_m);

            if interpolate {
                // --- Per-azimuth interpolated vessel positions ---
                let t_frac = a as f32 / azis as f32;
                let dt = t_frac * config.sweep_duration_s;

                // Build interpolated vessels for this azimuth column.
                let interp_vessels: Vec<VesselObb> = scene
                    .vessels
                    .iter()
                    .map(|v| {
                        let center = [
                            v.center[0] + v.velocity[0] * dt,
                            v.center[1] + v.velocity[1] * dt,
                            v.center[2] + v.velocity[2] * dt,
                        ];
                        let rotation = if v.angular_velocity_y != 0.0 {
                            apply_yaw_delta(&v.rotation, v.angular_velocity_y * dt)
                        } else {
                            v.rotation
                        };
                        VesselObb {
                            center,
                            rotation,
                            half_extents: v.half_extents,
                            velocity: v.velocity,
                            angular_velocity_y: v.angular_velocity_y,
                        }
                    })
                    .collect();

                let aabbs: Vec<Aabb> = interp_vessels.iter().map(vessel_world_aabb).collect();
                let bvh = Bvh::build(&aabbs);

                let t_vessel = bvh.nearest_hit(&ray, upper, |idx, ray, best| {
                    let v = &interp_vessels[idx as usize];
                    ray_obb(ray, v.center, &v.rotation, v.half_extents, best)
                });
                let t = t_vessel.or(t_terrain);

                if let Some(t) = t {
                    points.push(t * local_dir[0]);
                    points.push(t * local_dir[1]);
                    points.push(t * local_dir[2]);
                    timestamps.push(dt);
                }
            } else {
                // --- Static path (no interpolation) ---
                let t_vessel = static_vessel_bvh.as_ref().and_then(|bvh| {
                    bvh.nearest_hit(&ray, upper, |idx, ray, best| {
                        let v = &scene.vessels[idx as usize];
                        ray_obb(ray, v.center, &v.rotation, v.half_extents, best)
                    })
                });
                let t = t_vessel.or(t_terrain);

                if let Some(t) = t {
                    points.push(t * local_dir[0]);
                    points.push(t * local_dir[1]);
                    points.push(t * local_dir[2]);
                }
            }
        }
    }

    let count = (points.len() / 3) as u32;
    LidarFrame {
        points,
        count,
        timestamps,
    }
}

// --- WASM bindings ------------------------------------------------

#[cfg(target_arch = "wasm32")]
mod wasm {
    use super::*;
    use std::cell::RefCell;
    use wasm_bindgen::prelude::*;

    // Single thread-local terrain BVH — the kernel is single-instance
    // per Bino node. Multi-instance support (e.g. multiple lidars
    // sharing a single terrain) is a follow-up; for now the wrapper
    // can call `lidar_init_terrain` once and reuse.
    thread_local! {
        static TERRAIN: RefCell<Option<TerrainBvh>> = const { RefCell::new(None) };
    }

    #[wasm_bindgen]
    pub fn lidar_init_terrain(triangles: JsValue) -> Result<(), JsValue> {
        let triangles: Vec<TerrainTriangle> = serde_wasm_bindgen::from_value(triangles)?;
        let bvh = TerrainBvh::build(triangles);
        TERRAIN.with(|t| *t.borrow_mut() = Some(bvh));
        Ok(())
    }

    #[wasm_bindgen]
    pub fn lidar_sweep(
        scene: JsValue,
        sensor: JsValue,
        config: JsValue,
    ) -> Result<JsValue, JsValue> {
        let scene: SceneSnapshot = serde_wasm_bindgen::from_value(scene)?;
        let sensor: SensorPose = serde_wasm_bindgen::from_value(sensor)?;
        let config: LidarConfig = serde_wasm_bindgen::from_value(config)?;
        TERRAIN.with(|t| -> Result<JsValue, JsValue> {
            let borrow = t.borrow();
            let terrain = borrow
                .as_ref()
                .ok_or_else(|| JsValue::from_str("terrain BVH not initialised"))?;
            let result = sweep(terrain, &scene, &sensor, &config);
            Ok(serde_wasm_bindgen::to_value(&result)?)
        })
    }
}

// --- Tests --------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    fn identity_rotation() -> [f32; 9] {
        [1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0]
    }

    fn empty_terrain() -> TerrainBvh {
        TerrainBvh::build(vec![])
    }

    fn cfg(chans: u32, azis: u32, fov_v: f32, fov_h: f32, range: f32) -> LidarConfig {
        LidarConfig {
            channels: chans,
            azimuths: azis,
            fov_v_deg: fov_v,
            fov_h_deg: fov_h,
            range_m: range,
            sweep_duration_s: 0.0,
        }
    }

    fn sensor_at_origin() -> SensorPose {
        SensorPose {
            origin: [0.0, 0.0, 0.0],
            rotation: identity_rotation(),
        }
    }

    fn vessel_obb(center: [f32; 3], half_extents: [f32; 3]) -> VesselObb {
        VesselObb {
            center,
            rotation: identity_rotation(),
            half_extents,
            velocity: [0.0; 3],
            angular_velocity_y: 0.0,
        }
    }

    #[test]
    fn empty_scene_yields_zero_points() {
        let scene = SceneSnapshot { vessels: vec![] };
        let frame = sweep(
            &empty_terrain(),
            &scene,
            &sensor_at_origin(),
            &cfg(8, 16, 30.0, 90.0, 100.0),
        );
        assert_eq!(frame.count, 0);
        assert!(frame.points.is_empty());
        assert!(frame.timestamps.is_empty());
    }

    #[test]
    fn vessel_directly_ahead_lights_some_points() {
        // Sensor-local forward = -z. Place a vessel at z = -50 (50 m
        // ahead) with a 10m half-length box. Expect the centre-most
        // ray to hit the near face at z ≈ -40.
        let scene = SceneSnapshot {
            vessels: vec![vessel_obb([0.0, 0.0, -50.0], [10.0, 5.0, 10.0])],
        };
        let frame = sweep(
            &empty_terrain(),
            &scene,
            &sensor_at_origin(),
            &cfg(16, 16, 30.0, 30.0, 200.0),
        );
        assert!(frame.count > 0, "expected hits on a centred 10m box");
        let near_z = frame
            .points
            .chunks_exact(3)
            .map(|p| p[2].abs())
            .fold(f32::INFINITY, f32::min);
        assert!(
            (near_z - 40.0).abs() < 2.0,
            "expected near hit at z≈-40, got |z|={near_z}"
        );
    }

    #[test]
    fn vessel_outside_range_produces_no_points() {
        let scene = SceneSnapshot {
            vessels: vec![vessel_obb([0.0, 0.0, -500.0], [10.0, 5.0, 10.0])],
        };
        let frame = sweep(
            &empty_terrain(),
            &scene,
            &sensor_at_origin(),
            &cfg(8, 16, 30.0, 30.0, 100.0),
        );
        assert_eq!(frame.count, 0);
    }

    #[test]
    fn vessel_off_axis_stays_unhit_with_narrow_fov() {
        // Vessel directly to the +x side (90° off forward). With 10°
        // horizontal FOV, no ray reaches it.
        let scene = SceneSnapshot {
            vessels: vec![vessel_obb([50.0, 0.0, 0.0], [5.0, 5.0, 5.0])],
        };
        let frame = sweep(
            &empty_terrain(),
            &scene,
            &sensor_at_origin(),
            &cfg(4, 8, 10.0, 10.0, 100.0),
        );
        assert_eq!(frame.count, 0);
    }

    #[test]
    fn ground_plane_triangle_hits_under_downward_pitch() {
        // Single large terrain triangle at y = -10. Sensor pitched 90°
        // down; centre ray should hit at distance ≈ 10.
        let triangles = vec![TerrainTriangle {
            v: [
                [-100.0, -10.0, -100.0],
                [100.0, -10.0, -100.0],
                [0.0, -10.0, 100.0],
            ],
        }];
        let terrain = TerrainBvh::build(triangles);
        let scene = SceneSnapshot { vessels: vec![] };

        // Row-major rotation that maps sensor -z (forward) to world -y:
        //   local x = (1,0,0) → world x = (1,0,0)
        //   local y = (0,1,0) → world y = (0,0,-1)  (pitch nose down)
        //   local z = (0,0,1) → world z = (0,1,0)
        let pitch_down: [f32; 9] = [1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, -1.0, 0.0];
        let sensor = SensorPose {
            origin: [0.0, 0.0, 0.0],
            rotation: pitch_down,
        };
        let frame = sweep(&terrain, &scene, &sensor, &cfg(4, 4, 10.0, 10.0, 100.0));
        assert!(frame.count > 0, "expected ground-plane hits when pitched down");
        let mid_dist = frame
            .points
            .chunks_exact(3)
            .map(|p| (p[0] * p[0] + p[1] * p[1] + p[2] * p[2]).sqrt())
            .fold(f32::INFINITY, f32::min);
        assert!(
            (mid_dist - 10.0).abs() < 1.5,
            "expected centre hit at ~10m, got {mid_dist}"
        );
    }

    #[test]
    fn vessel_in_front_of_terrain_hides_terrain() {
        // Floor at y=-10, vessel at y=-5 directly below sensor — the
        // vessel's near face should be the reported hit, not the floor.
        let triangles = vec![TerrainTriangle {
            v: [
                [-100.0, -10.0, -100.0],
                [100.0, -10.0, -100.0],
                [0.0, -10.0, 100.0],
            ],
        }];
        let terrain = TerrainBvh::build(triangles);
        let scene = SceneSnapshot {
            vessels: vec![vessel_obb([0.0, -5.0, 0.0], [2.0, 1.0, 2.0])],
        };
        let pitch_down: [f32; 9] = [1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, -1.0, 0.0];
        let sensor = SensorPose {
            origin: [0.0, 0.0, 0.0],
            rotation: pitch_down,
        };
        let frame = sweep(&terrain, &scene, &sensor, &cfg(4, 4, 5.0, 5.0, 100.0));
        let nearest = frame
            .points
            .chunks_exact(3)
            .map(|p| (p[0] * p[0] + p[1] * p[1] + p[2] * p[2]).sqrt())
            .fold(f32::INFINITY, f32::min);
        assert!(
            (nearest - 4.0).abs() < 0.5,
            "expected nearest hit at vessel top (y=-4 → 4m), got {nearest}"
        );
    }

    #[test]
    fn backward_compat_sweep_duration_zero() {
        // With sweep_duration_s = 0, results should be identical to the
        // pre-S16 static path: same hit count, no timestamps.
        let scene = SceneSnapshot {
            vessels: vec![vessel_obb([0.0, 0.0, -50.0], [10.0, 5.0, 10.0])],
        };
        let frame = sweep(
            &empty_terrain(),
            &scene,
            &sensor_at_origin(),
            &cfg(16, 16, 30.0, 30.0, 200.0),
        );
        assert!(frame.count > 0, "expected hits on a centred 10m box");
        assert!(
            frame.timestamps.is_empty(),
            "timestamps should be empty when sweep_duration_s == 0"
        );
        // Verify near-z is still correct.
        let near_z = frame
            .points
            .chunks_exact(3)
            .map(|p| p[2].abs())
            .fold(f32::INFINITY, f32::min);
        assert!(
            (near_z - 40.0).abs() < 2.0,
            "expected near hit at z~40, got {near_z}"
        );
    }

    #[test]
    fn temporal_interpolation_shifts_vessel() {
        // Vessel at (0, 0, -50) moving at (10, 0, 0) m/s.
        // Sweep duration 0.1s (10 Hz). 1 channel, 8 azimuths, fov_h = 10 deg.
        // With sensor at origin looking down -z:
        // - Azimuth 0 (t_frac=0/8=0): vessel at (0, 0, -50) — centred
        // - Azimuth 7 (t_frac=7/8): vessel at (10*0.0875=0.875m in +x, 0, -50)
        //
        // The hit x-coords at later azimuths should reflect the vessel
        // shifting rightward.
        let scene = SceneSnapshot {
            vessels: vec![VesselObb {
                center: [0.0, 0.0, -50.0],
                rotation: identity_rotation(),
                half_extents: [10.0, 5.0, 10.0],
                velocity: [10.0, 0.0, 0.0],
                angular_velocity_y: 0.0,
            }],
        };
        let mut config = cfg(1, 8, 0.0, 10.0, 200.0);
        config.sweep_duration_s = 0.1;

        let frame = sweep(&empty_terrain(), &scene, &sensor_at_origin(), &config);
        assert!(frame.count > 0, "expected hits");
        assert_eq!(
            frame.timestamps.len(),
            frame.count as usize,
            "one timestamp per hit"
        );

        // Timestamps should span from 0 up to near sweep_duration_s.
        let t_min = frame.timestamps.iter().cloned().fold(f32::INFINITY, f32::min);
        let t_max = frame
            .timestamps
            .iter()
            .cloned()
            .fold(f32::NEG_INFINITY, f32::max);
        assert!(t_min < 0.001, "first timestamp should be near 0, got {t_min}");
        assert!(
            t_max > 0.05,
            "last timestamp should be > 0.05s, got {t_max}"
        );
        assert!(
            t_max <= config.sweep_duration_s + 1e-6,
            "timestamp should not exceed sweep_duration_s"
        );

        // The hit points' x-coordinates should show the vessel's lateral
        // shift. Group hits by their timestamp — earlier hits should have
        // x closer to 0, later hits should be shifted toward +x.
        let hit_points: Vec<[f32; 3]> = frame
            .points
            .chunks_exact(3)
            .map(|c| [c[0], c[1], c[2]])
            .collect();

        // Find the x of the first-timestamp hit and last-timestamp hit.
        let first_idx = frame
            .timestamps
            .iter()
            .enumerate()
            .min_by(|a, b| a.1.partial_cmp(b.1).unwrap())
            .unwrap()
            .0;
        let last_idx = frame
            .timestamps
            .iter()
            .enumerate()
            .max_by(|a, b| a.1.partial_cmp(b.1).unwrap())
            .unwrap()
            .0;

        let x_first = hit_points[first_idx][0];
        let x_last = hit_points[last_idx][0];
        // The vessel shifts +x over time, so hits at later azimuths
        // should reflect a more positive x position on the vessel face.
        // The difference should be roughly 10 m/s * 0.1s * 7/8 ~ 0.875m.
        // We just check the sign/direction — x_last should be more positive.
        assert!(
            x_last > x_first,
            "later-azimuth hit x ({x_last}) should be > earlier ({x_first}) due to +x velocity"
        );
    }

    #[test]
    fn bvh_matches_linear_scan_on_random_triangles() {
        let mut state: u32 = 0xC0FFEE;
        let mut rnd = || -> f32 {
            state = state.wrapping_mul(1103515245).wrapping_add(12345);
            ((state >> 16) & 0x7FFF) as f32 / 32768.0
        };
        let mut triangles = Vec::new();
        for _ in 0..200 {
            let cx = (rnd() - 0.5) * 100.0;
            let cy = (rnd() - 0.5) * 100.0;
            let cz = (rnd() - 0.5) * 100.0;
            triangles.push(TerrainTriangle {
                v: [
                    [cx, cy, cz],
                    [cx + 2.0, cy, cz],
                    [cx, cy + 2.0, cz + 1.0],
                ],
            });
        }
        let bvh_terrain = TerrainBvh::build(triangles.clone());

        for _ in 0..50 {
            let dir = {
                let dx = rnd() - 0.5;
                let dy = rnd() - 0.5;
                let dz = rnd() - 0.5;
                let len = (dx * dx + dy * dy + dz * dz).sqrt().max(1e-6);
                [dx / len, dy / len, dz / len]
            };
            let ray = Ray::new([0.0, 0.0, 0.0], dir);
            let bvh_t = bvh_terrain.nearest_hit(&ray, 1000.0);
            let lin_t = triangles
                .iter()
                .filter_map(|tri| ray_triangle(&ray, &tri.v, 1000.0))
                .fold(f32::INFINITY, f32::min);
            let lin_t = if lin_t.is_finite() { Some(lin_t) } else { None };
            match (bvh_t, lin_t) {
                (None, None) => {}
                (Some(a), Some(b)) => {
                    assert!((a - b).abs() < 1e-3, "BVH t={a} != linear t={b}")
                }
                (a, b) => panic!("BVH/linear disagree: bvh={a:?}, linear={b:?}"),
            }
        }
    }
}
