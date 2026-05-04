//! Binary AABB BVH: top-down median-split build, stack-based
//! near-first traversal. Generic over leaf primitive — the caller
//! supplies an `intersect(prim_idx, ray, current_best_t)` closure that
//! returns Some(t) for closer hits or None.

use crate::geom::{ray_aabb, Ray};
use crate::Aabb;

/// One BVH node. Internal nodes have `left` and `right` indexing
/// further nodes; leaves use `left = u32::MAX` and `first_prim` +
/// `prim_count`.
#[derive(Clone, Copy, Debug)]
pub struct Node {
    pub aabb: Aabb,
    pub left: u32,
    pub right: u32,
    pub first_prim: u32,
    pub prim_count: u32,
}

impl Node {
    pub fn is_leaf(&self) -> bool {
        self.left == u32::MAX
    }
}

const LEAF_THRESHOLD: usize = 4;

pub struct Bvh {
    pub nodes: Vec<Node>,
    /// Permutation of [0, N) — leaf primitives index into this.
    pub indices: Vec<u32>,
}

impl Bvh {
    /// Build a BVH from per-primitive AABBs. Empty input yields an
    /// empty BVH (no nodes); `nearest_hit` short-circuits on this.
    pub fn build(prim_aabbs: &[Aabb]) -> Self {
        let n = prim_aabbs.len();
        if n == 0 {
            return Self {
                nodes: Vec::new(),
                indices: Vec::new(),
            };
        }
        let mut indices: Vec<u32> = (0..n as u32).collect();
        let centroids: Vec<[f32; 3]> = prim_aabbs.iter().map(|a| a.centroid()).collect();
        let mut nodes: Vec<Node> = Vec::with_capacity(2 * n);
        nodes.push(Node {
            aabb: Aabb::empty(),
            left: u32::MAX,
            right: u32::MAX,
            first_prim: 0,
            prim_count: n as u32,
        });
        build_recursive(&mut nodes, 0, &mut indices, prim_aabbs, &centroids);
        Self { nodes, indices }
    }

    /// Traverse for the nearest hit ≤ `max_t`. The `intersect` closure
    /// is called for each leaf primitive and should return Some(t) for
    /// hits closer than the current best.
    pub fn nearest_hit<F>(&self, ray: &Ray, max_t: f32, mut intersect: F) -> Option<f32>
    where
        F: FnMut(u32, &Ray, f32) -> Option<f32>,
    {
        if self.nodes.is_empty() {
            return None;
        }
        let mut stack: [u32; 64] = [0; 64];
        let mut sp = 1;
        stack[0] = 0;
        let mut best = max_t;

        while sp > 0 {
            sp -= 1;
            let idx = stack[sp] as usize;
            let node = &self.nodes[idx];
            if ray_aabb(ray, &node.aabb, best).is_none() {
                continue;
            }
            if node.is_leaf() {
                for k in 0..node.prim_count {
                    let prim = self.indices[(node.first_prim + k) as usize];
                    if let Some(t) = intersect(prim, ray, best) {
                        if t < best {
                            best = t;
                        }
                    }
                }
            } else {
                let l = node.left as usize;
                let r = node.right as usize;
                let lt = ray_aabb(ray, &self.nodes[l].aabb, best);
                let rt = ray_aabb(ray, &self.nodes[r].aabb, best);
                // Tree deeper than 64 levels — should not happen with
                // median-split on reasonable inputs. Bail safely if so.
                if sp + 2 > stack.len() {
                    return if best < max_t { Some(best) } else { None };
                }
                match (lt, rt) {
                    (None, None) => {}
                    (Some(_), None) => {
                        stack[sp] = l as u32;
                        sp += 1;
                    }
                    (None, Some(_)) => {
                        stack[sp] = r as u32;
                        sp += 1;
                    }
                    (Some(la), Some(rb)) => {
                        let (near, far) = if la < rb { (l, r) } else { (r, l) };
                        stack[sp] = far as u32;
                        sp += 1;
                        stack[sp] = near as u32;
                        sp += 1;
                    }
                }
            }
        }

        if best < max_t {
            Some(best)
        } else {
            None
        }
    }
}

fn build_recursive(
    nodes: &mut Vec<Node>,
    node_idx: usize,
    indices: &mut [u32],
    aabbs: &[Aabb],
    centroids: &[[f32; 3]],
) {
    let (first_prim, prim_count) = {
        let n = &nodes[node_idx];
        (n.first_prim as usize, n.prim_count as usize)
    };
    let slice = &mut indices[first_prim..first_prim + prim_count];

    let mut bbox = Aabb::empty();
    for &i in slice.iter() {
        bbox = bbox.union(&aabbs[i as usize]);
    }
    nodes[node_idx].aabb = bbox;

    if prim_count <= LEAF_THRESHOLD {
        return;
    }

    let centroid_box = Aabb::from_points(slice.iter().map(|&i| centroids[i as usize]));
    let extent = [
        centroid_box.max[0] - centroid_box.min[0],
        centroid_box.max[1] - centroid_box.min[1],
        centroid_box.max[2] - centroid_box.min[2],
    ];
    let axis = if extent[0] >= extent[1] && extent[0] >= extent[2] {
        0
    } else if extent[1] >= extent[2] {
        1
    } else {
        2
    };
    if extent[axis] <= 0.0 {
        // All centroids coincide — leave as a leaf.
        return;
    }

    let mid = slice.len() / 2;
    slice.select_nth_unstable_by(mid, |&a, &b| {
        centroids[a as usize][axis]
            .partial_cmp(&centroids[b as usize][axis])
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    let left_count = mid;
    let right_count = prim_count - mid;

    let left_idx = nodes.len();
    nodes.push(Node {
        aabb: Aabb::empty(),
        left: u32::MAX,
        right: u32::MAX,
        first_prim: first_prim as u32,
        prim_count: left_count as u32,
    });
    let right_idx = nodes.len();
    nodes.push(Node {
        aabb: Aabb::empty(),
        left: u32::MAX,
        right: u32::MAX,
        first_prim: (first_prim + left_count) as u32,
        prim_count: right_count as u32,
    });

    nodes[node_idx].left = left_idx as u32;
    nodes[node_idx].right = right_idx as u32;
    // Clear prim_count on the now-internal node so a bug in `is_leaf`
    // can't accidentally traverse stale leaf primitives.
    nodes[node_idx].prim_count = 0;

    build_recursive(nodes, left_idx, indices, aabbs, centroids);
    build_recursive(nodes, right_idx, indices, aabbs, centroids);
}
