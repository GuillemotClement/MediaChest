ALTER TABLE "watchlist" ADD COLUMN "status" text DEFAULT 'to_watch' NOT NULL;
ALTER TABLE "watchlist" ADD COLUMN "episode_total" integer;
ALTER TABLE "watchlist" ADD CONSTRAINT "watchlist_status_check" CHECK ("status" IN ('to_watch', 'watched'));
--> statement-breakpoint
CREATE TABLE "watched_episode" (
  "watchlist_id" integer NOT NULL REFERENCES "watchlist"("id") ON DELETE CASCADE,
  "season" integer NOT NULL,
  "episode" integer NOT NULL,
  CONSTRAINT "watched_episode_numbers_check" CHECK ("season" > 0 AND "episode" > 0)
);
CREATE UNIQUE INDEX "watched_episode_unique" ON "watched_episode" ("watchlist_id", "season", "episode");
