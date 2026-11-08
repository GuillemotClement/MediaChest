import type { Movie } from '../../../types/movie';
import type { Genre } from '../homepage.service';

type CardMedia = {
  media: Movie;
  genres: Genre[];
};

export default function CardMedia({ media, genres }: CardMedia) {
  const mediaGenres = genres.filter((genre) => media.genre_ids.includes(genre.id));

  return (
    <div className="card bg-base-100 w-full min-w-0 shadow-sm border border-gray-200 pt-5">
      <figure>
        <img
          src={`https://image.tmdb.org/t/p/w500${media.poster_path}`}
          alt={`Affiche de ${media.title}`}
          loading="lazy"
          width={200}
        />
      </figure>
      <div className="card-body">
        <h2 className="card-title">
          {media.title}
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
    </div>
  );
}
