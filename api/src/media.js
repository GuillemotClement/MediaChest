import { Router } from "express";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { db } from "./db/index.js";
import { watchlist, watchedEpisode } from "./db/schema.js";

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
      status: watchlist.status,
      episodeTotal: watchlist.episodeTotal,
      episodesWatched: sql`(select count(*)::int from watched_episode where watchlist_id = ${watchlist.id})`.mapWith(Number),
    }).from(watchlist)
      .where(eq(watchlist.userId, res.locals.session.user.id))
      .orderBy(desc(watchlist.createdAt), desc(watchlist.id));
    // Populate episode counts for series added before progress tracking existed.
    await Promise.all(results.filter(item => item.type === "tv" && item.episodeTotal === null).map(async item => {
      try {
        const saved = await ownedEntry(item.id, res.locals.session.user.id);
        const details = await tmdb(`tv/${saved.tmdbId}`);
        const progress = await db.transaction(async tx => {
          await lockEntry(tx, saved.id, res.locals.session.user.id);
          await tx.update(watchlist).set({ episodeTotal: seriesTotal(details) }).where(eq(watchlist.id, saved.id));
          return syncProgress(tx, saved.id);
        });
        item.episodeTotal = progress.episodeTotal;
        item.episodesWatched = progress.episodesWatched;
        item.status = progress.watchStatus;
      } catch { /* Keep the saved list available when TMDB is unavailable. */ }
    }));
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
    const details = await tmdb(`${type}/${id}`);
    const item = normalizeMedia(details, type);
    await db.insert(watchlist).values({ userId, tmdbId: id, type, title: item.title, overview: item.overview, posterUrl: item.posterUrl, releaseDate: item.releaseDate, episodeTotal: type === "tv" ? seriesTotal(details) : null }).onConflictDoNothing();
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
    const progress = saved.type === "tv"
      ? await db.transaction(async tx => {
          await lockEntry(tx, saved.id, res.locals.session.user.id);
          await tx.update(watchlist).set({ episodeTotal: seriesTotal(data) }).where(eq(watchlist.id, saved.id));
          return syncProgress(tx, saved.id);
        })
      : { watchStatus: saved.status, episodeTotal: null, episodesWatched: 0 };
    const credits = data[creditKey] || {};
    const cast = [...(credits.cast || [])].sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
    res.json({
      ...normalizeMedia(data, saved.type),
      savedId: saved.id,
      ...progress,
      seasonList: saved.type === "tv" ? regularSeasons(data).map(season => ({ number: season.season_number, name: season.name, episodeCount: season.episode_count })) : [],
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

function regularSeasons(data) {
  return (data.seasons || []).filter(season => season.season_number > 0);
}
function seriesTotal(data) {
  const seasons = regularSeasons(data);
  return seasons.length ? seasons.reduce((total, season) => total + (season.episode_count || 0), 0) : data.number_of_episodes ?? null;
}
function validNumber(value) {
  return /^[1-9]\d*$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) <= 2147483647;
}
async function ownedEntry(id, userId) {
  if (!validNumber(id)) throw Object.assign(new Error("Média invalide."), { status: 400 });
  const [saved] = await db.select().from(watchlist).where(and(eq(watchlist.id, Number(id)), eq(watchlist.userId, userId)));
  if (!saved) throw Object.assign(new Error("Ce média n’est pas dans votre liste."), { status: 404 });
  return saved;
}
async function lockEntry(tx, id, userId) {
  const [saved] = await tx.select().from(watchlist).where(and(eq(watchlist.id, id), eq(watchlist.userId, userId))).for("update");
  if (!saved) throw Object.assign(new Error("Ce média n’est plus dans votre liste."), { status: 404 });
  return saved;
}
async function syncProgress(tx, id) {
  const [saved] = await tx.select().from(watchlist).where(eq(watchlist.id, id));
  const [result] = await tx.select({ total: count() }).from(watchedEpisode).where(eq(watchedEpisode.watchlistId, id));
  const status = saved.episodeTotal > 0 && result.total >= saved.episodeTotal ? "watched" : "to_watch";
  await tx.update(watchlist).set({ status }).where(eq(watchlist.id, id));
  return { watchStatus: status, episodeTotal: saved.episodeTotal, episodesWatched: result.total };
}

mediaRouter.get("/watchlist/:id/seasons/:season", async (req, res, next) => {
  try {
    const saved = await ownedEntry(req.params.id, res.locals.session.user.id);
    if (saved.type !== "tv" || !validNumber(req.params.season)) return res.status(400).json({ message: "Saison invalide." });
    const data = await tmdb(`tv/${saved.tmdbId}/season/${Number(req.params.season)}`);
    const watched = await db.select().from(watchedEpisode).where(and(eq(watchedEpisode.watchlistId, saved.id), eq(watchedEpisode.season, Number(req.params.season))));
    const ids = new Set(watched.map(item => item.episode));
    res.json({ episodes: (data.episodes || []).map(item => ({ number: item.episode_number, name: item.name, airDate: item.air_date, watched: ids.has(item.episode_number) })) });
  } catch (error) { next(error); }
});

mediaRouter.put("/watchlist/:id/seasons/:season/episodes/:episode", async (req, res, next) => {
  try {
    const userId = res.locals.session.user.id;
    const saved = await ownedEntry(req.params.id, userId);
    const season = Number(req.params.season), episode = Number(req.params.episode);
    if (saved.type !== "tv" || !validNumber(req.params.season) || !validNumber(req.params.episode) || typeof req.body?.watched !== "boolean") {
      return res.status(400).json({ message: "Épisode ou état invalide." });
    }
    // Validate against TMDB before adding progress; unchecking works without TMDB.
    if (req.body.watched) {
      const data = await tmdb(`tv/${saved.tmdbId}/season/${season}`);
      if (!(data.episodes || []).some(item => item.episode_number === episode)) return res.status(400).json({ message: "Cet épisode n’existe pas." });
    }
    const result = await db.transaction(async tx => {
      await lockEntry(tx, saved.id, userId);
      if (req.body.watched) await tx.insert(watchedEpisode).values({ watchlistId: saved.id, season, episode }).onConflictDoNothing();
      else await tx.delete(watchedEpisode).where(and(eq(watchedEpisode.watchlistId, saved.id), eq(watchedEpisode.season, season), eq(watchedEpisode.episode, episode)));
      return syncProgress(tx, saved.id);
    });
    res.json(result);
  } catch (error) { next(error); }
});

mediaRouter.patch("/watchlist/:id/status", async (req, res, next) => {
  try {
    const userId = res.locals.session.user.id;
    const saved = await ownedEntry(req.params.id, userId);
    const status = req.body?.status;
    if (!["to_watch", "watched"].includes(status)) return res.status(400).json({ message: "Statut invalide." });
    let episodes = [], total = saved.episodeTotal;
    if (saved.type === "tv" && status === "watched") {
      const details = await tmdb(`tv/${saved.tmdbId}`);
      const seasons = regularSeasons(details);
      if (!seasons.length) return res.status(400).json({ message: "Aucun épisode disponible pour cette série." });
      // Fetch in small batches rather than flooding TMDB for long-running series.
      for (let i = 0; i < seasons.length; i += 4) {
        const batch = await Promise.all(seasons.slice(i, i + 4).map(async season => {
          const data = await tmdb(`tv/${saved.tmdbId}/season/${season.season_number}`);
          return (data.episodes || []).map(item => ({ watchlistId: saved.id, season: season.season_number, episode: item.episode_number }));
        }));
        episodes.push(...batch.flat());
      }
      total = seriesTotal(details);
    }
    const result = await db.transaction(async tx => {
      await lockEntry(tx, saved.id, userId);
      if (saved.type === "movie") {
        await tx.update(watchlist).set({ status }).where(eq(watchlist.id, saved.id));
        return { watchStatus: status, episodeTotal: null, episodesWatched: 0 };
      }
      await tx.delete(watchedEpisode).where(eq(watchedEpisode.watchlistId, saved.id));
      for (let i = 0; i < episodes.length; i += 500) await tx.insert(watchedEpisode).values(episodes.slice(i, i + 500)).onConflictDoNothing();
      await tx.update(watchlist).set({ episodeTotal: total }).where(eq(watchlist.id, saved.id));
      return syncProgress(tx, saved.id);
    });
    res.json(result);
  } catch (error) { next(error); }
});
