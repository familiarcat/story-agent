-- Supabase RLS enablement for tables orphaned in cloud database
-- These tables exist in remote but lack RLS configuration, blocking CI/CD
-- This migration applies RLS to all and creates basic authenticated-user policies

-- Enable RLS on orphaned sa_* tables (Story Agent prefixed)
ALTER TABLE IF EXISTS sa_stress_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sa_crew_heartbeats ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sa_worfgate_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sa_worfgate_credential_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sa_story_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sa_cost_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sa_crew_escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sa_crew_rotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sa_breadcrumb_cache_stats ENABLE ROW LEVEL SECURITY;

-- Create basic read policies for authenticated users on sa_* tables
-- (Prevent "no policies exist" warnings while maintaining security)

DROP POLICY IF EXISTS stress_test_results_read ON sa_stress_test_results;
CREATE POLICY stress_test_results_read ON sa_stress_test_results
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS crew_heartbeats_read ON sa_crew_heartbeats;
CREATE POLICY crew_heartbeats_read ON sa_crew_heartbeats
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS worfgate_audit_read ON sa_worfgate_audit;
CREATE POLICY worfgate_audit_read ON sa_worfgate_audit
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS worfgate_credential_audit_read ON sa_worfgate_credential_audit;
CREATE POLICY worfgate_credential_audit_read ON sa_worfgate_credential_audit
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS story_dependencies_read ON sa_story_dependencies;
CREATE POLICY story_dependencies_read ON sa_story_dependencies
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS cost_tracking_read ON sa_cost_tracking;
CREATE POLICY cost_tracking_read ON sa_cost_tracking
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS crew_escalations_read ON sa_crew_escalations;
CREATE POLICY crew_escalations_read ON sa_crew_escalations
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS crew_rotations_read ON sa_crew_rotations;
CREATE POLICY crew_rotations_read ON sa_crew_rotations
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS breadcrumb_cache_stats_read ON sa_breadcrumb_cache_stats;
CREATE POLICY breadcrumb_cache_stats_read ON sa_breadcrumb_cache_stats
  FOR SELECT USING (auth.role() = 'authenticated');
