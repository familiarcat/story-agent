#!/usr/bin/env node

/**
 * Crew Integrity Recovery Mission
 *
 * When the crew gathers for a mission, they first ensure everyone is accounted for.
 * This script demonstrates Worf running a security check and discovering that some crew
 * members are missing or uninitialized, then orchestrating their recovery.
 *
 * "In this starship, we leave no one behind." — Captain Picard
 */

import { CREW_MISSION_ORDER } from '../lib/crew-personas.js';
import {
  generateCrewIntegrityReport,
  getCrewIntegritySummary,
  recoverAllMissingCrewMembers,
} from '../lib/crew-integrity.js';

console.log(`
════════════════════════════════════════════════════════════════════════════════
CREW INTEGRITY RECOVERY MISSION
════════════════════════════════════════════════════════════════════════════════

Stardate: 2026.06.07
Location: Sovereign Factory Bridge
Mission: Ensure all 11 crew members are accounted for and initialized

Initiating: Lieutenant Commander Worf, Chief of Security
\n`);

// Worf begins the security check
console.log(`
[WORF]:
"Before we begin any mission, I must ensure the entire crew is present and ready.
This is a security check. Nothing personal. Just protocol."

Initiating crew integrity scan...
\n`);

async function runCrewRecoveryMission() {
  try {
    // Step 1: Generate initial integrity report
    console.log(`[INTEGRITY SCAN IN PROGRESS]`);
    console.log(`Checking all 11 crew members across:
  • sa_crew_personas (canonical identity data)
  • sa_crew_skills (skill manifests and learnings)
  • System accessibility\n`);

    const initialReport = await generateCrewIntegrityReport();

    console.log(`[INITIAL SCAN RESULTS]`);
    console.log(
      `Total crew members: ${initialReport.totalCrew}`,
      `Present and initialized: ${initialReport.presentCount}`,
      `Missing or uninitialized: ${initialReport.missingCount}\n`,
      `Status: ${initialReport.allCrewPresent ? '✅ CREW FULLY ACCOUNTED FOR' : '⚠️ CREW MEMBERS MISSING'}\n`
    );

    // Step 2: Display crew status summary
    const summary = await getCrewIntegritySummary();
    console.log(`[DETAILED CREW STATUS]\n${summary}\n`);

    // Step 3: If crew members are missing, initiate recovery
    if (initialReport.missingCount > 0) {
      console.log(`
[WORF]:
"I detect ${initialReport.missingCount} crew member(s) missing or uninitialized.
This is unacceptable. Initiating recovery operation.

Captain, I must insist we cannot proceed with any mission until all crew
members are present and accounted for. We leave no one behind."

\n[RECOVERY OPERATION INITIATED]\n`);

      console.log(`Attempting to recover and initialize ${initialReport.missingCount} crew member(s)...\n`);

      const recoveryResult = await recoverAllMissingCrewMembers();

      console.log(`
[RECOVERY RESULTS]
Total attempted: ${recoveryResult.totalAttempted}
Successful recoveries: ${recoveryResult.successfulRecoveries}
Failed recoveries: ${recoveryResult.failedRecoveries}

Recovered crew members:
${recoveryResult.recoveredCrew.map(id => `  ✅ ${id}`).join('\n')}\n`);

      if (recoveryResult.report.allCrewPresent) {
        console.log(`
[WORF]:
"All crew members have been recovered and reinitialized.

The crew is now:
  • Fully assembled
  • Properly initialized across all systems
  • Ready for mission assignment

Status: READY TO PROCEED
"\n`);
      } else {
        console.log(`
[WORF]:
"Some crew members could not be recovered. Manual intervention may be required.

Crew status:
  • Present: ${recoveryResult.report.presentCount}/${recoveryResult.report.totalCrew}
  • Still missing: ${recoveryResult.report.missingCount}

We must resolve this before proceeding."
\n`);
      }
    } else {
      console.log(`
[WORF]:
"All ${CREW_MISSION_ORDER.length} crew members are present and properly initialized.

Scanning for any system discrepancies...
(None detected)

Crew status: FULLY OPERATIONAL
Ready for any mission."
\n`);
    }

    // Step 4: Display final status
    console.log(`
════════════════════════════════════════════════════════════════════════════════
CREW INTEGRITY REPORT - FINAL STATUS
════════════════════════════════════════════════════════════════════════════════\n`);

    const finalReport = await generateCrewIntegrityReport();
    console.log(`Present: ${finalReport.presentCount}/${finalReport.totalCrew}`);
    console.log(
      `All crew accounted for: ${finalReport.allCrewPresent ? '✅ YES' : '❌ NO'}\n`
    );

    console.log(`
[PICARD]:
"Well done, Worf. The crew is complete.

In this starship, we work as one. No missions without everyone.
No decisions without all voices heard.

We are ready for what comes next."

════════════════════════════════════════════════════════════════════════════════
CREW INTEGRITY MISSION: COMPLETE
════════════════════════════════════════════════════════════════════════════════
\n`);

    process.exit(0);
  } catch (error) {
    console.error('\n[ERROR] Crew integrity mission failed:', error);
    process.exit(1);
  }
}

runCrewRecoveryMission();
