
// this file is generated — do not edit it


/// <reference types="@sveltejs/kit" />

/**
 * This module provides access to environment variables that are injected _statically_ into your bundle at build time and are limited to _private_ access.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Static environment variables are [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env` at build time and then statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * **_Private_ access:**
 * 
 * - This module cannot be imported into client-side code
 * - This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured)
 * 
 * For example, given the following build time environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { ENVIRONMENT, PUBLIC_BASE_URL } from '$env/static/private';
 * 
 * console.log(ENVIRONMENT); // => "production"
 * console.log(PUBLIC_BASE_URL); // => throws error during build
 * ```
 * 
 * The above values will be the same _even if_ different values for `ENVIRONMENT` or `PUBLIC_BASE_URL` are set at runtime, as they are statically replaced in your code with their build time values.
 */
declare module '$env/static/private' {
	export const DOCKER_BUILDKIT: string;
	export const npm_package_devDependencies_vitest: string;
	export const USER: string;
	export const CLAUDE_CODE_ENTRYPOINT: string;
	export const npm_config_user_agent: string;
	export const GIT_EDITOR: string;
	export const HOSTNAME: string;
	export const GIT_ASKPASS: string;
	export const pnpm_config_pm_on_fail: string;
	export const npm_package_dependencies__bino_core: string;
	export const npm_package_devDependencies__sveltejs_vite_plugin_svelte: string;
	export const npm_package_devDependencies_vite: string;
	export const npm_node_execpath: string;
	export const SHLVL: string;
	export const BROWSER: string;
	export const HOME: string;
	export const TERM_PROGRAM_VERSION: string;
	export const NVM_BIN: string;
	export const VSCODE_IPC_HOOK_CLI: string;
	export const NVM_INC: string;
	export const NVM_SYMLINK_CURRENT: string;
	export const npm_package_dependencies_three: string;
	export const npm_package_devDependencies__sveltejs_adapter_static: string;
	export const VSCODE_GIT_ASKPASS_MAIN: string;
	export const npm_package_dependencies__eclipse_zenoh_zenoh_ts: string;
	export const npm_package_devDependencies_svelte_check: string;
	export const VSCODE_GIT_ASKPASS_NODE: string;
	export const VSCODE_PYTHON_AUTOACTIVATE_GUARD: string;
	export const COLORTERM: string;
	export const REMOTE_CONTAINERS: string;
	export const npm_package_description: string;
	export const npm_package_devDependencies_typescript: string;
	export const NVM_DIR: string;
	export const WAYLAND_DISPLAY: string;
	export const npm_package_scripts_dev: string;
	export const REMOTE_CONTAINERS_IPC: string;
	export const npm_package_type: string;
	export const _: string;
	export const npm_package_private: string;
	export const NVIDIA_DRIVER_CAPABILITIES: string;
	export const CLAUDE_CODE_SSE_PORT: string;
	export const PROMPT_DIRTRIM: string;
	export const npm_config_registry: string;
	export const TERM: string;
	export const OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE: string;
	export const RUSTUP_HOME: string;
	export const CODELLDB_LAUNCH_CONNECT_FILE: string;
	export const npm_config_node_gyp: string;
	export const PATH: string;
	export const NODE: string;
	export const npm_package_name: string;
	export const COREPACK_ENABLE_AUTO_PIN: string;
	export const XDG_RUNTIME_DIR: string;
	export const npm_config_frozen_lockfile: string;
	export const REMOTE_CONTAINERS_SOCKETS: string;
	export const DISPLAY: string;
	export const NoDefaultCurrentDirectoryInExePath: string;
	export const LANG: string;
	export const LS_COLORS: string;
	export const VSCODE_GIT_IPC_HANDLE: string;
	export const TERM_PROGRAM: string;
	export const npm_lifecycle_script: string;
	export const REMOTE_CONTAINERS_DISPLAY_SOCK: string;
	export const npm_package_scripts_test: string;
	export const npm_package_devDependencies__sveltejs_kit: string;
	export const SHELL: string;
	export const npm_package_version: string;
	export const npm_lifecycle_event: string;
	export const NODE_PATH: string;
	export const npm_package_scripts_build: string;
	export const npm_package_devDependencies_svelte: string;
	export const RUST_VERSION: string;
	export const CLAUDECODE: string;
	export const npm_package_scripts_typecheck: string;
	export const VSCODE_GIT_ASKPASS_EXTRA_ARGS: string;
	export const PWD: string;
	export const npm_execpath: string;
	export const CARGO_HOME: string;
	export const NVM_CD_FLAGS: string;
	export const CLAUDE_CODE_EXECPATH: string;
	export const npm_config_recursive: string;
	export const PNPM_SCRIPT_SRC_DIR: string;
	export const npm_command: string;
	export const npm_package_scripts_preview: string;
	export const npm_package_devDependencies__types_three: string;
	export const INIT_CWD: string;
	export const NODE_ENV: string;
}

/**
 * This module provides access to environment variables that are injected _statically_ into your bundle at build time and are _publicly_ accessible.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Static environment variables are [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env` at build time and then statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * **_Public_ access:**
 * 
 * - This module _can_ be imported into client-side code
 * - **Only** variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`) are included
 * 
 * For example, given the following build time environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { ENVIRONMENT, PUBLIC_BASE_URL } from '$env/static/public';
 * 
 * console.log(ENVIRONMENT); // => throws error during build
 * console.log(PUBLIC_BASE_URL); // => "http://site.com"
 * ```
 * 
 * The above values will be the same _even if_ different values for `ENVIRONMENT` or `PUBLIC_BASE_URL` are set at runtime, as they are statically replaced in your code with their build time values.
 */
declare module '$env/static/public' {
	
}

