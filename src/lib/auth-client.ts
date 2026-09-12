// Browser-side better-auth client. Calls go to the same origin, which is what
// the server's `baseURL` (env.ORIGIN) expects, so no explicit baseURL is needed.
import { createAuthClient } from 'better-auth/svelte';

export const authClient = createAuthClient();
