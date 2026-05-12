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
use geom::{mat3_apply, mat3t_apply, Ray};
use geom::ray_triangle;

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

/// Per-frame vessel instance referencing a pre-built model by index.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct VesselInstance {
    pub model_index: u32,
    pub center: [f32; 3],
    pub rotation: [f32; 9],
    #[serde(default)]
    pub velocity: [f32; 3],
    #[serde(default)]
    pub angular_velocity_y: f32,
}

/// Per-frame scene state. The terrain BVH is built and held separately
/// (one-time cost at scenario load) — this is just the moving entities.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SceneSnapshot {
    pub vessels: Vec<VesselInstance>,
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
    /// Water surface Y-coordinate. When set, rays crossing this plane
    /// from above are terminated (water absorbs lidar energy).
    #[serde(default)]
    pub water_level_y: Option<f32>,
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

/// Pre-built BVH for a vessel model's triangles in vessel-local frame.
/// Built once per unique model, reused across frames.
pub struct VesselModelBvh {
    bvh: Bvh,
    triangles: Vec<TerrainTriangle>,
    pub local_aabb: Aabb,
}

impl VesselModelBvh {
    pub fn build(triangles: Vec<TerrainTriangle>) -> Self {
        let aabbs: Vec<Aabb> = triangles
            .iter()
            .map(|t| Aabb::from_points(t.v.iter().copied()))
            .collect();
        let local_aabb = aabbs
            .iter()
            .fold(Aabb::empty(), |acc, a| acc.union(a));
        let bvh = Bvh::build(&aabbs);
        Self {
            bvh,
            triangles,
            local_aabb,
        }
    }

    pub fn nearest_hit(&self, ray: &Ray, max_t: f32) -> Option<f32> {
        let tris = &self.triangles;
        self.bvh.nearest_hit(ray, max_t, |idx, ray, best| {
            ray_triangle(ray, &tris[idx as usize].v, best)
        })
    }
}

/// World-frame AABB of a vessel instance, derived from the model's
/// local AABB rotated + translated by the instance pose.
fn vessel_world_aabb(v: &VesselInstance, model: &VesselModelBvh) -> Aabb {
    let la = &model.local_aabb;
    let half = [
        (la.max[0] - la.min[0]) * 0.5,
        (la.max[1] - la.min[1]) * 0.5,
        (la.max[2] - la.min[2]) * 0.5,
    ];
    let lc = [
        (la.min[0] + la.max[0]) * 0.5,
        (la.min[1] + la.max[1]) * 0.5,
        (la.min[2] + la.max[2]) * 0.5,
    ];
    let wc = mat3_apply(&v.rotation, lc);
    let wc = [
        v.center[0] + wc[0],
        v.center[1] + wc[1],
        v.center[2] + wc[2],
    ];
    let r = &v.rotation;
    let hx = r[0].abs() * half[0] + r[1].abs() * half[1] + r[2].abs() * half[2];
    let hy = r[3].abs() * half[0] + r[4].abs() * half[1] + r[5].abs() * half[2];
    let hz = r[6].abs() * half[0] + r[7].abs() * half[1] + r[8].abs() * half[2];
    Aabb {
        min: [wc[0] - hx, wc[1] - hy, wc[2] - hz],
        max: [wc[0] + hx, wc[1] + hy, wc[2] + hz],
    }
}

/// Ray-vessel intersection: transform the ray into vessel-local frame,
/// then query the model's triangle BVH.
fn ray_vessel_mesh(
    ray: &Ray,
    center: [f32; 3],
    rotation: &[f32; 9],
    model: &VesselModelBvh,
    max_t: f32,
) -> Option<f32> {
    let rel = [
        ray.origin[0] - center[0],
        ray.origin[1] - center[1],
        ray.origin[2] - center[2],
    ];
    let local_origin = mat3t_apply(rotation, rel);
    let local_dir = mat3t_apply(rotation, ray.dir);
    let local_ray = Ray::new(local_origin, local_dir);
    model.nearest_hit(&local_ray, max_t)
}

