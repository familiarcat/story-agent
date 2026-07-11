
═══════════════════════════════════════════════════════════════════════════
TASK IMPLEMENTATION GUIDE FOR CREW EXECUTION (SIMULATED ENVIRONMENT)
═══════════════════════════════════════════════════════════════════════════

🎯 TROI WORKSTREAM (Notification Delivery — SIMULATED)
────────────────────────────────────────────────────────────────────────────

Task: Generate and log notification copy to dev environment

Implementation:
  1. Create synthetic user dataset (6,000 profiles):
     - Locate: packages/mcp-server/src/lib/synthetic-data.ts (or create new)
     - Schema: { user_id, email, name, client_id, cohort: "canary" }
     - Output: .claude/section-31-results/synthetic-users-6000.json

  2. Log notification copy to dev database:
     - POST /api/test/notifications/simulate
     - Request: { user_id, email, subject, banner_text, opt_out_link }
     - Response: { logged: true, notification_id, timestamp }
     - NO OUTBOUND EMAIL SENDS

  3. Create opt-out link (logged only):
     - Format: /api/canary/opt-out?user_id={user_id}&token={random_token}
     - Store in test database (NOT sent anywhere)

  4. Create Aha story (auto-create via Aha API):
     - Story title: "Canary Notification Delivery (SIMULATED)"
     - Epic: PROD-E-5
     - Description: "6,000 synthetic users, notification logged to dev, no emails sent"
     - Release: PROD-R-4
     - Status: In Progress
     - Return: { story_id, story_url }

  5. Report format:
     - Notification logged: ✓
     - Users assigned: 6,000 synthetic profiles
     - Aha story: [STORY_ID] Canary Notification Delivery (SIMULATED)
     - Test channel: Logged to #section-31-canary-test
     - Safety verification: NO REAL EMAILS SENT ✓

───────────────────────────────────────────────────────────────────────────

🎯 QUARK WORKSTREAM (Cost Monitoring — SIMULATED)
────────────────────────────────────────────────────────────────────────────

Task: Deploy cost monitoring with synthetic data

Implementation:
  1. Generate synthetic cost dataset:
     - Locate: packages/mcp-server/src/lib/cost-anomaly-detection.ts
     - Create synthetic_cost_data.json:
       {
         "cohort": "canary",
         "baseline_cost_per_user_per_day": 0.78,
         "total_users": 6000,
         "daily_total_cost": 4680,
         "daily_costs_7_day": [4620, 4650, 4680, 4700, 4725, 4760, 4680],
         "mean": 4688.33,
         "std_dev": 42.31,
         "thresholds": {
           "GREEN": 936,
           "YELLOW_MIN": 936,
           "YELLOW_MAX": 1092,
           "RED": 1092
         }
       }

  2. Deploy cost monitoring:
     - Endpoint: GET /api/cost/canary/monitor
     - Response: { status, daily_total, mean, std_dev, threshold_current, alert_status }
     - Implement anomaly detection (rolling 7-day mean + 2σ)

  3. Test alerts (YELLOW/RED):
     - Simulate YELLOW alert: cost spike to $1050
     - Simulate RED alert: cost spike to $1150
     - Verify alerts POST to #section-31-canary-test (NOT production)
     - Confirm alert format: { timestamp, cohort, status, cost, threshold, action }

  4. Create Aha story (auto-create via Aha API):
     - Story title: "Cost Model + Anomaly Detection (SIMULATED)"
     - Epic: PROD-E-5
     - Description: "Synthetic cost dataset deployed, 6,000 users, baseline $0.78/user"
     - Release: PROD-R-4
     - Status: In Progress
     - Return: { story_id, story_url }

  5. Report format:
     - Cost monitoring deployed: ✓
     - Synthetic data seeded: 6,000 users @ $0.78/user/day
     - Thresholds: GREEN ≤$936, YELLOW $936-$1092, RED >$1092
     - Aha story: [STORY_ID] Cost Model + Anomaly Detection (SIMULATED)
     - Test channel: Alerts verified in #section-31-canary-test ✓
     - Safety verification: ALERTS GO TO TEST CHANNEL ONLY ✓

───────────────────────────────────────────────────────────────────────────

🎯 PICARD WORKSTREAM (Daily Protocol — SIMULATED)
────────────────────────────────────────────────────────────────────────────

Task: Activate daily status escalation framework

