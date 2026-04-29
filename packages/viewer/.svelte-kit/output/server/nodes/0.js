

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export const universal = {
  "ssr": false,
  "prerender": true
};
export const universal_id = "src/routes/+layout.ts";
export const imports = ["_app/immutable/nodes/0.tGF0iY5_.js","_app/immutable/chunks/_r6saDAo.js","_app/immutable/chunks/BU0DZgG9.js","_app/immutable/chunks/D6YzVrbJ.js"];
export const stylesheets = [];
export const fonts = [];
