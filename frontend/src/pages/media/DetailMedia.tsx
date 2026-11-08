import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';
import { getMovieById } from '../../services/tmdb/tmdb.service';
import { convertMinuteToHour, displayDateFr } from '../../services/utils';
import { ArrowLeft, Calendar, Clock8, Flag, Star } from 'lucide-react';

export default function DetailMedia() {
  const { mediaId } = useParams();

  const mediaQuery = useQuery({
    queryKey: ['movie', 'detail', 'fr-FR', mediaId],
    queryFn: ({ signal }) => getMovieById(mediaId!, signal),
    enabled: Boolean(mediaId),
    staleTime: 5 * 60 * 1000,
  });

  const data = mediaQuery.data;
  if (mediaQuery.isPending) {
    return <p>Récupéation en cours</p>;
  }

  if (mediaQuery.isError) {
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
          alt={`Affiche de ${data?.title}`}
          loading="lazy"
          width={400}
        />
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold my-5">{data.title}</h1>
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
            <span>{displayDateFr(data.release_date)}</span>
          </div>

          <div className="flex gap-x-2">
            <Clock8 />
            <span>{convertMinuteToHour(data.runtime)}</span>
          </div>

          <div className="flex gap-x-2">
            <Star />
            <span>{data.vote_average}</span>
          </div>

          <div className="flex gap-x-2">
            <Flag />
            <span>{data.origin_country}</span>
          </div>

          {/* TODO: ajouter le realisateur */}
        </div>
      </div>

      {/* TODO: ajouter les acteurs */}
      <div className=""></div>
    </div>
  );
}