Implementation:
  1. Define daily protocol metrics:
     - Metric: opt_out_rate (threshold: <2.5%)
     - Metric: error_rate (threshold: <0.13%)
     - Metric: sentiment (threshold: ≥60%)
     - Metric: cost_per_user (threshold: ≤$0.22/user)

  2. Implement daily reporting endpoint:
     - Endpoint: POST /api/canary/daily-report
     - Cron trigger: daily at 9:00 AM PT (via Postgres CRON or external scheduler)
     - Response: { date, metrics, status, escalations }
     - Status: GREEN (all metrics OK), YELLOW (1+ warning), RED (1+ critical)

  3. Escalation rules:
     - GREEN: No escalation
     - YELLOW: Post to #section-31-canary-test (not production)
     - RED: Post to #section-31-canary-test (not production)
     - Include: { date, metrics, suspected_cause, recommended_action }

  4. Test escalations:
     - Manually trigger daily report
     - Verify YELLOW escalation: Set opt_out_rate > 2.5%
     - Verify RED escalation: Set error_rate > 0.13%
     - Confirm escalations logged to #section-31-canary-test

  5. Create Aha story (auto-create via Aha API):
     - Story title: "Daily Metric Reporting (SIMULATED)"
     - Epic: PROD-E-5
     - Description: "Daily GREEN/YELLOW/RED protocol, escalations to test channel"
     - Release: PROD-R-4
     - Status: In Progress
     - Return: { story_id, story_url }

  6. Report format:
     - Daily protocol activated: ✓
     - Metrics defined: opt_out, error, sentiment, cost
     - Thresholds: opt_out <2.5%, error <0.13%, sentiment ≥60%, cost ≤$0.22/user
     - Aha story: [STORY_ID] Daily Metric Reporting (SIMULATED)
     - Test channel: Escalations verified in #section-31-canary-test ✓
     - Safety verification: ALL ESCALATIONS TO TEST CHANNEL ONLY ✓

───────────────────────────────────────────────────────────────────────────

🎯 WORF WORKSTREAM (TPM Signing Validation — DEV)
────────────────────────────────────────────────────────────────────────────

Task: Validate TPM cert provisioning workflow (dev environment)

Implementation:
  1. Validate TPM cert provisioning:
     - Location: packages/shared/src/worfgate-credentials.ts
     - Verify TPM signer available in dev environment
     - Test cert generation with synthetic request
     - Confirm audit trail logged to dev database

  2. Test signing function:
     - Create test payload: { request_id, timestamp, action, user_id }
     - Sign with TPM key
     - Verify signature
     - Log to test database: { payload, signature, verified: true, timestamp }

  3. Audit trail validation:
     - Query dev database for TPM signing events (last 1 hour)
     - Verify all events logged with: { timestamp, payload_hash, signature, status }
     - Confirm NO GAPS in audit trail

  4. Create Aha story (auto-create via Aha API):
     - Story title: "TPM Signing Validation (SIMULATED)"
     - Epic: PROD-E-5
     - Description: "TPM cert provisioning validated in dev, audit trail confirmed"
     - Release: PROD-R-4
     - Status: In Progress
     - Return: { story_id, story_url }

  5. Report format:
     - TPM signing validated: ✓
     - Signing function tested: 10+ synthetic requests
     - Audit trail confirmed: All events logged to dev database
     - Aha story: [STORY_ID] TPM Signing Validation (SIMULATED)
     - Test environment: Dev only ✓
     - Safety verification: SYNTHETIC REQUESTS, DEV ENV ONLY ✓

───────────────────────────────────────────────────────────────────────────

🎯 O'BRIEN WORKSTREAM (Canary Infrastructure — TEST)
────────────────────────────────────────────────────────────────────────────

Task: Finalize canary infrastructure (test environment)

