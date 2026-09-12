// Flashcard vocabulary shared by the server and the review UI.
//
// The shapes only — the scheduling rules live in `$lib/srs`, and the queries in
// `$lib/server/review`. Keeping them here lets a client component describe a
// card without reaching into server code.
import type { Curriculum } from './hanzi';
import type { Rating } from './srs';

/** One card as the review page sees it. */
export interface CardView {
	hanziId: number;
	curriculum: Curriculum;
	/** rung on the interval ladder; 0 while still on the learning steps */
	stage: number;
	/** when it comes back */
	dueAt: number;
	intervalDays: number;
	reviews: number;
	lapses: number;
	lastReviewedAt: number | null;
	graduated: boolean;
}

/** What is waiting in one curriculum. */
export interface QueueCounts {
	/** cards whose moment has come */
	due: number;
	/** cards still on their learning steps, coming back later today */
	learning: number;
	/** cards reviewed far enough ahead to count as known */
	known: number;
	/** every card this learner holds in the curriculum */
	cards: number;
	/** deck characters in the curriculum that have never been studied */
	newAvailable: number;
	/** when the next card comes back, or null when nothing is scheduled */
	nextDueAt: number | null;
}

export type Counts = Record<Curriculum, QueueCounts>;

/** The study tallies the heatmap, the streak line and the achievements read. */
export interface ReviewStats {
	totalReviews: number;
	reviewsToday: number;
	streak: number;
	longestStreak: number;
	activeDays: number;
	/** share of reviews answered "known it" */
	accuracy: number;
	ratings: Record<Rating, number>;
}

/** Totals returned after a grading, so the page can update without refetching. */
export interface ReviewTotals {
	totalReviews: number;
	reviewsToday: number;
	streak: number;
}

export const emptyCounts = (): QueueCounts => ({
	due: 0,
	learning: 0,
	known: 0,
	cards: 0,
	newAvailable: 0,
	nextDueAt: null
});
