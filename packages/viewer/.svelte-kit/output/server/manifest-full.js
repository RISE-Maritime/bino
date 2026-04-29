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
		client: {start:"_app/immutable/entry/start.Bt6c0lX8.js",app:"_app/immutable/entry/app.N5Quruok.js",imports:["_app/immutable/entry/start.Bt6c0lX8.js","_app/immutable/chunks/CYCoQl0i.js","_app/immutable/chunks/BU0DZgG9.js","_app/immutable/chunks/3q_Q3XbO.js","_app/immutable/entry/app.N5Quruok.js","_app/immutable/chunks/BU0DZgG9.js","_app/immutable/chunks/BeGXTDLn.js","_app/immutable/chunks/_r6saDAo.js","_app/immutable/chunks/3q_Q3XbO.js","_app/immutable/chunks/D6YzVrbJ.js","_app/immutable/chunks/B3CsZdTR.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
