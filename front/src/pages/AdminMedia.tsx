import { useEffect, useState } from "react";
import { Link } from "react-router";

type Availability = "to_download" | "downloaded" | "available";
type Media = { id: number; title: string; type: "movie" | "tv"; posterUrl: string | null; releaseDate: string | null; status: Availability; users: { id: string; username: string }[] };
const labels: Record<Availability, string> = { to_download: "À télécharger", downloaded: "Téléchargé", available: "Dispo" };

function Poster({ media }: { media: Media }) {
  const [failed, setFailed] = useState(false);
  return media.posterUrl && !failed
    ? <img src={media.posterUrl} alt={`Affiche de ${media.title}`} loading="lazy" width={40} height={60} className="h-15 w-10 rounded object-cover" onError={() => setFailed(true)} />
    : <div className="flex h-15 w-10 items-center justify-center rounded bg-base-200 p-1 text-center text-xs text-base-content/50">Sans affiche</div>;
}

export default function AdminMedia() {
  const [data, setData] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [updating, setUpdating] = useState<Set<number>>(new Set());
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/admin/media", { signal: controller.signal });
        const body = await response.json();
        if (controller.signal.aborted) return;
        if (response.status === 403) { setForbidden(true); return; }
        if (!response.ok) throw new Error(body.message || "Impossible de charger les médias.");
        setData(body.results);
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Le serveur est injoignable.");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [attempt]);

  async function changeStatus(media: Media, status: Availability) {
    setUpdating(previous => new Set(previous).add(media.id));
    setRowErrors(previous => ({ ...previous, [media.id]: "" })); setNotice("");
    try {
      const response = await fetch(`/api/admin/media/${media.id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "Impossible de modifier le statut.");
      setData(previous => previous.map(item => item.id === media.id ? { ...item, status: body.status } : item));
      setNotice(`« ${media.title} » : ${labels[body.status as Availability]}.`);
    } catch (err) {
      setRowErrors(previous => ({ ...previous, [media.id]: err instanceof Error ? err.message : "Le serveur est injoignable." }));
    } finally { setUpdating(previous => { const next = new Set(previous); next.delete(media.id); return next; }); }
  }

  if (forbidden) return <section className="space-y-4"><h1 className="text-3xl font-bold">Accès réservé</h1><p role="alert">Cette page est réservée aux administrateurs.</p><Link to="/" className="btn">Retour à ma liste</Link></section>;
  return <section className="space-y-6" aria-labelledby="admin-title">
    <div><p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">Administration</p><h1 id="admin-title" className="text-3xl font-bold">Médias des utilisateurs</h1><p className="mt-3 text-base-content/70">Tous les films et séries présents dans les listes, regroupés sans doublons. Le statut de disponibilité est commun à tous les utilisateurs.</p></div>
    <div className="rounded-box border border-base-300 bg-base-100 p-4 sm:p-6">
      {loading ? <p role="status">Chargement des médias…</p> : error ? <div role="alert"><p className="text-error">{error}</p><button className="btn btn-sm mt-3" onClick={() => { setLoading(true); setError(""); setAttempt(value => value + 1); }}>Réessayer</button></div>
        : <>
          <p role="status" className="mb-3 text-sm text-base-content/60">{data.length} média{data.length > 1 ? "s" : ""} unique{data.length > 1 ? "s" : ""}</p>
          <p role="status" className="mb-3 text-sm text-success">{notice}</p>
          {data.length === 0 ? <p className="py-10 text-center text-base-content/60">Aucun média dans les listes des utilisateurs pour le moment.</p> : <div className="overflow-x-auto"><table className="table w-full">
            <caption className="sr-only">Médias uniques de toutes les listes et disponibilité</caption>
            <thead><tr><th scope="col" className="w-16">Image</th><th scope="col">Nom</th><th scope="col">Année</th><th scope="col">Type</th><th scope="col">Utilisateurs</th><th scope="col">Disponibilité</th></tr></thead>
            <tbody>{data.map(media => <tr key={media.id}>
              <td><Poster media={media} /></td><td className="min-w-36 font-bold">{media.title}</td><td>{media.releaseDate?.slice(0, 4) || "Non renseignée"}</td>
              <td><span className={`badge badge-soft ${media.type === "movie" ? "badge-primary" : "badge-secondary"}`}>{media.type === "movie" ? "Film" : "Série"}</span></td>
              <td><p className="text-xs text-base-content/60">{media.users.length} liste{media.users.length > 1 ? "s" : ""}</p><ul className="mt-1 flex flex-wrap gap-1" aria-label={`Utilisateurs ayant ajouté ${media.title}`}>{[...media.users].sort((a, b) => a.username.localeCompare(b.username)).map(user => <li key={user.id} className="badge badge-outline badge-sm">{user.username}</li>)}</ul></td>
              <td><select className="select select-sm min-w-40" aria-label={`Disponibilité de ${media.title} (${media.type === "movie" ? "film" : "série"})`} value={media.status} disabled={updating.has(media.id)} onChange={event => void changeStatus(media, event.target.value as Availability)}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{updating.has(media.id) && <p role="status" className="mt-1 text-xs">Enregistrement…</p>}{rowErrors[media.id] && <p role="alert" className="mt-2 text-sm text-error">{rowErrors[media.id]}</p>}</td>
            </tr>)}</tbody>
          </table></div>}
        </>}
    </div>
  </section>;
}
