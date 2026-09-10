CREATE TABLE "entity_display_authors" (
	"entity_id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"city" text,
	"country" text,
	"note" text,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entity_meta" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"entity_id" uuid NOT NULL,
	"label" text NOT NULL,
	"value" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_schedule" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"event_id" uuid NOT NULL,
	"starts_at" timestamp(3) with time zone NOT NULL,
	"ends_at" timestamp(3) with time zone,
	"title" text NOT NULL,
	"short_md" text DEFAULT '' NOT NULL,
	"full_md" text DEFAULT '' NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "country" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "entity_events" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "entity_events" ADD COLUMN "latitude" numeric(9, 6);--> statement-breakpoint
ALTER TABLE "entity_events" ADD COLUMN "longitude" numeric(9, 6);--> statement-breakpoint
ALTER TABLE "entity_events" ADD COLUMN "is_global" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "entity_display_authors" ADD CONSTRAINT "entity_display_authors_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_meta" ADD CONSTRAINT "entity_meta_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_schedule" ADD CONSTRAINT "event_schedule_event_id_entities_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entity_meta_entity_idx" ON "entity_meta" USING btree ("entity_id","sort_order");--> statement-breakpoint
CREATE INDEX "event_schedule_event_idx" ON "event_schedule" USING btree ("event_id","starts_at");--> statement-breakpoint
ALTER TABLE "entity_events"
  ADD CONSTRAINT entity_events_coords_check
  CHECK ((latitude IS NULL) = (longitude IS NULL));
--> statement-breakpoint
ALTER TABLE "event_schedule"
  ADD CONSTRAINT event_schedule_period_check
  CHECK (ends_at IS NULL OR ends_at >= starts_at);
