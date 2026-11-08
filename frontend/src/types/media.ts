import type { Genre } from "../services/tmdb/tmdb.type";

export interface Movie {
  genre_ids: number[];
  adult: boolean;
  id: number;
  original_language: string;
  original_title: string;
  overview: string;
  popularity: number;
  poster_path: string | null;
  release_date: string;
  softcore: boolean;
  title: string;
  video: boolean;
  vote_average: number;
  vote_count: number;
}

export interface Serie {
  backdrop_path: string;
  first_air_date: string;
  genre_ids: number[];
  id: number;
  name: string;
  origin_country: string[];
  original_language: string;
  original_name: string;
  overview: string;
  popularity: number;
  poster_path: string;
  vote_average: number;
  vote_count: number;
}

export interface MediaDetail {
  adult: boolean;
  backdrop_path: string;
  id: number;
  budget: number;
  genres: Genre[];
  title: string;
  original_language: string;
  original_title: string;
  overview: string;
  poster_path: string;
  media_type: string;
  genre_ids: number[];
  popularity: number;
  release_date: string;
  video: boolean;
  vote_average: number;
  vote_count: number;
  origin_country: string[];
  production_componies: ProductionCompanie[];
  production_countries: ProductionCountries[];
  revenue: number;
  runtime: number;
  softcore: boolean;
  status: string;
}

export type ProductionCompanie = {
  id: number;
  logo_path: string;
  name: string;
  origin_country: string;
}

export type ProductionCountries = {
  iso_3166_1: string;
  name: string;
}

