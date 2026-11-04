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
    const parsed = new URL(url);
    if (parsed.pathname.includes("/season/")) {
      return Response.json({ episodes: [{ episode_number: 1, name: "Pilote", air_date: "2023-01-01" }, { episode_number: 2, name: "La suite", air_date: "2023-01-08" }] });
    }
    if (parsed.pathname.endsWith("/multi")) {
      const results = parsed.searchParams.get("query") === "people-first" && parsed.searchParams.get("page") === "1"
        ? [{ id: 1, media_type: "person", name: "Personne exclue" }]
        : [{ id: 1, media_type: "person", name: "Personne exclue" }, ...Array.from({ length: 15 }, (_, i) => ({ id: 42 + Math.floor(i / 2), media_type: i % 2 ? "tv" : "movie", title: `Film ${i}`, name: `Série ${i}`, poster_path: "/test.jpg" }))];
      return Response.json({ page: Number(parsed.searchParams.get("page")), total_pages: 2, results });
    }
    const tv = String(url).includes("/tv");
    const media = { id: 42, title: "Film test", name: "Série test", overview: "Résumé", poster_path: "/test.jpg", release_date: "2024-01-01", first_air_date: "2023-01-01" };
    return Response.json(String(url).includes("/search/") ? { page: 1, total_pages: 2, total_results: 21, results: [media] } : {
      ...media, name: tv ? "Série test" : undefined,
      seasons: [{ season_number: 0, episode_count: 5, name: "Spéciaux" }, { season_number: 1, episode_count: 2, name: "Saison 1" }],
      runtime: 155, number_of_seasons: 3, number_of_episodes: 24, episode_run_time: [45],
      genres: [{ name: "Science-fiction" }], tagline: "Une aventure", vote_count: 10, vote_average: 8.2,
      created_by: [{ name: "Créatrice test" }],
      credits: { cast: [{ id: 3, name: "Acteur film", character: "Paul", order: 0, profile_path: "/actor.jpg" }], crew: [{ name: "Réalisateur test", job: "Director" }] },
      aggregate_credits: { cast: [{ id: 4, name: "Actrice série", roles: [{ character: "Jessica" }], order: 0 }] },
    });
  };
});
after(async () => {
  globalThis.fetch = originalFetch;
  if (server) await new Promise(resolve => server.close(resolve));
  if (pool) await pool.end();
  if (created) await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
  await admin.end();
});
async function request(path, cookie, body, method = body === undefined ? "GET" : "POST") {
  return originalFetch(base + path, { method, headers: { Origin: origin, ...(cookie ? { Cookie: cookie } : {}), ...(body === undefined ? {} : { "Content-Type": "application/json" }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
async function signup(username) {
  const response = await request("/api/auth/sign-up/email", null, { username, password: "test-password-123" });
  assert.equal(response.status, 200, await response.clone().text());
  return response.headers.getSetCookie().map(v => v.split(";")[0]).join("; ");
}

test("authenticated media search, validation, TMDB failures and private idempotent watchlist", async () => {
  assert.equal((await request("/api/media/search?type=movie&query=Dune")).status, 401);
  assert.equal((await request("/api/media/watchlist", null, { id: 42, type: "movie" })).status, 401);
  assert.equal((await request("/api/media/watchlist")).status, 401);
  const cookie = await signup("media_test");
  assert.deepEqual(await (await request("/api/media/watchlist", cookie)).json(), { results: [] });
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
  // Optional type uses mixed TMDB relevance order, excludes people, caps at ten,
  // and keeps movie/TV entries with the same numeric ID distinct.
  for (const suffix of ["", "&type="]) {
    const response = await request(`/api/media/search?query=Dune${suffix}`, cookie);
    assert.equal(response.status, 200);
    const mixed = (await response.json()).results;
    assert.equal(mixed.length, 10);
    assert.ok(mixed.every(item => ["movie", "tv"].includes(item.type)));
    assert.equal(mixed[0].title, "Film 0");
    assert.equal(mixed[0].added, true);
    assert.equal(mixed[1].title, "Série 1");
    assert.equal(mixed[1].added, false);
    assert.equal(mixed[0].id, mixed[1].id);
  }
  const callCount = calls.length;
  assert.equal((await (await request("/api/media/search?query=people-first", cookie)).json()).results.length, 10);
  assert.equal(calls.length - callCount, 2);
  assert.equal(calls.at(-1).searchParams.get("page"), "2");
  const movieId = stored.rows[0].id;
  const beforeDetailCalls = calls.length;
  assert.equal((await request(`/api/media/watchlist/${movieId}`)).status, 401);
  assert.equal((await request(`/api/media/watchlist/${movieId}`, otherCookie)).status, 404);
  assert.equal((await request("/api/media/watchlist/invalid", cookie)).status, 400);
  assert.equal((await request("/api/media/watchlist/2147483648", cookie)).status, 400);
  assert.equal(calls.length, beforeDetailCalls);
  const movieResponse = await request(`/api/media/watchlist/${movieId}`, cookie);
  assert.equal(movieResponse.status, 200);
  const movieDetail = await movieResponse.json();
  assert.equal(movieDetail.title, "Film test");
  assert.equal(movieDetail.overview, "Résumé");
  assert.equal(movieDetail.releaseDate, "2024-01-01");
  assert.equal(movieDetail.runtime, 155);
  assert.deepEqual(movieDetail.authors, ["Réalisateur test"]);
  assert.equal(movieDetail.cast[0].name, "Acteur film");
  assert.equal(movieDetail.cast[0].character, "Paul");
  assert.equal(movieDetail.seasons, null);
  assert.equal(movieDetail.watchStatus, "to_watch");
  assert.equal((await request(`/api/media/watchlist/${movieId}/status`, otherCookie, { status: "watched" }, "PATCH")).status, 404);
  assert.equal((await request(`/api/media/watchlist/${movieId}/status`, cookie, { status: "invalid" }, "PATCH")).status, 400);
  const filmSeen = await request(`/api/media/watchlist/${movieId}/status`, cookie, { status: "watched" }, "PATCH");
  assert.equal((await filmSeen.json()).watchStatus, "watched");
  assert.equal((await (await request(`/api/media/watchlist/${movieId}`, cookie)).json()).watchStatus, "watched");
  await request(`/api/media/watchlist/${movieId}/status`, cookie, { status: "to_watch" }, "PATCH");
  assert.equal(calls.at(-1).searchParams.get("append_to_response"), "credits");
  assert.equal((await request("/api/media/watchlist", cookie, { id: 42, type: "tv" })).status, 201);
  const seriesId = (await pool.query("SELECT id FROM watchlist WHERE type = 'tv'")).rows[0].id;
  const seriesDetail = await (await request(`/api/media/watchlist/${seriesId}`, cookie)).json();
  assert.equal(seriesDetail.type, "tv");
  assert.equal(seriesDetail.seasons, 3);
  assert.equal(seriesDetail.episodes, 24);
  assert.equal(seriesDetail.runtime, null);
  assert.deepEqual(seriesDetail.authors, ["Créatrice test"]);
  assert.equal(seriesDetail.cast[0].character, "Jessica");
  assert.equal(calls.at(-1).searchParams.get("append_to_response"), "aggregate_credits");
  assert.equal(seriesDetail.watchStatus, "to_watch");
  assert.equal(seriesDetail.episodesWatched, 0);
  assert.equal(seriesDetail.episodeTotal, 2);
  assert.equal(seriesDetail.seasonList.length, 1);
  const episodePath = `/api/media/watchlist/${seriesId}/seasons/1/episodes/`;
  assert.equal((await request(episodePath + 1, null, { watched: true }, "PUT")).status, 401);
  assert.equal((await request(episodePath + 1, otherCookie, { watched: true }, "PUT")).status, 404);
  assert.equal((await request(episodePath + 99, cookie, { watched: true }, "PUT")).status, 400);
  assert.equal((await request(episodePath + 1, cookie, { watched: "yes" }, "PUT")).status, 400);
  const season = await (await request(`/api/media/watchlist/${seriesId}/seasons/1`, cookie)).json();
  assert.equal(season.episodes.length, 2);
  assert.equal(season.episodes[0].watched, false);
  const mark = episode => request(episodePath + episode, cookie, { watched: true }, "PUT");
  const first = await (await mark(1)).json();
  assert.equal(first.episodesWatched, 1);
  assert.equal(first.watchStatus, "to_watch");
  assert.equal((await (await mark(1)).json()).episodesWatched, 1);
  await Promise.all([mark(1), mark(2)]);
  const completed = await (await request(`/api/media/watchlist/${seriesId}`, cookie)).json();
  assert.equal(completed.episodesWatched, 2);
  assert.equal(completed.watchStatus, "watched");
  const listedSeries = (await (await request("/api/media/watchlist", cookie)).json()).results.find(item => item.id === seriesId);
  assert.equal(listedSeries.episodesWatched, 2);
  assert.equal(listedSeries.episodeTotal, 2);
  assert.equal(listedSeries.status, "watched");
  const unchecked = await (await request(episodePath + 1, cookie, { watched: false }, "PUT")).json();
  assert.equal(unchecked.episodesWatched, 1);
  assert.equal(unchecked.watchStatus, "to_watch");
  const reset = await (await request(`/api/media/watchlist/${seriesId}/status`, cookie, { status: "to_watch" }, "PATCH")).json();
  assert.equal(reset.episodesWatched, 0);
  const allSeen = await (await request(`/api/media/watchlist/${seriesId}/status`, cookie, { status: "watched" }, "PATCH")).json();
  assert.equal(allSeen.episodesWatched, 2);
  assert.equal(allSeen.watchStatus, "watched");
  await request(`/api/media/watchlist/${seriesId}`, cookie, undefined, "DELETE");
  assert.equal((await pool.query("SELECT count(*)::int AS count FROM watched_episode")).rows[0].count, 0);
  upstreamStatus = 500;
  assert.equal((await request(`/api/media/watchlist/${movieId}`, cookie)).status, 502);
  upstreamStatus = 200;
  delete process.env.TMDB_READ_ACCESS_TOKEN;
  assert.equal((await request(`/api/media/watchlist/${movieId}`, cookie)).status, 503);
  // Listing reads stored metadata, works without TMDB, and never exposes another user's list.
  delete process.env.TMDB_READ_ACCESS_TOKEN;
  const listing = await request("/api/media/watchlist", cookie);
  assert.equal(listing.status, 200);
  const list = (await listing.json()).results;
  assert.equal(list.length, 1);
  assert.equal(list[0].title, "Film test");
  assert.equal(list[0].releaseDate, "2024-01-01");
  assert.equal(list[0].type, "movie");
  assert.equal(list[0].posterUrl, "https://image.tmdb.org/t/p/w342/test.jpg");
  assert.equal(list[0].userId, undefined);
  assert.deepEqual(await (await request("/api/media/watchlist", otherCookie)).json(), { results: [] });
  const remove = (id, sessionCookie) => request(`/api/media/watchlist/${id}`, sessionCookie, undefined, "DELETE");
  assert.equal((await remove(list[0].id)).status, 401);
  for (const id of ["invalid", "0", "-1", "2147483648", "1.5"]) {
    assert.equal((await remove(id, cookie)).status, 400);
  }
  assert.equal((await remove(list[0].id, otherCookie)).status, 404);
  assert.equal((await (await request("/api/media/watchlist", cookie)).json()).results.length, 1);
  assert.equal((await remove(list[0].id, cookie)).status, 204);
  assert.deepEqual(await (await request("/api/media/watchlist", cookie)).json(), { results: [] });
  assert.equal((await remove(list[0].id, cookie)).status, 404);
  process.env.TMDB_READ_ACCESS_TOKEN = "test-token";
  assert.equal((await (await request("/api/media/search?type=movie&query=Dune", cookie)).json()).results[0].added, false);
  assert.equal((await request("/api/media/watchlist", cookie, { id: 42, type: "movie" })).status, 201);
  upstreamStatus = 429;
  assert.equal((await request("/api/media/search?type=movie&query=Dune", cookie)).status, 429);
  upstreamStatus = 401;
  assert.equal((await request("/api/media/search?type=movie&query=Dune", cookie)).status, 502);
});
