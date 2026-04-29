<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { type PoseStream } from "@bino/core";
  import { mountViewer, type ViewerHandle, type ViewerStats } from "$lib/viewer.js";
  import { connectZenohPoses, vesselsForZenoh, type ZenohConnection } from "$lib/zenoh.js";
  import { startScriptedPoses, type ScriptedHandle } from "$lib/scripted.js";
  import { v01Scenario } from "$lib/scenario.js";

  let canvas: HTMLCanvasElement | undefined = $state();
  let handle: ViewerHandle | undefined;
  let zenoh: ZenohConnection | undefined;
  let scripted: ScriptedHandle | undefined;
  let stats: ViewerStats = $state({
    frames: 0,
    fps: 0,
    cameraFrames: 0,
    lidarPoints: 0,
    staleEntities: [],
  });
  let source: "zenoh" | "scripted" | "connecting" = $state("scripted");
  let zenohError: string | undefined = $state();

  onMount(async () => {
    if (!canvas) return;
    const params = new URLSearchParams(window.location.search);
    const zenohUrl = params.get("zenoh");

    let poses: PoseStream;
    if (zenohUrl) {
      source = "connecting";
      try {
        zenoh = await connectZenohPoses(zenohUrl, vesselsForZenoh(v01Scenario.vessels));
        poses = zenoh.stream;
        source = "zenoh";
      } catch (err) {
        zenohError = err instanceof Error ? err.message : String(err);
        scripted = startScriptedPoses();
        poses = scripted.stream;
        source = "scripted";
      }
    } else {
      scripted = startScriptedPoses();
      poses = scripted.stream;
      source = "scripted";
    }

    handle = mountViewer({
      canvas,
      poses,
      onStats: (s) => {
        stats = s;
      },
    });
  });

  onDestroy(async () => {
    handle?.stop();
    scripted?.stop();
    await zenoh?.close();
  });
</script>

<main class="layout">
  <header>
    <h1>Bino viewer</h1>
    <span class="stats">
      {stats.fps.toFixed(1)} fps · {stats.frames} frames · cam {stats.cameraFrames} · lidar {stats.lidarPoints} pts · src: {source}
      {#if stats.staleEntities.length > 0}
        · <span class="stale">stale: {stats.staleEntities.join(", ")}</span>
      {/if}
    </span>
    {#if zenohError}
      <span class="err">zenoh: {zenohError}</span>
    {/if}
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
  .err {
    color: #f88;
    font-size: 0.8125rem;
  }
  .stale {
    color: #fb6;
  }
  .scene {
    width: 100%;
    height: 100%;
    display: block;
  }
</style>
