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
  varying float vWaveHeight;

  const float G = 9.81;

  void main() {
    vec3 pos = position;
    // Use world-space coordinates for wave phase so the mesh can follow
    // the camera without waves appearing to slide.
    vec4 worldBase = modelMatrix * vec4(pos, 1.0);

    vec3 displaced = pos;
    vec3 tangent  = vec3(1.0, 0.0, 0.0);
    vec3 binormal = vec3(0.0, 0.0, 1.0);
    float waveHeightSum = 0.0;

    for (int i = 0; i < N_WAVES; i++) {
      float A = uAmplitude[i];
      float L = uWavelength[i];
      vec2  D = uDirection[i];
      float Q = uSteepness[i];

      float k = 6.2831853 / L;
      float omega = sqrt(G * k);
      float phase = k * dot(D, worldBase.xz) - omega * uTime;
      float c = cos(phase);
      float s = sin(phase);

      displaced.x += Q * A * D.x * c;
      displaced.z += Q * A * D.y * c;
      displaced.y += A * s;
      waveHeightSum += A * s;

      float WA = k * A;
      tangent  += vec3(-Q * D.x * D.x * WA * s, D.x * WA * c, -Q * D.x * D.y * WA * s);
      binormal += vec3(-Q * D.x * D.y * WA * s, D.y * WA * c, -Q * D.y * D.y * WA * s);
    }

    vWaveHeight = waveHeightSum;
    vec3 normal = normalize(cross(binormal, tangent));
    vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
    vWorldPos = worldPos.xyz;
    vNormal = mat3(modelMatrix) * normal;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const FRAG = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec3 uSeaColor;
  uniform vec3 uSkyColor;
  uniform vec3 uSunDir;
  uniform float uMaxAmplitude;
  uniform float uPlaneRadius;

  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vWaveHeight;

  // ---- Procedural noise (hash-based 2D value noise + FBM) ----
  float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float amp = 0.5;
    float totalAmp = 0.0;
    for (int i = 0; i < 4; i++) {
      v += amp * valueNoise(p);
      totalAmp += amp;
      p *= 2.0;
      amp *= 0.5;
    }
    return v / totalAmp;
  }

  void main() {
    vec3 n = normalize(vNormal);

    // --- Procedural noise normal perturbation (fine ripples) ---
    vec2 noiseCoord = vWorldPos.xz * 0.5 + uTime * vec2(0.3, 0.25);
    float eps = 0.5;
    float nC = fbm(noiseCoord);
    float nR = fbm(noiseCoord + vec2(eps, 0.0));
    float nU = fbm(noiseCoord + vec2(0.0, eps));
    vec3 noiseNormal = normalize(vec3(nC - nR, eps, nC - nU));
    n = normalize(n + noiseNormal * 0.15);

    // --- View direction ---
    vec3 viewDir = normalize(cameraPosition - vWorldPos);

    // --- Schlick fresnel (water IOR 1.33, F0 ≈ 0.02) ---
    float cosTheta = max(dot(viewDir, n), 0.0);
    float F0 = 0.02;
    float fresnel = F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);

    // --- Reflected color (sky gradient) ---
    vec3 reflDir = reflect(-viewDir, n);
    float skyT = clamp(reflDir.y * 0.5 + 0.5, 0.0, 1.0);
    vec3 horizonHaze = vec3(0.75, 0.82, 0.88);
    vec3 skyBlue = vec3(0.35, 0.55, 0.85);
    vec3 reflectedColor = mix(horizonHaze, skyBlue, skyT);

    // --- Subsurface scattering approximation ---
    vec3 sssColor = vec3(0.0, 0.55, 0.45); // turquoise/green tint
    vec3 sunDir = normalize(uSunDir);
    float viewSunAlign = max(dot(viewDir, -sunDir), 0.0);
    float maxAmp = max(uMaxAmplitude, 0.01);
    float normalizedHeight = clamp((vWaveHeight / maxAmp + 1.0) * 0.5, 0.0, 1.0);
    float sss = normalizedHeight * pow(viewSunAlign, 3.0) * 0.4;
    vec3 subsurface = sssColor * sss;

    // --- Base water color ---
    vec3 waterColor = mix(uSeaColor, reflectedColor, fresnel) + subsurface;

    // --- Sun specular (Blinn-Phong) ---
    vec3 halfDir = normalize(sunDir + viewDir);
    float NdotH = max(dot(n, halfDir), 0.0);
    float specPrimary = pow(NdotH, 256.0);   // tight sun highlight
    float specSecondary = pow(NdotH, 32.0);   // broader glare
    vec3 sunColor = vec3(1.0, 0.95, 0.85);
    vec3 specular = sunColor * (specPrimary * 1.5 + specSecondary * 0.25);

    // --- Foam / whitecaps ---
    float foamNoise = fbm(vWorldPos.xz * 0.3 + uTime * vec2(0.1, 0.08));
    float foamMask = smoothstep(0.5, 0.9, normalizedHeight) * foamNoise;
    vec3 foamColor = vec3(0.9, 0.95, 1.0);
    waterColor = mix(waterColor, foamColor, foamMask * 0.6);

    // --- Combine ---
    vec3 color = waterColor + specular;

    // --- Distance fog (exponential atmospheric) ---
    float dist = length(vWorldPos - cameraPosition);
    vec3 fogColor = horizonHaze;
    float fogDensity = 0.00012;
    float fogFactor = 1.0 - exp(-fogDensity * dist);
    color = mix(color, fogColor, fogFactor);

    // --- Edge blending (hide plane boundary) ---
    float edgeDist = length(vWorldPos.xz - cameraPosition.xz);
    float edgeFade = smoothstep(uPlaneRadius * 0.7, uPlaneRadius, edgeDist);
    color = mix(color, fogColor, edgeFade);

    gl_FragColor = vec4(color, 1.0);
  }
