ALTER TABLE "entity_events" ADD COLUMN "announce_at" timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "entity_events" ADD COLUMN "announce_md" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "entity_events"
  ADD CONSTRAINT entity_events_announce_check
  CHECK (announce_at IS NULL OR announce_at <= starts_at);
