// Evaluating the achievement ladders against a learner's live tallies.
//
// Nothing is awarded by a background job: the tallies are cheap to read, so the
// tiers are recomputed whenever they are shown, and an unlock row is written
// the first time a tier is reached so its date is remembered for good.
import { and, count, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { achievementUnlock, characterProgress } from '$lib/server/db/schema';
import { loadStories } from '$lib/server/story';
import { studyStats } from '$lib/server/review';
import {
	ACHIEVEMENTS,
	metricValue,
	progressOf,
	type AchievementMetrics,
	type AchievementProgress
} from '$lib/achievements';
import { CURRICULA, type Curriculum } from '$lib/hanzi';

/** The tallies every achievement reads. */
export async function achievementMetrics(userId: string, now: number): Promise<AchievementMetrics> {
	const [known, reviews, stories] = await Promise.all([
		db
			.select({ script: characterProgress.script, n: count() })
			.from(characterProgress)
			.where(and(eq(characterProgress.userId, userId), eq(characterProgress.status, 'known')))
			.groupBy(characterProgress.script),
		studyStats(userId, now),
		loadStories(userId)
	]);

	const knownByCurriculum: Record<Curriculum, number> = { trad: 0, simp: 0, jp: 0 };
	for (const r of known) {
		if (CURRICULA.includes(r.script)) knownByCurriculum[r.script] = Number(r.n);
	}

	return {
		known: knownByCurriculum,
		reviews: reviews.totalReviews,
		streak: reviews.streak,
		stories: Object.values(stories).filter((body) => body.trim()).length
	};
}

/**
 * Every tier with its progress and, where it has one, the date it was unlocked.
 * Tiers already reached are written to `achievement_unlock` if they are not
 * there yet, so a tier crossed by any route is dated the first time it is seen.
 */
export async function achievementProgress(
	userId: string,
	now: number
): Promise<{ list: AchievementProgress[]; metrics: AchievementMetrics; unlocked: string[] }> {
	const [metrics, unlocks] = await Promise.all([
		achievementMetrics(userId, now),
		db
			.select({ key: achievementUnlock.key, unlockedAt: achievementUnlock.unlockedAt })
			.from(achievementUnlock)
			.where(eq(achievementUnlock.userId, userId))
	]);

	const dates = new Map(unlocks.map((u) => [u.key, u.unlockedAt.getTime()]));

	// Reached but never recorded: write those rows now and hand back their keys
	// so the caller can announce them.
	const fresh = ACHIEVEMENTS.filter(
		(a) => !dates.has(a.key) && metricValue(metrics, a) >= a.target
	);

	if (fresh.length) {
		await db
			.insert(achievementUnlock)
			.values(fresh.map((a) => ({ userId, key: a.key, unlockedAt: new Date(now) })))
			.onConflictDoNothing();
		for (const a of fresh) dates.set(a.key, now);
	}

	return {
		list: ACHIEVEMENTS.map((a) => progressOf(a, metrics, dates.get(a.key) ?? null)),
		metrics,
		unlocked: fresh.map((a) => a.key)
	};
}
