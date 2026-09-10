CREATE TABLE "entity_views" (
	"entity_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entity_views_entity_id_profile_id_pk" PRIMARY KEY("entity_id","profile_id")
);
--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN "viewer_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "entity_views" ADD CONSTRAINT "entity_views_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_views" ADD CONSTRAINT "entity_views_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entity_views_profile_idx" ON "entity_views" USING btree ("profile_id");--> statement-breakpoint
CREATE FUNCTION entity_views_guard() RETURNS trigger AS $$
DECLARE
  entity_owner uuid;
BEGIN
  SELECT owner_id INTO entity_owner FROM entities WHERE id = NEW.entity_id;

  IF entity_owner = NEW.profile_id THEN
    RAISE EXCEPTION 'свой заход на свой объект не считается';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER entity_views_guard_trigger
  BEFORE INSERT ON entity_views
  FOR EACH ROW EXECUTE FUNCTION entity_views_guard();
--> statement-breakpoint
CREATE FUNCTION entity_views_sync() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE entities SET viewer_count = viewer_count + 1 WHERE id = NEW.entity_id;
  ELSE
    UPDATE entities SET viewer_count = greatest(viewer_count - 1, 0) WHERE id = OLD.entity_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER entity_views_sync_trigger
  AFTER INSERT OR DELETE ON entity_views
  FOR EACH ROW EXECUTE FUNCTION entity_views_sync();
