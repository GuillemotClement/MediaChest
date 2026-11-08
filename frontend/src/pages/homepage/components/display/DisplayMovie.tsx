import CardMovie from '../card/CardMovie';
import { useQuery } from '@tanstack/react-query';
import { getMovieGenres, getPopularMovies } from '../../../../services/tmdb/tmdb.service';

export default function DisplayMovie() {
  const moviesQuery = useQuery({
    queryKey: ['movies', 'popular', 'fr-FR'],
    queryFn: ({ signal }) => getPopularMovies(signal),
    staleTime: 5 * 60 * 1000,
  });

  const genresQuery = useQuery({
    queryKey: ['genres', 'movie', 'fr-FR'],
    queryFn: ({ signal }) => getMovieGenres(signal),
    staleTime: 60 * 60 * 1000,
  });

  if (moviesQuery.isPending || genresQuery.isPending) {
    return <p>Chargement ...</p>;
  }

  if (moviesQuery.isError) {
    return <p role="alert">{moviesQuery.error.message}</p>;
  }

  if (genresQuery.isError) {
    return <p role="alert">{genresQuery.error.message}</p>;
  }

  if (moviesQuery.data.length === 0) {
    return <p>Aucun films</p>;
  }

  return (
    <div className="border border-gray-300 bg-gray-50 rounded py-5 grid grid-cols-3 p-5 gap-3">
      {moviesQuery.data.map((movie) => (
        <CardMovie
          key={movie.id}
          media={movie}
          genres={genresQuery.data}
        />
      ))}
    </div>
  );
}
