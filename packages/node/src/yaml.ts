import { readFile } from "node:fs/promises";
import { parse as yamlParse } from "yaml";
import { compileScenario, type CompiledScene } from "@bino/core";

export async function loadScenario(path: string): Promise<CompiledScene> {
  const text = await readFile(path, "utf8");
  const data = yamlParse(text) as unknown;
  if (data === null || typeof data !== "object" || !("scenario" in data)) {
    throw new Error(`${path}: YAML missing top-level 'scenario:' key`);
  }
  try {
    return compileScenario((data as { scenario: unknown }).scenario);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`${path}: ${detail}`, { cause: err });
  }
}
