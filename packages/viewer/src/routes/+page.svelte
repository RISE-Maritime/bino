<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { MemoryPoseStream } from "@bino/core";
  import { mountViewer, type ViewerHandle, type ViewerStats } from "$lib/viewer.js";

  let canvas: HTMLCanvasElement | undefined = $state();
  let handle: ViewerHandle | undefined;
  let stats: ViewerStats = $state({ frames: 0, fps: 0, cameraFrames: 0, lidarPoints: 0 });

  onMount(() => {
    if (!canvas) return;
    // Placeholder pose stream — #14 wires up scripted poses, #13 the
    // real Zenoh-WS subscriber.
    const poses = new MemoryPoseStream();
    handle = mountViewer({
      canvas,
      poses,
      onStats: (s) => {
        stats = s;
      },
    });
  });

  onDestroy(() => handle?.stop());
</script>

<main class="layout">
  <header>
    <h1>Bino viewer</h1>
    <span class="stats">
      {stats.fps.toFixed(1)} fps · {stats.frames} frames · cam {stats.cameraFrames} · lidar {stats.lidarPoints} pts
    </span>
  </header>
  <canvas bind:this={canvas} class="scene"></canvas>
</main>

<style>
  .layout {
    display: grid;
    grid-template-rows: auto 1fr;
    height: 100vh;
  }
  header {
    padding: 8px 16px;
    display: flex;
    align-items: baseline;
    gap: 24px;
    border-bottom: 1px solid #1f2a3c;
  }
  h1 {
    font-size: 1rem;
    font-weight: 500;
    margin: 0;
    letter-spacing: -0.01em;
  }
  .stats {
    opacity: 0.65;
    font-size: 0.8125rem;
    font-variant-numeric: tabular-nums;
  }
  .scene {
    width: 100%;
    height: 100%;
    display: block;
  }
</style>
