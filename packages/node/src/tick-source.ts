// What decides when the deterministic loop advances (Slipway ADR-0033).
//
// Exactly one source per run: two things advancing one clock is the failure
// this seam exists to make impossible. The runner awaits `next()`, renders
// whatever falls due at the tick it is handed, and asks again.

import {
  decodeTickFenceEnvelope,
  encodeTickAckEnvelope,
  type TickFence,
  type ZenohSubscriberLike,
} from "@bino/core";

export interface Tick {
  /** Monotonic within a run — the free-running frame count, or the kernel's
   *  tick number. Becomes `FrameEvent.index`. */
  index: number;
  /** Seconds since the run began. Drives the scene (the sea's `uTime`), which
   *  wants a small number. */
  timeS: number;
  /** The tick's absolute simulated instant, in seconds, when an outside clock
   *  states one. Sensors stamp their outputs with it, so a frame carries the
   *  kernel's time rather than bino's. */
  stampS?: number;
  /** The run this tick belongs to. A change means a new run from tick 0. */
  runId?: string;
}

export interface TickSource {
  /** `free`: integer frames on a grid of the sensors' own periods.
   *  `external`: ticks of someone else's step, which sensors are fitted to. */
  readonly kind: "free" | "external";
  /** The next tick, or null once the source is closed. */
  next(): Promise<Tick | null>;
  /** Make a pending and every later `next()` return null. */
  close(): void;
}

/** Today's loop, behind the seam: bino steps its own clock by `baseDt` as fast
 *  as it can, yielding to the event loop every hundred ticks so the pose pump
 *  can run. The arithmetic is the accumulated `t += dt` it always was, so a
 *  stepped run renders exactly what it did before the seam existed. */
export class FreeRunningTickSource implements TickSource {
  readonly kind = "free" as const;
  private t = 0;
  private index = 0;
  private closed = false;

  constructor(private readonly baseDt: number) {}

  async next(): Promise<Tick | null> {
    if (this.closed) return null;
    if (this.index % 100 === 0) {
      await new Promise<void>((r) => setImmediate(r));
      if (this.closed) return null;
    }
    this.t += this.baseDt;
    this.index += 1;
    return { index: this.index, timeS: this.t };
  }

  close(): void {
    this.closed = true;
  }
}

export interface BarrierSession {
  declareSubscriber: (keyExpr: string) => Promise<ZenohSubscriberLike>;
  /** Publish the ack. The caller should send it with BLOCK congestion
   *  control: a dropped ack stalls the run until its deadline and then fails
   *  it, for nothing — keelson's `no_drop` profile for `scenario_tick_ack`. */
  put: (keyExpr: string, payload: Uint8Array) => Promise<void>;
}

export interface BarrierTickSourceOptions {
  session: BarrierSession;
  fenceKey: string;
  ackKey: string;
  /** Wall clock for the ack's timestamp; injectable for tests. */
  now?: () => Date;
}

export interface BarrierStats {
  /** Fences acknowledged. */
  acked: number;
  /** Fences superseded before the loop reached them. Zero for a blocking
   *  worker, whose next fence cannot exist before it answers this one. */
  skipped: number;
}

/** Ticks from Slipway's tick barrier (ADR-0019): wait for the fence, render,
 *  acknowledge — the protocol of Slipway's `tools/tick_participant.py`.
 *
 *  **Tick N is acknowledged when the loop asks for N+1.** An async generator
 *  resumes only after its consumer has finished with the frame it yielded, so
 *  by then the frame for N has been rendered *and published*. Acking any
 *  earlier would tell the kernel the picture exists while it is still in
 *  flight.
 *
 *  Fences are deduplicated on (run, tick): the kernel repeats the status as a
 *  heartbeat while paused and every few ticks while running, with the same
 *  tick number, and only an advance is a new tick. A new run id starts over.
 *  If fences pile up — a worker not declared blocking — the latest wins and
 *  the rest are counted as skipped rather than answered late. */
export class BarrierTickSource implements TickSource {
  readonly kind = "external" as const;
  readonly stats: BarrierStats = { acked: 0, skipped: 0 };
  private readonly opts: BarrierTickSourceOptions;
  private subscriber: ZenohSubscriberLike | undefined;
  private pump: Promise<void> | undefined;
  private queued: TickFence | undefined;
  private waiter: ((f: TickFence | null) => void) | undefined;
  private unacked: TickFence | undefined;
  private lastRun: string | undefined;
  private lastTick = 0;
  private closed = false;

  constructor(opts: BarrierTickSourceOptions) {
    this.opts = opts;
  }

  /** Subscribe to the fence. Call before the kernel starts ticking: a worker
   *  that misses its first fence holds a blocking run until the deadline. */
  async start(): Promise<void> {
    if (this.subscriber) return;
    this.subscriber = await this.opts.session.declareSubscriber(this.opts.fenceKey);
    const receiver = this.subscriber.receiver();
    if (!receiver) return;
    this.pump = (async () => {
      try {
        for await (const sample of receiver) {
          if (this.closed) break;
          const fence = decodeTickFenceEnvelope(sample.payload().toBytes());
          if (fence) this.offer(fence);
        }
      } catch {
        // subscriber error / undeclare race — the loop ends on close()
      }
    })();
  }

  /** Accept one decoded fence. Public so a test can drive the source without
   *  a session. */
  offer(fence: TickFence): void {
    if (this.closed) return;
    if (fence.runId !== this.lastRun) {
      // A new run, from its first tick. An ack still owed to the old run is
      // owed to nobody now.
      this.lastRun = fence.runId;
      this.lastTick = 0;
      this.unacked = undefined;
      if (this.queued) this.stats.skipped += 1;
      this.queued = undefined;
    }
    // Tick 0 is the loaded state before any step; the barrier never waits on
    // it, and an ack for it would only be noise in the kernel's ledger.
    if (fence.tick <= this.lastTick) return;
    this.lastTick = fence.tick;
    if (this.waiter) {
      const w = this.waiter;
      this.waiter = undefined;
      w(fence);
      return;
    }
    if (this.queued) this.stats.skipped += 1;
    this.queued = fence;
  }

  async next(): Promise<Tick | null> {
    if (this.unacked) {
      const fence = this.unacked;
      this.unacked = undefined;
      await this.ack(fence);
    }
    if (this.closed) return null;
    let fence: TickFence | null;
    if (this.queued) {
      fence = this.queued;
      this.queued = undefined;
    } else {
      fence = await new Promise<TickFence | null>((resolve) => {
        this.waiter = resolve;
      });
    }
    if (!fence) return null;
    this.unacked = fence;
    const tick: Tick = {
      index: fence.tick,
      timeS: (fence.tick * fence.stepUs) / 1e6,
      runId: fence.runId,
    };
    if (fence.simulationTime) tick.stampS = fence.simulationTime.getTime() / 1000;
    return tick;
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.queued = undefined;
    if (this.waiter) {
      const w = this.waiter;
      this.waiter = undefined;
      w(null);
    }
    this.subscriber?.undeclare().catch(() => {});
  }

  /** Wait for the subscription pump to finish after `close()`. */
  async stopped(): Promise<void> {
    await this.pump?.catch(() => {});
  }

  private async ack(fence: TickFence): Promise<void> {
    const bytes = encodeTickAckEnvelope(fence, (this.opts.now ?? (() => new Date()))());
    await this.opts.session.put(this.opts.ackKey, bytes);
    this.stats.acked += 1;
  }
}
