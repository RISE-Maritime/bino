import { MemoryPoseStream, type PoseStream } from "./pose.js";
import {
  decodePoseEnvelope,
  decodeLocationFixEnvelope,
  decodeTimestampedFloatEnvelope,
  type NavTopicKeys,
} from "./keelson.js";
import { LatestWinsNavFuser } from "./nav-fuser.js";
import type { Anchor } from "./dsl.js";

export interface ZenohSampleLike {
  payload: () => { toBytes: () => Uint8Array };
}

export interface ZenohSubscriberLike {
  receiver: () => AsyncIterable<ZenohSampleLike> | undefined;
  undeclare: () => Promise<void>;
}

export interface ZenohSessionLike {
  declareSubscriber: (keyExpr: string) => Promise<ZenohSubscriberLike>;
}

/** A decomposed-nav vessel: the four subject keys to subscribe to. */
export interface ZenohNavVessel {
  vesselId: string;
  keys: NavTopicKeys;
  /** Drive vertical position from the raw location_fix altitude instead of
   *  sitting the vessel at the waterline (anchor height). Default false. */
  useFixAltitude?: boolean;
}

export interface ZenohPoseStreamOptions {
  session: ZenohSessionLike;
  /** frame_transform vessels: one topic each, applied as a raw scene pose. */
  vessels?: ReadonlyArray<{ vesselId: string; topic: string }>;
  /** Decomposed-nav vessels: four subjects each, fused + projected by Bino. */
  nav?: ReadonlyArray<ZenohNavVessel>;
  /** Required when `nav` is non-empty — the geodetic datum to project fixes. */
  anchor?: Anchor;
  /** Observe the staleness latest-wins fusion accepts per fused pose. */
  onSkew?: (vesselId: string, skew_s: number) => void;
}

export async function createZenohPoseStream(opts: ZenohPoseStreamOptions): Promise<PoseStream> {
  const buffer = new MemoryPoseStream();
  const subs: ZenohSubscriberLike[] = [];

  const subscribe = async (keyExpr: string, handle: (bytes: Uint8Array) => void): Promise<void> => {
    const sub = await opts.session.declareSubscriber(keyExpr);
    subs.push(sub);
    const recv = sub.receiver();
    if (recv) void pump(recv, handle);
  };

  // frame_transform vessels — the Keelson topic key is authoritative for which
  // vessel a pose belongs to; override whatever child_frame_id the payload claims.
  for (const v of opts.vessels ?? []) {
    await subscribe(v.topic, (bytes) => {
      const decoded = decodePoseEnvelope(bytes);
      if (decoded) buffer.push({ ...decoded, entityId: v.vesselId });
    });
  }

  // Decomposed-nav vessels — fuse location_fix (the trigger) with the latest
  // heading/pitch/roll, projecting through the anchor.
  for (const nv of opts.nav ?? []) {
    if (!opts.anchor) {
      throw new Error("keelson_nav pose_source requires a scenario anchor");
    }
    const fuser = new LatestWinsNavFuser(nv.vesselId, opts.anchor, nv.useFixAltitude ?? false);
    await subscribe(nv.keys.locationFix, (bytes) => {
      const fix = decodeLocationFixEnvelope(bytes);
      if (!fix) return;
      const fused = fuser.fix(fix);
      buffer.push(fused.update);
      opts.onSkew?.(nv.vesselId, fused.skew_s);
    });
    await subscribe(nv.keys.heading, (bytes) => {
      const s = decodeTimestampedFloatEnvelope(bytes);
      if (s) fuser.setHeading(s);
    });
    await subscribe(nv.keys.pitch, (bytes) => {
      const s = decodeTimestampedFloatEnvelope(bytes);
      if (s) fuser.setPitch(s);
    });
    await subscribe(nv.keys.roll, (bytes) => {
      const s = decodeTimestampedFloatEnvelope(bytes);
      if (s) fuser.setRoll(s);
    });
  }

  return {
    [Symbol.asyncIterator]: () => buffer[Symbol.asyncIterator](),
    close: () => {
      for (const sub of subs) {
        sub.undeclare().catch(() => {});
      }
      buffer.close();
    },
  };
}

async function pump(
  recv: AsyncIterable<ZenohSampleLike>,
  handle: (bytes: Uint8Array) => void,
): Promise<void> {
  try {
    for await (const sample of recv) {
      handle(sample.payload().toBytes());
    }
  } catch {
    // subscriber error / undeclare race — silently end this pump
  }
}
