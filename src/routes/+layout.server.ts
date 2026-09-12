import type { LayoutServerLoad } from './$types';

/**
 * The session lives in `locals` (set by `hooks.server.ts`). Only leaf fields
 * cross to the client — never the whole session record.
 */
export const load: LayoutServerLoad = async ({ locals }) => {
	const u = locals.user;
	return {
		user: u
			? { id: u.id, name: u.name, email: u.email, image: u.image ?? null }
			: null
	};
};
