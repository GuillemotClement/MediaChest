import { input } from 'better-auth';
import * as mediaRepository from './media.repository.js';
import { InsertMedia } from './media.type.js';

export const addMediaToUser = async (userId, payload: InsertMedia) => {
  // TODO: check si le mediaTMDBId est deja present
  let media = await mediaRepository.findByTMDBId(payload.tmdbId, payload.mediaType);
  // si present, on ajoute juste la relation

  // sinon, on enregistrer une nouelle ligne dans media
};
