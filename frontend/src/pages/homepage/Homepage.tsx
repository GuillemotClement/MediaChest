import { useEffect, useState } from 'react';
import { getMovieGenres, getPopularMovies, type Genre } from './homepage.service';
import type { Movie } from '../../types/movie';
import ButtonDisplayChoice from './components/ButtonChoice';
import CardMedia from './components/CardMedia';

const displayTitles = {
  populare_movie: 'Films populaires',
  populare_serie: 'Séries populaire',
  my_media: 'Ma liste',
};

type Display = keyof typeof displayTitles;

export default function Homepage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [display, setDisplay] = useState<Display>('populare_movie');

  const [genres, setGenres] = useState<Genre[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPopularMovies(): Promise<void> {
      try {
        const [moviesData, genresData] = await Promise.all([
          getPopularMovies(controller.signal),
          getMovieGenres(controller.signal),
        ]);

        // const data = await getPopularMovies(controller.signal);

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

  console.log(display);

  return (
    <div className="">
      <div className="border border-gray-300 bg-white rounded p-5 my-10">
        <h2 className="text-3xl mt-3 mb-5 font-bold">{displayTitles[display]}</h2>

        <div className="flex gap-x-3">
          <ButtonDisplayChoice
            text="Films populaire"
            setChoice={() => setDisplay('populare_movie')}
            color="btn-primary"
          />

          <ButtonDisplayChoice
            text="Séries populaire"
            setChoice={() => setDisplay('populare_serie')}
            color="btn-error"
          />

          <ButtonDisplayChoice
            text="Ma liste"
            setChoice={() => setDisplay('my_media')}
            color=""
          />
        </div>
      </div>

      <div className="border border-gray-300 bg-gray-50 rounded py-5 grid grid-cols-3 p-5 gap-3">
        {movies.map((movie) => (
          <CardMedia
            key={movie.id}
            media={movie}
            genres={genres}
          />
        ))}
      </div>
    </div>
  );
}
