import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// Kit options (adapter, compilerOptions, typescript) live in svelte.config.js.
// Passing any of them here instead makes SvelteKit ignore that file entirely.
export default defineConfig({
	plugins: [tailwindcss(), sveltekit()]
});
