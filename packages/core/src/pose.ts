import type * as THREE from "three";
import { z } from "zod";
import type { Pose } from "./sensor.js";

export interface PoseUpdate {
  entityId: string;
  pose: Pose;
  time: number;
}

export const PoseMessage = z.object({
  position: z.tuple([z.number(), z.number(), z.number()]),
  orientation: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  time: z.number(),
});
export type PoseMessage = z.infer<typeof PoseMessage>;

export function decodePoseMessage(json: unknown, entityId: string): PoseUpdate | null {
  const result = PoseMessage.safeParse(json);
  if (!result.success) return null;
  return {
    entityId,
    pose: { position: result.data.position, orientation: result.data.orientation },
    time: result.data.time,
  };
}

export interface PoseStream extends AsyncIterable<PoseUpdate> {
  close(): void;
}

export class MemoryPoseStream implements PoseStream {
  private readonly queue: PoseUpdate[] = [];
  private readonly waiters: Array<(value: IteratorResult<PoseUpdate>) => void> = [];
  private closed = false;

  push(update: PoseUpdate): void {
    if (this.closed) return;
    const waiter = this.waiters.shift();
    if (waiter) {
      waiter({ value: update, done: false });
    } else {
      this.queue.push(update);
    }
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    while (this.waiters.length > 0) {
      const waiter = this.waiters.shift()!;
      waiter({ value: undefined, done: true });
    }
  }

  [Symbol.asyncIterator](): AsyncIterator<PoseUpdate> {
    return {
      next: (): Promise<IteratorResult<PoseUpdate>> => {
        const buffered = this.queue.shift();
        if (buffered !== undefined) {
          return Promise.resolve({ value: buffered, done: false });
        }
        if (this.closed) {
          return Promise.resolve({ value: undefined, done: true });
        }
        return new Promise((resolve) => {
          this.waiters.push(resolve);
        });
      },
    };
  }
}

export function applyPoseUpdate(
  entities: ReadonlyMap<string, THREE.Object3D>,
  update: PoseUpdate,
): void {
  const entity = entities.get(update.entityId);
  if (!entity) return;
  const [px, py, pz] = update.pose.position;
  const [qx, qy, qz, qw] = update.pose.orientation;
  entity.position.set(px, py, pz);
  entity.quaternion.set(qx, qy, qz, qw);
}
