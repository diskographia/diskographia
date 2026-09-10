ALTER TABLE "entity_events" ADD COLUMN "applications_open" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "entity_events" ADD COLUMN "application_ttl_days" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "entity_events"
  ADD CONSTRAINT entity_events_ttl_check
  CHECK (application_ttl_days BETWEEN 1 AND 90);
