// Network plumbing for terrain data sources (ADR-005, phase 1): resolve
// endpoints from the environment and fetch with bounded retry/backoff so a
// flaky public API degrades into a retry rather than a hard failure. Kept
// separate from terrain.ts so the source/parse logic stays focused, and
// environment-agnostic (no node `process` type dependency).

const DEFAULT_OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const DEFAULT_GMRT_URL = "https://www.gmrt.org/services/GridServer";

/** Read an env var without depending on @types/node. Returns undefined in
 *  the browser (no `process`) or when unset/blank. */
function readEnv(name: string): string | undefined {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env;
  const v = env?.[name];
  return v && v.trim() ? v.trim() : undefined;
}

/** Overpass endpoint — `BINO_OVERPASS_URL` overrides the public default,
 *  e.g. to point at a self-hosted instance (ADR-005). */
export function overpassUrl(): string {
  return readEnv("BINO_OVERPASS_URL") ?? DEFAULT_OVERPASS_URL;
}

/** GMRT GridServer endpoint — `BINO_GMRT_URL` overrides the public default. */
export function gmrtUrl(): string {
  return readEnv("BINO_GMRT_URL") ?? DEFAULT_GMRT_URL;
}

/** Transient HTTP statuses worth retrying: request timeout, too-early,
 *  rate-limit, and the 5xx family the public Overpass/GMRT instances return
 *  under load. Other 4xx are caller errors and fail fast. */
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

export interface FetchRetryOptions {
  /** Extra attempts after the first (default 2 → up to 3 total). */
  retries?: number;
  /** Base backoff in ms; attempt N waits baseDelayMs * 2^N (default 500). */
  baseDelayMs?: number;
  /** Label used in retry warnings (default: the URL). */
  label?: string;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * fetch() with bounded exponential backoff. Retries on network errors and
 * retryable HTTP statuses; returns the final Response (ok or not) so the
 * caller keeps its own error-with-body handling. Non-retryable statuses
 * return immediately.
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  opts: FetchRetryOptions = {},
): Promise<Response> {
  const retries = opts.retries ?? 2;
  const base = opts.baseDelayMs ?? 500;
  const label = opts.label ?? url;
  let lastErr: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    let res: Response | undefined;
    try {
      res = await fetch(url, init);
    } catch (err) {
      lastErr = err;
      if (attempt === retries) throw err;
    }

    if (res) {
      if (res.ok) return res;
      // Exhausted, or a status the caller should handle directly.
      if (attempt === retries || !RETRYABLE_STATUS.has(res.status)) return res;
      lastErr = new Error(`${label} returned ${res.status}`);
    }

    const delay = base * 2 ** attempt;
    console.warn(
      `[bino] ${label} attempt ${attempt + 1}/${retries + 1} failed ` +
        `(${res ? `HTTP ${res.status}` : "network error"}); retrying in ${delay}ms`,
    );
    await sleep(delay);
  }

  // Unreachable in practice (loop returns or throws), but satisfies the type.
  throw lastErr ?? new Error(`${label}: fetch failed`);
}
