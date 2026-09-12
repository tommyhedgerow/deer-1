import { error, json } from '@sveltejs/kit';
import { introduceNew, queueCounts } from '$lib/server/review';
import { isCurriculum } from '$lib/hanzi';
import type { RequestHandler } from './$types';

const MAX_NEW_PER_CALL = 100;

/**
 * Take new cards: the next unstudied characters of a curriculum, in book order,
 * added to the queue as cards on the first learning step.
 *
 * Only characters with no card yet are chosen, so calling this again never
 * duplicates work — it simply takes the next ones along.
 */
export const POST: RequestHandler = async ({ locals, request, fetch }) => {
	const user = locals.user;
	if (!user) error(401, 'Sign in to review.');

	let payload: unknown;
	try {
		payload = await request.json();
	} catch {
		error(400, 'Expected a JSON body.');
	}

	const { script, count } = (payload ?? {}) as Record<string, unknown>;

	if (!isCurriculum(script)) error(400, 'script must be "trad", "simp" or "jp".');
	if (typeof count !== 'number' || !Number.isInteger(count) || count < 1 || count > MAX_NEW_PER_CALL)
		error(400, `count must be between 1 and ${MAX_NEW_PER_CALL}.`);

	const now = Date.now();
	const taken = await introduceNew(user.id, script, count, fetch, now);
	const counts = await queueCounts(user.id, fetch, now);

	return json({
		ok: true,
		introduced: taken.created.length,
		remaining: taken.remaining,
		counts: counts[script]
	});
};
