// Inject-augment lidar loop (docs/internal/inject-augment.md).
//
// The lidar analogue of radar-augmenter.ts, and strictly simpler: a point cloud
// is sparse and self-describing (stride + fields on the wire), so there is no
// bin grid, no azimuth index, and no geometry to derive. Each real point_cloud
// is the trigger; Bino renders one synthetic cloud posed at the frame's time,
// concatenates it into the real cloud's exact layout, and republishes carrying
// the real frame's timestamp + frame_id.

import {
  appendSyntheticPoints,
  decodePointCloudPayload,
  encodePointCloudPayload,
  xyzFieldOffsets,
  type LidarFrame,
  type ZenohSessionLike,
} from "@bino/core";

export interface PublishSession {
  put(keyExpr: string, payload: Uint8Array): Promise<void>;
}

export interface LidarAugmenterOptions {
  /** Session used to subscribe to the real point_cloud stream. */
  session: ZenohSessionLike;
  /** Session used to publish the augmented point_cloud stream. */
  publish: PublishSession;
  /** Real point_cloud key to subscribe to. */
  realTopic: string;
  /** Augmented point_cloud key to publish on (distinct from realTopic). */
  publishTopic: string;
  /** Render one synthetic cloud at `time`, with entity poses sampled at `time`.
   *  Supplied by the node service (closes over the lidar kernel + PoseSampler). */
  renderFrame: (time: number) => LidarFrame;
  onStats?: (s: AugmentStats) => void;
}

export interface AugmentStats {
  /** Clouds republished with synthetic points concatenated in. */
  augmented: number;
  /** Clouds republished as-is — render failed, or the real cloud's layout has no
   *  FLOAT32 xyz to pack synthetic points into. The explicit keep-up fallback. */
  forwarded: number;
}

export interface LidarAugmenter {
  run(): Promise<void>;
  stop(): Promise<void>;
  readonly stats: AugmentStats;
}

export function createLidarAugmenter(opts: LidarAugmenterOptions): LidarAugmenter {
  const stats: AugmentStats = { augmented: 0, forwarded: 0 };
  let subscriber: { undeclare: () => Promise<void> } | undefined;
  let stopped = false;

  async function handleCloud(bytes: Uint8Array): Promise<void> {
    const real = decodePointCloudPayload(bytes);
    if (!real) return;

    const offsets = xyzFieldOffsets(real.fields);
    let synth: LidarFrame | undefined;
    if (offsets) {
      try {
        synth = opts.renderFrame(real.time);
      } catch (err) {
        synth = undefined;
        console.warn(`[bino] lidar augment render failed: ${asMessage(err)}`);
      }
    }

    let out = real;
    if (offsets && synth) {
      out = {
        ...real,
        data: appendSyntheticPoints(
          real.data,
          real.pointStride,
          offsets,
          synth.points,
          synth.count,
        ),
      };
      stats.augmented++;
    } else {
      // Keep-up fallback: forward the real cloud unchanged, counted so the gap
      // is visible rather than silently dropping synthetic returns.
      stats.forwarded++;
    }

    const e = encodePointCloudPayload(out, opts.publishTopic);
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
          await handleCloud(sample.payload().toBytes());
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
