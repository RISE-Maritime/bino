export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([]),
	mimeTypes: {},
	_: {
		client: {start:"_app/immutable/entry/start.BJ83vDOd.js",app:"_app/immutable/entry/app.CmMWdmuI.js",imports:["_app/immutable/entry/start.BJ83vDOd.js","_app/immutable/chunks/DzO97bUq.js","_app/immutable/chunks/DmwP-tdC.js","_app/immutable/chunks/OPpdAD3J.js","_app/immutable/entry/app.CmMWdmuI.js","_app/immutable/chunks/DmwP-tdC.js","_app/immutable/chunks/d1_Ve-tO.js","_app/immutable/chunks/D3udM_jP.js","_app/immutable/chunks/OPpdAD3J.js","_app/immutable/chunks/CS5EFGGd.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js'))
		],
		remotes: {
			
		},
		routes: [
			
		],
		prerendered_routes: new Set(["/"]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
