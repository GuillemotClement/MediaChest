import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';
import { getSerieById } from '../../services/tmdb/tmdb.service';
import { displayDateFr } from '../../services/utils';
import { ArrowLeft, Calendar, Flag, Star } from 'lucide-react';

export default function DetailSerie() {
  const { serieId } = useParams();

  const serieDetailQuery = useQuery({
    queryKey: ['serie', 'detail', serieId, 'fr-FR'],
    queryFn: ({ signal }) => getSerieById(serieId!, signal),
    enabled: Boolean(serieId),
    staleTime: 5 * 60 * 1000,
  });

  const data = serieDetailQuery.data;
  if (serieDetailQuery.isPending) {
    return <p>Récupéation en cours</p>;
  }

  if (serieDetailQuery.isError) {
    return <p>Erreur lors de la récupération des données</p>;
  }

  if (!data) {
    return <p>Pas de données</p>;
  }

  return (
    <div className="bg-white rounde border border-gray-300 p-10">
      <div className="">
        <Link
          className="btn"
          to="/"
        >
          <ArrowLeft />
          Retour à la liste
        </Link>
      </div>

      <div className="flex justify-center">
        <img
          src={`https://image.tmdb.org/t/p/w500${data.poster_path}`}
          alt={`Affiche de ${data.name}`}
          loading="lazy"
          width={400}
        />
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold my-5">{data.name}</h1>
        <button className="btn btn-primary">Ajouter à ma liste</button>
      </div>

      {/* TODO: permettre d'accéder a une page de listing de film par catégorie en cliquant sur le genre */}
      <div className="flex gap-x-4">
        {data.genres.map((genre) => (
          <div
            className="badge badge-neutral"
            key={genre.id}
          >
            {genre.name}
          </div>
        ))}
      </div>

      <div className="divider"></div>

      <h2 className="text-2xl font-bold mb-3">Synopsis</h2>
      <p>{data.overview}</p>

      <div className="divider"></div>

      <div className="">
        <h2 className="text-2xl font-bold mb-3">Détail</h2>

        <div className="flex justify-between">
          <div className="flex gap-x-2">
            <Calendar />
            <span>{displayDateFr(data.first_air_date)}</span>
          </div>

          <div className="">Nombre de saisons: {data.number_of_seasons}</div>

          <div className="">Nombre d'épisode: {data.number_of_episodes}</div>

          <div className="flex gap-x-2">
            <Star />
            <span>{data.vote_average}</span>
          </div>

          <div className="flex gap-x-2">
            <Flag />
            <span>{data.origin_country}</span>
          </div>
        </div>
      </div>

      <div className=""></div>
    </div>
  );
}
