import { relations, sql } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, index, integer, uniqueIndex, check } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  role: text("role").default("user").notNull(),
  displayUsername: text("display_username"),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
}, (table) => [check("user_role_check", sql`${table.role} IN ('user', 'admin')`)]);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const watchlist = pgTable("watchlist", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  tmdbId: integer("tmdb_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  overview: text("overview").notNull(),
  posterUrl: text("poster_url"),
  releaseDate: text("release_date"),
  status: text("status").default("to_watch").notNull(),
  episodeTotal: integer("episode_total"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [check("watchlist_status_check", sql`${table.status} IN ('to_watch', 'watched')`), uniqueIndex("watchlist_user_media_idx").on(table.userId, table.type, table.tmdbId), check("watchlist_type_check", sql`${table.type} IN ('movie', 'tv')`)]);

export const watchedEpisode = pgTable("watched_episode", {
  watchlistId: integer("watchlist_id").notNull().references(() => watchlist.id, { onDelete: "cascade" }),
  season: integer("season").notNull(),
  episode: integer("episode").notNull(),
}, (table) => [uniqueIndex("watched_episode_unique").on(table.watchlistId, table.season, table.episode), check("watched_episode_numbers_check", sql`${table.season} > 0 AND ${table.episode} > 0`)]);

export const mediaAvailability = pgTable("media_availability", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tmdbId: integer("tmdb_id").notNull(),
  type: text("type").notNull(),
  status: text("status").default("to_download").notNull(),
}, (table) => [
  uniqueIndex("media_availability_media_idx").on(table.type, table.tmdbId),
  check("media_availability_type_check", sql`${table.type} IN ('movie', 'tv')`),
  check("media_availability_status_check", sql`${table.status} IN ('to_download', 'downloaded', 'available')`),
]);
