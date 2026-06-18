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
