import type { MediaDetail } from '../../types/media';

export interface Genre {
  id: number;
  name: string;
}

export interface TMDBResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface TMDBGenreResponse {
  genres: Genre[];
}

export interface TMDBMediaDetailResponse {
  data: MediaDetail;
  status: number;
}
