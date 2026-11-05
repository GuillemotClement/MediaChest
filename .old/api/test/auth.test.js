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

test("username-only authentication lifecycle and access control", async () => {
  assert.equal((await request("/api/me")).status, 401);
  const invalid = await request("/api/auth/sign-up/email", { username: "a!", password: "long-password-123" });
  assert.equal(invalid.status, 400);
  const weak = await request("/api/auth/sign-up/email", { username: "weak_user", password: "short" });
  assert.equal(weak.status, 400);
  const username = "Media_Tester";
  const password = "correct-test-password-123";
  const signup = await request("/api/auth/sign-up/email", { username, password, role: "admin" });
  assert.equal(signup.status, 200, await signup.clone().text());
  const signupData = await signup.json();
  assert.equal(signupData.user.username, username.toLowerCase());
  assert.match(signupData.user.email, /@users\.invalid$/);
  assert.equal(signupData.user.role, "user");
  let cookie = cookies(signup);
  assert.ok(cookie.includes("session_token="));
  assert.equal((await request("/api/me", undefined, cookie)).status, 200);
  const duplicate = await request("/api/auth/sign-up/email", { username: username.toUpperCase(), password });
  assert.equal(duplicate.status, 400);
  const wrong = await request("/api/auth/sign-in/username", { username, password: "wrong-password" });
  assert.equal(wrong.status, 401);
  const forbidden = await request("/api/auth/sign-out", {}, cookie, "https://untrusted.example");
  assert.equal(forbidden.status, 403);
  const logout = await request("/api/auth/sign-out", {}, cookie);
  assert.equal(logout.status, 200);
  assert.equal((await request("/api/me", undefined, cookie)).status, 401);
  const signin = await request("/api/auth/sign-in/username", { username: username.toUpperCase(), password });
  assert.equal(signin.status, 200, await signin.clone().text());
  cookie = cookies(signin);
  const session = await request("/api/me", undefined, cookie);
  assert.equal(session.status, 200);
  const sessionData = await session.json();
  assert.equal(sessionData.user.username, username.toLowerCase());
  assert.equal(sessionData.user.role, "user");
  assert.equal((await request("/api/media/watchlist", undefined, cookie)).status, 200);
  const stored = await pool.query('SELECT password FROM account WHERE user_id = $1', [signupData.user.id]);
  assert.notEqual(stored.rows[0].password, password);
  assert.ok(stored.rows[0].password.length > 40);
  // Four signup requests above, then the fifth is allowed and the sixth is limited.
  assert.equal((await request("/api/auth/sign-up/email", { username: "!", password })).status, 400);
  assert.equal((await request("/api/auth/sign-up/email", { username: "!", password })).status, 429);
});

test("administrator bootstrap is atomic, idempotent and upgrades legacy gizmo without losing media", async () => {
  const { ensureAdministrator } = await import("../src/bootstrap-admin.js");
  const { hashPassword, verifyPassword } = await import("better-auth/crypto");
  const initialized = await Promise.all([ensureAdministrator(), ensureAdministrator()]);
  assert.equal(initialized.filter(result => result.created).length, 1);
  const stored = await pool.query('SELECT * FROM "user" WHERE username = $1', ["gizmo"]);
  assert.equal(stored.rowCount, 1);
  assert.equal(stored.rows[0].email, "guillemot.clement35@gmail.com");
  assert.equal(stored.rows[0].role, "admin");
  const login = await request("/api/auth/sign-in/username", { username: "gizmo", password: "password" });
  assert.equal(login.status, 200, await login.clone().text());
  const adminCookie = cookies(login);
  const me = await (await request("/api/me", undefined, adminCookie)).json();
  assert.equal(me.user.role, "admin");
  assert.equal((await request("/api/media/watchlist", undefined, adminCookie)).status, 200);
  const changedHash = await hashPassword("a-new-test-password-123");
  await pool.query("UPDATE account SET password = $1 WHERE user_id = $2", [changedHash, me.user.id]);
  assert.equal((await ensureAdministrator()).created, false);
  assert.equal((await pool.query("SELECT password FROM account WHERE user_id = $1", [me.user.id])).rows[0].password, changedHash);
  // Simulate the existing local gizmo account from before roles were introduced.
  await pool.query('UPDATE "user" SET role = $1, email = $2 WHERE id = $3', ["user", "legacy@users.invalid", me.user.id]);
  await pool.query("INSERT INTO watchlist (user_id, tmdb_id, type, title, overview) VALUES ($1, 42, 'movie', 'Preserved film', '')", [me.user.id]);
  assert.equal((await ensureAdministrator()).id, me.user.id);
  assert.equal((await pool.query("SELECT count(*)::int AS count FROM watchlist WHERE user_id = $1", [me.user.id])).rows[0].count, 1);
  assert.equal((await request("/api/me", undefined, adminCookie)).status, 401);
  const credential = (await pool.query("SELECT password FROM account WHERE user_id = $1", [me.user.id])).rows[0].password;
  assert.notEqual(credential, "password");
  assert.ok(await verifyPassword({ hash: credential, password: "password" }));
});

test("production bootstrap uses configured password and refuses weak initial credentials", async () => {
  const { ensureAdministrator } = await import("../src/bootstrap-admin.js");
  const previousMode = process.env.NODE_ENV;
  const previousPassword = process.env.ADMIN_INITIAL_PASSWORD;
  try {
    await pool.query('DELETE FROM "user" WHERE username = $1', ["gizmo"]);
    process.env.NODE_ENV = "production";
    delete process.env.ADMIN_INITIAL_PASSWORD;
    await assert.rejects(ensureAdministrator(), /ADMIN_INITIAL_PASSWORD/);
    process.env.ADMIN_INITIAL_PASSWORD = "password";
    await assert.rejects(ensureAdministrator(), /ADMIN_INITIAL_PASSWORD/);
    assert.equal((await pool.query('SELECT count(*)::int AS count FROM "user" WHERE username = $1', ["gizmo"])).rows[0].count, 0);
    process.env.ADMIN_INITIAL_PASSWORD = "production-test-password-123";
    await ensureAdministrator();
    const login = await request("/api/auth/sign-in/username", { username: "gizmo", password: process.env.ADMIN_INITIAL_PASSWORD });
    assert.equal(login.status, 200);
    assert.equal((await login.json()).user.role, "admin");
    process.env.ADMIN_INITIAL_PASSWORD = "another-initial-password-123";
    assert.equal((await ensureAdministrator()).created, false);
    assert.equal((await request("/api/auth/sign-in/username", { username: "gizmo", password: "production-test-password-123" })).status, 200);
  } finally {
    if (previousMode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousMode;
    if (previousPassword === undefined) delete process.env.ADMIN_INITIAL_PASSWORD; else process.env.ADMIN_INITIAL_PASSWORD = previousPassword;
  }
});
