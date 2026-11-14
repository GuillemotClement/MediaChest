import type { MediaDetail, Movie, Serie } from '../../types/media';
import type { SerieDetail } from '../../types/serie';
import { tmdbApi } from './tmdb.api';
import { type Genre, type TMDBGenreResponse, type TMDBResponse } from './tmdb.type';
import { api } from '../api';

export const getPopularMovies = async (signal?: AbortSignal): Promise<Movie[]> => {
  const response = await tmdbApi.get<TMDBResponse<Movie>>('/movie/popular', {
    signal,
    params: {
      include_adult: false,
      include_video: false,
      language: 'fr-FR',
      page: 1,
      sort_by: 'popularity.desc',
    },
  });
  console.log(response);

  return response.data.results;
};

export const getMovieGenres = async (signal?: AbortSignal): Promise<Genre[]> => {
  const response = await tmdbApi.get<TMDBGenreResponse>('/genre/movie/list', {
    signal,
    params: { language: 'fr-FR' },
  });

  console.log(response);

  return response.data.genres;
};

export const getPopularSerie = async (signal: AbortSignal): Promise<Serie[]> => {
  const { data } = await tmdbApi.get<TMDBResponse<Serie>>('/discover/tv', {
    signal,
    params: {
      include_adult: false,
      include_video: false,
      language: 'fr-FR',
      page: 1,
      sort_by: 'popularity.desc',
    },
  });

  return data.results;
};

export const getSerieGenres = async (signal?: AbortSignal): Promise<Genre[]> => {
  const { data } = await tmdbApi.get<TMDBGenreResponse>('/genre/tv/list', {
    signal,
    params: {
      language: 'fr-FR',
    },
  });

  return data.genres;
};

export const getMovieById = async (mediaId: string, signal?: AbortSignal) => {
  const { data } = await tmdbApi.get<MediaDetail>(`/movie/${mediaId}`, {
    signal,
    params: {
      language: 'fr-FR',
    },
  });

  return data;
};

export const getSerieById = async (serieId: string, signal?: AbortSignal) => {
  const response = await tmdbApi.get<SerieDetail>(`/tv/${serieId}`, {
    signal,
    params: {
      language: 'fr-FR',
    },
  });

  const data = response.data;
  return data;
};

// ADD MEDIA
// move to service for media
export type AddMediaPayload = {
  tmdbId: string;
  name: string;
  mediaType: 'serie' | 'film';
};

export const addMovieToUser = async (payload: AddMediaPayload) => {
  const response = await api.post('/media/add-media-to-user', payload);
  console.log(response);
  return response.data;
};
