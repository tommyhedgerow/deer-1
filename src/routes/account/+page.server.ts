import { redirect } from '@sveltejs/kit';
import { countProgress, listProgress, resetProgress } from '$lib/server/progress';
import { countStories, resetStories } from '$lib/server/story';
import { heatmapDays, queueCounts, resetCards, resetReviewLog, studyStats } from '$lib/server/review';
import { achievementProgress } from '$lib/server/achievements';
import { hanziTotals } from '$lib/server/hanzi-index';
import { dayKey } from '$lib/day';
import { isCurriculum } from '$lib/hanzi';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url, fetch }) => {
	const user = locals.user;
	if (!user) redirect(303, `/login?redirect=${encodeURIComponent(url.pathname + url.search)}`);

	const now = Date.now();
	const [counts, entries, storyCounts, totals, stats, achievements, reviewCounts] =
		await Promise.all([
			countProgress(user.id),
			listProgress(user.id),
			countStories(user.id),
			// A missing index only costs the percentages, never the page.
			hanziTotals(fetch).catch(() => null),
			studyStats(user.id, now),
			achievementProgress(user.id, now),
			queueCounts(user.id, fetch, now)
		]);

	return {
		// Which panel to open; validated against the tab list by the page.
		tab: url.searchParams.get('tab'),
		today: dayKey(now),
		counts,
		storyCounts,
		totals,
		memberSince: user.createdAt
			? new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(user.createdAt)
			: null,
		entries: entries.map((e) => ({
			hanziId: e.hanziId,
			script: e.script,
			status: e.status,
			updatedAt: e.updatedAt.getTime()
		})),
		study: {
			totalReviews: stats.totalReviews,
			reviewsToday: stats.reviewsToday,
			streak: stats.streak,
			longestStreak: stats.longestStreak,
			activeDays: stats.activeDays,
			accuracy: stats.accuracy,
			ratings: stats.ratings,
			perCurriculum: stats.perCurriculum,
			// The heatmap is a year of squares; the extra days pad it to whole weeks.
			heatmap: heatmapDays(stats, now),
			queue: reviewCounts
		},
		awards: {
			list: achievements.list,
			metrics: achievements.metrics,
			earned: achievements.list.filter((p) => p.earned).length,
			total: achievements.list.length
		}
	};
};

export const actions: Actions = {
	/** Clear one curriculum's marks, or everything when none is submitted. */
	reset: async ({ locals, request }) => {
		const user = locals.user;
		if (!user) redirect(303, '/login?redirect=%2Faccount');

		const scope = (await request.formData()).get('script');
		const script = isCurriculum(scope) ? scope : undefined;

		await resetProgress(user.id, script);
		return { cleared: script ?? 'all' };
	},

	/** Stories are not marks: clearing them is its own deliberate act. */
	resetStories: async ({ locals }) => {
		const user = locals.user;
		if (!user) redirect(303, '/login?redirect=%2Faccount');

		await resetStories(user.id);
		return { clearedStories: true };
	},

	/**
	 * Study history comes in two halves that a learner may want to part with
	 * separately: the cards (what is scheduled next) and the review log (the
	 * heatmap and the streak).
	 */
	resetStudy: async ({ locals, request }) => {
		const user = locals.user;
		if (!user) redirect(303, '/login?redirect=%2Faccount');

		const scope = (await request.formData()).get('scope');
		if (scope === 'cards') await resetCards(user.id);
		else if (scope === 'log') await resetReviewLog(user.id);
		else {
			await resetCards(user.id);
			await resetReviewLog(user.id);
		}

		return { clearedStudy: scope === 'cards' || scope === 'log' ? scope : 'all' };
	}
};
