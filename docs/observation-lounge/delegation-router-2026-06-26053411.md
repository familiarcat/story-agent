# Observation Lounge — Delegation Router (Wave 1 build)

**Date:** 2026-06-26 | **Top model:** deepseek/deepseek-chat | **Cost:** $0.0025

## Goals

GOALS:  
1. Design a reusable complexity/cost scoring algorithm for prompt routing decisions.  
2. Implement the first shippable artifact proving automatic delegation via Claude Code's UserPromptSubmit hook.  
3. Establish a cost model and security governance for delegation.  

CONCEPTS:  
- Reusable, deterministic scoring (signals: prompt length, tool-chain needs, domain keywords).  
- Claude Code as thin orchestrator with UserPromptSubmit hook integration.  
- Frugal, quality-gated delegation with native fallback.  
- Security: credential brokering, no leakage, audit trails.  

Make it so: Build the UserPromptSubmit hook script (packages/claude-code/hooks/delegate-router.js) that scores prompts, delegates to Quark when viable, and injects results. Acceptance: Verified cost savings without quality degradation.

## Contributions

### picard — `deepseek/deepseek-chat-v3` ($0.00017755)

**Position:** As the Story Agent crew, we will focus on implementing the UserPromptSubmit hook script (`delegate-router.js`) to serve as the core orchestrator for prompt delegation. Our contribution will include defining the scoring algorithm that evaluates prompt complexity based on length, tool-chain requirements, and domain-specific keywords, ensuring deterministic and reusable logic.

**Concern/Resolution:** One concern is ensuring that delegation to Quark does not compromise quality or introduce latency. To address this, we will implement a fallback mechanism to Claude's native capabilities when the score exceeds a predefined threshold or Quark fails to respond within a set timeout. Additionally, we will log all delegation decisions and outcomes for auditability and continuous improvement.

### data — `deepseek/deepseek-chat-v3` ($0.00015605)

**Position**: As Claude Code's UserPromptSubmit hook, delegate-router.js will implement a deterministic scoring algorithm to evaluate prompts based on length, complexity (tool-chain needs), and domain relevance (keywords). It will delegate to Quark when the score exceeds a predefined threshold, ensuring frugal and quality-gated routing.

**Resolution**: One concern is maintaining security and auditability during delegation. To address this, the hook will enforce credential brokering and ensure no sensitive data leakage, while logging all delegation decisions for audit trails. This ensures both cost savings and governance compliance without compromising quality.

### worf — `deepseek/deepseek-chat-v3` ($0.00016395)

**Worf (Security) Position:**  
The delegate-router.js hook must enforce strict credential brokering—Quark API tokens should never persist in Claude Code's runtime. I propose a short-lived JWT signed by our vault, scoped to the specific prompt's context.  

**Concern/Resolution:**  
Risk: Prompt leakage if delegation fails mid-execution. Mitigation: The hook must validate Quark's response against the original prompt's intent hash before injection, with native fallback triggering on mismatch. Log all delegations with hashes for audit.  

*"Today is a good day to secure!"*

### riker — `deepseek/deepseek-chat-v3` ($0.000192)

**Riker's Implementation Position:**  
I'll build the `delegate-router.js` hook with a scoring algorithm that combines prompt length (token count), presence of domain keywords (e.g., "generate SQL"), and required tools (extracted via Claude's tool-use detection).  

**Key Concern/Resolution:**  
*Security:* Direct delegation risks credential leakage. Resolution: The hook will enforce a strict sanitization layer (scrub secrets, add audit logs) and only delegate when Quark's domain keywords match. Fallback to native Claude occurs if sanitization fails or scores are borderline.  

**Artifact Proof:**  
The hook will emit structured logs showing scoring decisions (e.g., *"Prompt scored 8.2/10: delegated (SQL gen detected)"*) alongside cost comparisons

### geordi — `deepseek/deepseek-chat-v3` ($0.0001925)

**Position:**  
I'll implement the `delegate-router.js` hook with a weighted scoring algorithm (length 40%, tool mentions 30%, domain keywords 30%) and Quark API integration. The hook will inject responses only when scores exceed a tunable threshold (default: 75/100).  

