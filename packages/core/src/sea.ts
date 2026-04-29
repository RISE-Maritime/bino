// v0.4a #6 — Gerstner sea-surface ShaderMaterial.
//
// Lifted from spikes/sea-shader/sea.mjs (S13 verdict). Math from
// GPU Gems 1, Chapter 1 (Mark Finch, "Effective Water Simulation
// from Physical Models"). 4 fixed components driven by the DSL
// environment.sea_state. Pierson-Moskowitz spectral sampling is a
// future extension to componentsFor; the shader doesn't change.

import * as THREE from "three";
import type { Environment, SeaState } from "./dsl.js";

const N_WAVES = 4;
const G = 9.81;

export interface WaveComponent {
  amplitude: number;
  wavelength: number;
  dirX: number;
  dirZ: number;
  steepness: number;
}

/** Pick four Gerstner components from a sea_state config. v0.4a
 *  ships this manual selection; v0.5+ may replace with a true
 *  spectral sample of `pierson_moskowitz`. */
export function componentsFor(seaState: SeaState | undefined): WaveComponent[] {
  const Hs = seaState?.significant_wave_height ?? 0;
  const T = seaState?.peak_period ?? 5;
  const dirRad = ((seaState?.direction_deg ?? 0) * Math.PI) / 180;
  const peakWavelength = (G * T * T) / (2 * Math.PI);
  const A = Hs / 4; // significant ≈ 4σ in standard ocean-eng convention
  const dx = Math.cos(dirRad);
  const dz = Math.sin(dirRad);
  return [
    { amplitude: A * 1.0, wavelength: peakWavelength,        dirX: dx,                       dirZ: dz,                       steepness: 0.5 },
    { amplitude: A * 0.6, wavelength: peakWavelength * 0.5,  dirX: dx * 0.92 + -dz * 0.39,   dirZ: dz * 0.92 + dx * 0.39,    steepness: 0.4 },
    { amplitude: A * 0.4, wavelength: peakWavelength * 0.25, dirX: dx * 0.71 + -dz * 0.71,   dirZ: dz * 0.71 + dx * 0.71,    steepness: 0.3 },
    { amplitude: A * 0.3, wavelength: peakWavelength * 0.7,  dirX: -dz,                      dirZ: dx,                       steepness: 0.2 },
  ];
}

const VERT = /* glsl */ `
  precision highp float;

  uniform float uTime;
  const int N_WAVES = 4;
  uniform float uAmplitude[N_WAVES];
  uniform float uWavelength[N_WAVES];
  uniform vec2  uDirection[N_WAVES];
  uniform float uSteepness[N_WAVES];

  varying vec3 vWorldPos;
  varying vec3 vNormal;

  const float G = 9.81;

  void main() {
    vec3 pos = position;
    vec3 displaced = pos;
    vec3 tangent  = vec3(1.0, 0.0, 0.0);
    vec3 binormal = vec3(0.0, 0.0, 1.0);

    for (int i = 0; i < N_WAVES; i++) {
      float A = uAmplitude[i];
      float L = uWavelength[i];
      vec2  D = uDirection[i];
      float Q = uSteepness[i];

      float k = 6.2831853 / L;
      float omega = sqrt(G * k);
      float phase = k * dot(D, pos.xz) - omega * uTime;
      float c = cos(phase);
      float s = sin(phase);

      displaced.x += Q * A * D.x * c;
      displaced.z += Q * A * D.y * c;
      displaced.y += A * s;

      float WA = k * A;
      tangent  += vec3(-Q * D.x * D.x * WA * s, D.x * WA * c, -Q * D.x * D.y * WA * s);
      binormal += vec3(-Q * D.x * D.y * WA * s, D.y * WA * c, -Q * D.y * D.y * WA * s);
    }

    vec3 normal = normalize(cross(binormal, tangent));
    vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
    vWorldPos = worldPos.xyz;
    vNormal = mat3(modelMatrix) * normal;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const FRAG = /* glsl */ `
  precision highp float;

  uniform vec3 uSeaColor;
  uniform vec3 uSkyColor;
  uniform vec3 uSunDir;

  varying vec3 vWorldPos;
  varying vec3 vNormal;

  void main() {
    vec3 n = normalize(vNormal);
    float upness = clamp(n.y, 0.0, 1.0);
    vec3 base = mix(uSkyColor, uSeaColor, upness);
    float sun = max(dot(n, normalize(uSunDir)), 0.0);
    vec3 lit = base + vec3(0.6) * pow(sun, 16.0);
    gl_FragColor = vec4(lit, 1.0);
  }
