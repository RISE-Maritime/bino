// Gerstner (trochoidal) sea-surface ShaderMaterial.
//
// This file is the v0.4a #6 implementation in spike form — the
// shader sources + the JS wiring will lift directly into
// @bino/core/src/sea.ts when v0.4a starts. Keep production-quality.
//
// Wave model: sum of N Gerstner components. Each component has:
//   - amplitude (m)
//   - wavelength (m) → wavenumber k = 2π / wavelength
//   - direction (unit vector in xz plane)
//   - speed: deep-water dispersion ω = sqrt(g·k), so phase = ω·t
//   - steepness: Q ∈ [0,1] — controls how sharp the crests get
//                (Q=0 reduces to plain sine waves; Q=1 starts to
//                 produce loops if ΣQ_i·k_i·A_i > 1)
//
// The summed displacement and analytical-normal formulas come from
// GPU Gems 1, Chapter 1 (Mark Finch, "Effective Water Simulation
// from Physical Models"). Maintained here for portability.

import * as THREE from "three";

/**
 * Pick component parameters from a sea-state-like configuration.
 * Pierson-Moskowitz spectral sampling is the v0.4a follow-up; this
 * starting point is 4 manually-tuned components phased and oriented
 * around the configured wind direction.
 */
export function componentsFor({
  significant_wave_height = 1.2,
  peak_period = 6.5,
  direction_deg = 0,
} = {}) {
  // Peak wavelength from peak period using deep-water dispersion:
  //   ω = 2π / T,    k = ω² / g,    L = 2π / k = g·T² / 2π.
  const g = 9.81;
  const peakWavelength = (g * peak_period * peak_period) / (2 * Math.PI);

  // 4 components: peak, half-peak, quarter-peak, plus a
  // perpendicular cross-swell. Amplitudes scaled so RMS ≈
  // significant_wave_height / 4 (significant ≈ 4·σ in standard
  // ocean-eng convention).
  const Hs = significant_wave_height;
  const A = Hs / 4;
  const dirRad = (direction_deg * Math.PI) / 180;
  const dx = Math.cos(dirRad);
  const dz = Math.sin(dirRad);

  return [
    { amplitude: A * 1.0, wavelength: peakWavelength, dirX: dx, dirZ: dz, steepness: 0.5 },
    { amplitude: A * 0.6, wavelength: peakWavelength * 0.5, dirX: dx * 0.92 + -dz * 0.39, dirZ: dz * 0.92 + dx * 0.39, steepness: 0.4 },
    { amplitude: A * 0.4, wavelength: peakWavelength * 0.25, dirX: dx * 0.71 + -dz * 0.71, dirZ: dz * 0.71 + dx * 0.71, steepness: 0.3 },
    { amplitude: A * 0.3, wavelength: peakWavelength * 0.7, dirX: -dz, dirZ: dx, steepness: 0.2 },
  ];
}

const VERT = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec3 uSeaColor;
  uniform vec3 uSkyColor;
  uniform vec3 uSunDir;

  // 4 wave components packed into uniform arrays (the count is
  // fixed in the shader; growing it requires recompiling).
  const int N_WAVES = 4;
  uniform float uAmplitude[N_WAVES];
  uniform float uWavelength[N_WAVES];
  uniform vec2  uDirection[N_WAVES];   // unit, in xz plane
  uniform float uSteepness[N_WAVES];

  varying vec3 vWorldPos;
  varying vec3 vNormal;

  const float G = 9.81;

  void main() {
    vec3 pos = position;
    vec3 displaced = pos;
    // Tangent / binormal for analytic normal (start at the
    // unperturbed values; each wave perturbs them).
    vec3 tangent = vec3(1.0, 0.0, 0.0);
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

      // Gerstner displacement:
      //   x += Q * A * D.x * cos(phase)
      //   z += Q * A * D.y * cos(phase)
      //   y += A * sin(phase)
      displaced.x += Q * A * D.x * c;
      displaced.z += Q * A * D.y * c;
      displaced.y += A * s;

      // Analytic normal contributions (GPU Gems Ch 1).
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
    // Fake fresnel-ish blend: when the normal points up (away from
    // viewer for a flat-ish sea), show sea colour; near grazing
    // angle (normal perpendicular to view), bias toward sky.
    float upness = clamp(n.y, 0.0, 1.0);
    vec3 base = mix(uSkyColor, uSeaColor, upness);

    // Diffuse-ish sun component for highlights on wave faces.
    float sun = max(dot(n, normalize(uSunDir)), 0.0);
    vec3 lit = base + vec3(0.6) * pow(sun, 16.0);

    gl_FragColor = vec4(lit, 1.0);
  }
`;

/**
 * Build a Three.ShaderMaterial driven by the given sea-state
 * components. `update(material, t)` advances the time uniform.
 */
export function buildSeaMaterial(initialComponents) {
  const uniforms = {
    uTime: { value: 0 },
    uSeaColor: { value: new THREE.Color(0x0c4060) },
    uSkyColor: { value: new THREE.Color(0xb6d4e8) },
    uSunDir: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
    uAmplitude: { value: new Float32Array(4) },
    uWavelength: { value: new Float32Array(4) },
    uDirection: { value: [
      new THREE.Vector2(), new THREE.Vector2(),
      new THREE.Vector2(), new THREE.Vector2(),
    ] },
    uSteepness: { value: new Float32Array(4) },
  };
  setSeaComponents(uniforms, initialComponents);
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERT,
    fragmentShader: FRAG,
    side: THREE.DoubleSide,
  });
}

export function setSeaComponents(uniforms, components) {
  for (let i = 0; i < 4; i++) {
    const c = components[i];
    if (!c) {
      uniforms.uAmplitude.value[i] = 0;
      uniforms.uWavelength.value[i] = 1;
      uniforms.uDirection.value[i].set(1, 0);
      uniforms.uSteepness.value[i] = 0;
      continue;
    }
    uniforms.uAmplitude.value[i] = c.amplitude;
    uniforms.uWavelength.value[i] = c.wavelength;
    uniforms.uDirection.value[i].set(c.dirX, c.dirZ);
    uniforms.uSteepness.value[i] = c.steepness;
  }
}

export function setSeaTime(material, t) {
  material.uniforms.uTime.value = t;
}
