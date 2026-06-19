// Sample-at-time pose history for inject-augment. The real sensor stream and the
// frame_transform pose stream arrive asynchronously at independent rates, so when
// a real spoke arrives at time T the augmenter must reconstruct each entity's
// pose *at T* — not reuse whichever pose happened to arrive last. This keeps a
// short per-entity history and interpolates (lerp position, slerp orientation)
// to the requested time, holding at the ends.
//
// Pure data structure, no scene/IO — see docs/internal/inject-augment.md.

import * as THREE from "three";
import type { Pose } from "./sensor.js";

interface Stamped {
  time: number;
  pose: Pose;
}

export interface PoseSamplerOptions {
  /** Discard samples older than this many seconds behind the newest received
   *  sample for the same entity. Bounds memory on a long run. Default 5 s. */
  horizon_s?: number;
}

const _qa = new THREE.Quaternion();
const _qb = new THREE.Quaternion();

export class PoseSampler {
  private readonly horizon_s: number;
  // Per-entity history, kept sorted by ascending time.
  private readonly byEntity = new Map<string, Stamped[]>();

  constructor(opts: PoseSamplerOptions = {}) {
    this.horizon_s = opts.horizon_s ?? 5;
  }

  /** Record a pose observation. Out-of-order arrivals are inserted in time
   *  order so interpolation stays monotonic. */
  record(entityId: string, pose: Pose, time: number): void {
    let hist = this.byEntity.get(entityId);
    if (!hist) {
      hist = [];
      this.byEntity.set(entityId, hist);
    }
    const last = hist[hist.length - 1];
    if (!last || time >= last.time) {
      hist.push({ time, pose });
    } else {
      // Rare out-of-order insert — find the slot.
      let i = hist.length - 1;
      while (i > 0 && hist[i - 1]!.time > time) i--;
      hist.splice(i, 0, { time, pose });
    }
    // Trim history older than the horizon behind the newest sample.
    const cutoff = hist[hist.length - 1]!.time - this.horizon_s;
    let drop = 0;
    while (drop < hist.length - 1 && hist[drop + 1]!.time < cutoff) drop++;
    if (drop > 0) hist.splice(0, drop);
  }

  /** Pose of `entityId` at `time`. Interpolates between bracketing samples;
   *  holds the nearest end when `time` is outside the recorded range. Returns
   *  undefined if the entity has no samples yet. */
  sample(entityId: string, time: number): Pose | undefined {
    const hist = this.byEntity.get(entityId);
    if (!hist || hist.length === 0) return undefined;
    if (hist.length === 1) return hist[0]!.pose;

    // Clamp to the ends (hold) rather than extrapolate.
    if (time <= hist[0]!.time) return hist[0]!.pose;
    const newest = hist[hist.length - 1]!;
    if (time >= newest.time) return newest.pose;

    // Binary search for the right bracket [lo, lo+1].
    let lo = 0;
    let hi = hist.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (hist[mid]!.time <= time) lo = mid;
      else hi = mid;
    }
    const a = hist[lo]!;
    const b = hist[lo + 1]!;
    const span = b.time - a.time;
    const t = span > 0 ? (time - a.time) / span : 0;
    return lerpPose(a.pose, b.pose, t);
  }

  /** Drop all history for an entity (or everything when no id given). */
  clear(entityId?: string): void {
    if (entityId === undefined) this.byEntity.clear();
    else this.byEntity.delete(entityId);
  }
}

function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const position: [number, number, number] = [
    a.position[0] + (b.position[0] - a.position[0]) * t,
    a.position[1] + (b.position[1] - a.position[1]) * t,
    a.position[2] + (b.position[2] - a.position[2]) * t,
  ];
  _qa.set(a.orientation[0], a.orientation[1], a.orientation[2], a.orientation[3]);
  _qb.set(b.orientation[0], b.orientation[1], b.orientation[2], b.orientation[3]);
  _qa.slerp(_qb, t);
  return { position, orientation: [_qa.x, _qa.y, _qa.z, _qa.w] };
}
