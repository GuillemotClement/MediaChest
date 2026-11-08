import { useEffect, useState } from 'react';
import { getMovieGenres, getPopularMovies, type Genre } from '../../homepage.service';
import type { Movie } from '../../../../types/media';
import CardMovie from '../card/CardMovie';

export default function DisplayMovie() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [genres, setGenres] = useState<Genre[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPopularMovies(): Promise<void> {
      try {
        const [moviesData, genresData] = await Promise.all([
          getPopularMovies(controller.signal),
          getMovieGenres(controller.signal),
        ]);

        if (!controller.signal.aborted) {
          setMovies(moviesData);
          setGenres(genresData);
        }
      } catch (error: unknown) {
        if (controller.signal.aborted) {
          return;
        }

        console.error(error);

        setError(error instanceof Error ? error.message : 'Impossible de récupérer les médias.');
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }
    void loadPopularMovies();
    return () => controller.abort();
  }, []);

  if (isLoading) {
    return <p>Chargement en cours</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  if (movies.length === 0) {
    return <p>Aucun films</p>;
  }

  return (
    <div className="border border-gray-300 bg-gray-50 rounded py-5 grid grid-cols-3 p-5 gap-3">
      {movies.map((movie) => (
        <CardMovie
          key={movie.id}
          media={movie}
          genres={genres}
        />
      ))}
    </div>
  );
}
