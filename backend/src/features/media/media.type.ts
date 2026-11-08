import { media } from '../../db/media.js';

export type Media = typeof media.$inferSelect;

// TODO: why pick ??
export type InsertMedia = Pick<typeof media.$inferInsert, 'tmdbId' | 'name' | 'mediaType'>;
