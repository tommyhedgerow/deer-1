import { error, json } from '@sveltejs/kit';
import { queueCounts, studyStats } from '$lib/server/review';
import type { RequestHandler } from './$types';

/**
 * Just enough for the header badge: how many cards are waiting in each
 * curriculum, and today's tally. The queue itself is fetched when the learner
 * actually sits down to review.
 */
export const GET: RequestHandler = async ({ locals, fetch }) => {
	const user = locals.user;
	if (!user) error(401, 'Sign in to see your review queue.');

	const now = Date.now();
	const [counts, stats] = await Promise.all([
		queueCounts(user.id, fetch, now),
		studyStats(user.id, now)
	]);

	return json({
		counts,
		reviewsToday: stats.reviewsToday,
		streak: stats.streak,
		totalReviews: stats.totalReviews
	});
};
