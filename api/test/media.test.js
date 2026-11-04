import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { after, before, test } from "node:test";
import pg from "pg";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const name = `mediachest_media_test_${randomUUID().replaceAll("-", "")}`;
const admin = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const originalFetch = globalThis.fetch;
let server, pool, base, created = false;
const origin = process.env.FRONTEND_URL || "http://localhost:5173";
const calls = [];
let upstreamStatus = 200;

before(async () => {
  await admin.query(`CREATE DATABASE "${name}"`); created = true;
  const url = new URL(process.env.DATABASE_URL); url.pathname = `/${name}`;
  process.env.DATABASE_URL = url.toString();
  const database = await import("../src/db/index.js"); pool = database.pool;
  await migrate(database.db, { migrationsFolder: "./drizzle" });
  const { app } = await import("../src/app.js");
  server = app.listen(0, "127.0.0.1"); await once(server, "listening");
  base = `http://127.0.0.1:${server.address().port}`;
  globalThis.fetch = async (url, options) => {
    if (!String(url).startsWith("https://api.themoviedb.org/3/")) return originalFetch(url, options);
    calls.push(new URL(url));
    assert.equal(options.headers.Authorization, "Bearer test-token");
    if (upstreamStatus !== 200) return new Response("{}", { status: upstreamStatus });
    const tv = String(url).includes("/tv");
    const media = { id: 42, title: "Film test", name: "Série test", overview: "Résumé", poster_path: "/test.jpg", release_date: "2024-01-01", first_air_date: "2023-01-01" };
    return Response.json(String(url).includes("/search/") ? { page: 1, total_pages: 2, total_results: 21, results: [media] } : { ...media, name: tv ? "Série test" : undefined });
  };
});
after(async () => {
  globalThis.fetch = originalFetch;
  if (server) await new Promise(resolve => server.close(resolve));
  if (pool) await pool.end();
  if (created) await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
  await admin.end();
});
async function request(path, cookie, body) {
  return originalFetch(base + path, { method: body === undefined ? "GET" : "POST", headers: { Origin: origin, ...(cookie ? { Cookie: cookie } : {}), ...(body === undefined ? {} : { "Content-Type": "application/json" }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
async function signup(username) {
  const response = await request("/api/auth/sign-up/email", null, { username, password: "test-password-123" });
  assert.equal(response.status, 200, await response.clone().text());
  return response.headers.getSetCookie().map(v => v.split(";")[0]).join("; ");
}

test("authenticated media search, validation, TMDB failures and private idempotent watchlist", async () => {
  assert.equal((await request("/api/media/search?type=movie&query=Dune")).status, 401);
  assert.equal((await request("/api/media/watchlist", null, { id: 42, type: "movie" })).status, 401);
  const cookie = await signup("media_test");
  for (const query of ["type=person&query=Dune", "type=movie&query=%20", "type=tv&query=Dune&page=501", "type=movie&query[]=Dune"]) {
    assert.equal((await request(`/api/media/search?${query}`, cookie)).status, 400);
  }
  delete process.env.TMDB_READ_ACCESS_TOKEN;
  assert.equal((await request("/api/media/search?type=movie&query=Dune", cookie)).status, 503);
  process.env.TMDB_READ_ACCESS_TOKEN = "test-token";
  for (const type of ["movie", "tv"]) {
    const response = await request(`/api/media/search?type=${type}&query=Dune&page=2`, cookie);
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.results[0].title, type === "movie" ? "Film test" : "Série test");
    assert.equal(result.results[0].added, false);
    assert.equal(calls.at(-1).pathname, `/3/search/${type}`);
    assert.equal(calls.at(-1).searchParams.get("query"), "Dune");
    assert.equal(calls.at(-1).searchParams.get("language"), "fr-FR");
    assert.equal(calls.at(-1).searchParams.get("page"), "2");
  }
  assert.equal((await request("/api/media/watchlist", cookie, { id: "42", type: "movie" })).status, 400);
  for (let i = 0; i < 2; i++) {
    const response = await request("/api/media/watchlist", cookie, { id: 42, type: "movie", title: "Forged title" });
    assert.equal(response.status, i === 0 ? 201 : 200);
  }
  const stored = await pool.query('SELECT * FROM watchlist');
  assert.equal(stored.rowCount, 1);
  assert.equal(stored.rows[0].title, "Film test");
  assert.equal((await (await request("/api/media/search?type=movie&query=Dune", cookie)).json()).results[0].added, true);
  const otherCookie = await signup("other_media_test");
  assert.equal((await (await request("/api/media/search?type=movie&query=Dune", otherCookie)).json()).results[0].added, false);
  assert.equal((await (await request("/api/media/search?type=tv&query=Dune", cookie)).json()).results[0].added, false);
  upstreamStatus = 429;
  assert.equal((await request("/api/media/search?type=movie&query=Dune", cookie)).status, 429);
  upstreamStatus = 401;
  assert.equal((await request("/api/media/search?type=movie&query=Dune", cookie)).status, 502);
});
