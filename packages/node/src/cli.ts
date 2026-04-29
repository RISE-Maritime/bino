#!/usr/bin/env node
import { argv, exit, stderr, stdout } from "node:process";
import { Config, open } from "@eclipse-zenoh/zenoh-ts";
import {
  MemoryPoseStream,
  createZenohPoseStream,
  type PoseStream,
  type CompiledScene,
} from "@bino/core";
import { loadScenario } from "./yaml.js";
import { createNodeService } from "./service.js";

interface CliArgs {
  scenarioPath: string;
  zenoh?: string;
}

function parseArgs(args: string[]): CliArgs | null {
  let scenarioPath: string | undefined;
  let zenoh: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === "--zenoh" || a === "-z") {
      zenoh = args[++i];
    } else if (!scenarioPath) {
      scenarioPath = a;
    }
  }
  if (!scenarioPath) return null;
  return zenoh ? { scenarioPath, zenoh } : { scenarioPath };
}

function zenohVessels(scenario: CompiledScene): Array<{ vesselId: string; topic: string }> {
  const out: Array<{ vesselId: string; topic: string }> = [];
  for (const v of scenario.vessels) {
    if (v.pose_source.type === "zenoh") {
      out.push({ vesselId: v.id, topic: v.pose_source.topic });
    }
  }
  return out;
}

async function main(): Promise<void> {
  const parsed = parseArgs(argv.slice(2));
  if (!parsed) {
    stderr.write("usage: bino-node <scenario.yaml> [--zenoh ws://host:port]\n");
    exit(1);
  }

  const scene = await loadScenario(parsed.scenarioPath);
  stdout.write(
    `loaded scenario '${scene.name}': ${scene.vessels.length} vessel(s), ` +
      `mode=${scene.modes.rendering}/${scene.modes.clock}/${scene.modes.determinism}\n`,
  );

  const service = createNodeService({ scenario: scene });
  let stream: PoseStream;
  let zenohSession: Awaited<ReturnType<typeof open>> | undefined;

  if (parsed.zenoh) {
    zenohSession = await open(new Config(parsed.zenoh));
    stream = await createZenohPoseStream({
      session: zenohSession,
      vessels: zenohVessels(scene),
    });
    stdout.write(`zenoh: connected to ${parsed.zenoh}, ${zenohVessels(scene).length} subscription(s)\n`);
  } else {
    stream = new MemoryPoseStream();
    stdout.write("zenoh: no --zenoh endpoint, running without pose updates\n");
  }

  const shutdown = (): void => {
    service.runner.stop();
    stream.close();
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

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
    await zenohSession?.close().catch(() => {});
  }
}

main().catch((err) => {
  stderr.write(`bino-node: ${err instanceof Error ? err.message : String(err)}\n`);
  exit(2);
});
