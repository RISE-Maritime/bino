import { describe, expect, it } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadScenario } from "../src/yaml.js";

async function withTempScenario(yaml: string, fn: (path: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), "bino-test-"));
  const path = join(dir, "scenario.yaml");
  await writeFile(path, yaml, "utf8");
  try {
    await fn(path);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const validYaml = `
scenario:
  name: test-loader
  keelson:
    base_path: bino
  anchor:
    lat: 54.3233
    lon: 10.1394
    height: 0.0
  vessels:
    - id: ego
      model: tanker_120m
      pose_source: { type: zenoh, topic: ego/pose }
      sensors:
        - id: bow_camera
          type: camera
          mount: { x: 110, y: 0, z: 28 }
          fov_deg: 90
          resolution: [1920, 1080]
          rate_hz: 10
  modes:
    rendering: replace
    clock: wall
    determinism: relaxed
`;

describe("loadScenario", () => {
  it("loads a YAML file, unwraps scenario:, and returns a CompiledScene", async () => {
    await withTempScenario(validYaml, async (path) => {
      const scene = await loadScenario(path);
      expect(scene.name).toBe("test-loader");
      expect(scene.vessels).toHaveLength(1);
      expect(scene.vessels[0]?.sensors).toHaveLength(1);
    });
  });

  it("rejects YAML without a top-level scenario: key", async () => {
    await withTempScenario("name: bad\n", async (path) => {
      await expect(loadScenario(path)).rejects.toThrow(/scenario/i);
    });
  });

  it("propagates Zod validation errors with the file path in the message", async () => {
    const bad = validYaml.replace("rendering: replace", "rendering: garbage");
    await withTempScenario(bad, async (path) => {
      await expect(loadScenario(path)).rejects.toThrow(/scenario\.yaml/);
    });
  });
});
