import { eq, and, DrizzleQueryError } from 'drizzle-orm';
import { media, mediaUser } from '../../db/media.js';
import { db } from '../../lib/drizzle.js';
import { Media, MediaUser } from './media.type.js';
import AppError from '../../errors/AppError.js';
import { DatabaseError } from 'pg';
import { ConflictError } from '../../errors/index.js';

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

export const createMedia = async (
  tmdbId: string,
  mediaType: Media['mediaType'],
  name: string,
): Promise<Media> => {
  try {
    const [result] = await db.insert(media).values({ tmdbId, mediaType, name }).returning();

    if (!result) {
      throw new AppError('Media insertion returned no row', 500);
    }

    return result;
  } catch (err) {
    const pgError = err instanceof DrizzleQueryError ? err.cause : err;

    if (pgError instanceof DatabaseError && pgError.code === '23505') {
      throw new ConflictError('Media already exists');
    }

    throw err;
  }
};

export const createMediaUser = async (userId: string, mediaId: number): Promise<MediaUser> => {
  try {
    const [result] = await db.insert(mediaUser).values({ userId, mediaId }).returning();

    if (!result) {
      throw new AppError('Media user returned no row', 500);
    }

    return result;
  } catch (err) {
    const pgError = err instanceof DrizzleQueryError ? err.cause : err;

    if (pgError instanceof DatabaseError && pgError.code === '23505') {
      throw new ConflictError('Media relation already exist');
    }

    throw err;
  }
};
