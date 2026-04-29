import { decodePoseMessage, MemoryPoseStream, type PoseStream } from "@bino/core";

export interface ZenohSampleLike {
  payload: () => { toString: () => string };
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
      const text = sample.payload().toString();
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        continue;
      }
      const update = decodePoseMessage(json, vesselId);
      if (update) buffer.push(update);
    }
  } catch {
    // subscriber error / undeclare race — silently end this pump
  }
}