/**
 * This module provides access to environment variables set _dynamically_ at runtime and that are limited to _private_ access.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Dynamic environment variables are defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`.
 * 
 * **_Private_ access:**
 * 
 * - This module cannot be imported into client-side code
 * - This module includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured)
 * 
 * > [!NOTE] In `dev`, `$env/dynamic` includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 * 
 * > [!NOTE] To get correct types, environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * >
 * > ```env
 * > MY_FEATURE_FLAG=
 * > ```
 * >
 * > You can override `.env` values from the command line like so:
 * >
 * > ```sh
 * > MY_FEATURE_FLAG="enabled" npm run dev
 * > ```
 * 
 * For example, given the following runtime environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { env } from '$env/dynamic/private';
 * 
 * console.log(env.ENVIRONMENT); // => "production"
 * console.log(env.PUBLIC_BASE_URL); // => undefined
 * ```
 */
declare module '$env/dynamic/private' {
	export const env: {
		DOCKER_BUILDKIT: string;
		npm_package_devDependencies_vitest: string;
		USER: string;
		CLAUDE_CODE_ENTRYPOINT: string;
		npm_config_user_agent: string;
		GIT_EDITOR: string;
		HOSTNAME: string;
		GIT_ASKPASS: string;
		pnpm_config_pm_on_fail: string;
		npm_package_dependencies__bino_core: string;
		npm_package_devDependencies__sveltejs_vite_plugin_svelte: string;
		npm_package_devDependencies_vite: string;
		npm_node_execpath: string;
		SHLVL: string;
		BROWSER: string;
		HOME: string;
		TERM_PROGRAM_VERSION: string;
		NVM_BIN: string;
		VSCODE_IPC_HOOK_CLI: string;
		NVM_INC: string;
		NVM_SYMLINK_CURRENT: string;
		npm_package_dependencies_three: string;
		npm_package_devDependencies__sveltejs_adapter_static: string;
		VSCODE_GIT_ASKPASS_MAIN: string;
		npm_package_dependencies__eclipse_zenoh_zenoh_ts: string;
		npm_package_devDependencies_svelte_check: string;
		VSCODE_GIT_ASKPASS_NODE: string;
		VSCODE_PYTHON_AUTOACTIVATE_GUARD: string;
		COLORTERM: string;
		REMOTE_CONTAINERS: string;
		npm_package_description: string;
		npm_package_devDependencies_typescript: string;
		NVM_DIR: string;
		WAYLAND_DISPLAY: string;
		npm_package_scripts_dev: string;
		REMOTE_CONTAINERS_IPC: string;
		npm_package_type: string;
		_: string;
		npm_package_private: string;
		NVIDIA_DRIVER_CAPABILITIES: string;
		CLAUDE_CODE_SSE_PORT: string;
		PROMPT_DIRTRIM: string;
		npm_config_registry: string;
		TERM: string;
		OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE: string;
		RUSTUP_HOME: string;
		CODELLDB_LAUNCH_CONNECT_FILE: string;
		npm_config_node_gyp: string;
		PATH: string;
		NODE: string;
		npm_package_name: string;
		COREPACK_ENABLE_AUTO_PIN: string;
		XDG_RUNTIME_DIR: string;
		npm_config_frozen_lockfile: string;
		REMOTE_CONTAINERS_SOCKETS: string;
		DISPLAY: string;
		NoDefaultCurrentDirectoryInExePath: string;
		LANG: string;
		LS_COLORS: string;
		VSCODE_GIT_IPC_HANDLE: string;
		TERM_PROGRAM: string;
		npm_lifecycle_script: string;
		REMOTE_CONTAINERS_DISPLAY_SOCK: string;
		npm_package_scripts_test: string;
		npm_package_devDependencies__sveltejs_kit: string;
		SHELL: string;
		npm_package_version: string;
		npm_lifecycle_event: string;
		NODE_PATH: string;
		npm_package_scripts_build: string;
		npm_package_devDependencies_svelte: string;
		RUST_VERSION: string;
		CLAUDECODE: string;
		npm_package_scripts_typecheck: string;
		VSCODE_GIT_ASKPASS_EXTRA_ARGS: string;
		PWD: string;
		npm_execpath: string;
		CARGO_HOME: string;
		NVM_CD_FLAGS: string;
		CLAUDE_CODE_EXECPATH: string;
		npm_config_recursive: string;
		PNPM_SCRIPT_SRC_DIR: string;
		npm_command: string;
		npm_package_scripts_preview: string;
		npm_package_devDependencies__types_three: string;
		INIT_CWD: string;
		NODE_ENV: string;
		[key: `PUBLIC_${string}`]: undefined;
		[key: `${string}`]: string | undefined;
	}
}

/**
 * This module provides access to environment variables set _dynamically_ at runtime and that are _publicly_ accessible.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Dynamic environment variables are defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`.
 * 
 * **_Public_ access:**
 * 
 * - This module _can_ be imported into client-side code
 * - **Only** variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`) are included
 * 
 * > [!NOTE] In `dev`, `$env/dynamic` includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 * 
 * > [!NOTE] To get correct types, environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * >
 * > ```env
 * > MY_FEATURE_FLAG=
 * > ```
 * >
 * > You can override `.env` values from the command line like so:
 * >
 * > ```sh
 * > MY_FEATURE_FLAG="enabled" npm run dev
 * > ```
 * 
 * For example, given the following runtime environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://example.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { env } from '$env/dynamic/public';
 * console.log(env.ENVIRONMENT); // => undefined, not public
 * console.log(env.PUBLIC_BASE_URL); // => "http://example.com"
 * ```
 * 
 * ```
 * 
 * ```
 */
declare module '$env/dynamic/public' {
	export const env: {
		[key: `PUBLIC_${string}`]: string | undefined;
	}
}
