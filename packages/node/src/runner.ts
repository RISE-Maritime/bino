import * as THREE from "three";
import {
  applyPoseUpdate,
  SteppedClock,
  VelocityTracker,
  type Clock,
  type PoseStream,
  type PoseUpdate,
} from "@bino/core";

const DEFAULT_TICK_HZ = 1000;

export interface SensorKernelLike {
  step(time: number): unknown;
  dispose(): void;
}

export interface ScheduledKernel {
  sensorId: string;
  rate_hz: number;
  kernel: SensorKernelLike;
  phaseOffset_s?: number;
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
  /** Per-tick scene-level update, called BEFORE any kernel fires
   *  with the current clock time. Used to advance time-driven
   *  uniforms — e.g. the sea surface's `uTime` — so kernel reads
   *  see a consistent scene state. */
  onTick?: (time: number) => void;
  /** When true, the runner drives the SteppedClock itself and uses
   *  integer tick counting for fully deterministic sensor scheduling.
   *  Requires the clock to be a SteppedClock. */
  deterministic?: boolean;
}

interface KernelSchedule extends ScheduledKernel {
  period: number;
  nextFireTime: number;
}

interface DeterministicKernelSchedule extends ScheduledKernel {
  fireEveryN: number;
  phaseOffsetFrames: number;
}

// ---------------------------------------------------------------------------
// Helpers for deterministic tick computation
// ---------------------------------------------------------------------------

