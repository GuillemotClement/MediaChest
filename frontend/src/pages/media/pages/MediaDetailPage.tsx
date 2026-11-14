import { useParams } from 'react-router';
import { getMediaById } from '../../../services/tmdb/tmdb.service';
import { useQuery } from '@tanstack/react-query';

export default function MediaDetailPage() {
  const { tmdbId, mediaType } = useParams();

  console.log(tmdbId);

  const mediaQuery = useQuery({
    queryKey: ['media', 'detail', 'fr-FR', tmdbId],
    queryFn: ({ signal }) => getMediaById(tmdbId!, mediaType!, signal),
    enabled: Boolean(tmdbId),
    staleTime: 5 * 60 * 1000,
  });

  console.log(mediaQuery.data);

  const rawMedia = mediaQuery.data;

  const media = {
    image: rawMedia?.poster_path,
    overview: rawMedia?.overview,
    // name: rawMedia.name,
  };

  // if (mediaType === 'film') {
  //   media.name =  rawMedia.title,
  // } else if (mediaType === 'serie') {
  //   media = {
  //     name: rawMedia.name,
  //   };
  // }

  return (
    <div className="bg-white rounde border border-gray-300 p-10">
      {/* <div className="">
        <Link
          className="btn"
          to="/"
        >
          <ArrowLeft />
          Retour à la liste
        </Link>
      </div> */}

      <div className="flex justify-center">
        <img
          src={`https://image.tmdb.org/t/p/w500${media.poster_path}`}
          alt={`Affiche de ${media.name}`}
          loading="lazy"
          width={400}
        />
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold my-5">{media.title}</h1>
        {/* <button
          className="btn btn-primary"
          onClick={handleAddMovie}
          disabled={addMovieMutation.isPending}
        >
          {addMovieMutation.isPending ? 'Ajout ...' : 'Ajouter à ma liste'}
        </button> */}
      </div>

      {/* TODO: permettre d'accéder a une page de listing de film par catégorie en cliquant sur le genre */}
      {/* <div className="flex gap-x-4">
        {data.genres.map((genre) => (
          <div
            className="badge badge-neutral"
            key={genre.id}
          >
            {genre.name}
          </div>
        ))}
      </div> */}

      <div className="divider"></div>

      <h2 className="text-2xl font-bold mb-3">Synopsis</h2>
      <p>{media.overview}</p>

      <div className="divider"></div>

      <div className="">
        <h2 className="text-2xl font-bold mb-3">Détail</h2>

        <div className="flex justify-between">
          {/* <div className="flex gap-x-2">
            <Calendar />
            <span>{displayDateFr(data.release_date)}</span>
          </div> */}

          {/* <div className="flex gap-x-2">
            <Clock8 />
            <span>{convertMinuteToHour(data.runtime)}</span>
          </div> */}

          {/* <div className="flex gap-x-2">
            <Star />
            <span>{data.vote_average}</span>
          </div> */}

          {/* <div className="flex gap-x-2">
            <Flag />
            <span>{data.origin_country}</span>
          </div> */}

          {/* TODO: ajouter le realisateur */}
        </div>
      </div>

      {/* TODO: ajouter les acteurs */}
      <div className=""></div>
    </div>
  );
}

// import { Link } from 'react-router';
// import type { Genre } from '../../../../services/tmdb/tmdb.type';
// import type { Movie } from '../../../../types/media';

// type CardMedia = {
//   media: Movie;
//   genres: Genre[];
// };

// export default function CardMedia({ media, genres }: CardMedia) {
//   const mediaGenres = genres.filter((genre) => media.genre_ids.includes(genre.id));

//   return (
//     <Link
//       to={`/media/${media.id}`}
//       className="card bg-base-100 w-full min-w-0 shadow-sm border border-gray-200 pt-5"
//     >
//       <figure>
//         <img
//           src={`https://image.tmdb.org/t/p/w500${media.poster_path}`}
//           alt={`Affiche de ${media.title}`}
//           loading="lazy"
//           width={200}
//         />
//       </figure>
//       <div className="card-body">
//         <h2 className="card-title">
//           {media.title}
//           {/* <div className="badge badge-secondary">NEW</div> */}
//         </h2>
//         <p className="line-clamp-3 min-h-[4.5em] leading-normal">{media.overview}</p>

//         <div className="flex flex-wrap gap-2">
//           {mediaGenres.map((genre) => (
//             <span
//               key={genre.id}
//               className="badge badge-outline"
//             >
//               {genre.name}
//             </span>
//           ))}
//         </div>
//       </div>
//     </Link>
//   );
// }
