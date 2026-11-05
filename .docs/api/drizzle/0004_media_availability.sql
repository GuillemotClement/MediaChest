CREATE TABLE "media_availability" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "tmdb_id" integer NOT NULL,
  "type" text NOT NULL,
  "status" text DEFAULT 'to_download' NOT NULL,
  CONSTRAINT "media_availability_type_check" CHECK ("type" IN ('movie', 'tv')),
  CONSTRAINT "media_availability_status_check" CHECK ("status" IN ('to_download', 'downloaded', 'available'))
);
CREATE UNIQUE INDEX "media_availability_media_idx" ON "media_availability" ("type", "tmdb_id");
--> statement-breakpoint
INSERT INTO "media_availability" ("type", "tmdb_id")
SELECT DISTINCT "type", "tmdb_id" FROM "watchlist";
--> statement-breakpoint
CREATE FUNCTION initialize_media_availability() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO media_availability (type, tmdb_id) VALUES (NEW.type, NEW.tmdb_id)
  ON CONFLICT (type, tmdb_id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER watchlist_media_availability AFTER INSERT ON watchlist
FOR EACH ROW EXECUTE FUNCTION initialize_media_availability();
