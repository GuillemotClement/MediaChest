import { tmdbApi } from '../../services/tmdbApi';
import type { Movie, Serie } from '../../types/media';

interface MoviesResponse {
  page: number;
  results: Movie[];
  total_pages: number;
  total_results: number;
}

export const getPopularMovies = async (signal?: AbortSignal): Promise<Movie[]> => {
  const { data } = await tmdbApi.get<MoviesResponse>('/discover/movie', {
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

export interface Genre {
  id: number;
  name: string;
}

interface GenresResponse {
  genres: Genre[];
}

export const getMovieGenres = async (signal?: AbortSignal): Promise<Genre[]> => {
  const { data } = await tmdbApi.get<GenresResponse>('/genre/movie/list', {
    signal,
    params: { language: 'fr-FR' },
  });

  return data.genres;
};

export const getPopularSerie = async (signal: AbortSignal): Promise<Serie[]> => {
  const response = await tmdbApi.get('/discover/tv', {
    signal,
    params: {
      include_adult: false,
      include_video: false,
      language: 'fr-FR',
      page: 1,
      sort_by: 'popularity.desc',
    },
  });
  return response.data.results;
};

export const getSerieGenres = async (signal?: AbortSignal): Promise<Genre[]> => {
  const { data } = await tmdbApi.get<GenresResponse>('/genre/tv/list', {
    signal,
    params: {
      language: 'fr-FR',
    },
  });

  return data.genres;
};
