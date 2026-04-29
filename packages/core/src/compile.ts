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
  return {
    name: parsed.name,
    anchor: parsed.anchor,
    vessels: parsed.vessels,
    modes: parsed.modes,
    environment: parsed.environment,
    ...(parsed.terrain ? { terrain: parsed.terrain } : {}),
  };
}