function gcdInt(a: number, b: number): number {
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

export class BinoRunner {
  private readonly scene: THREE.Scene;
  private readonly entities: ReadonlyMap<string, THREE.Object3D>;
  private readonly schedules: KernelSchedule[];
  private readonly clock: Clock;
  private readonly tickIntervalMs: number;
  private readonly onTick: ((t: number) => void) | undefined;
  private readonly deterministic: boolean;
  private readonly velocityTracker = new VelocityTracker();
  private stopped = false;

  constructor(opts: RunnerOptions) {
    this.scene = opts.scene;
    this.entities = opts.entities;
    this.clock = opts.clock;
    this.tickIntervalMs = 1000 / (opts.tickHz ?? DEFAULT_TICK_HZ);
    this.onTick = opts.onTick;
    this.deterministic = opts.deterministic ?? false;

    if (this.deterministic && !(this.clock instanceof SteppedClock)) {
      throw new Error("deterministic mode requires a SteppedClock");
    }

    this.schedules = opts.kernels.map((k) => ({
      ...k,
      period: 1 / k.rate_hz,
      nextFireTime: k.phaseOffset_s ?? 0,
    }));

    // Sort schedules by sensorId in deterministic mode for stable fire order.
    if (this.deterministic) {
      this.schedules.sort((a, b) => a.sensorId.localeCompare(b.sensorId));
    }
  }

  stop(): void {
    this.stopped = true;
  }

  private trackVelocity(update: PoseUpdate, time: number): void {
    const entity = this.entities.get(update.entityId);
    if (!entity) return;
    const pos: [number, number, number] = [entity.position.x, entity.position.y, entity.position.z];
    const tmpEuler = new THREE.Euler();
    const tmpQuat = new THREE.Quaternion();
    tmpQuat.set(
      update.pose.orientation[0],
      update.pose.orientation[1],
      update.pose.orientation[2],
      update.pose.orientation[3],
    );
    tmpEuler.setFromQuaternion(tmpQuat, "YXZ");
    const est = this.velocityTracker.update(update.entityId, pos, tmpEuler.y, time);
    entity.userData.velocity = est.velocity;
    entity.userData.angularVelocityY = est.angularVelocityY;
  }

  async *frames(stream: PoseStream): AsyncGenerator<FrameEvent> {
    if (this.deterministic) {
      yield* this.deterministicFrames(stream);
    } else {
      yield* this.timePollingFrames(stream);
    }
  }

  // -----------------------------------------------------------------------
  // Time-polling path (original behaviour, unchanged)
  // -----------------------------------------------------------------------
  private async *timePollingFrames(stream: PoseStream): AsyncGenerator<FrameEvent> {
    void this.scene; // reserved for future scene-level per-tick work
    const pump = pumpPoses(stream, this.entities, this.velocityTracker);
    try {
      let index = 0;
      while (!this.stopped) {
        // Yield once so the pump can drain queued pose updates before
        // any kernel reads entity transforms.
        await new Promise<void>((r) => setImmediate(r));

        const t = this.clock.now();
        if (this.onTick) this.onTick(t);
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

  // -----------------------------------------------------------------------
  // Deterministic path — integer tick-driven, no timing non-determinism
  // -----------------------------------------------------------------------
  private async *deterministicFrames(stream: PoseStream): AsyncGenerator<FrameEvent> {
    const steppedClock = this.clock as SteppedClock;

    // Compute base dt as the GCD of all sensor periods (in microseconds to
    // avoid floating-point issues).
    const periodUsAll = this.schedules.map((s) => Math.round(1_000_000 / s.rate_hz));
    const gcdUs = periodUsAll.reduce(gcdInt);
    const baseDt = gcdUs / 1_000_000;

    // Build deterministic schedule: each sensor fires every N base ticks.
    const detSchedules: DeterministicKernelSchedule[] = this.schedules.map((s) => ({
      ...s,
      fireEveryN: Math.round(1 / s.rate_hz / baseDt),
      phaseOffsetFrames: Math.round((s.phaseOffset_s ?? 0) / baseDt),
    }));

    // Pose queue — a background pump pushes pose updates into a buffer;
    // we drain it synchronously before each tick.
    const poseQueue: PoseUpdate[] = [];
    const pumpPromise = (async () => {
      for await (const update of stream) {
        poseQueue.push(update);
      }
    })();

    try {
      let tickIndex = 0;

      while (!this.stopped) {
        // Yield to event loop periodically to let the pose pump run
        // and avoid starving other async work.
        if (tickIndex % 100 === 0) {
          await new Promise<void>((r) => setImmediate(r));
        }

        // Advance the clock by one base tick.
        steppedClock.step(baseDt);
        const t = steppedClock.now();

        // Drain buffered pose updates.
        while (poseQueue.length > 0) {
          const update = poseQueue.shift()!;
          applyPoseUpdate(this.entities, update);
          this.trackVelocity(update, t);
        }

        if (this.onTick) this.onTick(t);

        // Determine which sensors fire on this tick (1-indexed tick count).
        const fired: SensorOutput[] = [];
        for (const ds of detSchedules) {
          if (
            steppedClock.frameIndex >= ds.phaseOffsetFrames &&
            (steppedClock.frameIndex - ds.phaseOffsetFrames) % ds.fireEveryN === 0
          ) {
            const renderStart = performance.now();
            const output = ds.kernel.step(t);
            const renderMs = performance.now() - renderStart;
            fired.push({ sensorId: ds.sensorId, output, renderMs });
          }
        }

        if (fired.length > 0) {
          yield { index: steppedClock.frameIndex, time: t, outputs: fired };
        }

        tickIndex++;
      }
    } finally {
      stream.close();
      await pumpPromise.catch(() => {});
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
  velocityTracker: VelocityTracker,
): Promise<void> {
  const tmpEuler = new THREE.Euler();
  const tmpQuat = new THREE.Quaternion();
  for await (const update of stream) {
    applyPoseUpdate(entities, update);
    const entity = entities.get(update.entityId);
    if (entity) {
      const pos: [number, number, number] = [
        entity.position.x,
        entity.position.y,
        entity.position.z,
      ];
      tmpQuat.set(
        update.pose.orientation[0],
        update.pose.orientation[1],
        update.pose.orientation[2],
        update.pose.orientation[3],
      );
      tmpEuler.setFromQuaternion(tmpQuat, "YXZ");
      const est = velocityTracker.update(
        update.entityId,
        pos,
        tmpEuler.y,
        performance.now() / 1000,
      );
      entity.userData.velocity = est.velocity;
      entity.userData.angularVelocityY = est.angularVelocityY;
    }
  }
}
