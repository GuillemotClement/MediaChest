CREATE TABLE "watchlist" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "tmdb_id" integer NOT NULL,
  "type" text NOT NULL CHECK ("type" IN ('movie', 'tv')),
  "title" text NOT NULL,
  "overview" text NOT NULL,
  "poster_url" text,
  "release_date" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "watchlist_user_media_idx" ON "watchlist" ("user_id", "type", "tmdb_id");
