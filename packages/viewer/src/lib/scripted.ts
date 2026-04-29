import { MemoryPoseStream, type PoseStream } from "@bino/core";

export interface ScriptedHandle {
  stream: PoseStream;
  stop(): void;
}

/**
 * v0.1 standalone-demo pose source. Pushes a deterministic looping
 * trajectory so the viewer is self-demonstrating without a Zenoh
 * router: ego drifts forward, ferry orbits around it. Tick rate is
 * 10 Hz (matches the sensor rate_hz in the v0.1 scenario).
 */
export function startScriptedPoses(): ScriptedHandle {
  const stream = new MemoryPoseStream();
  const t0 = performance.now();
  const intervalId = setInterval(() => {
    const t = (performance.now() - t0) / 1000;
    // Ego: slow forward drift along -Z (1 m/s).
    stream.push({
      entityId: "ego",
      pose: { position: [0, 0, -t], orientation: [0, 0, 0, 1] },
      time: t,
    });
    // Ferry: orbits ego at radius 60 m, 45 s period, biased ahead so
    // it stays in the bow-camera FOV most of the time.
    const angle = (t / 45) * Math.PI * 2;
    stream.push({
      entityId: "ferry",
      pose: {
        position: [Math.sin(angle) * 60, 0, -t - 60 - Math.cos(angle) * 30],
        orientation: [0, 0, 0, 1],
      },
      time: t,
    });
  }, 100);

  return {
    stream,
    stop: () => {
      clearInterval(intervalId);
      stream.close();
    },
  };
}
