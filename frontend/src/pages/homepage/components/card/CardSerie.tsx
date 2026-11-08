import { Link } from 'react-router';
import type { Genre } from '../../../../services/tmdb/tmdb.type';
import type { Serie } from '../../../../types/media';

type CardMedia = {
  media: Serie;
  genres: Genre[];
};

export default function CardMedia({ media, genres }: CardMedia) {
  const mediaGenres = genres.filter((genre) => media.genre_ids.includes(genre.id));

  return (
    <Link
      to={`/serie/details/${media.id}`}
      className="card bg-base-100 w-full min-w-0 shadow-sm border border-gray-200 pt-5"
    >
      <figure>
        <img
          src={`https://image.tmdb.org/t/p/w500${media.poster_path}`}
          alt={`Affiche de ${media.name}`}
          loading="lazy"
          width={200}
        />
      </figure>
      <div className="card-body">
        <h2 className="card-title">
          {media.name}
          {/* <div className="badge badge-secondary">NEW</div> */}
        </h2>
        <p className="line-clamp-3 min-h-[4.5em] leading-normal">{media.overview}</p>

        <div className="flex flex-wrap gap-2">
          {mediaGenres.map((genre) => (
            <span
              key={genre.id}
              className="badge badge-outline"
            >
              {genre.name}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
