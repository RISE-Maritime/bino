// Minimal binary PPM (P6) writer — zero deps, lets us eyeball results.
import { writeFileSync } from "node:fs";

export function writePPM(path, rgba, width, height, { flipY = false } = {}) {
  const header = `P6\n${width} ${height}\n255\n`;
  const headerBuf = Buffer.from(header, "ascii");
  const pixels = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) {
    const srcY = flipY ? height - 1 - y : y;
    for (let x = 0; x < width; x++) {
      const si = (srcY * width + x) * 4;
      const di = (y * width + x) * 3;
      pixels[di + 0] = rgba[si + 0];
      pixels[di + 1] = rgba[si + 1];
      pixels[di + 2] = rgba[si + 2];
    }
  }
  writeFileSync(path, Buffer.concat([headerBuf, pixels]));
}
