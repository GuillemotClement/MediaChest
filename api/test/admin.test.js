import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { after, before, test } from "node:test";
import pg from "pg";
import { migrate } from "drizzle-orm/node-postgres/migrator";

// Run the real HTTP/auth/Drizzle stack in a disposable database, never the app database.
const databaseName = `mediachest_test_${randomUUID().replaceAll("-", "")}`;
const admin = new pg.Pool({ connectionString: process.env.DATABASE_URL });
let server;
let pool;
let base;
let created = false;
const origin = process.env.FRONTEND_URL || "http://localhost:5173";

before(async () => {
  await admin.query(`CREATE DATABASE "${databaseName}"`);
  created = true;
  const url = new URL(process.env.DATABASE_URL);
  url.pathname = `/${databaseName}`;
  process.env.DATABASE_URL = url.toString();
  const database = await import("../src/db/index.js");
  pool = database.pool;
  await migrate(database.db, { migrationsFolder: "./drizzle" });
  const { app } = await import("../src/app.js");
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (pool) await pool.end();
  if (created) await admin.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`);
  await admin.end();
});

async function request(path, body, cookie, requestOrigin = origin) {
  return fetch(`${base}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Origin: requestOrigin,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
function cookies(response) {
  return response.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
}

test("admin-only global listing deduplicates media and persists shared availability", async () => {
  const patch = (id, status, cookie) => fetch(`${base}/api/admin/media/${id}/status`, {
    method: "PATCH", headers: { Origin: origin, "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify({ status }),
  });
  assert.equal((await request("/api/admin/media")).status, 401);
  assert.equal((await patch(1, "available")).status, 401);
  const signup = await request("/api/auth/sign-up/email", { username: "global_user", password: "regular-test-password" });
  assert.equal(signup.status, 200);
  const normalCookie = cookies(signup);
  const user1 = (await signup.json()).user;
  const signup2 = await request("/api/auth/sign-up/email", { username: "global_other", password: "regular-test-password" });
  const user2 = (await signup2.json()).user;
  assert.equal((await request("/api/admin/media", undefined, normalCookie)).status, 403);
  assert.equal((await patch(1, "available", normalCookie)).status, 403);
  const { ensureAdministrator } = await import("../src/bootstrap-admin.js");
  await ensureAdministrator();
  const login = await request("/api/auth/sign-in/username", { username: "gizmo", password: "password" });
  assert.equal(login.status, 200);
  const adminCookie = cookies(login);
  assert.deepEqual(await (await request("/api/admin/media", undefined, adminCookie)).json(), { results: [] });
  await pool.query(`INSERT INTO watchlist (user_id, tmdb_id, type, title, overview) VALUES
    ($1, 42, 'movie', 'Shared film', ''), ($2, 42, 'movie', 'Shared film', ''), ($2, 42, 'tv', 'Separate series', '')`, [user1.id, user2.id]);
  const listing = await request("/api/admin/media", undefined, adminCookie);
  assert.equal(listing.status, 200, await listing.clone().text());
  const media = (await listing.json()).results;
  assert.equal(media.length, 2);
  const film = media.find(item => item.type === "movie");
  const series = media.find(item => item.type === "tv");
  assert.notEqual(film.id, series.id);
  assert.equal(film.status, "to_download");
  assert.equal(series.status, "to_download");
  assert.deepEqual(film.users.map(user => user.username).sort(), ["global_other", "global_user"]);
  assert.equal(film.users[0].email, undefined);
  assert.equal(series.users.length, 1);
  const personalList = async cookie => (await (await request("/api/media/watchlist", undefined, cookie)).json()).results;
  assert.equal((await personalList(normalCookie))[0].availability, "unavailable");
  const otherLogin = await request("/api/auth/sign-in/username", { username: "global_other", password: "regular-test-password" });
  const otherCookie = cookies(otherLogin);
  for (const status of ["downloaded", "available", "to_download", "available"]) {
    const changed = await patch(film.id, status, adminCookie);
    assert.equal(changed.status, 200);
    assert.equal((await changed.json()).status, status);
    const expected = status === "available" ? "available" : "unavailable";
    assert.equal((await personalList(normalCookie))[0].availability, expected);
    const otherList = await personalList(otherCookie);
    assert.equal(otherList.find(item => item.type === "movie").availability, expected);
    // The same numeric TMDB ID for a series must remain independent.
    assert.equal(otherList.find(item => item.type === "tv").availability, "unavailable");
  }
  assert.equal((await patch(film.id, "watched", adminCookie)).status, 400);
  assert.equal((await patch("bad", "available", adminCookie)).status, 400);
  assert.equal((await patch(2147483647, "available", adminCookie)).status, 404);
  assert.equal((await patch(film.id, "to_download", normalCookie)).status, 403);
  // Global status changes never change anyone's personal viewing status.
  const personal = (await (await request("/api/media/watchlist", undefined, normalCookie)).json()).results;
  assert.equal(personal.length, 1);
  assert.equal(personal[0].status, "to_watch");
  assert.equal(personal[0].availability, "available");
  const updated = (await (await request("/api/admin/media", undefined, adminCookie)).json()).results;
  assert.equal(updated.find(item => item.id === film.id).status, "available");
  assert.equal(updated.find(item => item.id === series.id).status, "to_download");
  await pool.query("DELETE FROM watchlist");
  assert.deepEqual(await (await request("/api/admin/media", undefined, adminCookie)).json(), { results: [] });
  await pool.query("INSERT INTO watchlist (user_id, tmdb_id, type, title, overview) VALUES ($1, 42, 'movie', 'Shared film', '')", [user1.id]);
  assert.equal((await (await request("/api/admin/media", undefined, adminCookie)).json()).results[0].status, "available");
  // An existing session cannot retain administration rights after demotion.
  await pool.query('UPDATE "user" SET role = $1 WHERE username = $2', ["user", "gizmo"]);
  assert.equal((await request("/api/admin/media", undefined, adminCookie)).status, 403);
  assert.equal((await patch(film.id, "to_download", adminCookie)).status, 403);
});
