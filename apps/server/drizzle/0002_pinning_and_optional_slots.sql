ALTER TYPE "public"."permission" ADD VALUE 'pin';--> statement-breakpoint
ALTER TYPE "public"."permission" ADD VALUE 'curate';--> statement-breakpoint
ALTER TABLE "entity_children" ALTER COLUMN "slot_index" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "entity_children" ADD COLUMN "pinned_at" timestamp(3) with time zone;--> statement-breakpoint
CREATE INDEX "entity_children_parent_added_idx" ON "entity_children" USING btree ("parent_id","created_at");--> statement-breakpoint
CREATE INDEX "entity_children_parent_pinned_idx" ON "entity_children" USING btree ("parent_id","pinned_at");