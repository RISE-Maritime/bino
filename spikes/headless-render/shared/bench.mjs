// Generic benchmark loop for the spike. Caller supplies functions to
// step + render + read back framebuffer + read back depth. We measure
// total frames-per-second and the per-stage cost so we can tell whether
// readback or rendering is the bottleneck.

export async function runBench({
  name,
  width,
  height,
  frames = 120,
  warmup = 30,
  step, // (t) => void  : update animation
  render, // ()  => void  : draw scene to fbo/canvas
  readColor, // ()  => Uint8Array | Promise<Uint8Array>
  readDepth, // ()  => Float32Array | Uint8Array | null  (null => not supported)
  hash, // (Uint8Array) => string  : sanity hash of color buffer
}) {
  // Warmup — JIT, GPU caches, shader compile.
  for (let i = 0; i < warmup; i++) {
    step(i / 60);
    await render();
    await readColor();
  }

  const stageColor = new Float64Array(frames);
  const stageRender = new Float64Array(frames);
  const stageDepth = readDepth ? new Float64Array(frames) : null;
  const stageStep = new Float64Array(frames);

  const totalStart = perfNow();
  let lastColor = null;
  let lastDepth = null;

  for (let i = 0; i < frames; i++) {
    const t = (warmup + i) / 60;

    let s = perfNow();
    step(t);
    stageStep[i] = perfNow() - s;

    s = perfNow();
    await render();
    stageRender[i] = perfNow() - s;

    s = perfNow();
    lastColor = await readColor();
    stageColor[i] = perfNow() - s;

    if (readDepth) {
      s = perfNow();
      lastDepth = await readDepth();
      stageDepth[i] = perfNow() - s;
    }
  }
  const totalMs = perfNow() - totalStart;

  const fps = (frames / totalMs) * 1000;
  const avg = (a) => a.reduce((s, v) => s + v, 0) / a.length;
  const p = (a, q) => {
    const s = [...a].sort((x, y) => x - y);
    return s[Math.min(s.length - 1, Math.floor(s.length * q))];
  };

  return {
    name,
    width,
    height,
    frames,
    warmup,
    totalMs,
    fps,
    perFrameMs: totalMs / frames,
    stage: {
      step: { avg: avg(stageStep), p50: p(stageStep, 0.5), p95: p(stageStep, 0.95) },
      render: { avg: avg(stageRender), p50: p(stageRender, 0.5), p95: p(stageRender, 0.95) },
      readColor: { avg: avg(stageColor), p50: p(stageColor, 0.5), p95: p(stageColor, 0.95) },
      readDepth: stageDepth
        ? { avg: avg(stageDepth), p50: p(stageDepth, 0.5), p95: p(stageDepth, 0.95) }
        : null,
    },
    sanity: {
      colorBytes: lastColor ? lastColor.length : 0,
      colorHash: lastColor && hash ? hash(lastColor) : null,
      colorNonZero: lastColor ? countNonZero(lastColor) : 0,
      depthBytes: lastDepth ? lastDepth.length : 0,
      depthSample: lastDepth ? sampleDepth(lastDepth) : null,
    },
    lastColor,
    lastDepth,
  };
}

export function perfNow() {
  const [s, ns] = process.hrtime();
  return s * 1000 + ns / 1e6;
}

export function fnv1a(buf) {
  let h = 0x811c9dc5;
  // Sample every 257th byte — full hash is too slow on a 1920*1080*4 buf
  // and we only want a sanity check.
  for (let i = 0; i < buf.length; i += 257) {
    h ^= buf[i];
    h = Math.imul(h, 0x01000193);
  }
  return ("00000000" + (h >>> 0).toString(16)).slice(-8);
}

function countNonZero(buf) {
  let n = 0;
  for (let i = 0; i < buf.length; i += 4) {
    if (buf[i] | buf[i + 1] | buf[i + 2]) n++;
  }
  return n;
}

function sampleDepth(buf) {
  // Ten evenly-spaced samples — enough to confirm we got real data
  // without dumping a 2 MB float array.
  const out = [];
  const stride = Math.floor(buf.length / 10) || 1;
  for (let i = 0; i < buf.length; i += stride) {
    out.push(typeof buf[i] === "number" ? +buf[i].toFixed(4) : buf[i]);
    if (out.length >= 10) break;
  }
  return out;
}

export function printResult(r) {
  const fmt = (n) => (n != null ? n.toFixed(2) : "  -- ");
  console.log(`\n=== ${r.name} :: ${r.width}x${r.height} ===`);
  console.log(
    `  frames=${r.frames}  total=${r.totalMs.toFixed(1)}ms  fps=${r.fps.toFixed(2)}  per-frame=${r.perFrameMs.toFixed(2)}ms`,
  );
  console.log(
    `  step      avg=${fmt(r.stage.step.avg)}ms  p50=${fmt(r.stage.step.p50)}  p95=${fmt(r.stage.step.p95)}`,
  );
  console.log(
    `  render    avg=${fmt(r.stage.render.avg)}ms  p50=${fmt(r.stage.render.p50)}  p95=${fmt(r.stage.render.p95)}`,
  );
  console.log(
    `  readColor avg=${fmt(r.stage.readColor.avg)}ms  p50=${fmt(r.stage.readColor.p50)}  p95=${fmt(r.stage.readColor.p95)}`,
  );
  if (r.stage.readDepth) {
    console.log(
      `  readDepth avg=${fmt(r.stage.readDepth.avg)}ms  p50=${fmt(r.stage.readDepth.p50)}  p95=${fmt(r.stage.readDepth.p95)}`,
    );
  } else {
    console.log(`  readDepth (not supported by this candidate)`);
  }
  console.log(
    `  sanity    colorBytes=${r.sanity.colorBytes}  colorHash=${r.sanity.colorHash}  nonZeroPx=${r.sanity.colorNonZero}`,
  );
  if (r.sanity.depthBytes) {
    console.log(
      `            depthBytes=${r.sanity.depthBytes}  depthSample=${JSON.stringify(r.sanity.depthSample)}`,
    );
  }
}
