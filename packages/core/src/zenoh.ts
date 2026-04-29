import { MemoryPoseStream, type PoseStream } from "./pose.js";
import { decodePoseEnvelope } from "./keelson.js";

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

export interface ZenohPoseStreamOptions {
  session: ZenohSessionLike;
  vessels: ReadonlyArray<{ vesselId: string; topic: string }>;
}

export async function createZenohPoseStream(opts: ZenohPoseStreamOptions): Promise<PoseStream> {
  const subs = await Promise.all(
    opts.vessels.map(async (v) => ({
      vesselId: v.vesselId,
      sub: await opts.session.declareSubscriber(v.topic),
    })),
  );

  const buffer = new MemoryPoseStream();

  for (const { vesselId, sub } of subs) {
    const recv = sub.receiver();
    if (!recv) continue;
    void pumpSubscriber(recv, vesselId, buffer);
  }

  return {
    [Symbol.asyncIterator]: () => buffer[Symbol.asyncIterator](),
    close: () => {
      for (const { sub } of subs) {
        sub.undeclare().catch(() => {});
      }
      buffer.close();
    },
  };
}

async function pumpSubscriber(
  recv: AsyncIterable<ZenohSampleLike>,
  vesselId: string,
  buffer: MemoryPoseStream,
): Promise<void> {
  try {
    for await (const sample of recv) {
      const bytes = sample.payload().toBytes();
      const decoded = decodePoseEnvelope(bytes);
      if (!decoded) continue;
      // The Keelson topic key is authoritative for which vessel this
      // pose belongs to; override whatever the payload's
      // child_frame_id claims.
      buffer.push({ ...decoded, entityId: vesselId });
    }
  } catch {
    // subscriber error / undeclare race — silently end this pump
  }
}
