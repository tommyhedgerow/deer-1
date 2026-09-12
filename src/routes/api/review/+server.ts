import { error, json } from '@sveltejs/kit';
import { dueQueue, queueCounts, recordReview, studyStats } from '$lib/server/review';
import { achievementProgress } from '$lib/server/achievements';
import { isCurriculum, type Curriculum } from '$lib/hanzi';
import { isRating } from '$lib/srs';
import type { RequestHandler } from './$types';

const MAX_HANZI_ID = 100_000;

const curriculumParam = (raw: string | null): Curriculum => {
	if (raw === 'trad' || raw === 'simp' || raw === 'jp') return raw;
	error(400, 'curriculum must be "trad", "simp" or "jp".');
};

/**
 * The session: the cards due now in one curriculum, what is waiting behind
 * them, and the study statistics the heatmap and streak read.
 */
export const GET: RequestHandler = async ({ locals, url, fetch }) => {
	const user = locals.user;
	if (!user) error(401, 'Sign in to review.');

	const curriculum = curriculumParam(url.searchParams.get('curriculum'));
	const now = Date.now();

	const [queue, counts, stats] = await Promise.all([
		dueQueue(user.id, curriculum, now),
		queueCounts(user.id, fetch, now),
		studyStats(user.id, now)
	]);

	return json({
		curriculum,
		now,
		queue,
		counts: counts[curriculum],
		allCounts: counts,
		stats: {
			totalReviews: stats.totalReviews,
			reviewsToday: stats.reviewsToday,
			streak: stats.streak,
			longestStreak: stats.longestStreak,
			activeDays: stats.activeDays,
			accuracy: stats.accuracy,
			ratings: stats.ratings
		}
	});
};

/**
 * Grade one card. The schedule, the character's known/learning mark and any
 * achievement the review crosses all move together in this one call.
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

	const { hanziId, script, rating } = (payload ?? {}) as Record<string, unknown>;

	if (typeof hanziId !== 'number' || !Number.isInteger(hanziId) || hanziId < 0 || hanziId > MAX_HANZI_ID)
		error(400, 'hanziId must be a deck row id.');
	if (!isCurriculum(script)) error(400, 'script must be "trad", "simp" or "jp".');
	if (!isRating(rating)) error(400, 'rating must be "again" or "good".');

	const now = Date.now();
	const result = await recordReview(user.id, script, hanziId, rating, now);
	const [counts, achievements, stats] = await Promise.all([
		queueCounts(user.id, fetch, now),
		achievementProgress(user.id, now),
		studyStats(user.id, now)
	]);

	return json({
		ok: true,
		card: result.card,
		status: result.status,
		counts: counts[script],
		unlocked: achievements.unlocked,
		totals: {
			totalReviews: stats.totalReviews,
			reviewsToday: stats.reviewsToday,
			streak: stats.streak
		}
	});
};
