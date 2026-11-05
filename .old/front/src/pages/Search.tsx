import { useEffect, useState } from "react";

type Media = { id: number; type: "movie" | "tv"; title: string; posterUrl: string | null; added: boolean };
type SearchState = { key: string; results: Media[]; error: string };

function Poster({ media }: { media: Media }) {
  const [failed, setFailed] = useState(false);
  return media.posterUrl && !failed
    ? <img src={media.posterUrl} alt={`Affiche de ${media.title}`} loading="lazy" width={48} height={72} className="h-18 w-12 shrink-0 rounded object-cover" onError={() => setFailed(true)} />
    : <div className="flex h-18 w-12 shrink-0 items-center justify-center rounded bg-base-200 p-1 text-center text-xs text-base-content/50">Sans affiche</div>;
}

export default function Search() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<"" | "movie" | "tv">("");
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<SearchState | null>(null);
  const [adding, setAdding] = useState<Set<string>>(new Set());
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});
  const term = query.trim();
  const key = JSON.stringify([term, type, attempt]);
  const current = state?.key === key ? state : null;
  const loading = !!term && !current;

  useEffect(() => {
    if (!term) return;
    const controller = new AbortController();
    // Wait briefly after typing and cancel superseded requests.
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ query: term });
        if (type) params.set("type", type);
        const response = await fetch(`/api/media/search?${params}`, { signal: controller.signal });
        const body = await response.json();
        if (!response.ok) throw new Error(body.message || "La recherche a échoué.");
        if (!controller.signal.aborted) setState({ key, results: body.results, error: "" });
      } catch (err) {
        if (!controller.signal.aborted) setState({ key, results: [], error: err instanceof Error ? err.message : "Le serveur est injoignable." });
      }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [term, type, key]);

  async function add(media: Media) {
    const mediaKey = `${media.type}:${media.id}`;
    setAdding((previous) => new Set(previous).add(mediaKey));
    setAddErrors((previous) => ({ ...previous, [mediaKey]: "" }));
    try {
      const response = await fetch("/api/media/watchlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: media.id, type: media.type }) });
      if (!response.ok) { const body = await response.json(); throw new Error(body.message || "L’ajout a échoué."); }
      setAdded((previous) => new Set(previous).add(mediaKey));
    } catch (err) {
      setAddErrors((previous) => ({ ...previous, [mediaKey]: err instanceof Error ? err.message : "Impossible d’ajouter ce média." }));
    } finally {
      setAdding((previous) => { const next = new Set(previous); next.delete(mediaKey); return next; });
    }
  }

  return <section className="space-y-6" aria-labelledby="search-title">
    <div>
      <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">Votre prochaine découverte</p>
      <h1 id="search-title" className="text-3xl font-bold sm:text-4xl">Rechercher un média</h1>
      <p className="mt-3 text-base-content/70">Trouvez un film ou une série et ajoutez-le à votre liste à voir.</p>
    </div>
    <div className="rounded-box border border-base-300 bg-base-100 p-5 sm:p-6">
      <label htmlFor="media-query" className="mb-2 block font-medium">Quel titre recherchez-vous ?</label>
      <input id="media-query" type="search" className="input w-full" placeholder="Ex. : Dune, The Last of Us…" maxLength={200} value={query} onChange={(event) => setQuery(event.target.value)} aria-describedby="search-help" aria-controls="search-results" />
      <p id="search-help" className="mt-2 text-sm text-base-content/60">Les résultats s’affichent automatiquement. Jusqu’à 10 films et séries correspondant à votre recherche.</p>
      <fieldset className="mt-5">
        <legend className="mb-3 text-sm font-medium">Type de média (optionnel)</legend>
        <div className="flex flex-wrap gap-6">
          <label className="flex cursor-pointer items-center gap-2"><input className="radio radio-primary" type="radio" name="media-type" value="" checked={type === ""} onChange={() => setType("")} />Tous</label>
          <label className="flex cursor-pointer items-center gap-2"><input className="radio radio-primary" type="radio" name="media-type" value="movie" checked={type === "movie"} onChange={() => setType("movie")} />Film</label>
          <label className="flex cursor-pointer items-center gap-2"><input className="radio radio-primary" type="radio" name="media-type" value="tv" checked={type === "tv"} onChange={() => setType("tv")} />Série</label>
        </div>
      </fieldset>
    </div>
    <div id="search-results" aria-busy={loading}>
      {!term && <div className="rounded-box border border-dashed border-base-300 px-6 py-12 text-center"><h2 className="text-xl font-semibold">Votre liste commence par une découverte</h2><p className="mt-2 text-base-content/60">Saisissez un titre pour rechercher parmi les films et les séries.</p></div>}
      {loading && <p role="status" className="flex items-center gap-3"><span className="loading loading-spinner loading-sm" />Recherche des médias…</p>}
      {term && current?.error && <div role="alert" className="alert alert-error"><p>{current.error}</p><button className="btn btn-sm" onClick={() => setAttempt((value) => value + 1)}>Réessayer</button></div>}
      {term && current && !current.error && <div className="space-y-4">
        <div role="status"><h2 className="text-xl font-semibold">Résultats pour « {term} »</h2><p className="mt-1 text-sm text-base-content/60">{current.results.length} résultat{current.results.length > 1 ? "s" : ""} · {type === "movie" ? "Films" : type === "tv" ? "Séries" : "Films et séries"}</p></div>
        {current.results.length === 0 ? <p className="rounded-box bg-base-100 p-8 text-center">Aucun résultat. Essayez un autre titre ou changez le type de média.</p>
          : <ul aria-label="Médias trouvés" className="divide-y divide-base-300 overflow-hidden rounded-box border border-base-300 bg-base-100">
            {current.results.map((media) => {
              const mediaKey = `${media.type}:${media.id}`;
              const inList = media.added || added.has(mediaKey);
              return <li key={mediaKey} className="flex flex-wrap items-center gap-4 p-4">
                <Poster media={media} />
                <div className="min-w-0 flex-1"><h3 className="font-bold">{media.title}</h3><span className={`badge badge-soft badge-sm mt-2 ${media.type === "movie" ? "badge-primary" : "badge-secondary"}`}>{media.type === "movie" ? "Film" : "Série"}</span></div>
                <button className={`btn btn-sm ${inList ? "btn-soft btn-success" : "btn-outline btn-primary"}`} disabled={inList || adding.has(mediaKey)} onClick={() => void add(media)} aria-label={`${inList ? "Déjà ajouté :" : "Ajouter à ma liste :"} ${media.title}`}>{inList ? "✓ Dans ma liste" : adding.has(mediaKey) ? "Ajout…" : "+ Ajouter à ma liste"}</button>
                {inList && <span role="status" className="sr-only">{media.title} est dans votre liste à voir.</span>}
                {addErrors[mediaKey] && <p role="alert" className="w-full text-sm text-error">{addErrors[mediaKey]}</p>}
              </li>;
            })}
          </ul>}
      </div>}
    </div>
    <p className="text-xs text-base-content/50">Données et images : <a className="link" href="https://www.themoviedb.org/" target="_blank" rel="noreferrer">TMDB</a>. This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
  </section>;
}
