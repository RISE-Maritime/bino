

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export const universal = {
  "ssr": false,
  "prerender": true
};
export const universal_id = "src/routes/+layout.ts";
export const imports = ["_app/immutable/nodes/0.BV6XfGFj.js","_app/immutable/chunks/D3udM_jP.js","_app/immutable/chunks/DmwP-tdC.js","_app/immutable/chunks/CS5EFGGd.js"];
export const stylesheets = [];
export const fonts = [];
