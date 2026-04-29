#!/usr/bin/env node
import { argv, exit, stderr, stdout } from "node:process";
import { loadScenario } from "./yaml.js";

async function main(): Promise<void> {
  const [, , scenarioPath] = argv;
  if (!scenarioPath) {
    stderr.write("usage: bino-node <scenario.yaml>\n");
    exit(1);
  }
  const scene = await loadScenario(scenarioPath);
  stdout.write(
    `loaded scenario '${scene.name}': ${scene.vessels.length} vessel(s), ` +
      `mode=${scene.modes.rendering}/${scene.modes.clock}/${scene.modes.determinism}\n`,
  );
}

main().catch((err) => {
  stderr.write(`bino-node: ${err instanceof Error ? err.message : String(err)}\n`);
  exit(2);
});
