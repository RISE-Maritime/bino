import { Scenario, type Scenario as ScenarioT } from "./dsl.js";
import {
  resolveNavIdentity,
  resolveOutputIdentity,
  cameraTopicKey,
  lidarTopicKey,
  radarTopicKey,
  radarSpokeTopicKey,
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
  checkAugmentSources(parsed);

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

/** Inject-augment validation (docs/internal/inject-augment.md). A radar sensor
 *  with `augment_source` subscribes to a real radar_spoke stream and republishes
 *  the merged result on its own resolved spoke key. Two ways to get it wrong are
 *  worth catching at compile time: using it outside inject mode (the renderer
 *  would still draw the world, so "merge into reality" is meaningless), and
 *  pointing it at its own output key (an immediate feedback loop). */
function checkAugmentSources(s: ScenarioT): void {
  const base = s.keelson.base_path;
  for (const v of s.vessels) {
    for (const sensor of v.sensors) {
      if (sensor.type !== "radar_marine" && sensor.type !== "lidar") continue;
      if (!sensor.augment_source) continue;
      const owner = `${v.id}/${sensor.id}`;
      if (s.modes.rendering !== "inject") {
        throw new Error(
          `sensor '${owner}' sets augment_source but modes.rendering is ` +
            `'${s.modes.rendering}' — augmentation is only valid in inject mode`,
        );
      }
      const id = resolveOutputIdentity({
        scenarioBasePath: base,
        vesselId: v.id,
        ...(v.keelson ? { vesselKeelson: v.keelson } : {}),
        sensorId: sensor.id,
        ...(sensor.keelson ? { sensorKeelson: sensor.keelson } : {}),
      });
      // The augmented stream is republished on the sensor's own output subject;
      // pointing the source at it would be an immediate feedback loop.
      const ownKey = sensor.type === "radar_marine" ? radarSpokeTopicKey(id) : lidarTopicKey(id);
      if (sensor.augment_source === ownKey) {
        throw new Error(
          `sensor '${owner}' augment_source equals its own output key ` +
            `'${sensor.augment_source}' — that is a feedback loop; subscribe to the ` +
            `real sensor's key, which must differ from Bino's augmented output`,
        );
      }
    }
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
