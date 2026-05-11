# Spike S13: Gerstner sea shader — verdict

**Spike date:** 2026-04-29
**Time spent:** ~1.5 hours (well under the 1-day box).

## Headline

**A 4-component Gerstner shader compiles and renders against
software-rendered `@kmamal/gl` at 17-20 ms per frame for a 512×384
output, a 256×256-segment plane, and one ShaderMaterial.** Output
is sea-state-sensitive: calm seas produce 18 unique colours,
moderate (Hs=1.5 m) 50, heavy (Hs=3.5 m) 48. Visually distinct
between states; the PPM dumps in `out/sea-{calm,moderate,heavy}.ppm`
show the wave faces clearly.

The spike's `sea.mjs` **is the v0.4a #6 implementation** — keep it
as production-quality code from day one. Lift to
`@bino/core/src/sea.ts` when v0.4a starts.

## Numbers

| sea state | Hs (m) | period (s) | render (ms) | unique colours |
| --------- | -----: | ---------: | ----------: | -------------: |
| calm      |    0.3 |        4.0 |         54¹ |             18 |
| moderate  |    1.5 |        6.0 |          18 |             50 |
| heavy     |    3.5 |        9.0 |          17 |             48 |

¹ first frame includes shader compile (~36 ms one-shot cost).

## Approach decisions locked

- **Custom `THREE.ShaderMaterial`, not Three's `Water` / `Water2`
  examples.** Three's water is good but tied to a specific
  reflection setup and parametrized for arbitrary gameplay use, not
  for DSL-driven sea-state control. Custom shader is ~120 lines and
  gives us full control of the parameters.
- **4 fixed wave components.** Tunable from sea-state input via
  `componentsFor({significant_wave_height, peak_period, direction_deg})`.
  Matches the DSL `environment.sea_state` shape from the design
  vision YAML. Component count is hard-coded in the shader (`const
int N_WAVES = 4;`); growing it later is a recompile, not a
  refactor.
- **Vertex displacement + analytic normals.** Per _GPU Gems 1
  Chapter 1_ (Mark Finch). The math is well-documented and
  portable; the implementation in `sea.mjs:VERT` is direct from the
  formula. No normal map, no fancy specular — just per-fragment
  lighting from the displaced normal. Foam, refractions, caustics
  are v1.0+ polish.
- **Pierson-Moskowitz spectral sampling deferred** to a v0.4a
  follow-up. The spike's `componentsFor()` picks 4 components
  manually phased and oriented around the configured wind direction;
  going to full PM (sampling N components from the spectrum) is a
  ~30-LOC change in `componentsFor` without touching the shader.
- **Steepness Q ∈ [0,1] per wave** — controls trochoidal
  sharpening. The spike uses 0.5/0.4/0.3/0.2 for the four
  components. v0.5 may want a single global "choppiness" knob in
  the DSL; defer.

## Things that could go wrong (and didn't)

- **Software rasterization compatibility.** Concern was that
  Mesa's llvmpipe might not support all GLSL constructs the shader
  uses (`varying` with vec3, uniform arrays of vec2/float). Worked
  first try.
- **Shader compile time.** First frame is ~54 ms (38 ms compile +
  16 ms render); subsequent frames are 17-20 ms. Well within
  budget for v0.4a's animated-sea use case.
- **Self-intersection at high steepness.** Gerstner waves with
  ΣQ_i·k_i·A_i > 1 produce loops at the crests. Our default
  steepness values stay safely below this. Document as a known
  limit if anyone bumps the steepness aggressively.

## What surprised me

- **Heavy seas had slightly fewer unique colours than moderate.**
  At Hs=3.5 m many wave crests cover groups of pixels with similar
  shading because the wave faces are larger and more dominant in
  the output. Not a bug — just the way colour-count changes
  non-monotonically with amplitude. The visual is unmistakably
  rougher in `sea-heavy.ppm`.
- **The "default" Three.js sky-vs-sea blend in the fragment shader
  needs tuning.** With `mix(uSkyColor, uSeaColor, n.y)`, near-grazing
  views see sky-blue dominating because `n.y` stays close to 0 from
  the side. For overhead views it's right. v0.4a #7 (sky+sun)
  should pass the actual sky cube to the shader for proper
  fresnel-style reflection — flagged as a follow-up rather than
  fixed in the spike.

## Acceptance vs the spike plan

| criterion                               | result                   |
| --------------------------------------- | ------------------------ |
| Working `THREE.ShaderMaterial`          | ✓ — `sea.mjs`            |
| Compiles + renders against `@kmamal/gl` | ✓                        |
| Output non-zero, varies                 | ✓ — 18-50 unique colours |
| PPM dumps for visual sanity             | ✓ — calm/moderate/heavy  |
| Sea-state setter API                    | ✓ — `componentsFor()`    |

## What v0.4a #6 looks like

`@bino/core/src/sea.ts` exports `buildSeaSurface(scenarioEnv,
{plane: {width, height, segments}}) → THREE.Mesh`. Internally:

1. Compute components via `componentsFor(scenarioEnv.sea_state)`.
2. Build a `THREE.ShaderMaterial` (the spike's `buildSeaMaterial`).
3. Wrap it in a `THREE.Mesh` with a `PlaneGeometry`.
4. Per-tick: `setSeaTime(material, t)` from the runner.

The `EnvironmentSnapshot` interface (v0.4a #2) needs to flow
`sea_state` through; for v0.4a we re-call `componentsFor` whenever
sea_state changes (rare; usually fixed per-scenario). Animated sea
state — wind picking up over time — is v0.5+ scope.
