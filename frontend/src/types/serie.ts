import type { Genre } from '../services/tmdb/tmdb.type';

export interface SerieDetail {
  adult: boolean;
  backdrop_path: string;
  created_by: SerieCreator[];
  first_air_date: string;
  genres: Genre[];
  homepage: string;
  id: number;
  in_production: boolean;
  languages: string[];
  last_air_date: string;
  name: string;
  network: SerieDistributor[];
  number_of_episodes: number;
  number_of_seasons: number;
  origin_country: string[];
  original_name: string;
  overview: string;
  popularity: number;
  poster_path: string;
  production_companies: ProductionCompany[];
  production_countries: ProductionCountry[];
  softcore: boolean;
  status: string;
  vote_average: number;
  seasons: Season[];
}

interface SerieCreator {
  credit_id: string;
  gender: number;
  name: string;
  original_name: string;
  profile_path: string;
}

interface SerieDistributor {
  id: number;
  logo_path: string;
  name: string;
  origin_country: string;
}

interface ProductionCompany {
  id: number;
  logo_path: string;
  name: string;
  origin_country: string;
}

interface ProductionCountry {
  iso_3166_1: string;
  name: string;
}

interface Season {
  air_date: string;
  episode_count: number;
  id: number;
  name: string;
  overview: string;
  poster_path: string;
  season_number: number;
  vote_average: number;
}
