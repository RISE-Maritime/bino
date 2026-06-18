import { Scenario, type Scenario as ScenarioT } from "./dsl.js";
import {
  resolveNavIdentity,
  resolveOutputIdentity,
  cameraTopicKey,
  lidarTopicKey,
  radarTopicKey,
  type KeelsonKeyIdentity,
} from "./keelson.js";

export interface CompiledScene {
  name: string;
  anchor: ScenarioT["anchor"];
  vessels: ScenarioT["vessels"];
  modes: ScenarioT["modes"];
  environment: ScenarioT["environment"];
  terrain?: ScenarioT["terrain"];
  keelson: ScenarioT["keelson"];
}

export function compileScenario(input: unknown): CompiledScene {
  const parsed = Scenario.parse(input);

  if (parsed.modes.determinism === "strict" && parsed.modes.clock !== "stepped") {
    throw new Error(`strict determinism requires stepped clock (got '${parsed.modes.clock}')`);
  }

  if (parsed.modes.rendering === "inject" && parsed.modes.determinism !== "strict") {
    console.warn(
      "[bino] inject mode without strict determinism is unusual — inject typically requires tight time-sync",
    );
  }

  checkKeelsonKeys(parsed);

  return {
    name: parsed.name,
    anchor: parsed.anchor,
    vessels: parsed.vessels,
    modes: parsed.modes,
    environment: parsed.environment,
    ...(parsed.terrain ? { terrain: parsed.terrain } : {}),
    keelson: parsed.keelson,
  };
}

function outputKeyFor(
  type: ScenarioT["vessels"][number]["sensors"][number]["type"],
  id: KeelsonKeyIdentity,
): string {
  switch (type) {
    case "camera":
      return cameraTopicKey(id);
    case "lidar":
      return lidarTopicKey(id);
    case "radar_marine":
      return radarTopicKey(id);
  }
}

/** ADR-004 cascade validation. Resolved sensor *output* keys must be unique
 *  scenario-wide — once entity/source segments are configurable, two emitters
 *  can collide and silently clobber each other. Also surfaces the observed-
 *  traffic footgun: a keelson_nav feed with a `target_id` but an inherited
 *  `entity_id` subscribes under the vessel's own identity instead of the
 *  receiving platform's. */
function checkKeelsonKeys(s: ScenarioT): void {
  const base = s.keelson.base_path;
  const seen = new Map<string, string>();

  for (const v of s.vessels) {
    for (const sensor of v.sensors) {
      const id = resolveOutputIdentity({
        scenarioBasePath: base,
        vesselId: v.id,
        ...(v.keelson ? { vesselKeelson: v.keelson } : {}),
        sensorId: sensor.id,
        ...(sensor.keelson ? { sensorKeelson: sensor.keelson } : {}),
      });
      // publish_topic_override bypasses resolution, but it is still the key
      // actually emitted, so it participates in the collision check.
      const key = sensor.publish_topic_override ?? outputKeyFor(sensor.type, id);
      const owner = `${v.id}/${sensor.id}`;
      const prev = seen.get(key);
      if (prev) {
        throw new Error(
          `keelson output key collision: '${owner}' and '${prev}' both resolve to '${key}' ` +
            `(ADR-004: resolved output keys must be unique scenario-wide)`,
        );
      }
      seen.set(key, owner);
    }

    if (v.pose_source.type === "keelson_nav" && v.pose_source.target_id) {
      const id = resolveNavIdentity({
        scenarioBasePath: base,
        vesselId: v.id,
        ...(v.keelson ? { vesselKeelson: v.keelson } : {}),
        poseSource: v.pose_source,
      });
      if (id.entity_id === v.id) {
        console.warn(
          `[bino] vessel '${v.id}': keelson_nav has target_id '${v.pose_source.target_id}' but its ` +
            `entity_id resolves to the vessel itself — observed-traffic feeds should set ` +
            `pose_source.entity_id (or vessel.keelson.entity_id) to the receiving platform (ADR-004).`,
        );
      }
    }
  }
}
