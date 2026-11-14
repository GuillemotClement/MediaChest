import { media, mediaUser } from '../../db/media.js';

export type Media = typeof media.$inferSelect;

// TODO: why pick ??
export type InsertMedia = Pick<typeof media.$inferInsert, 'tmdbId' | 'name' | 'mediaType'>;

export type MediaUser = typeof mediaUser.$inferSelect;
export type InsertMediaUser = typeof mediaUser.$inferInsert;
