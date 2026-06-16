import { describe, expect, it } from "vitest";
import { parseScenarioDoc, v01Scenario } from "./scenario.js";

describe("parseScenarioDoc", () => {
  it("unwraps a scenario:-keyed YAML document", () => {
    const yaml = `
scenario:
  name: test_loc
  anchor: { lat: 54.37, lon: 10.185, height: 0 }
  vessels:
    - id: ego
      model: tanker_120m
      pose_source: { type: zenoh, topic: ego/pose }
      sensors:
        - id: main_lidar
          type: lidar
          mount: { x: 0, y: 15, z: 0 }
          channels: 16
          range_m: 200
          rate_hz: 10
`;
    const scenario = parseScenarioDoc(yaml);
    expect(scenario.name).toBe("test_loc");
    expect(scenario.anchor.lat).toBe(54.37);
    expect(scenario.vessels[0]!.id).toBe("ego");
  });

  it("throws when the top-level 'scenario:' key is missing", () => {
    expect(() => parseScenarioDoc("name: oops\nvessels: []")).toThrow(/scenario:/);
  });

  it("round-trips the bundled demo scenario through YAML", () => {
    // JSON is a YAML subset, so the bundled object serialises and parses back.
    const doc = JSON.stringify({ scenario: v01Scenario });
    const parsed = parseScenarioDoc(doc);
    expect(parsed.name).toBe(v01Scenario.name);
    expect(parsed.vessels.length).toBe(v01Scenario.vessels.length);
  });
});
