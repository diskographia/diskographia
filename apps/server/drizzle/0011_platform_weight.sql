ALTER TABLE "profiles" ADD COLUMN "is_platform" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- у платформы веса нет: он и так предельный, а её отклики не должны выглядеть заслугой
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
    UPDATE profiles SET weight = weight + delta WHERE id = entity_author AND NOT is_platform;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION profile_feedback_sync() RETURNS trigger AS $$
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
          weight = weight + CASE WHEN is_platform THEN 0 ELSE delta END
      WHERE id = target_profile;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION entity_deletion_sync() RETURNS trigger AS $$
BEGIN
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    UPDATE profiles SET weight = weight - NEW.feedback_count WHERE id = NEW.author_id AND NOT is_platform;
  ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
    UPDATE profiles SET weight = weight + NEW.feedback_count WHERE id = NEW.author_id AND NOT is_platform;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
-- передача от платформы уносит вес вместе с объектом: авторство переходит получателю
CREATE FUNCTION entity_transfer_apply(transfer uuid) RETURNS void AS $$
DECLARE
  moved record;
  giver_is_platform boolean;
BEGIN
  SELECT t.entity_id, t.from_profile_id, t.to_profile_id, e.author_id, e.feedback_count, e.deleted_at
    INTO moved
    FROM entity_transfers t
    JOIN entities e ON e.id = t.entity_id
    WHERE t.id = transfer AND t.status = 'pending'
    FOR UPDATE OF e;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'нерассмотренной заявки на передачу нет';
  END IF;

  SELECT is_platform INTO giver_is_platform FROM profiles WHERE id = moved.from_profile_id;

  UPDATE entities SET owner_id = moved.to_profile_id WHERE id = moved.entity_id;

  IF giver_is_platform AND moved.author_id = moved.from_profile_id THEN
    UPDATE entities SET author_id = moved.to_profile_id WHERE id = moved.entity_id;

    IF moved.deleted_at IS NULL THEN
      UPDATE profiles
        SET weight = weight + moved.feedback_count
        WHERE id = moved.to_profile_id AND NOT is_platform;
    END IF;
  END IF;

  UPDATE entity_transfers SET status = 'accepted', resolved_at = now() WHERE id = transfer;
END;
$$ LANGUAGE plpgsql;
