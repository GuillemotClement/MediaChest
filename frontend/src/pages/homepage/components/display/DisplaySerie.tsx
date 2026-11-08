import { useEffect, useState } from 'react';
import { getPopularSerie, getSerieGenres, type Genre } from '../../homepage.service';
import type { Serie } from '../../../../types/media';
import CardSerie from '../card/CardSerie';

export default function DisplaySerie() {
  const [series, setSeries] = useState<Serie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [genres, setGenres] = useState<Genre[]>([]);

  useEffect(() => {
    const constroller = new AbortController();

    const loadPopularSerie = async (controller: AbortController): Promise<void> => {
      try {
        const [seriesData, genresData] = await Promise.all([
          getPopularSerie(controller.signal),
          getSerieGenres(controller.signal),
        ]);

        if (!controller.signal.aborted) {
          setSeries(seriesData);
          setGenres(genresData);
        }
      } catch (error: unknown) {
        if (controller.signal.aborted) {
          return;
        }

        console.error('Erreur fetch serie data: ', error);
        setError(error instanceof Error ? error.message : 'Impossible de récupèrer les séries');
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void loadPopularSerie(constroller);
    return () => constroller.abort();
  }, []);

  if (isLoading) {
    return <p>Chargement en cours</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  if (series.length === 0) {
    return <p>Aucune séries</p>;
  }

  return (
    <div className="border border-gray-300 bg-gray-50 rounded py-5 grid grid-cols-3 p-5 gap-3">
      {series.map((serie) => (
        <CardSerie
          key={serie.id}
          media={serie}
          genres={genres}
        />
      ))}
    </div>
  );
}
