import { adminRouter } from "./admin.js";
import { mediaRouter } from "./media.js";
import express from "express";
import cors from "cors";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import { auth } from "./auth.js";
import { pool } from "./db/index.js";
import { config } from "./config.js";

export const app = express();
app.disable("x-powered-by");
if (config.trustProxy) app.set("trust proxy", 1);
app.use(cors({ origin: config.frontOrigin, credentials: true }));
// Overwrite this header from the socket so clients cannot spoof the rate-limit IP.
app.use((req, _res, next) => {
  req.headers["x-mediachest-client-ip"] = config.trustProxy ? req.ip : req.socket.remoteAddress;
  next();
});
app.all("/api/auth/*splat", toNodeHandler(auth));
app.use(express.json({ limit: "16kb" }));
app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("select 1");
    res.json({ status: "ok" });
  } catch {
    res.status(503).json({ status: "unavailable" });
  }
});

// Every application endpoint mounted below this middleware requires a live session.
app.use("/api", async (req, res, next) => {
  try {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!session) return res.status(401).json({ message: "Authentification requise." });
    res.locals.session = session;
    next();
  } catch (error) {
    next(error);
  }
});
app.use("/api/media", mediaRouter);
app.use("/api/admin", adminRouter);
app.get("/api/me", (_req, res) => res.json(res.locals.session));
app.use((_req, res) => res.status(404).json({ message: "Route introuvable." }));
app.use((error, _req, res, _next) => {
  if ([400, 404, 429, 502, 503].includes(error.status)) return res.status(error.status).json({ message: error.message });
  console.error(error);
  res.status(500).json({ message: "Une erreur serveur est survenue." });
});
