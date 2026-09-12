import { error, json } from '@sveltejs/kit';
import { countProgress, loadProgress, setProgress } from '$lib/server/progress';
import { achievementProgress } from '$lib/server/achievements';
import { isCurriculum } from '$lib/hanzi';
import { isStatus } from '$lib/progress';
import type { RequestHandler } from './$types';

const MAX_HANZI_ID = 100_000;

/** Every mark the signed-in user has made, plus their tallies. */
export const GET: RequestHandler = async ({ locals }) => {
	const user = locals.user;
	if (!user) error(401, 'Sign in to keep track of your progress.');

	const [progress, counts] = await Promise.all([loadProgress(user.id), countProgress(user.id)]);
	return json({ progress, counts });
};

/**
 * Set or clear one mark. Called with a JSON body, so SvelteKit's form-origin
 * check does not apply; the request is same-origin and cookie-authenticated.
 *
 * A mark made by hand can cross a character-count achievement just as a
 * reviewed card can, so the tiers are re-checked here too and any that are
 * newly reached come back for the UI to announce.
 */
export const POST: RequestHandler = async ({ locals, request }) => {
	const user = locals.user;
	if (!user) error(401, 'Sign in to keep track of your progress.');

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		error(400, 'Expected a JSON body.');
	}

	const { hanziId, script, status } = (body ?? {}) as Record<string, unknown>;

	if (typeof hanziId !== 'number' || !Number.isInteger(hanziId) || hanziId < 0 || hanziId > MAX_HANZI_ID)
		error(400, 'hanziId must be a deck row id.');
	if (!isCurriculum(script)) error(400, 'script must be "trad", "simp" or "jp".');
	if (status !== null && !isStatus(status))
		error(400, 'status must be "known", "learning" or null.');

	await setProgress(user.id, hanziId, script, status);
	const [counts, achievements] = await Promise.all([
		countProgress(user.id),
		achievementProgress(user.id, Date.now())
	]);

	return json({ ok: true, counts, unlocked: achievements.unlocked });
};
