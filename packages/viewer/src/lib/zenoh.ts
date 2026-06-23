import { Config, open } from "@eclipse-zenoh/zenoh-ts";
import {
  createZenohPoseStream,
  navTopicKeys,
  navSourceOverrides,
  resolveNavIdentity,
  type Anchor,
  type NavTopicKeys,
  type PoseStream,
} from "@bino/core";

export interface ZenohConnection {
  stream: PoseStream;
  close(): Promise<void>;
}

/** Minimal shape of a scenario vessel this module needs. Mirrors the core DSL
 *  PoseSource union (zenoh frame_transform | decomposed keelson_nav). */
interface ScenarioVesselLike {
  id: string;
  keelson?: { base_path?: string; entity_id?: string };
  pose_source:
    | { type: "zenoh"; topic?: string }
    | {
        type: "keelson_nav";
        base_path?: string;
        entity_id?: string;
        source_id: string;
        target_id?: string;
        location_fix_source?: string;
        heading_source?: string;
        pitch_source?: string;
        roll_source?: string;
        altitude_mode?: "waterline" | "fix";
      };
}

export interface ZenohConnectOptions {
  /** Required when any vessel uses keelson_nav — the datum fixes are projected through. */
  anchor?: Anchor;
  /** Scenario-level keelson base_path, the bottom of the ADR-004 cascade. */
  scenarioBasePath?: string;
}

export async function connectZenohPoses(
  wsUrl: string,
  vessels: ReadonlyArray<ScenarioVesselLike>,
  opts: ZenohConnectOptions = {},
): Promise<ZenohConnection> {
  const session = await open(new Config(wsUrl));
  const ft = vesselsForZenoh(vessels);
  const nav = navVesselsForZenoh(vessels, opts.scenarioBasePath ?? "bino");
  const stream = await createZenohPoseStream({
    session,
    vessels: ft,
    nav,
    ...(opts.anchor ? { anchor: opts.anchor } : {}),
  });
  return {
    stream,
    close: async () => {
      stream.close();
      await session.close().catch(() => {});
    },
  };
}

/** frame_transform pose sources: subscribe to the raw pose topic directly. */
export function vesselsForZenoh(
  scenarioVessels: ReadonlyArray<ScenarioVesselLike>,
): Array<{ vesselId: string; topic: string }> {
  const out: Array<{ vesselId: string; topic: string }> = [];
  for (const v of scenarioVessels) {
    if (v.pose_source.type === "zenoh" && v.pose_source.topic) {
      out.push({ vesselId: v.id, topic: v.pose_source.topic });
    }
  }
  return out;
}

/** keelson_nav pose sources: resolve the four decomposed-nav subject keys
 *  (location_fix + heading/pitch/roll) through the ADR-004 identity cascade,
 *  so the viewer fuses + projects them exactly like the node CLI does. */
export function navVesselsForZenoh(
  scenarioVessels: ReadonlyArray<ScenarioVesselLike>,
  scenarioBasePath: string,
): Array<{ vesselId: string; keys: NavTopicKeys; useFixAltitude: boolean }> {
  const out: Array<{ vesselId: string; keys: NavTopicKeys; useFixAltitude: boolean }> = [];
  for (const v of scenarioVessels) {
    if (v.pose_source.type === "keelson_nav") {
      const identity = resolveNavIdentity({
        scenarioBasePath,
        vesselId: v.id,
        ...(v.keelson ? { vesselKeelson: v.keelson } : {}),
        poseSource: v.pose_source,
      });
      out.push({
        vesselId: v.id,
        keys: navTopicKeys(identity, navSourceOverrides(v.pose_source)),
        useFixAltitude: v.pose_source.altitude_mode === "fix",
      });
    }
  }
  return out;
}
