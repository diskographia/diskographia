CREATE TYPE "public"."transfer_status" AS ENUM('pending', 'accepted', 'declined', 'cancelled');--> statement-breakpoint
CREATE TABLE "entity_transfers" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"entity_id" uuid NOT NULL,
	"from_profile_id" uuid NOT NULL,
	"to_profile_id" uuid NOT NULL,
	"status" "transfer_status" DEFAULT 'pending' NOT NULL,
	"note" text,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp(3) with time zone
);
--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN "author_id" uuid;--> statement-breakpoint
UPDATE "entities" SET author_id = owner_id WHERE author_id IS NULL;--> statement-breakpoint
ALTER TABLE "entities" ALTER COLUMN "author_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "entity_transfers" ADD CONSTRAINT "entity_transfers_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_transfers" ADD CONSTRAINT "entity_transfers_from_profile_id_profiles_id_fk" FOREIGN KEY ("from_profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_transfers" ADD CONSTRAINT "entity_transfers_to_profile_id_profiles_id_fk" FOREIGN KEY ("to_profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entity_transfers_entity_idx" ON "entity_transfers" USING btree ("entity_id","created_at");--> statement-breakpoint
CREATE INDEX "entity_transfers_inbox_idx" ON "entity_transfers" USING btree ("to_profile_id","status");--> statement-breakpoint
ALTER TABLE "entities" ADD CONSTRAINT "entities_author_id_profiles_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entities_author_idx" ON "entities" USING btree ("author_id");--> statement-breakpoint
ALTER TABLE "entity_transfers"
  ADD CONSTRAINT entity_transfers_parties_check
  CHECK (from_profile_id <> to_profile_id);
--> statement-breakpoint
ALTER TABLE "entity_transfers"
  ADD CONSTRAINT entity_transfers_resolved_check
  CHECK ((status = 'pending') = (resolved_at IS NULL));
--> statement-breakpoint
CREATE UNIQUE INDEX entity_transfers_one_pending_idx
  ON "entity_transfers" (entity_id) WHERE status = 'pending';
--> statement-breakpoint
-- вес считается автору, а не владельцу: после передачи объекта отклики остаются у того, кто его сделал
CREATE OR REPLACE FUNCTION entity_feedback_sync() RETURNS trigger AS $$
DECLARE
  target_entity uuid;
  entity_author uuid;
  entity_alive boolean;
  delta int;
BEGIN
  IF TG_OP = 'INSERT' THEN
    target_entity := NEW.entity_id;
    delta := CASE WHEN NEW.withdrawn_at IS NULL THEN 1 ELSE 0 END;
  ELSIF TG_OP = 'UPDATE' THEN
    target_entity := NEW.entity_id;
    delta := (CASE WHEN NEW.withdrawn_at IS NULL THEN 1 ELSE 0 END)
           - (CASE WHEN OLD.withdrawn_at IS NULL THEN 1 ELSE 0 END);
  ELSE
    target_entity := OLD.entity_id;
    delta := CASE WHEN OLD.withdrawn_at IS NULL THEN -1 ELSE 0 END;
  END IF;

  IF delta = 0 THEN
    RETURN NULL;
  END IF;

  UPDATE entities
    SET feedback_count = feedback_count + delta
    WHERE id = target_entity
    RETURNING author_id, deleted_at IS NULL INTO entity_author, entity_alive;

  IF entity_alive THEN
    UPDATE profiles SET weight = weight + delta WHERE id = entity_author;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION entity_deletion_sync() RETURNS trigger AS $$
BEGIN
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    UPDATE profiles SET weight = weight - NEW.feedback_count WHERE id = NEW.author_id;
  ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
    UPDATE profiles SET weight = weight + NEW.feedback_count WHERE id = NEW.author_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
