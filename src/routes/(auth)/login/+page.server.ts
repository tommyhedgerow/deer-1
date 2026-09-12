import { awayIfSignedIn, safeRedirect } from '$lib/server/redirect';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	awayIfSignedIn(locals.user, url);
	return { redirectTo: safeRedirect(url.searchParams.get('redirect')) };
};
