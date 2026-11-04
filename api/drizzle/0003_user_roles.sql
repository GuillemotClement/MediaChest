ALTER TABLE "user" ADD COLUMN "role" text DEFAULT 'user' NOT NULL;
ALTER TABLE "user" ADD CONSTRAINT "user_role_check" CHECK ("role" IN ('user', 'admin'));
