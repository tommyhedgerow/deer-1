import adapter from '@sveltejs/adapter-netlify';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},

	kit: {
		// Deploying to Netlify, so pin the adapter instead of guessing with
		// adapter-auto. Publishes to `build/` and writes the serverless function.
		adapter: adapter(),

		typescript: {
			config: (config) => {
				config.include.push('../drizzle.config.ts');
			}
		}
	}
};

export default config;
