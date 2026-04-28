// Runs every candidate in sequence and prints a summary table at the
// end. Each candidate writes its own out/<name>.json — this script just
// orchestrates and aggregates.

import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "out");

const CANDIDATES = [
  { name: "headless-gl", path: "candidates/headless-gl/bench.mjs" },
  { name: "kmamal-gl",   path: "candidates/kmamal-gl/bench.mjs" },
  { name: "chromium",    path: "candidates/chromium/bench.mjs" },
  { name: "webgpu",      path: "candidates/webgpu/bench.mjs" },
];

async function runOne(c) {
  console.log(`\n##### ${c.name} #####`);
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [join(here, c.path)], {
      cwd: here,
      stdio: "inherit",
      env: process.env,
    });
    p.on("exit", (code) => resolve({ name: c.name, exitCode: code }));
    p.on("error", (e) => resolve({ name: c.name, exitCode: -1, error: e.message }));
  });
}

const exitCodes = [];
for (const c of CANDIDATES) {
  exitCodes.push(await runOne(c));
}

console.log(`\n##### SUMMARY #####`);
const rows = [];
for (const c of CANDIDATES) {
  const jsonPath = join(outDir, `${c.name}.json`);
  if (!existsSync(jsonPath)) {
    rows.push({ name: c.name, ok: false, reason: "no output file" });
    continue;
  }
  try {
    const v = JSON.parse(readFileSync(jsonPath, "utf8"));
    rows.push({
      name: c.name,
      ok: v.ok !== false,
      fps: v.fps,
      perFrameMs: v.perFrameMs,
      renderMs: v.stage?.render?.avg,
      readColorMs: v.stage?.readColor?.avg,
      readDepthMs: v.stage?.readDepth?.avg,
      glRenderer: v.glRenderer,
      reason: v.reason,
    });
  } catch (e) {
    rows.push({ name: c.name, ok: false, reason: `parse error: ${e.message}` });
  }
}

const fmt = (n) => (n != null ? n.toFixed(2).padStart(8) : "    --  ");
console.log(`${"name".padEnd(13)} ${"ok".padEnd(4)} ${"fps".padStart(8)} ${"frame_ms".padStart(8)} ${"render".padStart(8)} ${"rdColor".padStart(8)} ${"rdDepth".padStart(8)}  notes`);
for (const r of rows) {
  const note = r.ok ? (r.glRenderer || "").slice(0, 60) : (r.reason || "").slice(0, 60);
  console.log(`${r.name.padEnd(13)} ${(r.ok ? "Y" : "N").padEnd(4)} ${fmt(r.fps)} ${fmt(r.perFrameMs)} ${fmt(r.renderMs)} ${fmt(r.readColorMs)} ${fmt(r.readDepthMs)}  ${note}`);
}

writeFileSync(join(outDir, "summary.json"), JSON.stringify(rows, null, 2));
process.exit(rows.every((r) => r.ok) ? 0 : 1);
