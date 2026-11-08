import type { Movie, Serie } from '../../types/media';
import { tmdbApi } from './tmdb.api';
import type { Genre, TMDBGenreResponse, TMDBResponse } from './tmdb.type';

export const getPopularMovies = async (signal?: AbortSignal): Promise<Movie[]> => {
  const { data } = await tmdbApi.get<TMDBResponse<Movie>>('/discover/movie', {
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
