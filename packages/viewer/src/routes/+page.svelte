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
        return { id: s.id, type: "lidar", w: 200, h: 200, label: `lidar · ${s.id}` };
      if (s.type === "radar_marine")
        return { id: s.id, type: "radar", w: 220, h: 220, label: `PPI · ${s.id}` };
      return null;
    })
    .filter((s): s is PreviewSpec => s !== null);

  const lidarSpecs = previewSpecs.filter((s) => s.type === "lidar");
  const radarSpecs = previewSpecs.filter((s) => s.type === "radar");

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

  // Per-sensor overlay visibility
  let overlayState: Record<string, boolean> = $state(
    Object.fromEntries([...lidarSpecs, ...radarSpecs].map((s) => [s.id, false])),
  );

  // Per-sensor preview visibility (lidars only — toggle in preview label)
  let previewVisible: Record<string, boolean> = $state(
    Object.fromEntries(lidarSpecs.map((s) => [s.id, true])),
  );

  function toggleOverlay(id: string) {
    overlayState[id] = !overlayState[id];
    handle?.setOverlayVisible(id, overlayState[id]!);
  }

  function toggleAllOverlays(type: "lidar" | "radar") {
    const specs = type === "lidar" ? lidarSpecs : radarSpecs;
    const anyOn = specs.some((s) => overlayState[s.id]);
    for (const s of specs) {
      overlayState[s.id] = !anyOn;
      handle?.setOverlayVisible(s.id, !anyOn);
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.target !== document.body) return;
    if (e.key === "l" || e.key === "L") toggleAllOverlays("lidar");
    if (e.key === "r" || e.key === "R") toggleAllOverlays("radar");
  }

  let source: "zenoh" | "scripted" | "connecting" = $state("scripted");
  let zenohError: string | undefined = $state();
  let loadingStage: string = $state("Starting");

  onMount(async () => {
    if (!canvas) return;
    const params = new URLSearchParams(window.location.search);
    const zenohUrl = params.get("zenoh");

    let poses: PoseStream;
    if (zenohUrl) {
      loadingStage = "Connecting to zenoh";
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
      onProgress: (stage) => {
        loadingStage = stage;
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
      {#if lidarSpecs.length > 1}
        {#each lidarSpecs as spec (spec.id)}
          <button
            class="overlay-btn"
            class:active={overlayState[spec.id]}
            onclick={() => toggleOverlay(spec.id)}
          >{spec.id}</button>
        {/each}
        <button
          class="overlay-btn master"
          class:active={lidarSpecs.every((s) => overlayState[s.id])}
          onclick={() => toggleAllOverlays("lidar")}
        >[L] all</button>
      {:else}
        {#each lidarSpecs as spec (spec.id)}
          <button
            class="overlay-btn"
            class:active={overlayState[spec.id]}
            onclick={() => toggleOverlay(spec.id)}
          >[L]idar</button>
        {/each}
      {/if}
      {#each radarSpecs as spec (spec.id)}
        <button
          class="overlay-btn"
          class:active={overlayState[spec.id]}
          onclick={() => toggleOverlay(spec.id)}
        >[R]adar</button>
      {/each}
    </span>
    {#if zenohError}
      <span class="err">zenoh: {zenohError}</span>
    {/if}
  </header>
  <canvas bind:this={canvas} class="scene"></canvas>
  {#if loadingStage}
    <div class="loading-overlay">
      <div class="loading-box">
        <div class="spinner"></div>
        <div class="loading-text">{loadingStage}</div>
      </div>
    </div>
  {/if}
  <div class="preview-stack">
    {#each previewSpecs as spec (spec.id)}
      {@const isLidar = spec.type === "lidar"}
      {@const hidden = isLidar && !previewVisible[spec.id]}
      {@const expanded = expandedPreview === spec.id}
      {@const pw = expanded ? (spec.type === "camera" ? 640 : 500) : spec.w}
      {@const ph = expanded ? (spec.type === "camera" ? 480 : 500) : spec.h}
      <div
        class="preview-panel"
        class:expanded
        class:hidden-preview={hidden}
        role="button"
        tabindex="0"
      >
        <div class="preview-label">
          {#if isLidar}
            <button
              class="toggle-vis"
              class:off={hidden}
              onclick={(e) => {
                e.stopPropagation();
                previewVisible[spec.id] = !previewVisible[spec.id];
              }}
            >{hidden ? "+" : "-"}</button>
          {/if}
          <span
            onclick={() => {
              if (!hidden) expandedPreview = expanded ? null : spec.id;
            }}
          >
            {spec.label}{expanded ? " x" : ""}
          </span>
        </div>
        {#if !hidden}
          <canvas
            width={pw}
            height={ph}
            class="preview-canvas"
            class:pixelated={spec.type !== "camera"}
            use:bindPreview={spec.id}
            onclick={() => (expandedPreview = expanded ? null : spec.id)}
          ></canvas>
        {/if}
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
  .overlay-btn.master {
    border-style: dashed;
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
  .preview-panel.hidden-preview {
    padding: 4px 8px;
  }
  .preview-label {
    font-variant-numeric: tabular-nums;
    margin-bottom: 4px;
    letter-spacing: 0.02em;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .toggle-vis {
    background: transparent;
    border: 1px solid #2a3a4c;
    border-radius: 3px;
    color: #88a;
    font-size: 0.65rem;
    width: 18px;
    height: 18px;
    line-height: 1;
    cursor: pointer;
    font-family: inherit;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .toggle-vis:hover {
    border-color: #5a7a8c;
  }
  .toggle-vis.off {
    opacity: 0.5;
  }
  .preview-canvas {
    display: block;
  }
  .preview-canvas.pixelated {
    image-rendering: pixelated;
  }
  .loading-overlay {
    position: absolute;
    inset: 0;
    background: rgba(6, 12, 22, 0.92);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }
  .loading-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }
  .loading-text {
    color: #8ab;
    font-size: 0.9rem;
    letter-spacing: 0.03em;
  }
  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #1a2a3c;
    border-top-color: #55cc77;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
