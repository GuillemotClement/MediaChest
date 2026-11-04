import { useEffect, useState } from "react";
import WatchProgress from "../components/WatchProgress";
import { Link, useParams } from "react-router";

type Detail = {
  savedId: number; watchStatus: "to_watch" | "watched"; episodeTotal: number | null; episodesWatched: number;
  seasonList: { number: number; name: string; episodeCount: number }[];
  title: string; originalTitle: string; type: "movie" | "tv";
  overview: string; posterUrl: string | null; releaseDate: string | null;
  tagline: string; genres: string[]; runtime: number | null; episodeRuntime: number | null;
  seasons: number | null; episodes: number | null; lastAirDate: string | null;
  status: string | null; countries: string[]; languages: string[];
  rating: number | null; voteCount: number; authors: string[];
  cast: { id: number; name: string; character: string; profileUrl: string | null }[];
};
const statuses: Record<string, string> = {
  "Rumored": "Annoncé", "Planned": "En préparation", "In Production": "En production",
  "Post Production": "En postproduction", "Released": "Sorti", "Canceled": "Annulé",
  "Returning Series": "En cours", "Ended": "Terminé", "Pilot": "Pilote",
};
function date(value: string | null) {
  if (!value) return "Non renseignée";
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? "Non renseignée" : parsed.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}
function duration(value: number | null) {
  if (!value) return "Non renseignée";
  return value >= 60 ? `${Math.floor(value / 60)} h${value % 60 ? ` ${value % 60} min` : ""}` : `${value} min`;
}
function Image({ src, alt, className }: { src: string | null; alt: string; className: string }) {
  const [failed, setFailed] = useState(false);
  return src && !failed ? <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />
    : <div className={`${className} flex items-center justify-center bg-base-200 p-3 text-center text-sm text-base-content/50`}>Image indisponible</div>;
}

export default function MediaDetail() {
  const { id } = useParams();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ key: string; data?: Detail; error?: string } | null>(null);
  const key = `${id}:${attempt}`;
  const current = state?.key === key ? state : null;
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/media/watchlist/${encodeURIComponent(id || "")}`, { signal: controller.signal });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.message || "Impossible de charger la fiche du média.");
        }
        const data = await response.json();
        if (!controller.signal.aborted) setState({ key, data });
      } catch (err) {
        if (!controller.signal.aborted) setState({ key, error: err instanceof Error ? err.message : "Le serveur est injoignable." });
      }
    }
    void load();
    return () => controller.abort();
  }, [id, key]);
  const media = current?.data;
  return <section className="space-y-6">
    <Link to="/" className="link link-hover text-sm">← Retour à ma liste</Link>
    {!current && <p role="status" className="flex items-center gap-3"><span className="loading loading-spinner loading-sm" />Chargement de la fiche…</p>}
    {current?.error && <div role="alert" className="alert alert-error"><p>{current.error}</p><button className="btn btn-sm" onClick={() => setAttempt(value => value + 1)}>Réessayer</button></div>}
    {media && <>
      <article className="grid gap-7 rounded-box border border-base-300 bg-base-100 p-5 sm:p-8 md:grid-cols-[240px_1fr]">
        <Image key={media.posterUrl} src={media.posterUrl} alt={`Affiche de ${media.title}`} className="mx-auto aspect-[2/3] w-full max-w-60 rounded-box object-cover shadow-sm" />
        <div className="min-w-0 space-y-5">
          <div>
            <span className={`badge badge-soft ${media.type === "movie" ? "badge-primary" : "badge-secondary"}`}>{media.type === "movie" ? "Film" : "Série"}</span>
            <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{media.title}</h1>
            {media.originalTitle && media.originalTitle !== media.title && <p className="mt-2 text-sm text-base-content/60">Titre original : {media.originalTitle}</p>}
            {media.tagline && <p className="mt-3 italic text-base-content/70">{media.tagline}</p>}
          </div>
          {media.genres.length > 0 && <ul aria-label="Genres" className="flex flex-wrap gap-2">{media.genres.map(genre => <li key={genre} className="badge badge-outline">{genre}</li>)}</ul>}
          <div><h2 className="text-xl font-semibold">Résumé</h2><p className="mt-2 whitespace-pre-line leading-relaxed text-base-content/80">{media.overview || "Aucun résumé disponible pour ce média."}</p></div>
          <dl className="grid gap-x-6 gap-y-4 border-t border-base-300 pt-5 sm:grid-cols-2">
            <div><dt className="text-sm text-base-content/60">{media.type === "movie" ? "Date de sortie" : "Première diffusion"}</dt><dd className="mt-1 font-medium">{date(media.releaseDate)}</dd></div>
            <div><dt className="text-sm text-base-content/60">{media.type === "movie" ? "Durée" : "Durée d’un épisode"}</dt><dd className="mt-1 font-medium">{duration(media.type === "movie" ? media.runtime : media.episodeRuntime)}</dd></div>
            <div><dt className="text-sm text-base-content/60">{media.type === "movie" ? "Réalisation" : "Création"}</dt><dd className="mt-1 font-medium">{media.authors.join(", ") || "Non renseignée"}</dd></div>
            <div><dt className="text-sm text-base-content/60">Statut de production</dt><dd className="mt-1 font-medium">{media.status ? statuses[media.status] || media.status : "Non renseigné"}</dd></div>
            {media.type === "tv" && <><div><dt className="text-sm text-base-content/60">Saisons et épisodes</dt><dd className="mt-1 font-medium">{media.seasons ?? "—"} saison(s) · {media.episodes ?? "—"} épisode(s)</dd></div><div><dt className="text-sm text-base-content/60">Dernière diffusion</dt><dd className="mt-1 font-medium">{date(media.lastAirDate)}</dd></div></>}
            <div><dt className="text-sm text-base-content/60">Pays de production</dt><dd className="mt-1 font-medium">{media.countries.join(", ") || "Non renseignés"}</dd></div>
            <div><dt className="text-sm text-base-content/60">Langues</dt><dd className="mt-1 font-medium">{media.languages.join(", ") || "Non renseignées"}</dd></div>
            <div><dt className="text-sm text-base-content/60">Note des utilisateurs TMDB</dt><dd className="mt-1 font-medium">{media.rating !== null ? `${media.rating.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} / 10 · ${media.voteCount.toLocaleString("fr-FR")} votes` : "Pas encore de votes"}</dd></div>
          </dl>
        </div>
      </article>
      <WatchProgress key={media.savedId} {...media} />
      <section aria-labelledby="cast-title" className="rounded-box border border-base-300 bg-base-100 p-5 sm:p-8">
        <h2 id="cast-title" className="text-2xl font-bold">Acteurs principaux</h2>
        {media.cast.length === 0 ? <p className="mt-4 text-base-content/60">La distribution n’est pas disponible.</p>
          : <ul className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">{media.cast.map(actor => <li key={actor.id} className="min-w-0">
            <Image key={actor.profileUrl} src={actor.profileUrl} alt={actor.name} className="aspect-[2/3] w-full rounded-box object-cover" />
            <p className="mt-3 font-bold">{actor.name}</p><p className="mt-1 text-sm text-base-content/60">{actor.character || "Rôle non renseigné"}</p>
          </li>)}</ul>}
      </section>
      <p className="text-xs text-base-content/50">Données et images : <a className="link" href="https://www.themoviedb.org/" target="_blank" rel="noreferrer">TMDB</a>. This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
    </>}
  </section>;
}
