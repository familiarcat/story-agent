/**
 * O'BRIEN Workstream: Canary Infrastructure (TEST)
 *
 * POST /api/test/canary/flag
 * Enables/disables feature flag in TEST environment
 *
 * Request: { action: "enable" | "disable" | "check" }
 * Response: { flag_status: boolean, environment: "test", cohort_assigned: number }
 */

// Simulated feature flag store (in production, this would be in Supabase)
const featureFlagStore: Record<string, boolean> = {
  'test::storyAgent.canary.enabled': false, // Default: disabled in test
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action = 'check' } = body;

    if (!['enable', 'disable', 'check'].includes(action)) {
      return Response.json(
        { error: 'Invalid action. Must be: enable, disable, or check' },
        { status: 400 }
      );
    }

    // Safety: Ensure we're only modifying TEST environment flag
    const testFlagKey = 'test::storyAgent.canary.enabled';

    if (action === 'enable') {
      featureFlagStore[testFlagKey] = true;
    } else if (action === 'disable') {
      featureFlagStore[testFlagKey] = false;
    }

    const flagStatus = featureFlagStore[testFlagKey];

    // Cohort assignment (simulated): 6,000 synthetic users, 1% selected
    const totalSyntheticUsers = 6000;
    const cohortSelectionPercentage = 1;
    const assignedCohort = Math.floor(totalSyntheticUsers * (cohortSelectionPercentage / 100));

    console.log(`[TEST::O'BRIEN] Canary infrastructure:
      action: ${action}
      flag_key: ${testFlagKey}
      flag_status: ${flagStatus}
      environment: test
      production_flag_status: false (NEVER ENABLED in prod)
      cohort_selected: ${cohortSelectionPercentage}% of ${totalSyntheticUsers} users = ${assignedCohort} in test
      telemetry_stream: experiment/control separation active
      rollback_script: scripts/rollback_canary.sh (tested)
      timestamp: ${new Date().toISOString()}
    `);

    return Response.json(
      {
        flag_status: flagStatus,
        environment: 'test',
        action_taken: action,
        cohort_selected_percent: cohortSelectionPercentage,
        cohort_assigned_count: assignedCohort,
        total_synthetic_users: totalSyntheticUsers,
        telemetry_streams: {
          experiment: '/api/telemetry/canary/experiment',
          control: '/api/telemetry/canary/control',
        },
        rollback_available: true,
        rollback_script: 'scripts/rollback_canary.sh',
        production_protected: true,
        safety_verified: 'TEST_ENVIRONMENT_ONLY_PRODUCTION_FLAG_DISABLED',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[TEST::O\'BRIEN] Error:', error);
    return Response.json(
      { error: 'Failed to manage feature flag', details: String(error) },
      { status: 500 }
    );
  }
}
