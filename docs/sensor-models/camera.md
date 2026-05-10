# Camera sensor model

## Overview

WebGL render-to-texture approach. Uses Three.js PerspectiveCamera with a dedicated WebGLRenderTarget. Same rendering pipeline runs in both Node (via @kmamal/gl headless GL) and the browser.

## Rendering pipeline

1. PerspectiveCamera configured with fov_deg, aspect ratio from resolution, near=0.1, far=1,000,000
2. WebGLRenderTarget at configured resolution (width x height), RGBA format, UnsignedByte type, depth buffer enabled, stencil disabled
3. Each step: render scene to target, readRenderTargetPixels into Uint8Array
4. Output: RGBA pixels (width x height x 4 bytes)

## Configuration

| Parameter | Type | Description |
|-----------|------|-------------|
| fov_deg | number (0, 180) | Vertical field of view in degrees |
| resolution | [width, height] | Output resolution in pixels |
| rate_hz | number | Capture rate |
| exposure_time_s | number (default 0) | Exposure interval duration |
| phase_offset_s | number (default 0) | Scheduling phase offset |

## Exposure model

When `exposure_time_s > 0`:

- `exposure_start = time - exposure_time_s / 2`
- `exposure_end = time + exposure_time_s / 2`

These timestamps are metadata only -- no motion blur or multi-frame accumulation is performed. They enable downstream consumers to correlate camera frames with other time-stamped sensor data within the exposure window.

When `exposure_time_s = 0` (default): both timestamps equal `time`.

## Output format

- RGBA Uint8Array: `width * height * 4` bytes
- Published as Keelson `RawImage` (foxglove.RawImage: bytes, width, height, encoding="rgba8", step, timestamp, frame_id)

## Known limitations

- Not photorealistic -- "good enough for a perception network to consume"
- No motion blur
- No lens distortion, chromatic aberration, or vignetting
- No sensor noise model (read noise, shot noise, etc.)
- No rolling shutter simulation
- Cross-backend pixel divergence: Node (ANGLE software rasterizer) and browser (GPU) produce slightly different output. Not bit-identical.
