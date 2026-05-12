//! Ray primitives — slab-method ray-AABB, ray-OBB (yaw-or-arbitrary
//! oriented box via 3x3 rotation), and Möller-Trumbore ray-triangle.

use crate::Aabb;

#[derive(Clone, Copy, Debug)]
pub struct Ray {
    pub origin: [f32; 3],
    pub dir: [f32; 3],
    /// 1.0 / dir[i], precomputed to amortize over many AABB tests.
    pub inv_dir: [f32; 3],
}

impl Ray {
    #[inline]
    pub fn new(origin: [f32; 3], dir: [f32; 3]) -> Self {
        Self {
            origin,
            dir,
            inv_dir: [
                if dir[0] != 0.0 { 1.0 / dir[0] } else { f32::INFINITY },
                if dir[1] != 0.0 { 1.0 / dir[1] } else { f32::INFINITY },
                if dir[2] != 0.0 { 1.0 / dir[2] } else { f32::INFINITY },
            ],
        }
    }
}

/// Apply a row-major 3x3 matrix to a vector: `m · v`.
#[inline]
pub fn mat3_apply(m: &[f32; 9], v: [f32; 3]) -> [f32; 3] {
    [
        m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
        m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
        m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
    ]
}

/// Apply the transpose of a row-major 3x3 matrix to a vector: `mᵀ · v`.
/// For an orthonormal rotation `R`, this is the inverse rotation.
#[inline]
pub fn mat3t_apply(m: &[f32; 9], v: [f32; 3]) -> [f32; 3] {
    [
        m[0] * v[0] + m[3] * v[1] + m[6] * v[2],
        m[1] * v[0] + m[4] * v[1] + m[7] * v[2],
        m[2] * v[0] + m[5] * v[1] + m[8] * v[2],
    ]
}

/// 3D slab-method ray-AABB. Returns Some(t_enter) if the ray enters the
/// box at a non-negative distance ≤ max_t; None otherwise. Uses the
/// precomputed inv_dir from `Ray`.
pub fn ray_aabb(ray: &Ray, aabb: &Aabb, max_t: f32) -> Option<f32> {
    let mut t_min: f32 = 0.0;
    let mut t_max: f32 = max_t;

    for axis in 0..3 {
        let inv = ray.inv_dir[axis];
        let t1 = (aabb.min[axis] - ray.origin[axis]) * inv;
        let t2 = (aabb.max[axis] - ray.origin[axis]) * inv;
        let (lo, hi) = if t1 < t2 { (t1, t2) } else { (t2, t1) };
        t_min = t_min.max(lo);
        t_max = t_max.min(hi);
        if t_max < t_min {
            return None;
        }
    }

    Some(t_min)
}

/// Möller-Trumbore ray-triangle intersection. Returns Some(t) for the
/// nearest non-negative hit ≤ max_t. Backface culling disabled — lidar
/// returns from terrain regardless of triangle winding.
pub fn ray_triangle(ray: &Ray, v: &[[f32; 3]; 3], max_t: f32) -> Option<f32> {
    const EPS: f32 = 1e-7;
    let edge1 = sub(v[1], v[0]);
    let edge2 = sub(v[2], v[0]);
    let h = cross(ray.dir, edge2);
    let a = dot(edge1, h);
    if a.abs() < EPS {
        return None;
    }
    let f = 1.0 / a;
    let s = sub(ray.origin, v[0]);
    let u = f * dot(s, h);
    if !(0.0..=1.0).contains(&u) {
        return None;
    }
    let q = cross(s, edge1);
    let vbary = f * dot(ray.dir, q);
    if vbary < 0.0 || u + vbary > 1.0 {
        return None;
    }
    let t = f * dot(edge2, q);
    if t > EPS && t <= max_t {
        Some(t)
    } else {
        None
    }
}

#[inline]
fn sub(a: [f32; 3], b: [f32; 3]) -> [f32; 3] {
    [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

#[inline]
fn cross(a: [f32; 3], b: [f32; 3]) -> [f32; 3] {
    [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ]
}

#[inline]
fn dot(a: [f32; 3], b: [f32; 3]) -> f32 {
    a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}
