import type * as THREE from "three";
import { applyPoseUpdate, type Clock, type PoseStream } from "@bino/core";

const DEFAULT_TICK_HZ = 30;

export interface SensorKernelLike {
  step(time: number): unknown;
  dispose(): void;
}

export interface FrameEvent {
  index: number;
  time: number;
  renderMs: number;
  outputs: unknown[];
}

export interface RunnerOptions {
  scene: THREE.Scene;
  entities: ReadonlyMap<string, THREE.Object3D>;
  kernels: SensorKernelLike[];
  clock: Clock;
  tickHz?: number;
}

export class BinoRunner {
  private readonly scene: THREE.Scene;
  private readonly entities: ReadonlyMap<string, THREE.Object3D>;
  private readonly kernels: SensorKernelLike[];
  private readonly clock: Clock;
  private readonly tickIntervalMs: number;
  private stopped = false;

  constructor(opts: RunnerOptions) {
    this.scene = opts.scene;
    this.entities = opts.entities;
    this.kernels = opts.kernels;
    this.clock = opts.clock;
    this.tickIntervalMs = 1000 / (opts.tickHz ?? DEFAULT_TICK_HZ);
  }

  stop(): void {
    this.stopped = true;
  }

  async *frames(stream: PoseStream): AsyncGenerator<FrameEvent> {
    void this.scene; // reserved for future per-frame scene-level work (env updates, etc.)
    const pump = pumpPoses(stream, this.entities);
    try {
      let i = 0;
      while (!this.stopped) {
        const t = this.clock.now();
        const renderStart = performance.now();
        const outputs = this.kernels.map((k) => k.step(t));
        const renderMs = performance.now() - renderStart;
        yield { index: i, time: t, renderMs, outputs };
        i += 1;
        await this.wait();
      }
    } finally {
      stream.close();
      await pump.catch(() => {});
    }
  }

  private async wait(): Promise<void> {
    if (this.tickIntervalMs <= 1) {
      await new Promise<void>((r) => setImmediate(r));
    } else {
      await new Promise<void>((r) => setTimeout(r, this.tickIntervalMs));
    }
  }
}

async function pumpPoses(
  stream: PoseStream,
  entities: ReadonlyMap<string, THREE.Object3D>,
): Promise<void> {
  for await (const update of stream) {
    applyPoseUpdate(entities, update);
  }
}
