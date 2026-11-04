import { useRef, useState } from "react";
import type { FormEvent } from "react";

type Media = { id: number; type: "movie" | "tv"; title: string; originalTitle: string; overview: string; releaseDate: string | null; posterUrl: string | null; added: boolean };
type Results = { page: number; totalPages: number; totalResults: number; results: Media[] };
type SearchQuery = { query: string; type: "movie" | "tv" };

export default function Search() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<"" | "movie" | "tv">("");
  const [searched, setSearched] = useState<SearchQuery | null>(null);
  const [data, setData] = useState<Results | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState<Set<string>>(new Set());
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});
  const requestId = useRef(0);

  async function search(params: SearchQuery, page = 1) {
    const current = ++requestId.current;
    setLoading(true); setError(""); setData(null); setSearched(params); setAddErrors({});
    try {
      const response = await fetch(`/api/media/search?${new URLSearchParams({ ...params, page: String(page) })}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "La recherche a échoué.");
      if (current === requestId.current) setData(body);
    } catch (err) {
      if (current === requestId.current) setError(err instanceof Error ? err.message : "Le serveur est injoignable.");
    } finally { if (current === requestId.current) setLoading(false); }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (type && query.trim()) void search({ query: query.trim(), type });
  }

  async function add(media: Media) {
    const key = `${media.type}:${media.id}`;
    setAdding((previous) => new Set(previous).add(key));
    setAddErrors((previous) => ({ ...previous, [key]: "" }));
    try {
      const response = await fetch("/api/media/watchlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: media.id, type: media.type }) });
      if (!response.ok) { const body = await response.json(); throw new Error(body.message || "L’ajout a échoué."); }
      setData((previous) => previous && ({ ...previous, results: previous.results.map((item) => item.id === media.id && item.type === media.type ? { ...item, added: true } : item) }));
    } catch (err) {
      setAddErrors((previous) => ({ ...previous, [key]: err instanceof Error ? err.message : "Impossible d’ajouter ce média." }));
    } finally {
      setAdding((previous) => { const next = new Set(previous); next.delete(key); return next; });
    }
  }

  return <section className="space-y-8" aria-labelledby="search-title">
    <div>
      <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">Votre prochaine découverte</p>
      <h1 id="search-title" className="text-3xl font-bold sm:text-4xl">Rechercher un média</h1>
      <p className="mt-3 text-base-content/70">Un film à découvrir, une série à commencer. Retrouvez-les et gardez-les dans votre liste à voir.</p>
    </div>
    <form onSubmit={submit} className="rounded-box border border-base-300 bg-base-100 p-5 sm:p-6">
      <label htmlFor="media-query" className="mb-2 block font-medium">Quel titre recherchez-vous ?</label>
      <input id="media-query" type="search" className="input w-full" placeholder="Ex. : Dune, The Last of Us…" required maxLength={200} value={query} onChange={(event) => setQuery(event.target.value)} />
      <div className="mt-5 flex flex-wrap items-end justify-between gap-5">
        <fieldset>
          <legend className="mb-3 font-medium">Type de média</legend>
          <div className="flex gap-6">
            <label className="flex cursor-pointer items-center gap-2"><input className="radio radio-primary" type="radio" name="media-type" required value="movie" checked={type === "movie"} onChange={() => setType("movie")} />Film</label>
            <label className="flex cursor-pointer items-center gap-2"><input className="radio radio-primary" type="radio" name="media-type" required value="tv" checked={type === "tv"} onChange={() => setType("tv")} />Série</label>
          </div>
        </fieldset>
        <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={loading || !query.trim() || !type}>{loading ? "Recherche en cours…" : "Rechercher"}</button>
      </div>
    </form>
    {loading && <p role="status" className="flex items-center gap-3"><span className="loading loading-spinner loading-sm" />Recherche des médias…</p>}
    {error && <div role="alert" className="alert alert-error"><p>{error}</p><button className="btn btn-sm" onClick={() => searched && void search(searched)}>Réessayer</button></div>}
    {!searched && <div className="rounded-box border border-dashed border-base-300 px-6 py-12 text-center"><h2 className="text-xl font-semibold">Votre liste commence par une découverte</h2><p className="mt-2 text-base-content/60">Saisissez un titre, choisissez Film ou Série, puis lancez la recherche.</p></div>}
    {data && <div className="space-y-5">
      <div role="status"><h2 className="text-xl font-semibold">Résultats pour « {searched?.query} »</h2><p className="mt-1 text-sm text-base-content/60">{data.totalResults} résultat{data.totalResults > 1 ? "s" : ""} · {searched?.type === "movie" ? "Films" : "Séries"}</p></div>
      {data.results.length === 0 && <p className="rounded-box bg-base-100 p-8 text-center">Aucun résultat. Essayez un autre titre ou changez le type de média.</p>}
      <div className="grid gap-5 md:grid-cols-2">
        {data.results.map((media) => { const key = `${media.type}:${media.id}`; return <article key={key} className="flex overflow-hidden rounded-box border border-base-300 bg-base-100">
          <div className="w-28 shrink-0 bg-base-300 sm:w-36">
            {media.posterUrl ? <img src={media.posterUrl} alt={`Affiche de ${media.title}`} loading="lazy" className="aspect-[2/3] w-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : <div className="flex aspect-[2/3] items-center justify-center p-3 text-center text-sm text-base-content/50">Affiche indisponible</div>}
          </div>
          <div className="flex min-w-0 flex-1 flex-col items-start gap-3 p-4">
            <div><p className="mb-1 text-xs text-base-content/60">{media.type === "movie" ? "Film" : "Série"} · {media.releaseDate?.slice(0, 4) || "Date inconnue"}</p><h3 className="text-lg font-bold leading-tight">{media.title}</h3>{media.originalTitle && media.originalTitle !== media.title && <p className="mt-1 text-xs text-base-content/60">{media.originalTitle}</p>}</div>
            <p className="line-clamp-4 text-sm text-base-content/70">{media.overview || "Aucun résumé disponible."}</p>
            <button className={`btn btn-sm mt-auto ${media.added ? "btn-soft btn-success" : "btn-outline btn-primary"}`} disabled={media.added || adding.has(key)} onClick={() => void add(media)} aria-label={`${media.added ? "Déjà ajouté :" : "Ajouter à ma liste :"} ${media.title}`}>{media.added ? "✓ Dans ma liste" : adding.has(key) ? "Ajout…" : "+ Ajouter à ma liste"}</button>
            {media.added && <span role="status" className="sr-only">{media.title} est dans votre liste à voir.</span>}
            {addErrors[key] && <p role="alert" className="text-sm text-error">{addErrors[key]}</p>}
          </div>
        </article>; })}
      </div>
      {data.totalPages > 1 && <nav aria-label="Pages de résultats" className="flex items-center justify-center gap-4"><button className="btn btn-sm" disabled={data.page <= 1} onClick={() => searched && void search(searched, data.page - 1)}>Précédent</button><span className="text-sm">Page {data.page} sur {data.totalPages}</span><button className="btn btn-sm" disabled={data.page >= data.totalPages} onClick={() => searched && void search(searched, data.page + 1)}>Suivant</button></nav>}
    </div>}
    <p className="text-xs text-base-content/50">Données et images : <a className="link" href="https://www.themoviedb.org/" target="_blank" rel="noreferrer">TMDB</a>. This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
  </section>;
}
