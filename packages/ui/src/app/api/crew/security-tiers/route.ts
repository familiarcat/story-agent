/**
 * GET /api/crew/security-tiers
 *
 * Returns the registered client security policies sorted by tier,
 * with Bayer (regulated / gold standard) first.
 *
 * Uses the sa_security_tier_summary Supabase view introduced in
 * 20260607_client_memory_isolation.sql.
 *
 * Fallback: if the view doesn't exist yet (migration not run), returns
 * the TypeScript-defined policy registry from shared/client-security-policy.
 */

import { NextResponse } from 'next/server';
import { getDbClient } from '@story-agent/shared/db';
import {
  BAYER_SECURITY_POLICY,
  DEFAULT_ENTERPRISE_POLICY,
  resolveClientPolicy,
  validateClientCredentials,
} from '@story-agent/shared/client-security-policy';

export const dynamic = 'force-dynamic';

// Known registered clients — fallback when DB view isn't available
const REGISTERED_CLIENTS = ['bayer-int', 'familiarcat'];

export async function GET() {
  try {
    const db = await getDbClient();

    // Try the DB view first — most accurate since it includes memory counts
    const { data, error } = await db
      .from('sa_security_tier_summary')
      .select('*');

    if (!error && data && data.length > 0) {
      // Enrich with credential validation status from TypeScript policy
      const enriched = data.map((row: Record<string, unknown>) => {
        const clientId = row.client_id as string;
        const credReport = validateClientCredentials(clientId);
        return {
          ...row,
          credentialsPresent: credReport.allPresent,
          missingCredentialCount: credReport.missingCredentials.length,
          missingCredentials: credReport.missingCredentials.map(c => c.name),
          isGoldStandard: clientId === 'bayer-int',
        };
      });

      return NextResponse.json({
        success: true,
        tiers: enriched,
        goldStandardClientId: 'bayer-int',
        note: 'All clients are measured against the Bayer (regulated) gold standard.',
      });
    }

    // Fallback: build from TypeScript registry
    const tiers = REGISTERED_CLIENTS.map(clientId => {
      const policy = resolveClientPolicy(clientId);
      const credReport = validateClientCredentials(clientId);
      return {
        client_id: policy.clientId,
        client_name: policy.clientName,
        tier: policy.tier,
        tier_rationale: policy.tierRationale,
        require_bearer_token: policy.auth.requireBearerToken,
        require_entra_issuer: policy.auth.requireEntraIssuer,
        require_session_isolation: policy.auth.requireSessionIsolation,
        require_full_audit_trail: policy.auth.requireFullAuditTrail,
        worf_gate_enforce: policy.auth.worfGateEnforce,
        controlled_data_hard_block: policy.auth.controlledDataHardBlock,
        require_ssm_secrets: policy.auth.requireSsmSecrets,
        session_ttl_seconds: policy.auth.sessionTtlSeconds,
        worf_gate_mode: policy.worfGate.enforceMode,
        allow_controlled_outbound: policy.worfGate.allowControlledOutbound,
        memory_count: null,
        last_memory_at: null,
        credentialsPresent: credReport.allPresent,
        missingCredentialCount: credReport.missingCredentials.length,
        missingCredentials: credReport.missingCredentials.map(c => c.name),
        isGoldStandard: policy.clientId === 'bayer-int',
      };
    });

    return NextResponse.json({
      success: true,
      tiers,
      goldStandardClientId: 'bayer-int',
      note: 'Database view not yet available — showing TypeScript registry. Run 20260607_client_memory_isolation.sql to enable memory counts.',
      source: 'typescript_registry',
    });
  } catch (err) {
    // Last resort: hardcoded Bayer vs familiarcat comparison
    const bayer = resolveClientPolicy('bayer-int');
    const retailer = resolveClientPolicy('familiarcat');
    return NextResponse.json({
      success: true,
      tiers: [bayer, retailer].map(p => ({
        client_id: p.clientId,
        client_name: p.clientName,
        tier: p.tier,
        tier_rationale: p.tierRationale,
        isGoldStandard: p.clientId === 'bayer-int',
        credentialsPresent: false,
        missingCredentialCount: p.requiredEnvVars.length,
        missingCredentials: p.requiredEnvVars.map(v => v.name),
      })),
      goldStandardClientId: 'bayer-int',
      source: 'static_fallback',
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
