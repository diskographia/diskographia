CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"account_id" uuid NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp(3) with time zone NOT NULL,
	"revoked_at" timestamp(3) with time zone
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sessions_account_idx" ON "sessions" USING btree ("account_id","revoked_at");--> statement-breakpoint
-- тексты защит уходят людям через фильтр ошибок, поэтому по-русски
CREATE OR REPLACE FUNCTION entity_children_guard() RETURNS trigger AS $$
DECLARE
  parent_kind entity_kind;
  chain_depth int;
BEGIN
  IF NEW.parent_id = NEW.child_id THEN
    RAISE EXCEPTION 'предмет нельзя положить в него самого';
  END IF;

  SELECT kind INTO parent_kind FROM entities WHERE id = NEW.parent_id;
  IF parent_kind NOT IN ('event', 'capsule') THEN
    RAISE EXCEPTION 'в этот предмет нельзя ничего положить';
  END IF;

  IF EXISTS (
    WITH RECURSIVE descendants AS (
      SELECT child_id, 1 AS lvl FROM entity_children WHERE parent_id = NEW.child_id
      UNION ALL
      SELECT ec.child_id, d.lvl + 1
      FROM entity_children ec
      JOIN descendants d ON ec.parent_id = d.child_id
      WHERE d.lvl < 64
    )
    SELECT 1 FROM descendants WHERE child_id = NEW.parent_id
  ) THEN
    RAISE EXCEPTION 'получился круг: этот контейнер уже лежит внутри вкладываемого предмета';
  END IF;

  WITH RECURSIVE ancestors AS (
    SELECT parent_id, 1 AS lvl FROM entity_children WHERE child_id = NEW.parent_id
    UNION ALL
    SELECT ec.parent_id, a.lvl + 1
    FROM entity_children ec
    JOIN ancestors a ON ec.child_id = a.parent_id
    WHERE a.lvl < 64
  )
  SELECT COALESCE(max(lvl), 0) INTO chain_depth FROM ancestors;

  IF chain_depth >= 10 THEN
    RAISE EXCEPTION 'вложенность глубже десяти уровней';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION entity_feedback_guard() RETURNS trigger AS $$
DECLARE
  entity_owner uuid;
BEGIN
  SELECT owner_id INTO entity_owner FROM entities WHERE id = NEW.entity_id;
  IF entity_owner = NEW.profile_id THEN
    RAISE EXCEPTION 'нельзя откликнуться своему предмету';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION collaborator_role_guard() RETURNS trigger AS $$
DECLARE
  entity_owner uuid;
  role_owner uuid;
BEGIN
  SELECT owner_id INTO entity_owner FROM entities WHERE id = NEW.entity_id;
  SELECT owner_id INTO role_owner FROM roles WHERE id = NEW.role_id;
  IF entity_owner <> role_owner THEN
    RAISE EXCEPTION 'роль должна принадлежать владельцу предмета';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
