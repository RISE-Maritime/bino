#!/usr/bin/env node
import { argv, exit, stderr, stdout } from "node:process";
import { MemoryPoseStream } from "@bino/core";
import { loadScenario } from "./yaml.js";
import { createNodeService } from "./service.js";

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

  const service = createNodeService({ scenario: scene });
  const stream = new MemoryPoseStream();

  process.on("SIGINT", () => {
    service.runner.stop();
    stream.close();
  });

  try {
    let count = 0;
    let lastLog = performance.now();
    for await (const frame of service.runner.frames(stream)) {
      count += 1;
      const now = performance.now();
      if (now - lastLog >= 1000) {
        stdout.write(
          `t=${frame.time.toFixed(2)}s  frames=${count}  renderMs=${frame.renderMs.toFixed(2)}\n`,
        );
        lastLog = now;
      }
    }
    stdout.write(`stopped after ${count} frame(s)\n`);
  } finally {
    service.dispose();
  }
}

main().catch((err) => {
  stderr.write(`bino-node: ${err instanceof Error ? err.message : String(err)}\n`);
  exit(2);
});