`;

export interface SeaSurfaceHandle {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  setTime(t: number): void;
  setSeaState(seaState: SeaState | undefined): void;
  dispose(): void;
}

export interface SeaSurfaceOptions {
  /** Plane size in metres. */
  width?: number;
  height?: number;
  /** Subdivisions per side. Higher = more wave detail; squarely
   *  trades against vertex-shader cost. */
  segments?: number;
  /** Y offset (set negative if you want sea below an above-water
   *  geometry centre). */
  yOffset?: number;
}

// Default sea-plane sizing: 4 km × 4 km × 384 segments (~10 m per
// segment). Peak Pierson-Moskowitz wavelengths in normal seas are
// 30-100 m → 3-10 segments per crest. Visible wave silhouettes
// without the 512-seg vertex shader cost. Callers can override via
// SeaSurfaceOptions if they need either denser detail or a wider
// horizon. The previous default (10 km × 10 km × 256 segments,
// 39 m per segment) aliased away every wave component — fine for
// flat water, useless for a sea-state demo.
const DEFAULT_OPTS: Required<SeaSurfaceOptions> = {
  width: 4_000,
  height: 4_000,
  segments: 384,
  yOffset: 0,
};

export function createSeaSurface(
  env: Environment,
  opts: SeaSurfaceOptions = {},
): SeaSurfaceHandle {
  const { width, height, segments, yOffset } = { ...DEFAULT_OPTS, ...opts };

  const uniforms = {
    uTime: { value: 0 },
    uSeaColor: { value: new THREE.Color(0x0c4060) },
    uSkyColor: { value: new THREE.Color(0xb6d4e8) },
    uSunDir: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
    uAmplitude: { value: new Float32Array(N_WAVES) },
    uWavelength: { value: new Float32Array(N_WAVES) },
    uDirection: {
      value: Array.from({ length: N_WAVES }, () => new THREE.Vector2()),
    },
    uSteepness: { value: new Float32Array(N_WAVES) },
  };
  setUniformsFromComponents(uniforms, componentsFor(env.sea_state));

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERT,
    fragmentShader: FRAG,
    side: THREE.DoubleSide,
  });

  const geom = new THREE.PlaneGeometry(width, height, segments, segments);
  geom.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geom, material);
  mesh.name = "sea";
  mesh.position.y = yOffset;

  return {
    mesh,
    material,
    setTime(t: number) {
      material.uniforms["uTime"]!.value = t;
    },
    setSeaState(seaState: SeaState | undefined) {
      setUniformsFromComponents(material.uniforms, componentsFor(seaState));
    },
    dispose() {
      geom.dispose();
      material.dispose();
    },
  };
}

function setUniformsFromComponents(
  uniforms: THREE.ShaderMaterial["uniforms"],
  components: WaveComponent[],
): void {
  const A = uniforms["uAmplitude"]!.value as Float32Array;
  const L = uniforms["uWavelength"]!.value as Float32Array;
  const D = uniforms["uDirection"]!.value as THREE.Vector2[];
  const Q = uniforms["uSteepness"]!.value as Float32Array;
  for (let i = 0; i < N_WAVES; i++) {
    const c = components[i];
    if (!c) {
      A[i] = 0;
      L[i] = 1;
      D[i]!.set(1, 0);
      Q[i] = 0;
      continue;
    }
    A[i] = c.amplitude;
    L[i] = c.wavelength;
    D[i]!.set(c.dirX, c.dirZ);
    Q[i] = c.steepness;
  }
}
