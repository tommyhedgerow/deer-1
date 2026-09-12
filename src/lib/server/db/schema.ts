import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { user } from './auth.schema';

export const task = sqliteTable('task', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	title: text('title').notNull(),
	priority: integer('priority').notNull().default(1)
});

/**
 * A user's study progress for one character.
 *
 * `hanziId` is the deck row id in `static/data/hanzi.json`, and `script`
 * disambiguates the curriculum — a merged row carries both the traditional and
 * the simplified form, and a learner studying one of them has not necessarily
 * learned the other. `'jp'` is the Japanese (kanji) deck, which for now renders
 * the traditional data as a placeholder but keeps its own marks.
 * A missing row means "not seen yet".
 */
export const characterProgress = sqliteTable(
	'character_progress',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		hanziId: integer('hanzi_id').notNull(),
		script: text('script', { enum: ['trad', 'simp', 'jp'] }).notNull(),
		status: text('status', { enum: ['known', 'learning'] }).notNull().default('learning'),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [
		uniqueIndex('character_progress_key_idx').on(table.userId, table.hanziId, table.script),
		index('character_progress_user_idx').on(table.userId, table.script, table.status)
	]
);

/**
 * A learner's own story for one character — the mnemonic that ties its
 * components to its keyword.
 *
 * Private to its author: a story is keyed the same way as a mark, per user, per
 * character, per curriculum. Nothing is seeded from the deck yet, so a row here
 * only ever exists because someone wrote it. An empty body is never stored; the
 * story is deleted instead.
 */
export const characterStory = sqliteTable(
	'character_story',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		hanziId: integer('hanzi_id').notNull(),
		script: text('script', { enum: ['trad', 'simp', 'jp'] }).notNull(),
		body: text('body').notNull(),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [
		uniqueIndex('character_story_key_idx').on(table.userId, table.hanziId, table.script),
		index('character_story_user_idx').on(table.userId, table.script)
	]
);

/**
 * One flashcard: a character in one curriculum, and where it sits on the
 * spaced-repetition ladder ($lib/srs).
 *
 * `stage` is the rung (0 = still on the learning steps, `GRADUATED_STAGE` and
 * beyond = reviewed at month-long intervals and counted as *known*), and
 * `dueAt` is the moment it comes back. A character with no row here has never
 * been studied — that is what "new card" means, so there is no separate state
 * to keep in sync.
 */
export const reviewCard = sqliteTable(
	'review_card',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		hanziId: integer('hanzi_id').notNull(),
		script: text('script', { enum: ['trad', 'simp', 'jp'] }).notNull(),
		stage: integer('stage').notNull().default(0),
		dueAt: integer('due_at', { mode: 'timestamp_ms' }).notNull(),
		intervalDays: integer('interval_days').notNull().default(0),
		reviews: integer('reviews').notNull().default(0),
		lapses: integer('lapses').notNull().default(0),
		lastReviewedAt: integer('last_reviewed_at', { mode: 'timestamp_ms' }),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [
		uniqueIndex('review_card_key_idx').on(table.userId, table.hanziId, table.script),
		index('review_card_due_idx').on(table.userId, table.script, table.dueAt)
	]
);

/**
 * The review history: one row per grading, and the raw material for the
 * heatmap, the streaks and the review achievements.
 *
 * A grading is a plain yes-or-no — `good` or `again` — so `stage_before` and
 * `stage_after` carry the interesting part of what happened.
 *
 * `day` is the UTC day key of `reviewedAt`, stored rather than derived so the
 * heatmap is one grouped query on an index instead of a scan of every
 * timestamp.
 */
export const reviewLog = sqliteTable(
	'review_log',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		hanziId: integer('hanzi_id').notNull(),
		script: text('script', { enum: ['trad', 'simp', 'jp'] }).notNull(),
		rating: text('rating', { enum: ['again', 'good'] }).notNull(),
		stageBefore: integer('stage_before').notNull(),
		stageAfter: integer('stage_after').notNull(),
		intervalDays: integer('interval_days').notNull(),
		reviewedAt: integer('reviewed_at', { mode: 'timestamp_ms' }).notNull(),
		day: text('day').notNull()
	},
	(table) => [
		index('review_log_day_idx').on(table.userId, table.day),
		index('review_log_time_idx').on(table.userId, table.reviewedAt)
	]
);

/**
 * When an achievement was first reached.
 *
 * The tiers themselves are recomputed from the tallies whenever they are shown
 * (`$lib/achievements`), so this table exists only to remember the *date* of an
 * unlock — and to let the UI announce one the moment it happens.
 */
export const achievementUnlock = sqliteTable(
	'achievement_unlock',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		key: text('key').notNull(),
		unlockedAt: integer('unlocked_at', { mode: 'timestamp_ms' }).notNull()
	},
	(table) => [
		uniqueIndex('achievement_unlock_key_idx').on(table.userId, table.key),
		index('achievement_unlock_user_idx').on(table.userId, table.unlockedAt)
	]
);

export *  from './auth.schema';
