import * as mediaRepository from './media.repository.js';
import { InsertMedia } from './media.type.js';

export const addMediaToUser = async (userId: string, payload: InsertMedia) => {
  let media = await mediaRepository.findByTMDBId(payload.tmdbId, payload.mediaType);

  if (!media) {
    media = await mediaRepository.createMedia(payload.tmdbId, payload.mediaType, payload.name);
  }

  const mediaUser = await mediaRepository.createMediaUser(userId, media.id);

  const response = {
    mediaId: media.id,
    mediaTmdbId: media.tmdbId,
    mediaName: media.name,
    userId: mediaUser.userId,
  };

  return response;
};
