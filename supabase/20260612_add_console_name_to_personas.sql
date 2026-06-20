-- Migration to add console_name to sa_crew_personas table
ALTER TABLE public.sa_crew_personas ADD COLUMN IF NOT EXISTS console_name TEXT;
COMMENT ON COLUMN public.sa_crew_personas.console_name IS 'The Starship Console associated with this crew member (e.g. Communications Console).';