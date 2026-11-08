import axios from 'axios';

export const tmdbApi = axios.create({
  baseURL: 'https://api.themoviedb.org/3/',
  headers: { Authorization: `Bearer ${import.meta.env.VITE_TMDB_READ_ACCESS_TOKEN}` },
});
