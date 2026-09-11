CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ник уникален без учёта регистра
CREATE UNIQUE INDEX profiles_handle_lower_key ON profiles (lower(handle));

-- проверяется сразу, но может быть отложена на время перестановки командой
-- SET CONSTRAINTS ... DEFERRED, когда два объекта временно делят ячейку.
-- NULL в postgres не равен NULL, поэтому объекты вне инвентаря ограничением не задеты.
ALTER TABLE entities
  ADD CONSTRAINT entities_owner_inventory_slot_key
  UNIQUE (owner_id, inventory_slot) DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE entity_children
  ADD CONSTRAINT entity_children_parent_slot_key
  UNIQUE (parent_id, slot_index) DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE entity_events
  ADD CONSTRAINT entity_events_period_check
  CHECK (ends_at IS NULL OR ends_at >= starts_at);

ALTER TABLE entity_products
  ADD CONSTRAINT entity_products_price_check
  CHECK (price_amount IS NULL OR price_amount >= 0);

ALTER TABLE entity_products
  ADD CONSTRAINT entity_products_currency_check
  CHECK (price_amount IS NULL OR price_currency IS NOT NULL);

ALTER TABLE entity_media
  ADD CONSTRAINT entity_media_source_check
  CHECK (
    (kind = 'embed' AND embed_url IS NOT NULL AND file_id IS NULL)
    OR (kind <> 'embed' AND file_id IS NOT NULL AND embed_url IS NULL)
  );

ALTER TABLE profile_feedback
  ADD CONSTRAINT profile_feedback_not_self_check
  CHECK (target_id <> author_id);

ALTER TABLE event_participants
  ADD CONSTRAINT event_participants_attachment_check
  CHECK (attached_entity_id IS NULL OR application_status IS NOT NULL);

CREATE INDEX entities_title_trgm_idx ON entities USING gin (title gin_trgm_ops);

CREATE INDEX entities_search_vector_idx ON entities USING gin (search_vector);

-- поисковый вектор заполняется триггером, а не GENERATED ALWAYS:
-- prisma не умеет генерируемые столбцы, а триггеры игнорирует и не сносит
CREATE FUNCTION entities_search_vector_sync() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('russian', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('russian', coalesce(NEW.description_md, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER entities_search_vector_sync_trigger
  BEFORE INSERT OR UPDATE OF title, description_md ON entities
  FOR EACH ROW EXECUTE FUNCTION entities_search_vector_sync();


CREATE FUNCTION entity_children_guard() RETURNS trigger AS $$
DECLARE
  parent_kind entity_kind;
  chain_depth int;
BEGIN
  IF NEW.parent_id = NEW.child_id THEN
    RAISE EXCEPTION 'entity cannot contain itself';
  END IF;

  SELECT kind INTO parent_kind FROM entities WHERE id = NEW.parent_id;
  IF parent_kind NOT IN ('event', 'capsule') THEN
    RAISE EXCEPTION 'parent % is not a container', NEW.parent_id;
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
    RAISE EXCEPTION 'cycle detected: % already contains %', NEW.child_id, NEW.parent_id;
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
    RAISE EXCEPTION 'nesting deeper than 10 levels';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER entity_children_guard_trigger
  BEFORE INSERT OR UPDATE OF parent_id, child_id ON entity_children
  FOR EACH ROW EXECUTE FUNCTION entity_children_guard();


CREATE FUNCTION entity_feedback_guard() RETURNS trigger AS $$
DECLARE
  entity_owner uuid;
BEGIN
  SELECT owner_id INTO entity_owner FROM entities WHERE id = NEW.entity_id;
  IF entity_owner = NEW.profile_id THEN
    RAISE EXCEPTION 'cannot give feedback to own entity';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER entity_feedback_guard_trigger
  BEFORE INSERT ON entity_feedback
  FOR EACH ROW EXECUTE FUNCTION entity_feedback_guard();


CREATE FUNCTION collaborator_role_guard() RETURNS trigger AS $$
DECLARE
  entity_owner uuid;
  role_owner uuid;
BEGIN
  SELECT owner_id INTO entity_owner FROM entities WHERE id = NEW.entity_id;
  SELECT owner_id INTO role_owner FROM roles WHERE id = NEW.role_id;
  IF entity_owner <> role_owner THEN
    RAISE EXCEPTION 'role % does not belong to the owner of entity %', NEW.role_id, NEW.entity_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER collaborator_role_guard_trigger
  BEFORE INSERT OR UPDATE ON entity_collaborators
  FOR EACH ROW EXECUTE FUNCTION collaborator_role_guard();


CREATE FUNCTION entity_feedback_sync() RETURNS trigger AS $$
DECLARE
  target_entity uuid;
  delta int;
  entity_owner uuid;
  entity_alive boolean;
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
    RETURNING owner_id, deleted_at IS NULL INTO entity_owner, entity_alive;

  IF entity_alive THEN
    UPDATE profiles SET weight = weight + delta WHERE id = entity_owner;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER entity_feedback_sync_trigger
  AFTER INSERT OR UPDATE OF withdrawn_at OR DELETE ON entity_feedback
  FOR EACH ROW EXECUTE FUNCTION entity_feedback_sync();


CREATE FUNCTION profile_feedback_sync() RETURNS trigger AS $$
DECLARE
  target_profile uuid;
  delta int;
BEGIN
  IF TG_OP = 'INSERT' THEN
    target_profile := NEW.target_id;
    delta := CASE WHEN NEW.withdrawn_at IS NULL THEN 1 ELSE 0 END;
  ELSIF TG_OP = 'UPDATE' THEN
    target_profile := NEW.target_id;
    delta := (CASE WHEN NEW.withdrawn_at IS NULL THEN 1 ELSE 0 END)
           - (CASE WHEN OLD.withdrawn_at IS NULL THEN 1 ELSE 0 END);
  ELSE
    target_profile := OLD.target_id;
    delta := CASE WHEN OLD.withdrawn_at IS NULL THEN -1 ELSE 0 END;
  END IF;

  IF delta <> 0 THEN
    UPDATE profiles
      SET feedback_count = feedback_count + delta,
          weight = weight + delta
      WHERE id = target_profile;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profile_feedback_sync_trigger
  AFTER INSERT OR UPDATE OF withdrawn_at OR DELETE ON profile_feedback
  FOR EACH ROW EXECUTE FUNCTION profile_feedback_sync();


-- мягкое удаление снимает отклики объекта с веса автора, восстановление возвращает
CREATE FUNCTION entity_deletion_sync() RETURNS trigger AS $$
BEGIN
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    UPDATE profiles SET weight = weight - NEW.feedback_count WHERE id = NEW.owner_id;
  ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
    UPDATE profiles SET weight = weight + NEW.feedback_count WHERE id = NEW.owner_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER entity_deletion_sync_trigger
  AFTER UPDATE OF deleted_at ON entities
  FOR EACH ROW EXECUTE FUNCTION entity_deletion_sync();
