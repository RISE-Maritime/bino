//! S14 — sanity-check the cost of a naive linear ray-vs-AABB-list
//! scan at the v0.4b lidar's worst-case scene complexity.
//!
//! Rationale: v0.3 radar already uses linear scan (per-spoke,
//! against a vessel list of ~10). v0.4b lidar has a much bigger ray
//! budget (115k/sec vs radar's 360/sec) and more potential
//! geometry (terrain triangles ≫ vessel boxes). If naive scan
//! handles 115k rays × 60k AABBs/sec, we don't need a BVH. If
//! not, we do — and the BVH cost is amortized over the same ray
//! budget.

use std::time::Instant;

#[derive(Clone, Copy)]
struct Aabb {
    min: [f32; 3],
    max: [f32; 3],
}

#[derive(Clone, Copy)]
struct Ray {
    origin: [f32; 3],
    dir: [f32; 3],
}

#[inline(always)]
fn ray_aabb(ray: &Ray, b: &Aabb, max_t: f32) -> Option<f32> {
    let mut t_min = 0.0_f32;
    let mut t_max = max_t;
    for axis in 0..3 {
        let inv = 1.0 / ray.dir[axis];
        let mut t1 = (b.min[axis] - ray.origin[axis]) * inv;
        let mut t2 = (b.max[axis] - ray.origin[axis]) * inv;
        if t1 > t2 {
            std::mem::swap(&mut t1, &mut t2);
        }
        if t1 > t_min {
            t_min = t1;
        }
        if t2 < t_max {
            t_max = t2;
        }
        if t_max < t_min {
            return None;
        }
    }
    Some(t_min)
}

fn synthetic_aabbs(n: usize) -> Vec<Aabb> {
    // Distribute n boxes across a 10 km × 10 km × 100 m volume.
    let mut out = Vec::with_capacity(n);
    let side = (n as f32).sqrt().ceil() as usize;
    let step = 10_000.0 / side as f32;
    for iy in 0..side {
        for ix in 0..side {
            if out.len() >= n {
                break;
            }
            let x = ix as f32 * step - 5_000.0;
            let z = iy as f32 * step - 5_000.0;
            out.push(Aabb {
                min: [x, -100.0, z],
                max: [x + step * 0.8, 0.0, z + step * 0.8],
            });
        }
    }
    out
}

fn synthetic_rays(n: usize, max_range: f32) -> Vec<Ray> {
    let mut out = Vec::with_capacity(n);
    // 32 elevation channels × n/32 azimuth samples.
    let channels = 32;
    let azimuths = (n + channels - 1) / channels;
    let elev_lo: f32 = -15.0_f32.to_radians();
    let elev_hi: f32 = 15.0_f32.to_radians();
    for c in 0..channels {
        for a in 0..azimuths {
            if out.len() >= n {
                break;
            }
            let el = elev_lo + (elev_hi - elev_lo) * (c as f32 / (channels - 1) as f32);
            let az = (a as f32 / azimuths as f32) * std::f32::consts::TAU;
            let dx = az.cos() * el.cos();
            let dy = el.sin();
            let dz = az.sin() * el.cos();
            out.push(Ray {
                origin: [0.0, 5.0, 0.0],
                dir: [dx, dy, dz],
            });
            let _ = max_range; // silence unused
        }
    }
    out
}

fn naive_scan(rays: &[Ray], boxes: &[Aabb], max_range: f32) -> usize {
    let mut hits = 0;
    for r in rays {
        let mut best = max_range;
        let mut hit = false;
        for b in boxes {
            if let Some(t) = ray_aabb(r, b, best) {
                if t < best {
                    best = t;
                    hit = true;
                }
            }
        }
        if hit {
            hits += 1;
        }
    }
    hits
}

fn main() {
    let max_range = 200.0_f32;

    // The scenarios we care about for v0.4b lidar:
    let configurations = [
        ("v0.3-radar-equiv", 360, 10),    // ~baseline (radar uses ~10 vessel boxes)
        ("v0.3-lidar-only", 11_520, 10),  // 32×360 rays, ~10 vessels
        ("v0.3-lidar-full", 11_520, 100), // 100 vessel boxes
        ("v0.4b-with-terrain", 11_520, 5_000), // terrain triangulated to 5k AABBs
        ("v0.4b-dense-terrain", 11_520, 60_000), // worst-case 60k AABBs
    ];

    println!("{:<22} {:>8} {:>8} {:>10} {:>10}", "scenario", "rays", "boxes", "ms", "rays/s");
    println!("{}", "-".repeat(64));
    for (label, n_rays, n_boxes) in configurations.iter().copied() {
        let boxes = synthetic_aabbs(n_boxes);
        let rays = synthetic_rays(n_rays, max_range);
        // Warm-up
        let _ = naive_scan(&rays, &boxes, max_range);
        let t0 = Instant::now();
        let hits = naive_scan(&rays, &boxes, max_range);
        let ms = t0.elapsed().as_secs_f64() * 1000.0;
        let rps = (n_rays as f64 / ms) * 1000.0;
        println!(
            "{:<22} {:>8} {:>8} {:>10.2} {:>10.0}  hits={}",
            label, n_rays, n_boxes, ms, rps, hits
        );
    }
}
