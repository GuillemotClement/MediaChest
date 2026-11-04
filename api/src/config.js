import "dotenv/config";

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Variable manquante : ${name}`);
  return value;
}

export const config = {
  databaseUrl: required("DATABASE_URL"),
  authSecret: required("BETTER_AUTH_SECRET"),
  authUrl: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  frontOrigin: process.env.FRONTEND_URL || "http://localhost:5173",
  port: Number(process.env.PORT || 3000),
};
if (config.authSecret.length < 32) {
  throw new Error("BETTER_AUTH_SECRET doit contenir au moins 32 caractères.");
}
