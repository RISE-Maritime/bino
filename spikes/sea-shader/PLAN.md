# Spike S13: Gerstner sea shader

## Why

v0.4a #6 wants an animated sea surface driven by the DSL's
`environment.sea_state` (Pierson-Moskowitz spectrum, height,
period, direction). Settle:

- **Approach.** Three's `Water` example is too tied to a specific
  reflection setup; we want shader-level control. Custom
  `THREE.ShaderMaterial` with Gerstner (trochoidal) waves is the
  documented choice from the plan.
- **Wave-component count.** 4 vs 8 vs full PM-spectrum sampling.
  Trade-off: more components = more realistic surface, more vertex
  shader work.
- **Vertex displacement vs normal map.** Real Gerstner displaces
  vertices AND analytically computes the perturbed normal. Normal
  maps alone aren't enough — without displacement the surface is
  flat at the silhouette.
- **Software-rendering compatibility.** Our v0.1/v0.2 stack
  defaults to `@kmamal/gl` software rasterization. Verify the
  shader compiles and produces sensible output there.

## Acceptance

- A working `THREE.ShaderMaterial` that displaces vertices and
  perturbs normals via Gerstner.
- Compiles + renders one frame against `@kmamal/gl` in headless
  Node.
- Color output non-zero, varies across the surface (i.e. wasn't
  flat-shaded by accident).
- A PPM dump for visual sanity.
- Sea-state parameters wired to a `setSeaState({height, period,
direction})` API the v0.4a integration can call.
- `results.md` with the verdict + the shader source ready to lift
  into `@bino/core`.

## Out of scope

- Full Pierson-Moskowitz spectral sampling — defer to a v0.4a
  follow-up. Start with 4 manually-tuned components.
- Reflections, refractions, foam — v1.0 polish.
- Caustics, sub-surface scattering — never.

## Time box

~1 day (the spike gets the bigger budget because the unknowns are
real — visual quality matters and shaders are fiddly).
