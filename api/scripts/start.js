import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

// Keep sessions valid across container recreations without requiring manual setup.
if (!process.env.BETTER_AUTH_SECRET) {
  const secretPath = "/app/data/auth-secret";
  try {
    await writeFile(secretPath, randomBytes(48).toString("hex"), { flag: "wx", mode: 0o600 });
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
  process.env.BETTER_AUTH_SECRET = (await readFile(secretPath, "utf8")).trim();
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  console.log("Application des migrations PostgreSQL…");
  await migrate(drizzle(pool), { migrationsFolder: "/app/drizzle" });
  console.log("Migrations terminées.");
} finally {
  await pool.end();
}

await import("../src/server.js");
