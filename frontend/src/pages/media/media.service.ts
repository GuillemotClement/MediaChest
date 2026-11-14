// ADD MEDIA

import { api } from '../../services/api';

// move to service for media
export type AddMediaPayload = {
  tmdbId: string;
  name: string;
  mediaType: 'serie' | 'film';
};

type UserMedia = {
  id: number;
  name: string;
  tmdbId: number;
  status: string;
  type: string;
};

export const addMovieToUser = async (payload: AddMediaPayload) => {
  const response = await api.post('/media/add-media-to-user', payload);
  console.log(response);
  return response.data;
};

export const getUserMedia = async (signal?: AbortSignal): Promise<UserMedia[]> => {
  const { data } = await api.get('/media/user-media', { signal });
  return data;
};
