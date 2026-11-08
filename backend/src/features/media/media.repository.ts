import { eq, and } from 'drizzle-orm';
import { media } from '../../db/media.js';
import { db } from '../../lib/drizzle.js';
import { Media } from './media.type.js';

export const findByTMDBId = async (
  TMDBId: string,
  mediaType: Media['mediaType'],
): Promise<Media | undefined> => {
  const [result] = await db
    .select()
    .from(media)
    .where(and(eq(media.tmdbId, TMDBId), eq(media.mediaType, mediaType)))
    .limit(1);

  return result;
};
