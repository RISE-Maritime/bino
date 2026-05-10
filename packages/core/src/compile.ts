import { Scenario, type Scenario as ScenarioT } from "./dsl.js";

export interface CompiledScene {
  name: string;
  anchor: ScenarioT["anchor"];
  vessels: ScenarioT["vessels"];
  modes: ScenarioT["modes"];
  environment: ScenarioT["environment"];
  terrain?: ScenarioT["terrain"];
}

export function compileScenario(input: unknown): CompiledScene {
  const parsed = Scenario.parse(input);

  if (parsed.modes.determinism === "strict" && parsed.modes.clock !== "stepped") {
    throw new Error(
      `strict determinism requires stepped clock (got '${parsed.modes.clock}')`,
    );
  }

  if (parsed.modes.rendering === "inject" && parsed.modes.determinism !== "strict") {
    console.warn(
      "[bino] inject mode without strict determinism is unusual — inject typically requires tight time-sync",
    );
  }

  return {
    name: parsed.name,
    anchor: parsed.anchor,
    vessels: parsed.vessels,
    modes: parsed.modes,
    environment: parsed.environment,
    ...(parsed.terrain ? { terrain: parsed.terrain } : {}),
  };
}
