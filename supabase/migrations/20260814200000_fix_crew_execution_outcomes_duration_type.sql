-- Fix crew_execution_outcomes.duration_seconds: declared INTEGER, but the application
-- (packages/shared/src/db.ts's storeCrewExecutionOutcome) has always correctly sent fractional-
-- second float durations (fast operations genuinely complete in under a second). Every insert has
-- been failing since this table's creation (20260712144232_crew_execution_outcomes.sql) with
-- "invalid input syntax for type integer" — visible in test output all session, dismissed each
-- time as unrelated noise. The application code was right; the schema was wrong. NUMERIC widens
-- INTEGER losslessly for any existing rows (there are almost certainly none, given every insert has
-- failed since inception).
ALTER TABLE public.crew_execution_outcomes
  ALTER COLUMN duration_seconds TYPE NUMERIC;
