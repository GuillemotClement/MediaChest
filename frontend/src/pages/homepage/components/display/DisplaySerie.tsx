import { getPopularSerie, getSerieGenres } from '../../../../services/tmdb/tmdb.service';
import CardSerie from '../card/CardSerie';
import { useQuery } from '@tanstack/react-query';

export default function DisplaySerie() {
  const serieQuery = useQuery({
    queryKey: ['serie', 'popular', 'fr-FR'],
    queryFn: ({ signal }) => getPopularSerie(signal),
    staleTime: 5 * 60 * 1000,
  });

  const genresQuery = useQuery({
    queryKey: ['genres', 'serie', 'fr-FR'],
    queryFn: ({ signal }) => getSerieGenres(signal),
    staleTime: 60 * 60 * 1000,
  });

  if (serieQuery.isPending || genresQuery.isPending) {
    return <p>Chargement ...</p>;
  }

  if (serieQuery.isError) {
    return <p role="alert">{serieQuery.error.message}</p>;
  }

  if (genresQuery.isError) {
    return <p role="alert">{genresQuery.error.message}</p>;
  }

  if (serieQuery.data.length === 0) {
    return <p>Aucun films</p>;
  }

  return (
    <div className="border border-gray-300 bg-gray-50 rounded py-5 grid grid-cols-3 p-5 gap-3">
      {serieQuery.data.map((serie) => (
        <CardSerie
          key={serie.id}
          media={serie}
          genres={genresQuery.data}
        />
      ))}
    </div>
  );
}
