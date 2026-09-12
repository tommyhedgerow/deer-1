// Flashcards: the queue, the grading write, and the study statistics.
import { and, asc, count, eq, lte, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { reviewCard, reviewLog } from '$lib/server/db/schema';
import { setProgress } from '$lib/server/progress';
import { hanziOrder } from '$lib/server/hanzi-index';
import { dayKey, dayRange, shiftDay } from '$lib/day';
import { isGraduated, schedule, type Rating } from '$lib/srs';
import type { CardView, Counts, QueueCounts, ReviewStats } from '$lib/review';

export type { CardView, Counts, QueueCounts, ReviewStats };
import type { Curriculum } from '$lib/hanzi';

const cardView = (r: {
	hanziId: number;
	script: Curriculum;
	stage: number;
	dueAt: Date;
	intervalDays: number;
	reviews: number;
	lapses: number;
	lastReviewedAt: Date | null;
}): CardView => ({
	hanziId: r.hanziId,
	curriculum: r.script,
	stage: r.stage,
	dueAt: r.dueAt.getTime(),
	intervalDays: r.intervalDays,
	reviews: r.reviews,
	lapses: r.lapses,
	lastReviewedAt: r.lastReviewedAt ? r.lastReviewedAt.getTime() : null,
	graduated: isGraduated(r.stage)
});

/** Everything of one curriculum a learner has studied, due first. */
export async function cardsFor(userId: string, curriculum: Curriculum): Promise<CardView[]> {
	const rows = await db
		.select()
		.from(reviewCard)
		.where(and(eq(reviewCard.userId, userId), eq(reviewCard.script, curriculum)))
		.orderBy(asc(reviewCard.dueAt));
	return rows.map(cardView);
}

/**
 * The session queue: cards that are due, oldest first. Cards on a learning step
 * that comes back later today are deliberately excluded — they are not due yet,
 * and the next session will pick them up.
 */
export async function dueQueue(
	userId: string,
	curriculum: Curriculum,
	now: number,
	limit = 200
): Promise<CardView[]> {
	const rows = await db
		.select()
		.from(reviewCard)
		.where(
			and(
				eq(reviewCard.userId, userId),
				eq(reviewCard.script, curriculum),
				lte(reviewCard.dueAt, new Date(now))
			)
		)
		.orderBy(asc(reviewCard.dueAt))
		.limit(limit);
	return rows.map(cardView);
}

/** One card, or null when the character has never been studied. */
export async function cardOf(
	userId: string,
	curriculum: Curriculum,
	hanziId: number
): Promise<CardView | null> {
	const rows = await db
		.select()
		.from(reviewCard)
		.where(
			and(
				eq(reviewCard.userId, userId),
				eq(reviewCard.script, curriculum),
				eq(reviewCard.hanziId, hanziId)
			)
		)
		.limit(1);
	return rows[0] ? cardView(rows[0]) : null;
}

/**
 * Queue tallies per curriculum. New-card counts need the deck, so a missing
 * index costs only that number — never the counts of cards already held.
 */
export async function queueCounts(
	userId: string,
	fetchFn: typeof fetch,
	now: number
): Promise<Counts> {
	const totals = {
		trad: { deck: 0, held: 0, due: 0, learning: 0, known: 0, nextDueAt: null as number | null },
		simp: { deck: 0, held: 0, due: 0, learning: 0, known: 0, nextDueAt: null as number | null },
		jp: { deck: 0, held: 0, due: 0, learning: 0, known: 0, nextDueAt: null as number | null }
	};

	try {
		for (const c of ['trad', 'simp', 'jp'] as Curriculum[]) {
			totals[c].deck = (await hanziOrder(fetchFn, c)).length;
		}
	} catch {
		/* no deck, no new-card count */
	}

	const held = await db
		.select({
			script: reviewCard.script,
			stage: reviewCard.stage,
			dueAt: reviewCard.dueAt
		})
		.from(reviewCard)
		.where(eq(reviewCard.userId, userId));

	for (const r of held) {
		const t = totals[r.script];
		if (!t) continue;
		const at = r.dueAt.getTime();
		t.held++;
		if (at <= now) t.due++;
		else {
			if (r.stage === 0) t.learning++;
			if (t.nextDueAt === null || at < t.nextDueAt) t.nextDueAt = at;
		}
		if (isGraduated(r.stage)) t.known++;
	}

	const out = {} as Counts;
	for (const c of ['trad', 'simp', 'jp'] as Curriculum[]) {
		const t = totals[c];
		out[c] = {
			due: t.due,
			learning: t.learning,
			known: t.known,
			cards: t.held,
			newAvailable: t.deck > 0 ? Math.max(0, t.deck - t.held) : 0,
			nextDueAt: t.nextDueAt
		};
	}
	return out;
}

export interface Introduced {
	created: number[];
	/** how many more unstudied characters the curriculum still holds */
	remaining: number;
}

/**
 * Take the next `wanted` unstudied characters, in book order, and put them in
 * the queue as new cards. Only characters the learner has never studied are
 * chosen, so calling this twice in a row never duplicates work.
 */
export async function introduceNew(
	userId: string,
	curriculum: Curriculum,
	wanted: number,
	fetchFn: typeof fetch,
	now: number
): Promise<Introduced> {
	const order = await hanziOrder(fetchFn, curriculum);
	const held = await db
		.select({ hanziId: reviewCard.hanziId })
		.from(reviewCard)
		.where(and(eq(reviewCard.userId, userId), eq(reviewCard.script, curriculum)));
	const have = new Set(held.map((h) => h.hanziId));

	const fresh = order.filter((id) => !have.has(id)).slice(0, Math.max(0, wanted));
	if (!fresh.length) return { created: [], remaining: 0 };

	await db
		.insert(reviewCard)
		.values(
			fresh.map((hanziId) => ({
				userId,
				hanziId,
				script: curriculum,
				stage: 0,
				dueAt: new Date(now),
				intervalDays: 0,
				reviews: 0,
				lapses: 0
			}))
		)
		.onConflictDoNothing();

	return {
		created: fresh,
		remaining: Math.max(0, order.length - have.size - fresh.length)
	};
}

export interface ReviewResult {
	card: CardView;
	/** the mark the character now carries, driven by the SRS */
	status: 'known' | 'learning';
	day: string;
}

/**
 * Grade one card. This is the only writer of a card's schedule, and it also
 * keeps the character's *known* / *learning* mark in step: a card at or past the
 * graduation stage marks its character known, anything else marks it learning —
 * including a lapse on a card that had graduated.
 */
export async function recordReview(
	userId: string,
	curriculum: Curriculum,
	hanziId: number,
	rating: Rating,
	now: number
): Promise<ReviewResult> {
	const before = await cardOf(userId, curriculum, hanziId);
	const stageBefore = before?.stage ?? 0;
	const next = schedule(stageBefore, rating, now);
	const day = dayKey(now);
	const reviewedAt = new Date(now);

	await db
		.insert(reviewCard)
		.values({
			userId,
			hanziId,
			script: curriculum,
			stage: next.stage,
			dueAt: new Date(next.dueAt),
			intervalDays: next.intervalDays,
			reviews: 1,
			lapses: next.lapsed ? 1 : 0,
			lastReviewedAt: reviewedAt
		})
		.onConflictDoUpdate({
			target: [reviewCard.userId, reviewCard.hanziId, reviewCard.script],
			set: {
				stage: next.stage,
				dueAt: new Date(next.dueAt),
				intervalDays: next.intervalDays,
				reviews: sql`${reviewCard.reviews} + 1`,
				lapses: next.lapsed ? sql`${reviewCard.lapses} + 1` : reviewCard.lapses,
				lastReviewedAt: reviewedAt,
				updatedAt: reviewedAt
			}
		});

	await db.insert(reviewLog).values({
		userId,
		hanziId,
		script: curriculum,
		rating,
		stageBefore,
		stageAfter: next.stage,
		intervalDays: next.intervalDays,
		reviewedAt,
		day
	});

	const status: 'known' | 'learning' = next.graduated ? 'known' : 'learning';
	await setProgress(userId, hanziId, curriculum, status);

	return {
		card: {
			hanziId,
			curriculum,
			stage: next.stage,
			dueAt: next.dueAt,
			intervalDays: next.intervalDays,
			reviews: (before?.reviews ?? 0) + 1,
			lapses: (before?.lapses ?? 0) + (next.lapsed ? 1 : 0),
			lastReviewedAt: now,
			graduated: next.graduated
		},
		status,
		day
	};
}

/**
 * Study tallies for one learner: the headline numbers plus the day-by-day
 * counts and the per-curriculum split.
 */
export interface StudyStats extends ReviewStats {
	/** UTC day key → reviews that day */
	byDay: Record<string, number>;
	perCurriculum: Record<Curriculum, { reviews: number; cards: number; known: number }>;
}

/**
 * Everything the heatmap, the streak line and the achievements read.
 *
 * One grouped pass over the log per question, all of it indexed by user: the
 * numbers are small (a year of days at most) and always computed fresh, so
 * there is nothing to invalidate.
 */
export async function studyStats(userId: string, now: number): Promise<StudyStats> {
	const today = dayKey(now);

	const [totals, days, ratings, cards] = await Promise.all([
		db
			.select({ script: reviewLog.script, n: count() })
			.from(reviewLog)
			.where(eq(reviewLog.userId, userId))
			.groupBy(reviewLog.script),
		db
			.select({ day: reviewLog.day, n: count() })
			.from(reviewLog)
			.where(eq(reviewLog.userId, userId))
			.groupBy(reviewLog.day)
			.orderBy(asc(reviewLog.day)),
		db
			.select({ rating: reviewLog.rating, n: count() })
			.from(reviewLog)
			.where(eq(reviewLog.userId, userId))
			.groupBy(reviewLog.rating),
		db
			.select({ script: reviewCard.script, stage: reviewCard.stage, n: count() })
			.from(reviewCard)
			.where(eq(reviewCard.userId, userId))
			.groupBy(reviewCard.script, reviewCard.stage)
	]);

	const byDay: Record<string, number> = {};
	for (const d of days) byDay[d.day] = Number(d.n);

	const totalReviews = totals.reduce((n, t) => n + Number(t.n), 0);
	const ratingCounts: Record<Rating, number> = { again: 0, good: 0 };
	for (const r of ratings) {
		// A log written by an older, four-grade build would carry ratings this
		// build no longer knows; they are counted by total, never by grade.
		if (r.rating in ratingCounts) ratingCounts[r.rating] = Number(r.n);
	}
	const graded = ratingCounts.again + ratingCounts.good;

	const perCurriculum = {
		trad: { reviews: 0, cards: 0, known: 0 },
		simp: { reviews: 0, cards: 0, known: 0 },
		jp: { reviews: 0, cards: 0, known: 0 }
	} as StudyStats['perCurriculum'];
	for (const t of totals) {
		if (perCurriculum[t.script]) perCurriculum[t.script].reviews = Number(t.n);
	}
	for (const c of cards) {
		if (!perCurriculum[c.script]) continue;
		perCurriculum[c.script].cards += Number(c.n);
		if (isGraduated(c.stage)) perCurriculum[c.script].known += Number(c.n);
	}

	// Streak: walk back from today while the day has reviews. A day not studied
	// *yet* must not break a run that is still alive, so today is optional.
	let streak = 0;
	let cursor = byDay[today] ? today : shiftDay(today, -1);
	while (byDay[cursor]) {
		streak++;
		cursor = shiftDay(cursor, -1);
	}

	let longestStreak = 0;
	let run = 0;
	let previous: string | null = null;
	for (const day of Object.keys(byDay).sort()) {
		run = previous && shiftDay(previous, 1) === day ? run + 1 : 1;
		previous = day;
		if (run > longestStreak) longestStreak = run;
	}

	return {
		totalReviews,
		reviewsToday: byDay[today] ?? 0,
		byDay,
		streak,
		longestStreak,
		activeDays: Object.keys(byDay).length,
		accuracy: graded ? ratingCounts.good / graded : 0,
		ratings: ratingCounts,
		perCurriculum
	};
}

/** Review counts for a window of days ending today — the heatmap's data. */
export function heatmapDays(
	stats: StudyStats,
	now: number,
	length = 371
): { day: string; count: number }[] {
	return dayRange(dayKey(now), length).map((day) => ({ day, count: stats.byDay[day] ?? 0 }));
}

/** Clear study history: every card, optionally only one curriculum's. */
export async function resetCards(userId: string, curriculum?: Curriculum): Promise<void> {
	const where = curriculum
		? and(eq(reviewCard.userId, userId), eq(reviewCard.script, curriculum))
		: eq(reviewCard.userId, userId);
	await db.delete(reviewCard).where(where);
}

/** Wipe the review log (and with it the heatmap and the streak). */
export async function resetReviewLog(userId: string): Promise<void> {
	await db.delete(reviewLog).where(eq(reviewLog.userId, userId));
}
