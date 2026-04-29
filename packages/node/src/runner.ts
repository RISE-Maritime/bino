import type * as THREE from "three";
import { applyPoseUpdate, type Clock, type PoseStream } from "@bino/core";

const DEFAULT_TICK_HZ = 1000;

export interface SensorKernelLike {
  step(time: number): unknown;
  dispose(): void;
}

export interface ScheduledKernel {
  sensorId: string;
  rate_hz: number;
  kernel: SensorKernelLike;
}

export interface SensorOutput {
  sensorId: string;
  output: unknown;
  renderMs: number;
}

export interface FrameEvent {
  index: number;
  time: number;
  outputs: SensorOutput[];
}

export interface RunnerOptions {
  scene: THREE.Scene;
  entities: ReadonlyMap<string, THREE.Object3D>;
  kernels: ScheduledKernel[];
  clock: Clock;
  /** Loop tick rate. Each kernel still fires at its own rate_hz; this
   *  bounds the granularity. Defaults to 1000 Hz (1 ms). */
  tickHz?: number;
}

interface KernelSchedule extends ScheduledKernel {
  period: number;
  nextFireTime: number;
}

export class BinoRunner {
  private readonly scene: THREE.Scene;
  private readonly entities: ReadonlyMap<string, THREE.Object3D>;
  private readonly schedules: KernelSchedule[];
  private readonly clock: Clock;
  private readonly tickIntervalMs: number;
  private stopped = false;

  constructor(opts: RunnerOptions) {
    this.scene = opts.scene;
    this.entities = opts.entities;
    this.clock = opts.clock;
    this.tickIntervalMs = 1000 / (opts.tickHz ?? DEFAULT_TICK_HZ);
    this.schedules = opts.kernels.map((k) => ({
      ...k,
      period: 1 / k.rate_hz,
      nextFireTime: 0, // fire on first tick
    }));
  }

  stop(): void {
    this.stopped = true;
  }

  async *frames(stream: PoseStream): AsyncGenerator<FrameEvent> {
    void this.scene; // reserved for future scene-level per-tick work
    const pump = pumpPoses(stream, this.entities);
    try {
      let index = 0;
      while (!this.stopped) {
        // Yield once so the pump can drain queued pose updates before
        // any kernel reads entity transforms.
        await new Promise<void>((r) => setImmediate(r));

        const t = this.clock.now();
        const fired: SensorOutput[] = [];
        for (const s of this.schedules) {
          if (s.nextFireTime > t) continue;
          const renderStart = performance.now();
          const output = s.kernel.step(t);
          const renderMs = performance.now() - renderStart;
          fired.push({ sensorId: s.sensorId, output, renderMs });
          // Advance phase by enough periods to land at or beyond t —
          // catches up cleanly after a stall instead of firing N times
          // back-to-back to drain the backlog.
          const overshoot = t - s.nextFireTime;
          const skips = Math.floor(overshoot / s.period);
          s.nextFireTime += s.period * (skips + 1);
        }

        if (fired.length > 0) {
          yield { index, time: t, outputs: fired };
          index += 1;
        }

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
