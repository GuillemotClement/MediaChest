CREATE TYPE "status" AS ENUM('En attente', 'Télécharger', 'Disponible');--> statement-breakpoint
CREATE TYPE "media_type" AS ENUM('film', 'serie');--> statement-breakpoint
CREATE TABLE "media" (
	"id" serial PRIMARY KEY,
	"tmdb_id" varchar NOT NULL UNIQUE,
	"name" varchar NOT NULL,
	"type" "media_type" NOT NULL,
	"status" "status" DEFAULT 'En attente'::"status"
);
--> statement-breakpoint
CREATE TABLE "media_user" (
	"id" serial PRIMARY KEY,
	"user_id" text NOT NULL,
	"media_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "media_user" ADD CONSTRAINT "media_user_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "media_user" ADD CONSTRAINT "media_user_media_id_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE;