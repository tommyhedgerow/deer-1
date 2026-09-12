import { error, json } from '@sveltejs/kit';
import { countStories, loadStories, setStory } from '$lib/server/story';
import { isCurriculum } from '$lib/hanzi';
import { MAX_STORY_LENGTH } from '$lib/story';
import type { RequestHandler } from './$types';

const MAX_HANZI_ID = 100_000;

/** Every story the signed-in user has written, plus their tallies. */
export const GET: RequestHandler = async ({ locals }) => {
	const user = locals.user;
	if (!user) error(401, 'Sign in to keep your stories.');

	const [stories, counts] = await Promise.all([loadStories(user.id), countStories(user.id)]);
	return json({ stories, counts });
};

/**
 * Save or clear one story. A JSON body, so SvelteKit's form-origin check does
 * not apply; the request is same-origin and cookie-authenticated. An empty
 * `body` clears the story rather than storing a blank one.
 */
export const POST: RequestHandler = async ({ locals, request }) => {
	const user = locals.user;
	if (!user) error(401, 'Sign in to keep your stories.');

	let payload: unknown;
	try {
		payload = await request.json();
	} catch {
		error(400, 'Expected a JSON body.');
	}

	const { hanziId, script, body } = (payload ?? {}) as Record<string, unknown>;

	if (typeof hanziId !== 'number' || !Number.isInteger(hanziId) || hanziId < 0 || hanziId > MAX_HANZI_ID)
		error(400, 'hanziId must be a deck row id.');
	if (!isCurriculum(script)) error(400, 'script must be "trad", "simp" or "jp".');
	if (body !== null && typeof body !== 'string') error(400, 'body must be a string or null.');
	if (typeof body === 'string' && body.length > MAX_STORY_LENGTH)
		error(400, `A story can be at most ${MAX_STORY_LENGTH} characters.`);

	await setStory(user.id, hanziId, script, typeof body === 'string' ? body : null);
	return json({ ok: true, counts: await countStories(user.id) });
};
