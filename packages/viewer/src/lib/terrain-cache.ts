import type { TerrainCache, TerrainData } from "@bino/core";

// IndexedDB-backed terrain cache for the browser viewer (ADR-005). The node
// service has a filesystem cache; the browser had none, so every page load
// refetched Overpass + GMRT. TerrainData (incl. the Float32Array bathymetry)
// round-trips through IndexedDB's structured clone untouched — no JSON.

const DB_NAME = "bino";
const STORE = "terrain";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        req.onsuccess = () => resolve(req.result as T);
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
      }),
  );
}

/** Build an IndexedDB-backed {@link TerrainCache}, or `undefined` when
 *  IndexedDB is unavailable (SSR / tests) so callers can skip caching. All
 *  errors are swallowed to a miss — the cache must never break a load. */
export function createIndexedDbTerrainCache(): TerrainCache | undefined {
  if (typeof indexedDB === "undefined") return undefined;
  return {
    async get(key: string): Promise<TerrainData | undefined> {
      try {
        return (await run<TerrainData | undefined>("readonly", (s) => s.get(key))) ?? undefined;
      } catch {
        return undefined;
      }
    },
    async set(key: string, data: TerrainData): Promise<void> {
      try {
        await run("readwrite", (s) => s.put(data, key));
      } catch {
        // Non-fatal: a failed cache write just means the next load refetches.
      }
    },
  };
}

/** JSON heights are number[] (Float32Array can't round-trip JSON); rehydrate
 *  to the in-memory TerrainData shape — same as the node file cache. */
function rehydrate(raw: TerrainData & { bathymetry: { heights: number[] } }): TerrainData {
  return {
    ...raw,
    bathymetry: { ...raw.bathymetry, heights: new Float32Array(raw.bathymetry.heights) },
  };
}

/** Read-only cache backed by static bundle files (ADR-005). GET fetches
 *  `${baseUrl}<key>.json` — the same JSON the node file cache / prefetch script
 *  emit — so the viewer's *first* load can read a shipped bundle instead of
 *  hitting Overpass/GMRT. SET is a no-op. A 404 (no bundle for this location)
 *  is a normal miss → the caller falls back to the network. */
export function createStaticBundleCache(baseUrl: string): TerrainCache {
  return {
    async get(key: string): Promise<TerrainData | undefined> {
      try {
        const res = await fetch(`${baseUrl}${key}.json`);
        if (!res.ok) return undefined;
        return rehydrate(await res.json());
      } catch {
        return undefined;
      }
    },
    async set(): Promise<void> {
      // Bundles are shipped static assets — read-only.
    },
  };
}

function bundleBaseUrl(): string {
  // Vite injects BASE_URL (the app's deploy base, default "/"); resolves the
  // bundle path correctly even when the viewer is served under a sub-path.
  const base = import.meta.env?.BASE_URL ?? "/";
  return `${base}terrain/`;
}

export interface ViewerTerrainCacheOptions {
  /** Override the static-bundle base URL (default `${BASE_URL}terrain/`). */
  bundleBase?: string;
}

/** The viewer's terrain cache: IndexedDB (persistent, read-write) in front of
 *  the static-bundle source (first-load, read-only). On an IndexedDB miss it
 *  tries a shipped bundle and warms IndexedDB with it, so the first visit is
 *  fast/offline if a bundle exists and every later visit is instant. */
export function createViewerTerrainCache(opts: ViewerTerrainCacheOptions = {}): TerrainCache {
  const idb = createIndexedDbTerrainCache();
  const bundle = createStaticBundleCache(opts.bundleBase ?? bundleBaseUrl());
  return {
    async get(key: string): Promise<TerrainData | undefined> {
      const hit = await idb?.get(key);
      if (hit) return hit;
      const fromBundle = await bundle.get(key);
      if (fromBundle && idb) await idb.set(key, fromBundle);
      return fromBundle;
    },
    async set(key: string, data: TerrainData): Promise<void> {
      await idb?.set(key, data);
    },
  };
}
