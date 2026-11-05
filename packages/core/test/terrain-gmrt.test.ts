import { afterEach, describe, expect, it, vi } from "vitest";
import { writeArrayBuffer } from "geotiff";
import { geoTiffProblem, loadBathymetry } from "../src/terrain.js";

/** A whole little GeoTIFF: 4×3 float depths, as GMRT serves them. */
function tiff(): ArrayBuffer {
  const values = new Float32Array([-5, -6, -7, -8, -9, -10, -11, -12, -13, -14, -15, -16]);
  return writeArrayBuffer(values, { width: 4, height: 3 }) as ArrayBuffer;
}

function respond(bytes: ArrayBuffer, declared?: number): Response {
  return new Response(bytes, {
    status: 200,
    headers: declared === undefined ? {} : { "content-length": String(declared) },
  });
}

const BBOX: [number, number, number, number] = [11.78, 57.65, 11.86, 57.7];

describe("a GMRT body that is not a whole GeoTIFF (SLIPWAY#63)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("names a truncated body and a non-TIFF body, and passes a whole one", () => {
    const whole = tiff();
    expect(geoTiffProblem(whole, String(whole.byteLength))).toBe("");
    expect(geoTiffProblem(whole, null)).toBe("");
    expect(geoTiffProblem(whole.slice(0, 40), String(whole.byteLength))).toMatch(
      /returned 40 bytes, not a complete GeoTIFF/,
    );
    expect(geoTiffProblem(new TextEncoder().encode("<html>").buffer, null)).toMatch(
      /no TIFF header/,
    );
  });

  it("refetches a truncated body and parses the whole one that follows", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const whole = tiff();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(respond(whole.slice(0, 40), whole.byteLength))
      .mockResolvedValueOnce(respond(whole, whole.byteLength));
    vi.stubGlobal("fetch", fetchMock);
    const grid = await loadBathymetry(BBOX, { gridResM: 2000 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(new Set(grid.heights).size).toBeGreaterThan(1);
  });

  it("refetches a body that only fails when read, as when no length is declared", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const whole = tiff();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(respond(whole.slice(0, 40)))
      .mockResolvedValueOnce(respond(whole));
    vi.stubGlobal("fetch", fetchMock);
    await loadBathymetry(BBOX, { gridResM: 2000 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gives up after three bad bodies, saying what was wrong", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const whole = tiff();
    const fetchMock = vi.fn(async () => respond(whole.slice(0, 40), whole.byteLength));
    vi.stubGlobal("fetch", fetchMock);
    await expect(loadBathymetry(BBOX)).rejects.toThrow(/40 bytes, not a complete GeoTIFF/);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
