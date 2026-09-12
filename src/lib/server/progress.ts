// Per-user study progress: which characters a learner has marked.
import { and, count, desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { characterProgress } from '$lib/server/db/schema';
import { progressKey, type ProgressMap, type ProgressStatus } from '$lib/progress';
import type { Curriculum } from '$lib/hanzi';

/** Every mark a user has recorded, for rendering the index. */
export async function loadProgress(userId: string): Promise<ProgressMap> {
	const rows = await db
		.select({
			hanziId: characterProgress.hanziId,
			script: characterProgress.script,
			status: characterProgress.status
		})
		.from(characterProgress)
		.where(eq(characterProgress.userId, userId));

	const map: ProgressMap = {};
	for (const r of rows) map[progressKey(r.script, r.hanziId)] = r.status;
	return map;
}

export interface ProgressEntry {
	hanziId: number;
	script: Curriculum;
	status: ProgressStatus;
	updatedAt: Date;
}

/** Every mark a user has recorded, most recent first. */
export async function listProgress(userId: string): Promise<ProgressEntry[]> {
	return db
		.select({
			hanziId: characterProgress.hanziId,
			script: characterProgress.script,
			status: characterProgress.status,
			updatedAt: characterProgress.updatedAt
		})
		.from(characterProgress)
		.where(eq(characterProgress.userId, userId))
		.orderBy(desc(characterProgress.updatedAt));
}

export type ScriptCounts = Record<ProgressStatus, number>;
export type ProgressCounts = Record<Curriculum, ScriptCounts>;

export const emptyCounts = (): ProgressCounts => ({
	trad: { known: 0, learning: 0 },
	simp: { known: 0, learning: 0 },
	jp: { known: 0, learning: 0 }
});

/** Tally of marks per curriculum, aggregated in SQL. */
export async function countProgress(userId: string): Promise<ProgressCounts> {
	const rows = await db
		.select({
			script: characterProgress.script,
			status: characterProgress.status,
			n: count()
		})
		.from(characterProgress)
		.where(eq(characterProgress.userId, userId))
		.groupBy(characterProgress.script, characterProgress.status);

	const out = emptyCounts();
	for (const r of rows) out[r.script][r.status] = Number(r.n);
	return out;
}

/**
 * Record, update or clear (`status: null`) one mark. The upsert keeps the row's
 * `id` and `createdAt`, so ordering by `updatedAt` stays honest.
 */
export async function setProgress(
	userId: string,
	hanziId: number,
	script: Curriculum,
	status: ProgressStatus | null
): Promise<void> {
	const match = and(
		eq(characterProgress.userId, userId),
		eq(characterProgress.hanziId, hanziId),
		eq(characterProgress.script, script)
	);

	if (status === null) {
		await db.delete(characterProgress).where(match);
		return;
	}

	const now = new Date();
	await db
		.insert(characterProgress)
		.values({ userId, hanziId, script, status, createdAt: now, updatedAt: now })
		.onConflictDoUpdate({
			target: [characterProgress.userId, characterProgress.hanziId, characterProgress.script],
			set: { status, updatedAt: now }
		});
}

/** Clear every mark for a user, or just one curriculum when `script` is given. */
export async function resetProgress(userId: string, script?: Curriculum): Promise<void> {
	const where = script
		? and(eq(characterProgress.userId, userId), eq(characterProgress.script, script))
		: eq(characterProgress.userId, userId);
	await db.delete(characterProgress).where(where);
}
