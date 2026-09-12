// Per-user stories: the private mnemonic a learner writes for a character.
import { and, count, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { characterStory } from '$lib/server/db/schema';
import { MAX_STORY_LENGTH, storyKey, type StoryMap } from '$lib/story';
import type { Curriculum } from '$lib/hanzi';

/** Every story a user has written, for rendering the index. */
export async function loadStories(userId: string): Promise<StoryMap> {
	const rows = await db
		.select({
			hanziId: characterStory.hanziId,
			script: characterStory.script,
			body: characterStory.body
		})
		.from(characterStory)
		.where(eq(characterStory.userId, userId));

	const map: StoryMap = {};
	for (const r of rows) map[storyKey(r.script, r.hanziId)] = r.body;
	return map;
}

/**
 * Save, replace or clear (`body: null`, or nothing but whitespace) one story.
 * The upsert keeps the row's `id` and `createdAt`, so a story has a real
 * "written on" date that survives editing.
 */
export async function setStory(
	userId: string,
	hanziId: number,
	script: Curriculum,
	body: string | null
): Promise<void> {
	const text = (body ?? '').trim().slice(0, MAX_STORY_LENGTH);

	const match = and(
		eq(characterStory.userId, userId),
		eq(characterStory.hanziId, hanziId),
		eq(characterStory.script, script)
	);

	if (!text) {
		await db.delete(characterStory).where(match);
		return;
	}

	const now = new Date();
	await db
		.insert(characterStory)
		.values({ userId, hanziId, script, body: text, createdAt: now, updatedAt: now })
		.onConflictDoUpdate({
			target: [characterStory.userId, characterStory.hanziId, characterStory.script],
			set: { body: text, updatedAt: now }
		});
}

export type StoryCounts = Record<Curriculum, number>;

export const emptyStoryCounts = (): StoryCounts => ({ trad: 0, simp: 0, jp: 0 });

/** Tally of stories per curriculum, aggregated in SQL. */
export async function countStories(userId: string): Promise<StoryCounts> {
	const rows = await db
		.select({ script: characterStory.script, n: count() })
		.from(characterStory)
		.where(eq(characterStory.userId, userId))
		.groupBy(characterStory.script);

	const out = emptyStoryCounts();
	for (const r of rows) out[r.script] = Number(r.n);
	return out;
}

/** Clear every story for a user, or one curriculum when `script` is given. */
export async function resetStories(userId: string, script?: Curriculum): Promise<void> {
	const where = script
		? and(eq(characterStory.userId, userId), eq(characterStory.script, script))
		: eq(characterStory.userId, userId);
	await db.delete(characterStory).where(where);
}
