import { Config, open } from "@eclipse-zenoh/zenoh-ts";
import { createZenohPoseStream, type PoseStream } from "@bino/core";

export interface ZenohConnection {
  stream: PoseStream;
  close(): Promise<void>;
}

export async function connectZenohPoses(
  wsUrl: string,
  vessels: ReadonlyArray<{ vesselId: string; topic: string }>,
): Promise<ZenohConnection> {
  const session = await open(new Config(wsUrl));
  const stream = await createZenohPoseStream({ session, vessels });
  return {
    stream,
    close: async () => {
      stream.close();
      await session.close().catch(() => {});
    },
  };
}

export function vesselsForZenoh(
  scenarioVessels: ReadonlyArray<{ id: string; pose_source: { type: string; topic?: string } }>,
): Array<{ vesselId: string; topic: string }> {
  const out: Array<{ vesselId: string; topic: string }> = [];
  for (const v of scenarioVessels) {
    if (v.pose_source.type === "zenoh" && v.pose_source.topic) {
      out.push({ vesselId: v.id, topic: v.pose_source.topic });
    }
  }
  return out;
}