`;

export interface SeaSurfaceHandle {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  setTime(t: number): void;
  setSeaState(seaState: SeaState | undefined): void;
  setCenter(x: number, z: number): void;
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

// Default sea-plane sizing: 6 km × 6 km × 512 segments (~11.7 m per
// segment). Peak Pierson-Moskowitz wavelengths in normal seas are
// 30-100 m → 3-9 segments per crest. Wider extent reduces visible
// edge pop-in when following the camera. Callers can override via
// SeaSurfaceOptions if they need either denser detail or a wider
// horizon.
const DEFAULT_OPTS: Required<SeaSurfaceOptions> = {
  width: 6_000,
  height: 6_000,
  segments: 512,
  yOffset: 0,
};

export function createSeaSurface(
  env: Environment,
  opts: SeaSurfaceOptions = {},
): SeaSurfaceHandle {
  const { width, height, segments, yOffset } = { ...DEFAULT_OPTS, ...opts };

  const planeRadius = Math.sqrt(width * width + height * height) / 2;

  const components = componentsFor(env.sea_state);
  const maxAmplitude = components.reduce((sum, c) => sum + c.amplitude, 0);

  const uniforms = {
    uTime: { value: 0 },
    uSeaColor: { value: new THREE.Color(0x062840) },
    uSkyColor: { value: new THREE.Color(0xb0ccdd) },
    uSunDir: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
    uAmplitude: { value: new Float32Array(N_WAVES) },
    uWavelength: { value: new Float32Array(N_WAVES) },
    uDirection: {
      value: Array.from({ length: N_WAVES }, () => new THREE.Vector2()),
    },
    uSteepness: { value: new Float32Array(N_WAVES) },
    uMaxAmplitude: { value: maxAmplitude },
    uPlaneRadius: { value: planeRadius },
  };
  setUniformsFromComponents(uniforms, components);

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERT,
    fragmentShader: FRAG,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
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
      const comps = componentsFor(seaState);
      setUniformsFromComponents(material.uniforms, comps);
      material.uniforms["uMaxAmplitude"]!.value = comps.reduce(
        (sum, c) => sum + c.amplitude,
        0,
      );
    },
    setCenter(x: number, z: number) {
      mesh.position.x = x;
      mesh.position.z = z;
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
