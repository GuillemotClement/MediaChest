import { z } from 'zod';
import { mediaTypeEnum } from '../../db/media.js';

export const addMediaToUserRequest = z.object({
  name: z.string().trim().min(1, { error: 'Le nom est trop court' }),
  tmdbId: z.string().trim().min(1, { error: 'TMBD id est attendu' }),
  mediaType: z.enum(mediaTypeEnum.enumValues, { error: "Le type doit être 'film' ou 'serie'" }),
});

export type AddMMediaToUserRequest = z.infer<typeof addMediaToUserRequest>;
