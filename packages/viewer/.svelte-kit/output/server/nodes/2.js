

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/2.CHCtzciD.js","_app/immutable/chunks/D3udM_jP.js","_app/immutable/chunks/DmwP-tdC.js"];
export const stylesheets = [];
export const fonts = [];
