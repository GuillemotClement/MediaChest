import "dotenv/config";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const databaseName = `mediachest_e2e_${randomUUID().replaceAll("-", "")}`;
const admin = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await admin.query(`CREATE DATABASE "${databaseName}"`);
const databaseUrl = new URL(process.env.DATABASE_URL);
databaseUrl.pathname = `/${databaseName}`;
process.env.DATABASE_URL = databaseUrl.toString();
let pool;
let server;
let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  if (server) await new Promise((resolve) => server.close(resolve));
  if (pool) await pool.end();
  await admin.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`);
  await admin.end();
}
try {
  const database = await import("../src/db/index.js");
  pool = database.pool;
  await migrate(database.db, { migrationsFolder: "./drizzle" });
  const { app } = await import("../src/app.js");
  server = app.listen(Number(process.env.PORT || 3001), "127.0.0.1");
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => void shutdown().then(() => process.exit(0)));
  }
} catch (error) {
  await shutdown();
  throw error;
}
