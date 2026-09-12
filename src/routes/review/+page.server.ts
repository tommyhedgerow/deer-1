import { redirect } from '@sveltejs/kit';
import { queueCounts, studyStats } from '$lib/server/review';
import { achievementProgress } from '$lib/server/achievements';
import { nextUp } from '$lib/achievements';
import { hanziTotals } from '$lib/server/hanzi-index';
import { dayKey } from '$lib/day';
import type { PageServerLoad } from './$types';

/**
 * The review session needs an account: cards, schedules and history are all
 * per learner. Everything else — the queue itself — is fetched by the page, so
 * a session can be topped up without a round trip through the server.
 */
export const load: PageServerLoad = async ({ locals, url, fetch }) => {
	const user = locals.user;
	if (!user) redirect(303, `/login?redirect=${encodeURIComponent(url.pathname + url.search)}`);

	const now = Date.now();
	const [counts, stats, achievements, totals] = await Promise.all([
		queueCounts(user.id, fetch, now),
		studyStats(user.id, now),
		achievementProgress(user.id, now),
		// A missing index only costs the frame totals, never the page.
		hanziTotals(fetch).catch(() => null)
	]);

	const earned = achievements.list.filter((p) => p.earned);

	return {
		now,
		today: dayKey(now),
		allCounts: counts,
		totals,
		stats: {
			totalReviews: stats.totalReviews,
			reviewsToday: stats.reviewsToday,
			streak: stats.streak,
			longestStreak: stats.longestStreak,
			activeDays: stats.activeDays,
			accuracy: stats.accuracy,
			ratings: stats.ratings
		},
		awards: {
			earned: earned.length,
			total: achievements.list.length,
			next: nextUp(achievements.list),
			recent: earned
				.filter((p) => p.unlockedAt != null)
				.sort((a, b) => (b.unlockedAt ?? 0) - (a.unlockedAt ?? 0))
				.slice(0, 3)
		}
	};
};
