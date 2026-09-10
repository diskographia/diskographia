ALTER TYPE "public"."media_kind" ADD VALUE 'model';--> statement-breakpoint
ALTER TABLE "entity_media" ADD COLUMN "title" text;