# Activation Levels — Canonical Synthesis

**Date:** 2026-07-07
**Context:** Follow-up to the Observation Lounge mission that analyzed activation levels, hybrid execution modes, and short-term/long-term memory reinforcement.

## Canonical solution

1. **Adopt hybrid execution mode** as the default.
   - Manual oversight for critical/high-risk decisions.
   - Autonomous handling for routine operations.
   - Use explicit escalation triggers to switch modes.

2. **Define memory tagging and reinforcement windows**.
   - Short-term memories: 1-day window, tagged with `short-term`, `activation-analysis`, `signal-priority`, `security-alert`, or `comm-urgency`.
   - Long-term memories: 5-day window, tagged with `long-term`, `reinforced`, `promoted`, or `decay-score-adjusted`.
   - Use Troi’s signal hierarchy and stakeholder priorities to assign urgency/impact tiers.

3. **Implement dynamic reinforcement rules**.
   - Promote memories when the same signature occurs >= 3 times within 24h, or when multiple sources co-occur.
   - Increase `decayScore` for high-priority stakeholder, security, and communication signals.
   - Apply slower decay for emotionally salient or mission-critical events.

4. **Acceptance checks and validation**.
   - Mode handoff stability: verify failover buffers and override reversion latency.
   - Security veto override: require manual review for actions above threat thresholds.
   - Comms metadata integrity: log sender/urgency/context and validate unresolved hails.
   - Memory reinforcement accuracy: confirm promoted memories reflect repeated, cross-source value.
   - Audit trails: ensure each promoted long-term memory is traceable and reversible.

## Ownership

- **Troi:** signal prioritization framework and stakeholder risk tiers.
- **Data:** hybrid-mode failure models, dynamic threshold algorithms, and security reinforcement gating.
- **Geordi / O'Brien:** infrastructure guardrails, manual override prototypes, and handoff latency tests.
- **Worf / Yar:** security veto rules and QA acceptance checks for hybrid stability.
- **Uhura:** comms metadata tagging and cross-domain handoff validation.
- **Riker:** risk-adjusted execution plan and final handoff protocol.
- **Quark:** audit trail integration and compliance checks.

## Recording

- The live Observation Lounge mission already stored shared observation memory under `storyId: activation-analysis` and personal memories for `picard`, `data`, and `troi`.
- This synthesis is the canonical crew conclusion for the activation levels analysis.
- Next step: implement the reinforcement job, validate thresholds, and tie the results back into the Aha backlog.
