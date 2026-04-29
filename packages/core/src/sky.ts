import * as THREE from "three";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import type { Anchor, Environment } from "./dsl.js";

/**
 * Sky + sun lighting tied to environment.time_of_day. Uses Three's
 * Preetham sky model from `three/examples/jsm/objects/Sky.js` plus a
 * matching DirectionalLight whose position tracks the configured
 * solar elevation/azimuth.
 *
 * Solar geometry: simplified astronomical model — declination fixed
 * to the summer solstice (day_of_year = 172, the original "Kiel
 * approach at dusk" use case the design vision YAML hints at), hour
 * angle from time_of_day. Adequate for "the sun looks like it's
 * roughly in the right place for the time of day"; not adequate for
 * shadow-casting validation.
 */

export interface SkyHandle {
  /** The Three.Sky mesh — add to scene; covers the entire view. */
  sky: Sky;
  sun: THREE.DirectionalLight;
  ambient: THREE.AmbientLight;
  setEnvironment(env: Environment, anchor: Anchor): void;
  dispose(): void;
}

const SUN_DISTANCE = 4_000;

export function createSky(env: Environment, anchor: Anchor): SkyHandle {
  const sky = new Sky();
  sky.scale.setScalar(450_000);
  const skyUniforms = sky.material.uniforms;
  skyUniforms["turbidity"]!.value = 8;
  skyUniforms["rayleigh"]!.value = 2.5;
  skyUniforms["mieCoefficient"]!.value = 0.005;
  skyUniforms["mieDirectionalG"]!.value = 0.85;

  const sun = new THREE.DirectionalLight(0xffffff, 1.0);
  sun.position.set(0, SUN_DISTANCE, 0);
  // Ambient is intentionally low — most light comes from the sun.
  // Will be modulated below the horizon for realism.
  const ambient = new THREE.AmbientLight(0xffffff, 0.2);

  applyEnvironment(sky, sun, ambient, env, anchor);

  return {
    sky,
    sun,
    ambient,
    setEnvironment(e, a) {
      applyEnvironment(sky, sun, ambient, e, a);
    },
    dispose() {
      sky.geometry.dispose();
      (sky.material as THREE.Material).dispose();
    },
  };
}

function applyEnvironment(
  sky: Sky,
  sun: THREE.DirectionalLight,
  ambient: THREE.AmbientLight,
  env: Environment,
  anchor: Anchor,
): void {
  const { elevation, azimuth } = solarPosition(env.time_of_day, anchor.lat);
  const phi = Math.PI / 2 - elevation;
  const theta = azimuth;
  const sunPos = new THREE.Vector3();
  sunPos.setFromSphericalCoords(SUN_DISTANCE, phi, theta);

  sky.material.uniforms["sunPosition"]!.value.copy(sunPos);
  sun.position.copy(sunPos);

  // Below-horizon suns aren't useful as light sources; clamp.
  const intensity = Math.max(0, Math.sin(elevation));
  sun.intensity = 0.2 + 0.9 * intensity;
  ambient.intensity = 0.05 + 0.25 * intensity;
}

/**
 * Solar elevation + azimuth (radians) at given time-of-day and
 * latitude (degrees). Day of year fixed to summer solstice (172).
 * Reference frame: elevation = angle above horizon; azimuth =
 * 0 at south, increasing east/clockwise (matches Three's
 * `setFromSphericalCoords` with `theta` rotating around y).
 */
export function solarPosition(timeOfDay: string, latDeg: number): {
  elevation: number;
  azimuth: number;
} {
  const m = timeOfDay.match(/^(\d{2}):(\d{2})$/);
  if (!m) throw new Error(`invalid time_of_day: ${timeOfDay}`);
  const hours = Number(m[1]) + Number(m[2]) / 60;

  const declRad = (23.4 * Math.PI) / 180;
  const latRad = (latDeg * Math.PI) / 180;
  const hourAngle = ((hours - 12) * 15 * Math.PI) / 180;

  const sinEl =
    Math.sin(latRad) * Math.sin(declRad) +
    Math.cos(latRad) * Math.cos(declRad) * Math.cos(hourAngle);
  const elevation = Math.asin(Math.max(-1, Math.min(1, sinEl)));

  const azimuth = Math.atan2(
    Math.sin(hourAngle),
    Math.cos(hourAngle) * Math.sin(latRad) - Math.tan(declRad) * Math.cos(latRad),
  );

  return { elevation, azimuth };
}
