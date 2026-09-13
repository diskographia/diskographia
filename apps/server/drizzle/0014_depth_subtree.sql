-- предел вложенности считается по всей цепочке: предки нового родителя, новая связь и поддерево вкладываемого предмета
CREATE OR REPLACE FUNCTION entity_children_guard() RETURNS trigger AS $$
DECLARE
  parent_kind entity_kind;
  chain_above int;
  chain_below int;
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
  SELECT COALESCE(max(lvl), 0) INTO chain_above FROM ancestors;

  WITH RECURSIVE descendants AS (
    SELECT child_id, 1 AS lvl FROM entity_children WHERE parent_id = NEW.child_id
    UNION ALL
    SELECT ec.child_id, d.lvl + 1
    FROM entity_children ec
    JOIN descendants d ON ec.parent_id = d.child_id
    WHERE d.lvl < 64
  )
  SELECT COALESCE(max(lvl), 0) INTO chain_below FROM descendants;

  IF chain_above + 1 + chain_below > 10 THEN
    RAISE EXCEPTION 'вложенность глубже десяти уровней';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
