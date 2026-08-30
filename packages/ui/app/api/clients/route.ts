import { NextResponse } from 'next/server';
import {
  listClientsFromDb,
  resolveClientPolicy,
  lookupOrComputeChecksum,
} from '@story-agent/shared';

export const dynamic = 'force-dynamic';

/**
 * Phase 2: Enhanced /api/clients endpoint with checksum storage
 *
 * Returns full client data for hierarchical tree + checksum visualization:
 * - id, name, tier, businessTier
 * - parentClientId (for hierarchy)
 * - policy (full ClientSecurityPolicy object)
 * - checksum + checksumStatus (from Supabase storage or fresh compute)
 * - onboardedBy (operator tracking)
 *
 * Phase 2 DI: Uses lookupOrComputeChecksum() to enable persistent validation
 * - Retrieves stored checksums from sa_policy_checksums table
 * - Computes and stores fresh checksums on first lookup
 * - Returns "valid"/"invalid"/"unknown" status based on storage
 *
 * DI: Uses listClientsFromDb() + resolveClientPolicy() from shared
 * Fallback: Returns static clients if DB unavailable
 */
export async function GET(): Promise<NextResponse> {
  try {
    const rows = await listClientsFromDb();

    const clients = await Promise.all(
      rows.map(async (r) => {
        // Resolve full policy (from cache or code bootstrap)
        const policy = resolveClientPolicy(r.id);

        // Phase 2: Lookup stored checksum or compute + store fresh
        const checksumResult = await lookupOrComputeChecksum(r.id, policy);

        return {
          id: r.id,
          name: r.name,
          tier: r.security_tier,
          businessTier: policy.businessTier,
          parentClientId: r.parent_client_id,
          policy: policy, // Full policy object
          checksum: checksumResult.checksum,
          checksumStatus: checksumResult.checksumStatus,
          onboardedBy: r.onboarded_by ?? null,
          // Phase 2 metadata
          checksumSource: checksumResult.checksumStatus === 'unknown' ? 'computed' : 'stored',
        };
      })
    );

    return NextResponse.json({ clients, source: 'db', phase: 2 });
  } catch (error) {
    // Fallback: Return bootstrap clients with dummy checksums
    return NextResponse.json({
      clients: [
        {
          id: 'familiarcat',
          name: 'familiarcat',
          tier: 'enterprise',
          businessTier: 'enterprise',
          parentClientId: null,
          policy: null,
          checksum: null,
          checksumStatus: 'unknown',
          onboardedBy: null,
          checksumSource: 'fallback',
        },
        {
          id: 'jonah',
          name: 'Jonah',
          tier: 'standard',
          businessTier: 'standard',
          parentClientId: 'familiarcat',
          policy: null,
          checksum: null,
          checksumStatus: 'unknown',
          onboardedBy: null,
          checksumSource: 'fallback',
        },
        {
          id: 'client-int',
          name: 'Client (gold standard)',
          tier: 'regulated',
          businessTier: 'regulated',
          parentClientId: 'familiarcat',
          policy: null,
          checksum: null,
          checksumStatus: 'unknown',
          onboardedBy: null,
          checksumSource: 'fallback',
        },
      ],
      source: 'fallback',
      phase: 2,
    });
  }
}
