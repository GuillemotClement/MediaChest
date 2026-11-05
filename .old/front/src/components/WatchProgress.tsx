import { useEffect, useState } from "react";

type Progress = { watchStatus: "to_watch" | "watched"; episodesWatched: number; episodeTotal: number | null };
type Season = { number: number; name: string; episodeCount: number };
type Episode = { number: number; name: string; airDate: string | null; watched: boolean };
type Props = Progress & { savedId: number; type: "movie" | "tv"; seasonList: Season[] };

export default function WatchProgress(props: Props) {
  const [progress, setProgress] = useState<Progress>(props);
  const [season, setSeason] = useState(props.seasonList[0]?.number || 1);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ key: string; episodes: Episode[]; error?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const key = `${season}:${attempt}`;
  const current = state?.key === key ? state : null;
  useEffect(() => {
    if (props.type !== "tv" || !props.seasonList.length) return;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/media/watchlist/${props.savedId}/seasons/${season}`, { signal: controller.signal });
        const body = await response.json();
        if (!response.ok) throw new Error(body.message || "Impossible de charger les épisodes.");
        if (!controller.signal.aborted) setState({ key, episodes: body.episodes });
      } catch (err) {
        if (!controller.signal.aborted) setState({ key, episodes: [], error: err instanceof Error ? err.message : "Le serveur est injoignable." });
      }
    }
    void load();
    return () => controller.abort();
  }, [props.savedId, props.type, props.seasonList.length, season, key]);

  async function update(episode?: Episode) {
    setBusy(true); setError("");
    try {
      const response = await fetch(episode
        ? `/api/media/watchlist/${props.savedId}/seasons/${season}/episodes/${episode.number}`
        : `/api/media/watchlist/${props.savedId}/status`, {
        method: episode ? "PUT" : "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(episode ? { watched: !episode.watched } : { status: progress.watchStatus === "watched" ? "to_watch" : "watched" }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "Impossible de modifier le suivi.");
      setProgress(body);
      if (episode) setState(previous => previous && ({ ...previous, episodes: previous.episodes.map(item => item.number === episode.number ? { ...item, watched: !episode.watched } : item) }));
      else setAttempt(value => value + 1);
    } catch (err) { setError(err instanceof Error ? err.message : "Le serveur est injoignable."); }
    finally { setBusy(false); }
  }

  return <section aria-labelledby="progress-title" className="rounded-box border border-base-300 bg-base-100 p-5 sm:p-8">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><h2 id="progress-title" className="text-2xl font-bold">Mon suivi</h2><p role="status" className="mt-2"><span className={`badge ${progress.watchStatus === "watched" ? "badge-success" : "badge-outline"}`}>{progress.watchStatus === "watched" ? "Vu" : "À voir"}</span>{props.type === "tv" && <span className="ml-3 text-sm">{progress.episodesWatched}/{progress.episodeTotal ?? "—"} épisodes vus</span>}</p></div>
      <button className="btn btn-outline btn-primary btn-sm" disabled={busy || (props.type === "tv" && !props.seasonList.length)} onClick={() => void update()}>{busy ? "Enregistrement…" : progress.watchStatus === "watched" ? (props.type === "tv" ? "Tout remettre à voir" : "Remettre à voir") : (props.type === "tv" ? "Tout marquer vu" : "Marquer comme vu")}</button>
    </div>
    {error && <p role="alert" className="mt-4 text-error">{error}</p>}
    {props.type === "tv" && <div className="mt-6 space-y-4">
      <p className="text-sm text-base-content/60">Cochez les épisodes vus. La série passe à « Vu » lorsque tous les épisodes des saisons principales sont cochés, hors épisodes spéciaux.</p>
      {props.seasonList.length === 0 ? <p>Aucun épisode disponible.</p> : <>
        <label className="flex flex-wrap items-center gap-3">Saison<select className="select" value={season} disabled={busy} onChange={event => setSeason(Number(event.target.value))}>{props.seasonList.map(item => <option key={item.number} value={item.number}>{item.name || `Saison ${item.number}`} ({item.episodeCount} épisodes)</option>)}</select></label>
        {!current ? <p role="status">Chargement des épisodes…</p> : current.error ? <div role="alert"><p className="text-error">{current.error}</p><button className="btn btn-sm mt-2" onClick={() => setAttempt(value => value + 1)}>Réessayer</button></div>
          : <ul className="divide-y divide-base-300">{current.episodes.map(episode => <li key={episode.number}><label className="flex cursor-pointer items-center gap-4 py-4"><input className="checkbox checkbox-primary" type="checkbox" checked={episode.watched} disabled={busy} onChange={() => void update(episode)} /><span><span className="font-semibold">Épisode {episode.number} · {episode.name}</span>{episode.airDate && <span className="mt-1 block text-xs text-base-content/60">Diffusion : {new Date(`${episode.airDate}T12:00:00`).toLocaleDateString("fr-FR")}</span>}</span></label></li>)}</ul>}
      </>}
    </div>}
  </section>;
}
