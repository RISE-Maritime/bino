import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { globSync } from "node:fs";
import { parse as yamlParse } from "yaml";
import { Scenario } from "@bino/core";

const scenariosDir = resolve(import.meta.dirname, "../../../scenarios");
const files = globSync("**/*.yaml", { cwd: scenariosDir }).sort();

describe("scenario YAML validation", () => {
  it.each(files)("%s validates against the Zod schema", async (file) => {
    const fullPath = resolve(scenariosDir, file);
    const text = await readFile(fullPath, "utf8");
    const data = yamlParse(text) as unknown;
    expect(data).toBeDefined();
    expect(typeof data).toBe("object");
    expect(data).toHaveProperty("scenario");
    const result = Scenario.parse((data as { scenario: unknown }).scenario);
    expect(result.name).toBeTruthy();
    expect(result.vessels.length).toBeGreaterThanOrEqual(1);
  });
});
