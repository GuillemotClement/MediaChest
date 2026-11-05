import { Router } from "express";
import { and, eq, sql } from "drizzle-orm";
import { db } from "./db/index.js";
import { mediaAvailability, user, watchlist } from "./db/schema.js";

export const adminRouter = Router();
// Check the current database role for every request, including updates.
adminRouter.use(async (_req, res, next) => {
  try {
    const [administrator] = await db.select({ role: user.role }).from(user).where(eq(user.id, res.locals.session.user.id));
    if (administrator?.role !== "admin") return res.status(403).json({ message: "Cette page est réservée aux administrateurs." });
    next();
  } catch (error) { next(error); }
});

adminRouter.get("/media", async (_req, res, next) => {
  try {
    const results = await db.select({
      id: mediaAvailability.id,
      tmdbId: mediaAvailability.tmdbId,
      type: mediaAvailability.type,
      status: mediaAvailability.status,
      title: sql`max(${watchlist.title})`,
      releaseDate: sql`max(${watchlist.releaseDate})`,
      posterUrl: sql`max(${watchlist.posterUrl})`,
      users: sql`jsonb_agg(distinct jsonb_build_object('id', ${user.id}, 'username', ${user.username}))`,
    }).from(watchlist)
      .innerJoin(user, eq(watchlist.userId, user.id))
      .innerJoin(mediaAvailability, and(eq(mediaAvailability.type, watchlist.type), eq(mediaAvailability.tmdbId, watchlist.tmdbId)))
      .groupBy(mediaAvailability.id)
      .orderBy(sql`max(${watchlist.createdAt}) desc`, mediaAvailability.id);
    res.json({ results });
  } catch (error) { next(error); }
});

adminRouter.patch("/media/:id/status", async (req, res, next) => {
  const id = Number(req.params.id);
  const status = req.body?.status;
  if (!/^[1-9]\d*$/.test(req.params.id) || !Number.isSafeInteger(id) || id > 2147483647 || !["to_download", "downloaded", "available"].includes(status)) {
    return res.status(400).json({ message: "Média ou statut invalide." });
  }
  try {
    const [updated] = await db.update(mediaAvailability).set({ status }).where(eq(mediaAvailability.id, id)).returning({ id: mediaAvailability.id, status: mediaAvailability.status });
    if (!updated) return res.status(404).json({ message: "Média introuvable." });
    res.json(updated);
  } catch (error) { next(error); }
});
