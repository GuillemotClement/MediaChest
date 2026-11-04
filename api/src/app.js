import express from "express";
import cors from "cors";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import { auth } from "./auth.js";
import { config } from "./config.js";

export const app = express();
app.disable("x-powered-by");
app.use(cors({ origin: config.frontOrigin, credentials: true }));
// Overwrite this header from the socket so clients cannot spoof the rate-limit IP.
app.use((req, _res, next) => {
  req.headers["x-mediachest-client-ip"] = req.socket.remoteAddress;
  next();
});
app.all("/api/auth/*splat", toNodeHandler(auth));
app.use(express.json({ limit: "16kb" }));
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

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
app.get("/api/me", (_req, res) => res.json(res.locals.session));
app.use((_req, res) => res.status(404).json({ message: "Route introuvable." }));
app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: "Une erreur serveur est survenue." });
});
