// Inject-augment merge primitives: combine a real radar spoke off the bus with
// Bino's synthetic return for the same azimuth. Pure functions — no scene, no
// IO — so the merge/index decisions are unit-testable without GL.
//
// See docs/internal/inject-augment.md. Radar returns are signal-additive, so the
// merge is a per-bin max; the only subtlety is that the real and synthetic
// spokes may be sampled on different range grids (the real radar's range scale
// changes during operation), so synthetic intensity is resampled onto the real
// spoke's grid before combining.

import type { RadarFrame, RadarSpoke } from "./radar.js";

const TAU = Math.PI * 2;

export interface SpokeGrid {
  /** Per-bin intensity, nearest bin first. `length` is the bin count. */
  intensity: Uint8Array;
  /** Maximum range covered by the last bin, metres. */
  range_m: number;
}

/**
 * Merge a synthetic spoke into a real spoke, returning intensity on the
 * **real** spoke's grid (real is authoritative — it is the live stream).
 *
 * Both grids start at range 0; bin `i` of a grid covers the range interval
 * centred at `(i + 0.5) · range_m / nBins`. When the grids differ, each real
 * bin samples the synthetic bin whose range interval contains the real bin's
 * centre (nearest-bin resample); real bins beyond the synthetic max range get
 * no synthetic contribution. When the grids match (same length and range) this
 * collapses to a plain element-wise max.
 */
export function mergeSpokeIntensity(real: SpokeGrid, synth: SpokeGrid): Uint8Array {
  const out = new Uint8Array(real.intensity);
  const nSynth = synth.intensity.length;
  if (nSynth === 0 || synth.range_m <= 0 || real.range_m <= 0) return out;

  const nReal = real.intensity.length;
  // Fast path: identical grids — element-wise max, no resample.
  if (nSynth === nReal && synth.range_m === real.range_m) {
    for (let i = 0; i < nReal; i++) {
      if (synth.intensity[i]! > out[i]!) out[i] = synth.intensity[i]!;
    }
    return out;
  }

  // Resample: map each real bin centre's range to a synthetic bin.
  const realBinM = real.range_m / nReal;
  const synthBinM = synth.range_m / nSynth;
  for (let i = 0; i < nReal; i++) {
    const rangeM = (i + 0.5) * realBinM;
    if (rangeM > synth.range_m) break; // beyond synthetic coverage — real only
    const j = Math.min(nSynth - 1, Math.floor(rangeM / synthBinM));
    const s = synth.intensity[j]!;
    if (s > out[i]!) out[i] = s;
  }
  return out;
}

/** Ground truth for one injected target at a revolution time, in the radar's
 *  bow-relative frame so it lines up with spoke azimuth by construction:
 *  `azimuth` matches the spoke that would contain the target, `range_m` the bin.
 *  `height_m` is the target's height above the sensor (radar is otherwise 2-D). */
export interface GroundTruthTarget {
  id: string;
  range_m: number;
  /** Bow-relative bearing in [0, 2π), same convention as RadarSpoke.azimuth. */
  azimuth: number;
  height_m: number;
}

/**
 * Compute the true range + bow-relative bearing of each injected target from the
 * radar host, using the *same* convention the kernel uses to label spokes
 * (`world_angle = host.heading + azimuth`, rays cast in the XZ plane). Because it
 * mirrors the kernel's geometry, a consumer can score a detection at spoke
 * azimuth `a`, range `r` directly against a target reported at `(a, r)`. Targets
 * beyond `maxRange_m` are dropped — they are not detectable truth.
 */
export function groundTruthTargets(
  host: { position: readonly [number, number, number]; heading: number },
  targets: ReadonlyArray<{ id: string; position: readonly [number, number, number] }>,
  maxRange_m: number,
): GroundTruthTarget[] {
  const out: GroundTruthTarget[] = [];
  for (const t of targets) {
    const dx = t.position[0] - host.position[0];
    const dz = t.position[2] - host.position[2];
    const range_m = Math.hypot(dx, dz);
    if (range_m > maxRange_m) continue;
    let azimuth = Math.atan2(dz, dx) - host.heading;
    azimuth = ((azimuth % TAU) + TAU) % TAU;
    out.push({ id: t.id, range_m, azimuth, height_m: t.position[1] - host.position[1] });
  }
  return out;
}

/**
 * Index a synthetic revolution by azimuth, returning the synthetic spoke
 * closest to `azimuth` (radians). Assumes the frame's spokes are evenly spaced
 * over `[0, 2π)` and sorted by index — which is exactly what the radar kernel
 * produces (`azimuth = i / N · 2π`) — so the lookup is O(1). Returns undefined
 * for an empty frame.
 */
export function nearestSpokeByAzimuth(frame: RadarFrame, azimuth: number): RadarSpoke | undefined {
  const n = frame.spokes.length;
  if (n === 0) return undefined;
  // Normalise to [0, 2π) then round to the nearest evenly-spaced index.
  let a = azimuth % TAU;
  if (a < 0) a += TAU;
  const idx = Math.round((a / TAU) * n) % n;
  return frame.spokes[idx];
}
