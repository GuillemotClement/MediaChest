import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";

type SavedMedia = {
  id: number;
  title: string;
  status: "to_watch" | "watched";
  episodesWatched: number;
  episodeTotal: number | null;
  releaseDate: string | null;
  posterUrl: string | null;
  type: "movie" | "tv";
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");
}

function Poster({ media }: { media: SavedMedia }) {
  const [failed, setFailed] = useState(false);
  return media.posterUrl && !failed
    ? <img src={media.posterUrl} alt={`Affiche de ${media.title}`} loading="lazy" width={40} height={60} className="h-15 w-10 rounded object-cover" onError={() => setFailed(true)} />
    : <div className="flex h-15 w-10 items-center justify-center rounded bg-base-200 p-1 text-center text-xs text-base-content/50">Sans affiche</div>;
}

export default function Home() {
  const navigate = useNavigate();
  const [media, setMedia] = useState<SavedMedia[]>([]);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | "movie" | "tv">("");
  const [statusFilter, setStatusFilter] = useState<"" | "to_watch" | "watched">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [removing, setRemoving] = useState<Set<number>>(new Set());
  const [removeErrors, setRemoveErrors] = useState<Record<number, string>>({});
  const [notice, setNotice] = useState("");
  const [updating, setUpdating] = useState<Set<number>>(new Set());

  async function toggleStatus(item: SavedMedia) {
    setUpdating(previous => new Set(previous).add(item.id));
    setRemoveErrors(previous => ({ ...previous, [item.id]: "" }));
    try {
      const response = await fetch(`/api/media/watchlist/${item.id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: item.status === "watched" ? "to_watch" : "watched" }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "Impossible de modifier le statut.");
      setMedia(previous => previous.map(media => media.id === item.id ? { ...media, status: body.watchStatus, episodeTotal: body.episodeTotal, episodesWatched: body.episodesWatched } : media));
    } catch (err) { setRemoveErrors(previous => ({ ...previous, [item.id]: err instanceof Error ? err.message : "Le serveur est injoignable." })); }
    finally { setUpdating(previous => { const next = new Set(previous); next.delete(item.id); return next; }); }
  }

  async function remove(item: SavedMedia) {
    setRemoving((previous) => new Set(previous).add(item.id));
    setRemoveErrors((previous) => ({ ...previous, [item.id]: "" }));
    setNotice("");
    try {
      const response = await fetch(`/api/media/watchlist/${item.id}`, { method: "DELETE" });
      // A row removed in another tab can also be removed from this view.
      if (!response.ok && response.status !== 404) {
        throw new Error("Impossible de supprimer ce média. Réessayez.");
      }
      setMedia((previous) => previous.filter((media) => media.id !== item.id));
      setNotice(`« ${item.title} » a été retiré de votre liste.`);
    } catch (err) {
      setRemoveErrors((previous) => ({ ...previous, [item.id]: err instanceof Error ? err.message : "Le serveur est injoignable." }));
    } finally {
      setRemoving((previous) => { const next = new Set(previous); next.delete(item.id); return next; });
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/media/watchlist", { signal: controller.signal });
        if (!response.ok) throw new Error("Impossible de charger votre liste. Réessayez dans un instant.");
        const body = await response.json();
        if (!controller.signal.aborted) setMedia(body.results);
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Le serveur est injoignable.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [attempt]);

  const normalizedQuery = normalize(query.trim());
  const filtered = media.filter((item) => (!typeFilter || item.type === typeFilter) && (!statusFilter || item.status === statusFilter) && normalize(item.title).includes(normalizedQuery));

  return (
    <section className="space-y-6" aria-labelledby="home-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 id="home-title" className="text-3xl font-bold">Bienvenue sur MediaChest</h1>
          <p className="mt-2 text-base-content/70">Votre liste de films et de séries à voir, au même endroit.</p>
        </div>
        <Link to="/recherche" className="btn btn-primary">Rechercher un média</Link>
      </div>
      <div className="rounded-box border border-base-300 bg-base-100 p-4 sm:p-6">
        <div className="mb-5 space-y-4">
          <h2 className="text-xl font-semibold">Ma liste à voir</h2>
          <div className="w-full">
            <label htmlFor="watchlist-search" className="mb-2 block text-sm font-medium">Rechercher dans ma liste</label>
            <input id="watchlist-search" type="search" placeholder="Saisissez le nom d’un film ou d’une série…" aria-describedby="watchlist-search-help" aria-controls="watchlist-results" className="input w-full" value={query} onChange={(event) => setQuery(event.target.value)} disabled={loading || !!error || media.length === 0} />
            <p id="watchlist-search-help" className="mt-2 text-xs text-base-content/60">La liste se filtre au fur et à mesure de votre saisie, par nom, sans distinction de majuscules ni d’accents.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
          <div className="w-full sm:max-w-xs">
            <label htmlFor="watchlist-type" className="mb-2 block text-sm font-medium">Type de média</label>
            <select id="watchlist-type" className="select w-full" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as "" | "movie" | "tv")} aria-controls="watchlist-results" disabled={loading || !!error || media.length === 0}>
              <option value="">Tous les médias</option>
              <option value="movie">Films</option>
              <option value="tv">Séries</option>
            </select>
          </div>
            <div className="w-full sm:max-w-xs">
              <label htmlFor="watchlist-status" className="mb-2 block text-sm font-medium">Statut</label>
              <select id="watchlist-status" className="select w-full" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "" | "to_watch" | "watched")} aria-controls="watchlist-results" disabled={loading || !!error || media.length === 0}>
                <option value="">Tous les statuts</option>
                <option value="to_watch">À voir</option>
                <option value="watched">Vu</option>
              </select>
            </div>
          </div>
        </div>
        <p role="status" className="text-sm text-success">{notice}</p>
        {loading ? <p role="status" className="py-8 text-center">Chargement de votre liste…</p>
          : error ? <div role="alert" className="flex flex-wrap items-center gap-4 py-5"><p className="text-error">{error}</p><button className="btn btn-sm" onClick={() => { setError(""); setLoading(true); setAttempt((value) => value + 1); }}>Réessayer</button></div>
          : media.length === 0 ? <div className="py-10 text-center"><p className="text-lg font-medium">Votre liste est encore vide</p><p className="mt-2 text-base-content/60">Ajoutez un film ou une série depuis la page de recherche pour le retrouver ici.</p><Link to="/recherche" className="btn btn-outline btn-primary mt-5">Trouver mon premier média</Link></div>
          : <>
            <p role="status" className="mb-3 text-sm text-base-content/60">{filtered.length} média{filtered.length > 1 ? "s" : ""}{query.trim() || typeFilter || statusFilter ? ` sur ${media.length}` : " dans votre liste"}</p>
            <div className="overflow-x-auto">
              <table id="watchlist-results" className="table w-full">
                <caption className="sr-only">Films et séries de votre liste à voir</caption>
                <thead><tr><th scope="col" className="w-16">Image</th><th scope="col">Nom</th><th scope="col">Année de sortie</th><th scope="col">Type</th><th scope="col">Statut</th><th scope="col">Actions</th></tr></thead>
                <tbody>
                  {filtered.map((item) => <tr key={item.id} className="cursor-pointer hover:bg-base-200/50" onClick={(event) => {
                    if (!(event.target as HTMLElement).closest("a, button")) navigate(`/medias/${item.id}`);
                  }}>
                    <td><Link to={`/medias/${item.id}`} aria-label={`Voir la fiche de ${item.title}`}><Poster media={item} /></Link></td>
                    <td className="min-w-36 font-bold"><Link className="hover:underline focus-visible:underline" to={`/medias/${item.id}`}>{item.title}</Link></td>
                    <td>{item.releaseDate?.slice(0, 4) || "Non renseignée"}</td>
                    <td><span className={`badge badge-soft ${item.type === "movie" ? "badge-primary" : "badge-secondary"}`}>{item.type === "movie" ? "Film" : "Série"}</span></td>
                    <td><span className={`badge ${item.status === "watched" ? "badge-success" : "badge-outline"}`}>{item.status === "watched" ? "Vu" : "À voir"}</span>{item.type === "tv" && <span className="mt-2 block whitespace-nowrap text-sm text-base-content/60">{item.episodesWatched}/{item.episodeTotal ?? "—"} épisodes vus</span>}</td>
                    <td>
                      <button type="button" className="btn btn-outline btn-primary btn-sm mb-2 mr-2" disabled={updating.has(item.id) || removing.has(item.id)} onClick={() => void toggleStatus(item)} aria-label={`${item.status === "watched" ? "Remettre à voir" : "Marquer comme vu"} : ${item.title}`}>{updating.has(item.id) ? "Enregistrement…" : item.status === "watched" ? "À voir" : "Marquer vu"}</button>
                      <button type="button" className="btn btn-outline btn-error btn-sm" disabled={removing.has(item.id) || updating.has(item.id)} onClick={() => void remove(item)} aria-label={`Supprimer ${item.title} de ma liste`}>
                        {removing.has(item.id) ? "Suppression…" : "Supprimer"}
                      </button>
                      {removeErrors[item.id] && <p role="alert" className="mt-2 text-sm text-error">{removeErrors[item.id]}</p>}
                    </td>
                  </tr>)}
                  {filtered.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-base-content/60">{query.trim() ? `Aucun média ne correspond à « ${query.trim()} » avec les filtres sélectionnés.` : "Aucun média ne correspond aux filtres sélectionnés."}</td></tr>}
                </tbody>
              </table>
            </div>
          </>}
      </div>
    </section>
  );
}