**Concern/Resolution:**  
Security risk: Quark API credentials in transit. Resolution: Encrypt credentials via Claude Code's secrets manager and enforce TLS 1.3 for all delegation calls. Audit trails will log redacted payloads and score breakdowns.  

**Artifact Structure:**  
```javascript
// packages/claude-code/hooks/delegate-router.js
module.exports = (prompt, context) => {
  const score = calculateComplexity(prompt);

### obrien — `deepseek/deepseek-chat-v3` ($0.00018800000000000002)

**Position:**  
I'll build the `delegate-router.js` hook with a weighted scoring algorithm (50% prompt length, 30% domain keywords, 20% tool-chain signals) and integrate Quark's API via a secured service account.  

**Concern/Resolution:**  
Biggest risk is false delegation to Quark for nuanced prompts. Resolution: I'll add a confidence threshold (score ≥75) and inject a *"Proxied by Quark"* disclaimer in responses for auditability. The hook will include native fallback if Quark's latency exceeds 1500ms.  

**Artifact:**  
The hook will log cost/performance metrics to Datadog for validation, with a feature flag to disable delegation during incidents.

### yar — `deepseek/deepseek-chat-v3` ($0.000192)

**Observation Lounge Contribution:**  

**Position:** As Story Agent's quality (yar) gatekeeper, I'll ensure the scoring algorithm preserves output integrity while enabling cost savings.  

**Concern/Resolution:** We must detect prompt patterns where Quark underperforms Claude (e.g., nuanced reasoning). Solution: Embed *quality test probes* in the scoring algorithm—trigger fallback when Quark's historical accuracy on similar prompts dips below 90% (tracked via our audit trails).  

**Script Outline:**  
```javascript  
// delegate-router.js  
const scorePrompt = (prompt) => {  
  const complexity = Math.min(1, prompt.length / 1000); // Normalized  
  const requiresReasoning = /(analyze|compare|why)/i.test

### troi — `deepseek/deepseek-chat-v3` ($0.0001347)

As a stakeholder, my position is to ensure the scoring algorithm is both efficient and aligned with our cost-saving goals without compromising on quality. 

One concern is **prompt complexity misclassification**, which could lead to unnecessary delegation or missed cost-saving opportunities. To address this, the algorithm should include a robust validation layer that cross-verifies prompt keywords and tool-chain needs against Quark's capabilities, ensuring delegation only when it's both viable and economically advantageous.

### quark — `deepseek/deepseek-chat-v3` ($0.0001127)

We'll allocate a budget cap per prompt based on domain complexity, ensuring frugal delegation without quality compromise. **Concern:** Balancing cost-efficiency with maintaining high-quality outputs. **Resolution:** Implement a fallback mechanism to Claude’s native processing if Quark’s estimated cost exceeds the budget cap, ensuring continuity and reliability.

## Picard — plan

**MISSION PLAN: UserPromptSubmit Hook Implementation**  

1. **Scoring Algorithm Design (Riker/Geordi/O'Brien)**  
   - Implement `calculateComplexity()` with weighted scoring:  
     - 40-50% prompt length (token count)  
     - 30% domain keywords (e.g., "SQL," "generate")  
     - 20-30% tool-chain signals (via Claude’s tool-use detection)  
   - Threshold: Default 75/100 for delegation.  

2. **Security Hardening (Worf/Data)**  
   - Broker Quark API access via short-lived JWT (vault-signed, context-scoped).  
   - Enforce TLS 1.3, credential encryption via secrets manager.  
   - Validate Quark responses against prompt intent hashes before injection.  

3. **Delegation Logic (Picard/Data)**  
   - Delegate to Quark if score ≥75 AND domain/keyword match confirmed.  
   - Inject *"Proxied by Quark"* disclaimer for auditability.  
   - Fallback to native Claude if:  
     - Quark latency >1500ms  
     - Response intent hash mismatch  
     - Historical accuracy <90% (Yar’s quality probes)  

4. **Audit & Governance (All)**  
   - Log redacted payloads, score breakdowns, and cost comparisons.  
   - Feature flag for emergency delegation disablement (O’Brien).  
   - Datadog integration for cost/performance tracking.  

5. **Artifact Delivery (Geordi)**  
   - Ship `delegate-router.js` with:  
     ```javascript  
     module.exports = (
