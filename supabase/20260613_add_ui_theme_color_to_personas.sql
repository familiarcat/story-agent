-- Migration to add ui_theme_color to sa_crew_personas table
ALTER TABLE public.sa_crew_personas ADD COLUMN IF NOT EXISTS ui_theme_color TEXT;
COMMENT ON COLUMN public.sa_crew_personas.ui_theme_color IS 'The LCARS theme color for this crew member station (gold, blue, red, purple).';