export interface VelocityEstimate {
  velocity: [number, number, number];
  angularVelocityY: number;
}

export class VelocityTracker {
  private prev = new Map<
    string,
    { pos: [number, number, number]; heading: number; time: number }
  >();

  update(
    id: string,
    pos: [number, number, number],
    heading: number,
    time: number,
  ): VelocityEstimate {
    const prev = this.prev.get(id);
    this.prev.set(id, { pos: [...pos], heading, time });
    if (!prev || time <= prev.time) {
      return { velocity: [0, 0, 0], angularVelocityY: 0 };
    }
    const dt = time - prev.time;
    return {
      velocity: [
        (pos[0] - prev.pos[0]) / dt,
        (pos[1] - prev.pos[1]) / dt,
        (pos[2] - prev.pos[2]) / dt,
      ],
      angularVelocityY: (heading - prev.heading) / dt,
    };
  }

  clear(): void {
    this.prev.clear();
  }
}