/// Apply a yaw delta (rotation around Y axis) to an existing row-major
/// 3x3 rotation matrix, returning the composed result.
fn apply_yaw_delta(rotation: &[f32; 9], yaw_delta: f32) -> [f32; 9] {
    let (sin_y, cos_y) = yaw_delta.sin_cos();
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

/// Compute the maximum ray distance before hitting the water surface.
/// Returns `range_m` if no water plane is configured or the ray doesn't
/// cross it.
#[inline]
fn water_clip(origin_y: f32, dir_y: f32, water_level: Option<f32>, range_m: f32) -> f32 {
    match water_level {
        Some(wl) if origin_y > wl && dir_y < 0.0 => {
            let t = (wl - origin_y) / dir_y;
            if t > 0.0 { t.min(range_m) } else { range_m }
        }
        _ => range_m,
    }
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
    vessel_models: &[VesselModelBvh],
    scene: &SceneSnapshot,
    sensor: &SensorPose,
    config: &LidarConfig,
) -> LidarFrame {
    let chans = config.channels.max(1) as usize;
    let azis = config.azimuths.max(1) as usize;
    let mut points: Vec<f32> = Vec::with_capacity(chans * azis * 3);
    let mut timestamps: Vec<f32> = Vec::new();

    let has_vessels = !scene.vessels.is_empty()
        && scene
            .vessels
            .iter()
            .all(|v| (v.model_index as usize) < vessel_models.len());

    let interpolate = config.sweep_duration_s > 0.0 && has_vessels;

    let static_vessel_bvh = if !interpolate && has_vessels {
        let aabbs: Vec<Aabb> = scene
            .vessels
            .iter()
            .map(|v| vessel_world_aabb(v, &vessel_models[v.model_index as usize]))
            .collect();
        Some(Bvh::build(&aabbs))
    } else {
        None
    };

    if interpolate {
        timestamps.reserve(chans * azis);
    }

    let fov_v = config.fov_v_deg.to_radians();
    let fov_h = config.fov_h_deg.to_radians();

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

            let local_dir = [cos_e * sin_a, sin_e, -cos_e * cos_a];
            let world_dir = mat3_apply(&sensor.rotation, local_dir);
            let ray = Ray::new(sensor.origin, world_dir);

            let effective_range =
                water_clip(sensor.origin[1], world_dir[1], config.water_level_y, config.range_m);

            let t_terrain = terrain.nearest_hit(&ray, effective_range);
            let upper = t_terrain.unwrap_or(effective_range);

            if interpolate {
                let t_frac = a as f32 / azis as f32;
                let dt = t_frac * config.sweep_duration_s;

                let interp_vessels: Vec<VesselInstance> = scene
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
                        VesselInstance {
                            model_index: v.model_index,
                            center,
                            rotation,
                            velocity: v.velocity,
                            angular_velocity_y: v.angular_velocity_y,
                        }
                    })
                    .collect();

                let aabbs: Vec<Aabb> = interp_vessels
                    .iter()
                    .map(|v| vessel_world_aabb(v, &vessel_models[v.model_index as usize]))
                    .collect();
                let bvh = Bvh::build(&aabbs);

                let t_vessel = bvh.nearest_hit(&ray, upper, |idx, ray, best| {
                    let v = &interp_vessels[idx as usize];
                    let model = &vessel_models[v.model_index as usize];
                    ray_vessel_mesh(ray, v.center, &v.rotation, model, best)
                });
                let t = t_vessel.or(t_terrain);

                if let Some(t) = t {
                    points.push(t * local_dir[0]);
                    points.push(t * local_dir[1]);
                    points.push(t * local_dir[2]);
                    timestamps.push(dt);
                }
            } else {
                let t_vessel = static_vessel_bvh.as_ref().and_then(|bvh| {
                    bvh.nearest_hit(&ray, upper, |idx, ray, best| {
                        let v = &scene.vessels[idx as usize];
                        let model = &vessel_models[v.model_index as usize];
                        ray_vessel_mesh(ray, v.center, &v.rotation, model, best)
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

    thread_local! {
        static TERRAIN: RefCell<Option<TerrainBvh>> = const { RefCell::new(None) };
        static VESSEL_MODELS: RefCell<Vec<VesselModelBvh>> = const { RefCell::new(Vec::new()) };
    }

    #[wasm_bindgen]
    pub fn lidar_init_terrain(triangles: JsValue) -> Result<(), JsValue> {
        let triangles: Vec<TerrainTriangle> = serde_wasm_bindgen::from_value(triangles)?;
        let bvh = TerrainBvh::build(triangles);
        TERRAIN.with(|t| *t.borrow_mut() = Some(bvh));
        Ok(())
    }

    #[wasm_bindgen]
    pub fn lidar_init_vessel_models(models: JsValue) -> Result<(), JsValue> {
        let raw: Vec<Vec<TerrainTriangle>> = serde_wasm_bindgen::from_value(models)?;
        let built: Vec<VesselModelBvh> = raw
            .into_iter()
            .map(VesselModelBvh::build)
            .collect();
        VESSEL_MODELS.with(|vm| *vm.borrow_mut() = built);
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
            VESSEL_MODELS.with(|vm| {
                let models = vm.borrow();
                let result = sweep(terrain, &models, &scene, &sensor, &config);
                Ok(serde_wasm_bindgen::to_value(&result)?)
            })
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
            water_level_y: None,
        }
    }

    fn sensor_at_origin() -> SensorPose {
        SensorPose {
            origin: [0.0, 0.0, 0.0],
            rotation: identity_rotation(),
        }
    }

    /// Build a box model from 12 triangles (6 faces × 2).
    fn box_triangles(half: [f32; 3]) -> Vec<TerrainTriangle> {
        let [hx, hy, hz] = half;
        let c = [
            [-hx, -hy, -hz],
            [hx, -hy, -hz],
            [hx, hy, -hz],
            [-hx, hy, -hz],
            [-hx, -hy, hz],
            [hx, -hy, hz],
            [hx, hy, hz],
            [-hx, hy, hz],
        ];
        let faces: [(usize, usize, usize); 12] = [
            (0, 2, 1),
            (0, 3, 2),
            (5, 7, 4),
            (5, 6, 7),
            (1, 6, 5),
            (1, 2, 6),
            (4, 3, 0),
            (4, 7, 3),
            (3, 6, 2),
            (3, 7, 6),
            (4, 1, 5),
            (4, 0, 1),
        ];
        faces
            .iter()
            .map(|&(a, b, cc)| TerrainTriangle {
                v: [c[a], c[b], c[cc]],
            })
            .collect()
    }

    fn box_model(half: [f32; 3]) -> VesselModelBvh {
        VesselModelBvh::build(box_triangles(half))
    }

    fn vessel_instance(model_index: u32, center: [f32; 3]) -> VesselInstance {
        VesselInstance {
            model_index,
            center,
            rotation: identity_rotation(),
            velocity: [0.0; 3],
            angular_velocity_y: 0.0,
        }
    }

    #[test]
    fn empty_scene_yields_zero_points() {
        let scene = SceneSnapshot { vessels: vec![] };
        let frame = sweep(
            &empty_terrain(),
            &[],
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
        let model = box_model([10.0, 5.0, 10.0]);
        let scene = SceneSnapshot {
            vessels: vec![vessel_instance(0, [0.0, 0.0, -50.0])],
        };
        let frame = sweep(
            &empty_terrain(),
            &[model],
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
        let model = box_model([10.0, 5.0, 10.0]);
        let scene = SceneSnapshot {
            vessels: vec![vessel_instance(0, [0.0, 0.0, -500.0])],
        };
        let frame = sweep(
            &empty_terrain(),
            &[model],
            &scene,
            &sensor_at_origin(),
            &cfg(8, 16, 30.0, 30.0, 100.0),
        );
        assert_eq!(frame.count, 0);
    }

    #[test]
    fn vessel_off_axis_stays_unhit_with_narrow_fov() {
        let model = box_model([5.0, 5.0, 5.0]);
        let scene = SceneSnapshot {
            vessels: vec![vessel_instance(0, [50.0, 0.0, 0.0])],
        };
        let frame = sweep(
            &empty_terrain(),
            &[model],
            &scene,
            &sensor_at_origin(),
            &cfg(4, 8, 10.0, 10.0, 100.0),
        );
        assert_eq!(frame.count, 0);
    }

    #[test]
    fn ground_plane_triangle_hits_under_downward_pitch() {
        let triangles = vec![TerrainTriangle {
            v: [
                [-100.0, -10.0, -100.0],
                [100.0, -10.0, -100.0],
                [0.0, -10.0, 100.0],
            ],
        }];
        let terrain = TerrainBvh::build(triangles);
        let scene = SceneSnapshot { vessels: vec![] };
        let pitch_down: [f32; 9] = [1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, -1.0, 0.0];
        let sensor = SensorPose {
            origin: [0.0, 0.0, 0.0],
            rotation: pitch_down,
        };
        let frame = sweep(&terrain, &[], &scene, &sensor, &cfg(4, 4, 10.0, 10.0, 100.0));
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
        let triangles = vec![TerrainTriangle {
            v: [
                [-100.0, -10.0, -100.0],
                [100.0, -10.0, -100.0],
                [0.0, -10.0, 100.0],
            ],
        }];
        let terrain = TerrainBvh::build(triangles);
        let model = box_model([2.0, 1.0, 2.0]);
        let scene = SceneSnapshot {
            vessels: vec![vessel_instance(0, [0.0, -5.0, 0.0])],
        };
        let pitch_down: [f32; 9] = [1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, -1.0, 0.0];
        let sensor = SensorPose {
            origin: [0.0, 0.0, 0.0],
            rotation: pitch_down,
        };
        let frame = sweep(
            &terrain,
            &[model],
            &scene,
            &sensor,
            &cfg(4, 4, 5.0, 5.0, 100.0),
        );
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
        let model = box_model([10.0, 5.0, 10.0]);
        let scene = SceneSnapshot {
            vessels: vec![vessel_instance(0, [0.0, 0.0, -50.0])],
        };
        let frame = sweep(
            &empty_terrain(),
            &[model],
            &scene,
            &sensor_at_origin(),
            &cfg(16, 16, 30.0, 30.0, 200.0),
        );
        assert!(frame.count > 0, "expected hits on a centred 10m box");
        assert!(
            frame.timestamps.is_empty(),
            "timestamps should be empty when sweep_duration_s == 0"
        );
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
        let model = box_model([10.0, 5.0, 10.0]);
        let scene = SceneSnapshot {
            vessels: vec![VesselInstance {
                model_index: 0,
                center: [0.0, 0.0, -50.0],
                rotation: identity_rotation(),
                velocity: [10.0, 0.0, 0.0],
                angular_velocity_y: 0.0,
            }],
        };
        let mut config = cfg(1, 8, 0.0, 10.0, 200.0);
        config.sweep_duration_s = 0.1;

        let frame = sweep(&empty_terrain(), &[model], &scene, &sensor_at_origin(), &config);
        assert!(frame.count > 0, "expected hits");
        assert_eq!(
            frame.timestamps.len(),
            frame.count as usize,
            "one timestamp per hit"
        );

        let t_min = frame
            .timestamps
            .iter()
            .cloned()
            .fold(f32::INFINITY, f32::min);
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

        let hit_points: Vec<[f32; 3]> = frame
            .points
            .chunks_exact(3)
            .map(|c| [c[0], c[1], c[2]])
            .collect();

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

    // --- Water plane tests ---

    #[test]
    fn water_plane_blocks_seabed_hits() {
        // Sensor at y=10 looking straight down. Seabed at y=-20.
        // Without water, hit at 30m. With water at y=0, no hit (ray
        // absorbed at 10m distance).
        let triangles = vec![TerrainTriangle {
            v: [
                [-100.0, -20.0, -100.0],
                [100.0, -20.0, -100.0],
                [0.0, -20.0, 100.0],
            ],
        }];
        let terrain = TerrainBvh::build(triangles);
        let scene = SceneSnapshot { vessels: vec![] };
        let pitch_down: [f32; 9] = [1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, -1.0, 0.0];
        let sensor = SensorPose {
            origin: [0.0, 10.0, 0.0],
            rotation: pitch_down,
        };

        // Without water — should hit seabed
        let config_no_water = cfg(1, 1, 0.0, 0.0, 100.0);
        let frame = sweep(&terrain, &[], &scene, &sensor, &config_no_water);
        assert!(frame.count > 0, "should hit seabed without water");

        // With water at y=0 — ray absorbed, no hit
        let mut config_water = cfg(1, 1, 0.0, 0.0, 100.0);
        config_water.water_level_y = Some(0.0);
        let frame = sweep(&terrain, &[], &scene, &sensor, &config_water);
        assert_eq!(frame.count, 0, "water plane should block seabed hit");
    }

    #[test]
    fn water_plane_allows_above_water_hits() {
        // Land (above water) should still be hit even with water plane.
        // Triangle must extend past the sensor in z so that downward
        // rays reach it before water_clip truncates them.
        let triangles = vec![TerrainTriangle {
            v: [
                [-100.0, 5.0, -200.0],
                [100.0, 5.0, -200.0],
                [0.0, 5.0, 100.0],
            ],
        }];
        let terrain = TerrainBvh::build(triangles);
        let scene = SceneSnapshot { vessels: vec![] };
        let sensor = SensorPose {
            origin: [0.0, 20.0, 50.0],
            rotation: identity_rotation(),
        };
        let mut config = cfg(4, 4, 30.0, 30.0, 200.0);
        config.water_level_y = Some(0.0);
        let frame = sweep(&terrain, &[], &scene, &sensor, &config);
        assert!(frame.count > 0, "above-water terrain should still be hit");
    }
}
