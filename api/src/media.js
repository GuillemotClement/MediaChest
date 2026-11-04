import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "./db/index.js";
import { watchlist } from "./db/schema.js";

export const mediaRouter = Router();
const validType = (type) => type === "movie" || type === "tv";

export async function tmdb(path, params = {}) {
  if (!process.env.TMDB_READ_ACCESS_TOKEN) {
    throw Object.assign(new Error("Les informations TMDB sont indisponibles : le jeton n’est pas encore configuré."), { status: 503 });
  }
  const url = new URL(`https://api.themoviedb.org/3/${path}`);
  url.search = new URLSearchParams({ language: "fr-FR", ...params }).toString();
  let response;
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}` },
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw Object.assign(new Error("TMDB est injoignable. Réessayez dans un instant."), { status: 502 });
  }
  if (!response.ok) {
    throw Object.assign(new Error(response.status === 429 ? "Trop de recherches. Réessayez dans un instant." : "Impossible de récupérer les médias auprès de TMDB."), { status: response.status === 429 ? 429 : 502 });
  }
  return response.json();
}

export function normalizeMedia(media, type) {
  return {
    id: media.id,
    type,
    title: (type === "movie" ? media.title : media.name) || "Titre inconnu",
    originalTitle: type === "movie" ? media.original_title : media.original_name,
    releaseDate: (type === "movie" ? media.release_date : media.first_air_date) || null,
    overview: media.overview || "",
    posterUrl: media.poster_path ? `https://image.tmdb.org/t/p/w342${media.poster_path}` : null,
  };
}

mediaRouter.get("/search", async (req, res, next) => {
  const { type, query, page = "1" } = req.query;
  if ((type !== undefined && type !== "" && !validType(type)) || typeof query !== "string" || !query.trim() || query.trim().length > 200 || typeof page !== "string" || !/^[1-9]\d{0,2}$/.test(page) || Number(page) > 500) {
    return res.status(400).json({ message: "Indiquez un titre (200 caractères maximum) et, si souhaité, un type film ou série." });
  }
  try {
    const results = [];
    const seen = new Set();
    // Preserve TMDB's relevance order, excluding people from mixed searches.
    // Continue when people occupy most of the first page to fill the ten suggestions.
    for (let currentPage = Number(page); currentPage <= Math.min(Number(page) + 4, 500); currentPage++) {
      const data = await tmdb(`search/${type || "multi"}`, { query: query.trim(), page: String(currentPage), include_adult: "false" });
      for (const item of data.results) {
        const mediaType = type || item.media_type;
        const key = `${mediaType}:${item.id}`;
        if (!validType(mediaType) || seen.has(key)) continue;
        seen.add(key);
        results.push(normalizeMedia(item, mediaType));
        if (results.length === 10) break;
      }
      if (results.length === 10 || currentPage >= data.total_pages || type) break;
    }
    const saved = await db.select({ tmdbId: watchlist.tmdbId, type: watchlist.type }).from(watchlist)
      .where(eq(watchlist.userId, res.locals.session.user.id));
    const ids = new Set(saved.map((item) => `${item.type}:${item.tmdbId}`));
    res.json({ results: results.map((item) => ({ ...item, added: ids.has(`${item.type}:${item.id}`) })) });
  } catch (error) { next(error); }
});

mediaRouter.get("/watchlist", async (_req, res, next) => {
  try {
    const results = await db.select({
      id: watchlist.id,
      title: watchlist.title,
      releaseDate: watchlist.releaseDate,
      posterUrl: watchlist.posterUrl,
      type: watchlist.type,
    }).from(watchlist)
      .where(eq(watchlist.userId, res.locals.session.user.id))
      .orderBy(desc(watchlist.createdAt), desc(watchlist.id));
    res.json({ results });
  } catch (error) { next(error); }
});

mediaRouter.post("/watchlist", async (req, res, next) => {
  const { id, type } = req.body || {};
  if (!validType(type) || !Number.isSafeInteger(id) || id < 1) return res.status(400).json({ message: "Média invalide." });
  const userId = res.locals.session.user.id;
  try {
    const existing = await db.select().from(watchlist).where(and(eq(watchlist.userId, userId), eq(watchlist.type, type), eq(watchlist.tmdbId, id)));
    if (existing.length) return res.json({ added: true });
    // Fetch trusted metadata rather than accepting titles and images from the client.
    const item = normalizeMedia(await tmdb(`${type}/${id}`), type);
    await db.insert(watchlist).values({ userId, tmdbId: id, type, title: item.title, overview: item.overview, posterUrl: item.posterUrl, releaseDate: item.releaseDate }).onConflictDoNothing();
    res.status(201).json({ added: true });
  } catch (error) { next(error); }
});

mediaRouter.delete("/watchlist/:id", async (req, res, next) => {
  const id = Number(req.params.id);
  if (!/^[1-9]\d*$/.test(req.params.id) || !Number.isSafeInteger(id) || id > 2147483647) {
    return res.status(400).json({ message: "Média invalide." });
  }
  try {
    const removed = await db.delete(watchlist)
      .where(and(eq(watchlist.id, id), eq(watchlist.userId, res.locals.session.user.id)))
      .returning({ id: watchlist.id });
    if (!removed.length) return res.status(404).json({ message: "Ce média n’est plus dans votre liste." });
    res.status(204).end();
  } catch (error) { next(error); }
});

mediaRouter.get("/watchlist/:id", async (req, res, next) => {
  const id = Number(req.params.id);
  if (!/^[1-9]\d*$/.test(req.params.id) || !Number.isSafeInteger(id) || id > 2147483647) {
    return res.status(400).json({ message: "Média invalide." });
  }
  try {
    const [saved] = await db.select().from(watchlist)
      .where(and(eq(watchlist.id, id), eq(watchlist.userId, res.locals.session.user.id)));
    if (!saved) return res.status(404).json({ message: "Ce média n’est pas dans votre liste." });
    const isMovie = saved.type === "movie";
    const creditKey = isMovie ? "credits" : "aggregate_credits";
    const data = await tmdb(`${saved.type}/${saved.tmdbId}`, { append_to_response: creditKey });
    const credits = data[creditKey] || {};
    const cast = [...(credits.cast || [])].sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
    res.json({
      ...normalizeMedia(data, saved.type),
      savedId: saved.id,
      tagline: data.tagline || "",
      genres: (data.genres || []).map(item => item.name),
      runtime: isMovie ? data.runtime || null : null,
      seasons: isMovie ? null : data.number_of_seasons ?? null,
      episodes: isMovie ? null : data.number_of_episodes ?? null,
      episodeRuntime: isMovie ? null : data.episode_run_time?.[0] || null,
      lastAirDate: isMovie ? null : data.last_air_date || null,
      status: data.status || null,
      countries: (data.production_countries || []).map(item => item.name),
      languages: (data.spoken_languages || []).map(item => item.name || item.english_name),
      rating: data.vote_count > 0 ? data.vote_average : null,
      voteCount: data.vote_count || 0,
      authors: isMovie
        ? [...new Set((credits.crew || []).filter(item => item.job === "Director").map(item => item.name))]
        : (data.created_by || []).map(item => item.name),
      cast: cast.slice(0, 10).map(actor => ({
        id: actor.id,
        name: actor.name,
        character: actor.character || (actor.roles || []).map(role => role.character).filter(Boolean).join(" / "),
        profileUrl: actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : null,
      })),
    });
  } catch (error) { next(error); }
});
