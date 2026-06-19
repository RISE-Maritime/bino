// Inject-augment radar loop (docs/internal/inject-augment.md).
//
// Subscribes to a *real* radar_spoke stream off the Keelson bus, merges Bino's
// synthetic returns into each spoke, and republishes a single augmented stream.
// There is no Bino clock here: each inbound real spoke is the trigger and
// carries its own time. The synthetic revolution is rendered once per real
// revolution (detected by azimuth wrap) and indexed per spoke by azimuth —
// spokes arrive far faster than the scene can be re-raycast.
//
// The renderer is injected as `renderRevolution`, so this orchestration is
// testable without GL: a fake renderer + fake session exercise the full
// decode → index → merge → publish path including the keep-up fallback.

import {
  decodeRadarSpokeEnvelope,
  encodeGroundTruth,
  encodeRadarSpoke,
  mergeSpokeIntensity,
  nearestSpokeByAzimuth,
  type GroundTruthTarget,
  type RadarFrame,
  type ZenohSessionLike,
} from "@bino/core";

export interface RadarGeom {
  range_m: number;
  range_bins: number;
  spokes_per_rev: number;
}

export interface PublishSession {
  put(keyExpr: string, payload: Uint8Array): Promise<void>;
}

export interface RadarAugmenterOptions {
  /** Session used to subscribe to the real radar_spoke stream. */
  session: ZenohSessionLike;
  /** Session used to publish the augmented radar_spoke stream. */
  publish: PublishSession;
  /** Real radar_spoke key to subscribe to. */
  realTopic: string;
  /** Augmented radar_spoke key to publish on (distinct from realTopic). */
  publishTopic: string;
  /** Render one synthetic revolution at `time`, on the given geometry, with
   *  entity poses sampled at `time`. Supplied by the node service (closes over
   *  the radar kernel + PoseSampler). */
  renderRevolution: (time: number, geom: RadarGeom) => RadarFrame;
  /** Geometry used until it can be derived from the stream (DSL radar fields,
   *  per ADR — advisory, not authoritative). spokes_per_rev is the fallback for
   *  the first revolution; range/bins are always taken from the live spoke. */
  fallbackGeom: RadarGeom;
  /** Optional ground-truth co-publish: once per revolution, the true state of
   *  the injected targets is published on `topic`, in the same frame as the
   *  merged stream, so a consumer can score detections against truth.
   *  `render(time)` returns the targets at the revolution time (the scene is
   *  already posed at that time by `renderRevolution`, which runs first). */
  groundTruth?: {
    topic: string;
    render: (time: number) => GroundTruthTarget[];
  };
  /** Observe per-revolution counts (augmented vs forwarded). */
  onStats?: (s: AugmentStats) => void;
}

export interface AugmentStats {
  /** Spokes republished with synthetic returns merged in. */
  augmented: number;
  /** Spokes republished as-is because no synthetic data was available in time
   *  (render not ready, merge skipped/failed) — the explicit keep-up fallback. */
  forwarded: number;
  /** Ground-truth target messages published (across all revolutions). */
  groundTruth: number;
}

export interface RadarAugmenter {
  /** Run until the subscriber ends or `stop()` is called. */
  run(): Promise<void>;
  stop(): Promise<void>;
  readonly stats: AugmentStats;
}

export function createRadarAugmenter(opts: RadarAugmenterOptions): RadarAugmenter {
  const stats: AugmentStats = { augmented: 0, forwarded: 0, groundTruth: 0 };

  // Cache of the current synthetic revolution + the geometry it was rendered on.
  let synthFrame: RadarFrame | undefined;
  let synthRange_m = opts.fallbackGeom.range_m;

  // Revolution tracking for wrap detection + spokes_per_rev derivation.
  let prevAzimuth = Number.POSITIVE_INFINITY;
  let spokesThisRev = 0;
  let derivedSpokesPerRev: number | undefined;

  let subscriber: { undeclare: () => Promise<void> } | undefined;
  let stopped = false;

  async function handleSpoke(bytes: Uint8Array): Promise<void> {
    const real = decodeRadarSpokeEnvelope(bytes);
    if (!real) return;

    // New revolution: azimuth wrapped back (or first spoke). Re-render the
    // synthetic revolution at this spoke's time, on the real spoke's geometry.
    const wrapped = real.azimuth < prevAzimuth;
    prevAzimuth = real.azimuth;
    if (wrapped) {
      if (spokesThisRev > 0) derivedSpokesPerRev = spokesThisRev;
      spokesThisRev = 0;
      const range_m = real.range > 0 ? real.range : opts.fallbackGeom.range_m;
      const range_bins = real.intensity.length || opts.fallbackGeom.range_bins;
      const spokes_per_rev = derivedSpokesPerRev ?? opts.fallbackGeom.spokes_per_rev;
      try {
        synthFrame = opts.renderRevolution(real.time, { range_m, range_bins, spokes_per_rev });
        synthRange_m = range_m;
      } catch (err) {
        // Render failure — fall back to real-only for this revolution.
        synthFrame = undefined;
        console.warn(`[bino] radar augment render failed: ${asMessage(err)}`);
      }
      // Ground truth for the injected targets, in the merged stream's frame
      // (real.frameId), once per revolution. The scene is already posed at
      // real.time by renderRevolution above.
      if (opts.groundTruth) {
        try {
          const targets = opts.groundTruth.render(real.time);
          for (const e of encodeGroundTruth(
            targets,
            real.time,
            real.frameId,
            opts.groundTruth.topic,
          )) {
            await opts.publish.put(e.keyExpr, e.bytes);
            stats.groundTruth++;
          }
        } catch (err) {
          console.warn(`[bino] radar augment ground-truth failed: ${asMessage(err)}`);
        }
      }
    }
    spokesThisRev++;

    const synthSpoke = synthFrame ? nearestSpokeByAzimuth(synthFrame, real.azimuth) : undefined;

    let intensity = real.intensity;
    if (synthSpoke) {
      intensity = mergeSpokeIntensity(
        { intensity: real.intensity, range_m: real.range },
        { intensity: synthSpoke.intensity, range_m: synthRange_m },
      );
      stats.augmented++;
    } else {
      // Keep-up fallback: forward the real spoke unchanged, counted so the
      // gap is visible rather than a silent latency creep.
      stats.forwarded++;
    }

    const e = encodeRadarSpoke(
      {
        azimuth: real.azimuth,
        intensity,
        range_m: real.range,
        time: real.time,
        frameId: real.frameId,
      },
      opts.publishTopic,
    );
    await opts.publish.put(e.keyExpr, e.bytes);
    opts.onStats?.(stats);
  }

  return {
    stats,
    async run(): Promise<void> {
      const sub = await opts.session.declareSubscriber(opts.realTopic);
      subscriber = sub;
      const recv = sub.receiver();
      if (!recv) return;
      try {
        for await (const sample of recv) {
          if (stopped) break;
          await handleSpoke(sample.payload().toBytes());
        }
      } catch {
        // subscriber error / undeclare race — end the loop quietly
      }
    },
    async stop(): Promise<void> {
      stopped = true;
      await subscriber?.undeclare().catch(() => {});
    },
  };
}

function asMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
