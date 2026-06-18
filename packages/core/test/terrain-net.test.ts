import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWithRetry, overpassUrl, gmrtUrl } from "../src/terrain-net.js";

function jsonResponse(status: number): Response {
  return new Response(status === 200 ? "{}" : "err", { status });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete process.env.BINO_OVERPASS_URL;
  delete process.env.BINO_GMRT_URL;
});

describe("endpoint resolution", () => {
  it("defaults to the public Overpass / GMRT endpoints", () => {
    expect(overpassUrl()).toBe("https://overpass-api.de/api/interpreter");
    expect(gmrtUrl()).toBe("https://www.gmrt.org/services/GridServer");
  });

  it("honors BINO_OVERPASS_URL / BINO_GMRT_URL overrides", () => {
    process.env.BINO_OVERPASS_URL = "http://localhost:12345/api";
    process.env.BINO_GMRT_URL = "http://localhost:6789/grid";
    expect(overpassUrl()).toBe("http://localhost:12345/api");
    expect(gmrtUrl()).toBe("http://localhost:6789/grid");
  });

  it("ignores a blank override", () => {
    process.env.BINO_OVERPASS_URL = "   ";
    expect(overpassUrl()).toBe("https://overpass-api.de/api/interpreter");
  });
});

describe("fetchWithRetry", () => {
  it("returns immediately on a 2xx", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200));
    vi.stubGlobal("fetch", fetchMock);
    const res = await fetchWithRetry("http://x", undefined, { baseDelayMs: 0 });
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries a 503 then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(503))
      .mockResolvedValueOnce(jsonResponse(200));
    vi.stubGlobal("fetch", fetchMock);
    const res = await fetchWithRetry("http://x", undefined, { baseDelayMs: 0 });
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries network errors up to the limit then throws", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("ECONNRESET");
    });
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      fetchWithRetry("http://x", undefined, { retries: 2, baseDelayMs: 0 }),
    ).rejects.toThrow(/ECONNRESET/);
    expect(fetchMock).toHaveBeenCalledTimes(3); // 1 + 2 retries
  });

  it("does not retry a non-retryable 4xx — returns it for the caller to handle", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(404));
    vi.stubGlobal("fetch", fetchMock);
    const res = await fetchWithRetry("http://x", undefined, { baseDelayMs: 0 });
    expect(res.status).toBe(404);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns the last retryable response after exhausting retries", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(504));
    vi.stubGlobal("fetch", fetchMock);
    const res = await fetchWithRetry("http://x", undefined, { retries: 1, baseDelayMs: 0 });
    expect(res.status).toBe(504);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
