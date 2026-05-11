<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { SvelteMap } from "svelte/reactivity";
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
    radar: {},
    staleEntities: [],
  });

  // One preview panel per sensor on the ego vessel. Camera frames
  // render at 4:3 (matching the configured 640×480); lidar + radar
  // panels are square polar plots. Sensor type drives the size +
  // label only; the actual draw routine is in viewer.ts and
  // dispatches on the kernel's frame shape.
  type PreviewSpec = {
    id: string;
    type: "camera" | "lidar" | "radar";
    w: number;
    h: number;
    label: string;
  };
  const previewSpecs: PreviewSpec[] = (v01Scenario.vessels[0]?.sensors ?? [])
    .map((s): PreviewSpec | null => {
      if (s.type === "camera")
        return { id: s.id, type: "camera", w: 240, h: 180, label: `camera · ${s.id}` };
      if (s.type === "lidar")
        return { id: s.id, type: "lidar", w: 220, h: 220, label: `lidar · ${s.id}` };
      if (s.type === "radar_marine")
        return { id: s.id, type: "radar", w: 220, h: 220, label: `PPI · ${s.id}` };
      return null;
    })
    .filter((s): s is PreviewSpec => s !== null);
  const previewCanvasMap = new SvelteMap<string, HTMLCanvasElement>();
  function bindPreview(node: HTMLCanvasElement, id: string) {
    previewCanvasMap.set(id, node);
    return {
      destroy() {
        previewCanvasMap.delete(id);
      },
    };
  }
  let expandedPreview: string | null = $state(null);
  let lidarOverlayOn = $state(false);
  let radarOverlayOn = $state(false);
  function handleKeydown(e: KeyboardEvent) {
    if (e.target !== document.body) return;
    if (e.key === "l" || e.key === "L") {
      lidarOverlayOn = !lidarOverlayOn;
      for (const spec of previewSpecs) {
        if (spec.type === "lidar") handle?.setOverlayVisible(spec.id, lidarOverlayOn);
      }
    }
    if (e.key === "r" || e.key === "R") {
      radarOverlayOn = !radarOverlayOn;
      for (const spec of previewSpecs) {
        if (spec.type === "radar") handle?.setOverlayVisible(spec.id, radarOverlayOn);
      }
    }
  }
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

    handle = await mountViewer({
      canvas,
      poses,
      onStats: (s) => {
        stats = s;
      },
      previewCanvases: previewCanvasMap,
    });
  });

  onDestroy(async () => {
    handle?.stop();
    scripted?.stop();
    await zenoh?.close();
  });
</script>

<svelte:window onkeydown={handleKeydown} />

<main class="layout">
  <header>
    <h1>Bino viewer</h1>
    <span class="stats">
      {stats.fps.toFixed(1)} fps · {stats.frames} frames · cam {stats.cameraFrames} · lidar {stats.lidarPoints}
      pts · src: {source}
      {#if stats.staleEntities.length > 0}
        · <span class="stale">stale: {stats.staleEntities.join(", ")}</span>
      {/if}
    </span>
    <span class="overlay-keys">
      <button
        class="overlay-btn"
        class:active={lidarOverlayOn}
        onclick={() => {
          lidarOverlayOn = !lidarOverlayOn;
          for (const s of previewSpecs) {
            if (s.type === "lidar") handle?.setOverlayVisible(s.id, lidarOverlayOn);
          }
        }}>[L]idar</button
      >
      <button
        class="overlay-btn"
        class:active={radarOverlayOn}
        onclick={() => {
          radarOverlayOn = !radarOverlayOn;
          for (const s of previewSpecs) {
            if (s.type === "radar") handle?.setOverlayVisible(s.id, radarOverlayOn);
          }
        }}>[R]adar</button
      >
    </span>
    {#if zenohError}
      <span class="err">zenoh: {zenohError}</span>
    {/if}
  </header>
  <canvas bind:this={canvas} class="scene"></canvas>
  <div class="preview-stack">
    {#each previewSpecs as spec (spec.id)}
      {@const expanded = expandedPreview === spec.id}
      {@const pw = expanded ? (spec.type === "camera" ? 640 : 500) : spec.w}
      {@const ph = expanded ? (spec.type === "camera" ? 480 : 500) : spec.h}
      <div
        class="preview-panel"
        class:expanded
        onclick={() => (expandedPreview = expanded ? null : spec.id)}
        role="button"
        tabindex="0"
        onkeydown={(e) => {
          if (e.key === "Enter" || e.key === " ") expandedPreview = expanded ? null : spec.id;
        }}
      >
        <div class="preview-label">{spec.label}{expanded ? " ✕" : ""}</div>
        <canvas
          width={pw}
          height={ph}
          class="preview-canvas"
          class:pixelated={spec.type !== "camera"}
          use:bindPreview={spec.id}
        ></canvas>
      </div>
    {/each}
  </div>
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
  .overlay-keys {
    display: flex;
    gap: 6px;
    margin-left: auto;
  }
  .overlay-btn {
    background: transparent;
    border: 1px solid #2a3a4c;
    border-radius: 4px;
    color: #88a;
    font-size: 0.75rem;
    padding: 2px 8px;
    cursor: pointer;
    font-family: inherit;
  }
  .overlay-btn:hover {
    border-color: #4a6a7c;
  }
  .overlay-btn.active {
    background: rgba(80, 200, 120, 0.15);
    border-color: #55cc77;
    color: #8cf;
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
  .preview-stack {
    position: absolute;
    bottom: 16px;
    right: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: flex-end;
  }
  .preview-panel {
    background: rgba(10, 22, 38, 0.85);
    border: 1px solid #1f2a3c;
    border-radius: 6px;
    padding: 6px 8px 8px;
    font-size: 0.75rem;
    color: #88a;
    cursor: pointer;
    transition: border-color 0.15s;
  }
  .preview-panel:hover {
    border-color: #3a5a6c;
  }
  .preview-panel.expanded {
    border-color: #4a7a8c;
  }
  .preview-label {
    font-variant-numeric: tabular-nums;
    margin-bottom: 4px;
    letter-spacing: 0.02em;
  }
  .preview-canvas {
    display: block;
  }
  .preview-canvas.pixelated {
    image-rendering: pixelated;
  }
</style>