Implementation:
  1. Feature flag deployment (TEST environment):
     - Location: packages/shared/src/feature-flags.ts (or Supabase table)
     - Flag: storyAgent.canary.enabled = true
     - Environment: TEST ONLY (production flag defaults to false)
     - Scope: Test environment deployment only

  2. Cohort assignment (synthetic users):
     - Generate 6,000 synthetic user IDs
     - Assign cohort via: hash(user_id) % 100 < 1
     - This selects 1% of synthetic users (60 users in control group)
     - Verify: SELECT COUNT(*) FROM users WHERE cohort='canary' AND env='test'

  3. A/B telemetry setup (test data):
     - Separate data streams:
       - Experiment stream: /api/telemetry/canary/experiment
       - Control stream: /api/telemetry/canary/control
     - Both log to test database (NOT production)
     - Verify isolation: SELECT * FROM telemetry WHERE stream='experiment' AND env='test'

  4. Rollback procedure:
     - Location: scripts/rollback_canary.sh
     - Test validation:
       - Enable feature flag (storyAgent.canary.enabled = true)
       - Verify 10 requests succeed
       - Run rollback script
       - Verify feature flag disabled (false)
       - Verify 10 requests route to fallback
       - Confirm no data loss (all telemetry preserved)

  5. Create Aha story (auto-create via Aha API):
     - Story title: "Canary Infrastructure (SIMULATED)"
     - Epic: PROD-E-5
     - Description: "Feature flag enabled in test, cohort assigned, A/B telemetry running, rollback verified"
     - Release: PROD-R-4
     - Status: In Progress
     - Return: { story_id, story_url }

  6. Report format:
     - Feature flag enabled: ✓ (TEST environment only)
     - Cohort assignment: 6,000 synthetic users (1% selected = 60 control)
     - A/B telemetry: Separate streams deployed (test data only)
     - Aha story: [STORY_ID] Canary Infrastructure (SIMULATED)
     - Test environment: Feature flag verified in TEST env only ✓
     - Rollback verified: scripts/rollback_canary.sh tested, rollback SLA <5min ✓
     - Safety verification: NO REAL USERS AFFECTED ✓

═══════════════════════════════════════════════════════════════════════════

📋 TESTING CHECKLIST (ALL OFFICERS)

TROI:
  ✓ Synthetic users generated: 6,000 profiles in JSON
  ✓ Notification logged to dev database (NO EMAIL SENT)
  ✓ Aha story created and linked to PROD-E-5
  ✓ Safety: No real emails in outbound queue

QUARK:
  ✓ Synthetic cost data deployed: $0.78/user/day baseline
  ✓ Anomaly detection: rolling 7-day mean + 2σ
  ✓ Alert thresholds verified (GREEN/YELLOW/RED)
  ✓ Test alerts fired to #section-31-canary-test (NOT production)
  ✓ Aha story created and linked to PROD-E-5

PICARD:
  ✓ Daily protocol defined: 4 metrics, thresholds set
  ✓ Escalation rules tested (YELLOW/RED to test channel)
  ✓ Daily report endpoint verified
  ✓ Aha story created and linked to PROD-E-5
  ✓ Safety: All escalations to test channel only

WORF:
  ✓ TPM cert provisioning validated (dev environment)
  ✓ Signing function tested: 10+ synthetic requests
  ✓ Audit trail verified: All events logged to dev database
  ✓ Aha story created and linked to PROD-E-5
  ✓ Safety: Dev environment only, no production access

O'BRIEN:
  ✓ Feature flag deployed in TEST environment
  ✓ Cohort assignment: hash-based selection working
  ✓ A/B telemetry: separate experiment/control streams in test data
  ✓ Rollback procedure: scripts/rollback_canary.sh tested + validated
  ✓ Aha story created and linked to PROD-E-5
  ✓ Safety: No real users affected, TEST environment only

═══════════════════════════════════════════════════════════════════════════

🎯 GATE SIGN-OFF CRITERIA (ALL SIMULATED/TEST ENVIRONMENT)

| Officer | Gate | Criteria |
|---------|------|----------|
| TROI | Notification Ready | 6,000 synthetic users logged, email copy approved, NO REAL EMAILS SENT ✓ |
| QUARK | Cost Monitoring Ready | Synthetic data deployed, anomaly alerts tested in test channel, baselines set ✓ |
| PICARD | Daily Protocol Ready | 4 metrics defined, escalation rules tested in test channel, no production alerts ✓ |
| WORF | TPM Signing Ready | Dev validation complete, audit trail confirmed, no production signing access ✓ |
| O'BRIEN | Infrastructure Ready | Feature flag in TEST, cohort assigned, rollback tested + working, no real users ✓ |

🎬 PICARD GATE ASSESSMENT (after all 5 officers sign off)

If ALL 5 gates PASS (with safety constraints verified):
  ✅ LAUNCH-READY — READY FOR PRODUCTION GATE REVIEW
     • All simulated tasks completed successfully
     • All safety constraints verified (NO real emails, synthetic data only)
     • All Aha stories created and linked to PROD-E-5
     • All crew decisions logged to RAG memory
     • Ready to proceed to production gate approval (human review)

If ANY gate FAILS or safety constraint violated:
  ⚠️ HOLD — ESCALATION REQUIRED
     • Identify blocked gate or safety violation
     • Replan that workstream
     • All-hands Observation Lounge to resolve

═══════════════════════════════════════════════════════════════════════════
