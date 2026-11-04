import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "./db/index.js";
import { watchlist } from "./db/schema.js";

export const mediaRouter = Router();
const validType = (type) => type === "movie" || type === "tv";

export async function tmdb(path, params = {}) {
  if (!process.env.TMDB_READ_ACCESS_TOKEN) {
    throw Object.assign(new Error("La recherche est indisponible : le jeton TMDB n’est pas encore configuré."), { status: 503 });
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
  if (!validType(type) || typeof query !== "string" || !query.trim() || query.trim().length > 200 || typeof page !== "string" || !/^[1-9]\d{0,2}$/.test(page) || Number(page) > 500) {
    return res.status(400).json({ message: "Indiquez un titre (200 caractères maximum), un type film ou série et une page valide." });
  }
  try {
    const data = await tmdb(`search/${type}`, { query: query.trim(), page, include_adult: "false" });
    const saved = await db.select({ tmdbId: watchlist.tmdbId }).from(watchlist).where(and(eq(watchlist.userId, res.locals.session.user.id), eq(watchlist.type, type)));
    const ids = new Set(saved.map((item) => item.tmdbId));
    res.json({ page: data.page, totalPages: Math.min(data.total_pages, 500), totalResults: data.total_results, results: data.results.map((item) => ({ ...normalizeMedia(item, type), added: ids.has(item.id) })) });
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
