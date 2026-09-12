// The learner's own story for a character: a private mnemonic note.
//
// Nothing is seeded — the index ships no built-in stories yet — so every story
// starts blank and belongs to the person who wrote it. Like a mark, a story is
// held per curriculum, so the same deck row can carry a different story for the
// traditional, the simplified and the japanese view.
import type { Curriculum } from './hanzi';

/** Stories keyed by `curriculum:hanziId`, mirroring `ProgressMap`. */
export type StoryMap = Record<string, string>;

/** Long enough for a paragraph or two, short enough to keep the panel sane. */
export const MAX_STORY_LENGTH = 4000;

export const storyKey = (c: Curriculum, hanziId: number) => `${c}:${hanziId}`;
