export interface Pose {
  position: readonly [number, number, number];
  orientation: readonly [number, number, number, number];
}

export interface EntitySnapshot {
  id: string;
  pose: Pose;
}

export interface SceneSnapshot {
  time: number;
  entities: readonly EntitySnapshot[];
}

export interface SensorKernel<Config, Output> {
  configure(config: Config): void;
  step(scene: SceneSnapshot, pose: Pose, time: number): Output;
}
