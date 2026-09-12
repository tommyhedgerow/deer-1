import { redirect } from '@sveltejs/kit';

const FALLBACK = '/account';

/**
 * Only same-site absolute paths are accepted as post-auth destinations, so a
 * crafted `?redirect=` cannot bounce a freshly signed-in user off-site.
 */
export function safeRedirect(raw: string | null | undefined, fallback = FALLBACK): string {
	if (!raw) return fallback;
	if (!raw.startsWith('/')) return fallback;
	if (raw.startsWith('//') || raw.includes('\\')) return fallback;
	return raw;
}

/** Send an already-authenticated visitor on to their destination. */
export function awayIfSignedIn(user: unknown, url: URL, fallback = FALLBACK): void {
	if (!user) return;
	redirect(303, safeRedirect(url.searchParams.get('redirect'), fallback));
}
