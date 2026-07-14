-- Fix ambiguous crew_id reference in get_crew_memory_stats RPC.
--
-- Root cause:
--   The function parameter name (crew_id) collided with table column names,
--   which can yield Postgres error 42702 in PL/pgSQL contexts.
--
-- Resolution:
--   1) Rename parameter to p_crew_id.
--   2) Fully-qualify table columns via alias m.

CREATE OR REPLACE FUNCTION get_crew_memory_stats(p_crew_id TEXT)
RETURNS TABLE (
  total_memories INT,
  memory_by_type TEXT,
  projects_count INT,
  most_recent_memory TIMESTAMP,
  memory_count_by_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INT AS total_memories,
    m.memory_type AS memory_by_type,
    COUNT(DISTINCT m.project_id)::INT AS projects_count,
    MAX(m.created_at) AS most_recent_memory,
    COUNT(*)::TEXT AS memory_count_by_type
  FROM sa_crew_personal_memory m
  WHERE m.crew_id = p_crew_id
  GROUP BY m.memory_type;
END;
$$ LANGUAGE plpgsql;
