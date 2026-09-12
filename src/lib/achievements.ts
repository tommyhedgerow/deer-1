// The achievement ladders.
//
// Definitions live here, in plain data, so the server can evaluate them and the
// UI can render them from the same list — a new tier is one line in a table and
// nothing else has to know about it.
//
// Every achievement counts something the learner already has: characters marked
// *known* in one curriculum, reviews recorded, consecutive study days, stories
// written. Nothing is awarded for its own sake, and nothing decays.
import { CURRICULA, curriculumLabel, type Curriculum } from './hanzi';

export type AchievementGroup = 'characters' | 'reviews' | 'streak' | 'stories';

/** Which tally an achievement reads. */
export type Metric = 'known' | 'reviews' | 'streak' | 'stories';

export interface Achievement {
	/** stable id, stored on unlock — never reused for a different meaning */
	key: string;
	group: AchievementGroup;
	metric: Metric;
	target: number;
	/** only `known` is per curriculum; the rest are site-wide */
	curriculum?: Curriculum;
	title: string;
	detail: string;
}

export interface AchievementMetrics {
	/** characters marked known, per curriculum */
	known: Record<Curriculum, number>;
	reviews: number;
	/** consecutive days studied, ending today or yesterday */
	streak: number;
	stories: number;
}

export const emptyMetrics = (): AchievementMetrics => ({
	known: { trad: 0, simp: 0, jp: 0 },
	reviews: 0,
	streak: 0,
	stories: 0
});

const CHARACTER_TIERS = [50, 100, 300, 1000, 1500, 2000, 3000];
const REVIEW_TIERS = [1, 50, 100, 500, 1000, 2500, 5000, 10_000];
const STREAK_TIERS = [3, 7, 14, 30, 100, 365];
const STORY_TIERS = [1, 10, 50, 100];

const num = (n: number) => n.toLocaleString('en-US');

const characters: Achievement[] = CURRICULA.flatMap((c) =>
	CHARACTER_TIERS.map((n) => ({
		key: `${c}.known.${n}`,
		group: 'characters' as const,
		metric: 'known' as const,
		curriculum: c,
		target: n,
		title: `${num(n)} characters`,
		detail: `Learn ${num(n)} ${curriculumLabel(c)} characters`
	}))
);

const reviews: Achievement[] = REVIEW_TIERS.map((n) => ({
	key: `reviews.${n}`,
	group: 'reviews' as const,
	metric: 'reviews' as const,
	target: n,
	title: n === 1 ? 'First review' : `${num(n)} reviews`,
	detail: n === 1 ? 'Review your first card' : `Review ${num(n)} cards`
}));

const streaks: Achievement[] = STREAK_TIERS.map((n) => ({
	key: `streak.${n}`,
	group: 'streak' as const,
	metric: 'streak' as const,
	target: n,
	title: n === 1 ? 'A day studied' : `${num(n)}-day streak`,
	detail: n === 1 ? 'Study for a day' : `Study ${num(n)} days in a row`
}));

const stories: Achievement[] = STORY_TIERS.map((n) => ({
	key: `stories.${n}`,
	group: 'stories' as const,
	metric: 'stories' as const,
	target: n,
	title: n === 1 ? 'First story' : `${num(n)} stories`,
	detail: n === 1 ? 'Write your first story' : `Write ${num(n)} stories of your own`
}));

export const ACHIEVEMENTS: Achievement[] = [...characters, ...reviews, ...streaks, ...stories];

export const ACHIEVEMENT_BY_KEY = new Map(ACHIEVEMENTS.map((a) => [a.key, a]));

export const GROUP_ORDER: AchievementGroup[] = ['characters', 'reviews', 'streak', 'stories'];

export const GROUP_LABEL: Record<AchievementGroup, string> = {
	characters: 'Characters learned',
	reviews: 'Reviews',
	streak: 'Streaks',
	stories: 'Stories'
};

/** The tally an achievement reads right now. */
export function metricValue(metrics: AchievementMetrics, a: Achievement): number {
	switch (a.metric) {
		case 'known':
			return metrics.known[a.curriculum ?? 'trad'] ?? 0;
		case 'reviews':
			return metrics.reviews;
		case 'streak':
			return metrics.streak;
		case 'stories':
			return metrics.stories;
	}
}

export interface AchievementProgress {
	achievement: Achievement;
	current: number;
	target: number;
	/** 0–1, clamped — the bar to draw */
	ratio: number;
	earned: boolean;
	unlockedAt: number | null;
}

export function progressOf(
	a: Achievement,
	metrics: AchievementMetrics,
	unlockedAt: number | null
): AchievementProgress {
	const current = metricValue(metrics, a);
	const target = a.target;
	return {
		achievement: a,
		current,
		target,
		ratio: target > 0 ? Math.min(1, current / target) : 0,
		earned: current >= target,
		unlockedAt
	};
}

/** The closest unearned tier, for the "next up" line. */
export function nextUp(list: AchievementProgress[]): AchievementProgress | null {
	const open = list.filter((p) => !p.earned);
	if (!open.length) return null;
	return open.reduce((best, p) => (p.ratio > best.ratio ? p : best), open[0]);
}
