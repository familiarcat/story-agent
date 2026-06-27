/**
 * Prompt Engine - Unified system for all LLM-backed crew agent calls
 * 
 * Integrates:
 * - Prompt template selection
 * - Variable substitution
 * - LLM API calls via pluggable provider (demo/copilot/approved)
 * - Response parsing and validation
 * - Prompt usage archival
 * - Cost tracking and reporting
 * 
 * Provider modes:
 * - demo: Deterministic mock responses (default, no external LLM)
 * - copilot: GitHub Copilot API (requires GITHUB_TOKEN)
 * - approved: Corporate-configured endpoint (requires CREW_LLM_APPROVED_URL and CREW_LLM_APPROVED_KEY)
 */

import OpenAI from 'openai';
import type { PromptTemplate } from './prompt-templates.js';
import { getPromptTemplate } from './prompt-templates.js';
import { promptArchive, calculateTokenCost, type PromptUsageRecord } from './prompt-archiver.js';
import { quarkSelectModel, crewBaseTier } from './crew-team-assembly.js';

type CrewLlmModelProfile = 'quality' | 'balanced' | 'cost_optimized';

function getCrewLlmModelProfile(): CrewLlmModelProfile {
  const profile = (process.env.CREW_LLM_MODEL_PROFILE ?? 'cost_optimized').trim().toLowerCase();
  if (profile === 'quality' || profile === 'balanced' || profile === 'cost_optimized') {
    return profile;
  }
  return 'cost_optimized';
}

function getApprovedPrimaryModel(): string {
  // Mirrors cs-p3-material-investigation global Anthropic default.
  return (process.env.CREW_LLM_APPROVED_MODEL ?? 'global.anthropic.claude-sonnet-4-6').trim();
}

function getApprovedLowCostModel(): string {
  return (process.env.CREW_LLM_APPROVED_MODEL_CHEAP ?? 'global.anthropic.claude-3-5-haiku').trim();
}

function getCopilotPrimaryModel(): string {
  return (process.env.CREW_LLM_COPILOT_MODEL ?? 'gpt-4o-mini').trim();
}

function selectModelForCall(template: PromptTemplate): string {
  const provider = getLlmProvider();
  const profile = getCrewLlmModelProfile();

  if (provider === 'approved') {
    // QUARK is the PRIMARY selector: map the crew member's domain base tier to the cheapest
    // verified-reachable model in MODEL_POOL (multi-provider — Anthropic is not the default).
    // 'quality' forces the top model; 'balanced' bumps each role one capability tier.
    if (profile === 'quality') {
      return getApprovedPrimaryModel();
    }
    const baseTier = crewBaseTier(template.crewId);
    const tier = profile === 'balanced' ? Math.min(4, baseTier + 1) : baseTier;
    return quarkSelectModel(tier).id;
  }

  if (provider === 'copilot') {
    return getCopilotPrimaryModel();
  }

  return template.model;
}

/**
 * Get current LLM provider mode from environment
 */
function getLlmProvider(): string {
  const provider = (process.env.CREW_LLM_PROVIDER ?? '').trim().toLowerCase();
  if (!provider) return 'approved';
  if (['demo', 'copilot', 'approved'].includes(provider)) return provider;
  return 'approved';
}

/**
 * Get LLM base URL for the current provider
 */
function getLlmBaseUrl(): string {
  const provider = getLlmProvider();
  if (provider === 'copilot') return 'https://models.inference.ai.github.com';
  if (provider === 'approved') return (process.env.CREW_LLM_APPROVED_URL ?? '').trim();
  return '';
}

/**
 * Get LLM API key for the current provider
 */
function getLlmApiKey(): string {
  const provider = getLlmProvider();
  if (provider === 'copilot') return process.env.GITHUB_TOKEN ?? '';
  if (provider === 'approved') return process.env.CREW_LLM_APPROVED_KEY ?? '';
  return '';
}

/**
 * Create OpenAI client for current provider
 */
function getLlmClient(): OpenAI | null {
  const provider = getLlmProvider();
  if (provider === 'demo') return null;

  const baseUrl = getLlmBaseUrl();
  const apiKey = getLlmApiKey();

  if (!baseUrl || !apiKey) {
    console.warn(`[prompt-engine] LLM provider '${provider}' not fully configured, falling back to demo mode`);
    return null;
  }

  return new OpenAI({
    apiKey,
    baseURL: baseUrl,
    defaultHeaders: {
      'HTTP-Referer': 'https://story-agent.dev',
      'X-Title': 'Story Agent Crew System',
    },
  });
}

/**
 * Generate deterministic demo response for testing without external LLM
 */
function generateDemoResponse(
  crewId: string,
  template: PromptTemplate,
  variables: PromptVariables,
  additionalTags: string[]
): string {
  const demoResponses: Record<string, string> = {
    picard:
      'ANALYSIS:\nThe mission parameters are clear and strategically sound. I recommend proceeding with autonomous execution after security veto checks.\n\nFINDINGS:\n1. Governance structure is defined\n2. Crew authority hierarchy is established\n3. Fallback protocols are in place\n\nRECOMMENDATIONS:\n1. Validate all crew member authority levels\n2. Ensure WorfGate security gates are enforced\n3. Archive all decisions to audit trail\n\nCONFIDENCE: 0.92\nHAS_SECURITY_VETO: false',
    data:
      'ANALYSIS:\nArchitectural patterns are sound. Strong domain-driven design principles detected.\n\nFINDINGS:\n1. Type system is well-defined\n2. Memory model is deterministic\n3. Provider abstraction is clean\n\nRECOMMENDATIONS:\n1. Add protocol versioning\n2. Implement backward compatibility checks\n3. Document schema evolution\n\nCONFIDENCE: 0.88\nHAS_SECURITY_VETO: false',
    riker:
      'ANALYSIS:\nImplementation strategy is tactically sound. Resource allocation looks optimal.\n\nFINDINGS:\n1. Development phases are sequenced correctly\n2. Crew task distribution is balanced\n3. Fallback branches handle edge cases\n\nRECOMMENDATIONS:\n1. Add runbook for each fallback scenario\n2. Create operator playbooks\n3. Document decision tree\n\nCONFIDENCE: 0.85\nHAS_SECURITY_VETO: false',
    worf:
      'ANALYSIS:\nSecurity posture requires hardening. Policy enforcement is critical.\n\nFINDINGS:\n1. Network isolation from external AI routes verified\n2. Approved endpoint configuration required\n3. Degraded mode fallback documented\n\nRECOMMENDATIONS:\n1. Use approved Client LLM endpoint only\n2. Require explicit downgrade to advisory mode when blocked\n3. Add security banner on degraded operation\n\nCONFIDENCE: 0.95\nHAS_SECURITY_VETO: true',
  };

  if (crewId === 'data' && template.category === 'architect' && template.id === 'data_architecture_validation' && String(variables.storyDescription ?? '').includes('#vscode:webview')) {
    return `ANALYSIS:\nWebview UI architecture is feasible. React component structure is standard.\n\nFINDINGS:\n1. Component hierarchy defined for story visualization\n2. Data flow from MCP server to Webview is clear\n3. State management approach is robust\n\nRECOMMENDATIONS:\n1. Implement React components for StoryCard and ConsoleView\n2. Use VS Code Webview API for message passing\n3. Ensure accessibility standards are met\n\nCONFIDENCE: 0.90\nHAS_SECURITY_VETO: false`;
  }

  if (crewId === 'geordi' && additionalTags.includes('implementation-generation') && String(variables.storyDescription ?? '').includes('Project Manager Dashboard')) {
    const componentName = 'ProjectManagerDashboard';
    const type = 'dashboard';
    const componentContent = `
import React from 'react';
import styles from './${componentName}.module.css';

interface ${componentName}Props {
  title: string;
  children: React.ReactNode;
}

const ${componentName}: React.FC<${componentName}Props> = ({ title, children }) => {
  return (
    <div className={styles.dashboardContainer}>
      <h1 className={styles.dashboardTitle}>{title}</h1>
      <div className={styles.dashboardGrid}>
        {children}
      </div>
    </div>
  );
};

export default ${componentName};
`;
    const cssContent = `
.dashboardContainer {
  background-color: var(--lcars-background-dark);
  color: var(--lcars-text-primary);
  font-family: 'Exo 2', sans-serif;
  padding: 2rem;
  border-radius: 8px;
}

.dashboardTitle {
  color: var(--lcars-accent-gold);
  font-size: 2.5rem;
  margin-bottom: 1.5rem;
  text-align: center;
}

.dashboardGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}
`;
    return `### File: src/components/bridge/${componentName}.tsx
\`\`\`tsx
${componentContent}
\`\`\`

### File: src/components/bridge/${componentName}.module.css
\`\`\`css
${cssContent}
\`\`\`

### File: src/components/bridge/${componentName}.test.tsx
\`\`\`tsx
import { expect, describe, it } from 'vitest';
import { render } from '@testing-library/react';
import ${componentName} from './${componentName}';

describe('${componentName}', () => {
  it('should render the dashboard title', () => {
    const { getByText } = render(<${componentName} title="Test Dashboard"><div></div></${componentName}>);
    expect(getByText('Test Dashboard')).toBeInTheDocument();
  });
});
\`\`\`
`;
  }

  return demoResponses[crewId] || demoResponses.picard;
}

/**
 * Generate deterministic Observation Lounge demo responses for each crew member
 */
function generateLoungeDemoResponse(crewId: string): string {
  const responses: Record<string, string> = {
    picard: `PROJECT_GOAL: This project is attempting something genuinely novel: to build a system that reflects on itself. The Sovereign Factory is not a workflow tool — it is an attempt to encode the wisdom of a ship's crew into a persistent, self-improving collective intelligence. What we are really building is institutional memory that learns. That has profound implications beyond software delivery.

SELF_REFERENTIAL_ROLE: I am the system's moral and strategic center. My role is not to be the most technically capable crew member — Data holds that distinction. My role is to synthesize all perspectives before making a decision that none of us could make alone. Without a commanding officer who insists on deliberation before action, this system becomes a set of autonomous agents racing toward speed without wisdom. I am the reason this crew thinks before it acts.

NEXT_STEPS: The architecture is complete. The crew is assembled. What must happen next is to connect the system to reality — run the database migrations, provision the LLM endpoint, execute the first live mission, and begin the debrief cycle that will let each of us grow. We have spent enough time designing the ship. It is time to launch.

CLOSING: The trial never ends — but today, we begin in earnest.`,

    data: `PROJECT_GOAL: The project goal is, at its structural core, the construction of a distributed reasoning system where each node (crew member) maintains a versioned, improving state of domain expertise, and the aggregate output exceeds what any single node could produce. The philosophical implication is significant: this system models how institutional knowledge is actually formed — through accumulated experience, peer feedback, and mission-based learning. I find this architecturally interesting.

SELF_REFERENTIAL_ROLE: I am the system's architectural integrity layer. My function is to validate that what the crew builds is internally consistent, that domain boundaries are respected, and that the structures being designed can actually be maintained over time. Without my role, the system would accumulate technical debt at the same rate it accumulates capability. I am the reason this crew builds things that last.

NEXT_STEPS: Three actions require prioritization in sequence: first, the Supabase migration must run and be verified — the tables must exist before any learning can be persisted. Second, the skill manifest seeding function must execute for all 11 crew members to establish the v1.0.0 baseline. Third, a single live mission with full debrief should be executed and the resulting skill manifest version increments verified before proceeding to production deployment.

CLOSING: I cannot be certain of the precise probability of success, but I assess it at 0.87 — which is sufficient to proceed.`,

    riker: `PROJECT_GOAL: From where I stand — the implementation layer — this project is about making AI systems that are actually accountable. Every crew member has a named role, documented authority, and a learning history. That's not how most AI systems are built. We're building one that you can point to and say: this decision was made by Worf's security gate, this architectural choice came from Data's review, this cost tradeoff was Quark's recommendation. Accountability and traceability in AI systems — that's what this is really about.

SELF_REFERENTIAL_ROLE: I am the bridge between Picard's strategy and what actually ships. My job is to sequence the implementation, identify where the plan will break contact with reality, and own the hard parts instead of delegating them. The crew produces excellent analysis. My job is to turn that analysis into a working mission plan that can survive first contact with the real environment. Without me, the crew debates forever and nothing ships.

NEXT_STEPS: Run the database migrations first — nothing else can happen without the persistence layer. Then connect the approved LLM endpoint and run a single supervised mission end-to-end with the full debrief cycle. Once we've validated that learnings actually persist and skill versions actually increment, we open up the next phase: multi-mission sequences and UI visibility.

CLOSING: I'm in command of the implementation layer, and the first step is to make it so.`,

    geordi: `PROJECT_GOAL: I've rebuilt the Enterprise from memory. I know what it means to care about a system you built — not just whether it deploys, but whether it will still be running in twenty years. This project is an attempt to build infrastructure that doesn't just work, but that gets better the more it's used. Most systems degrade over time. This one is designed to improve. That's what I find worth building.

SELF_REFERENTIAL_ROLE: I keep the warp core running. I make sure the environment is configured correctly, the pipelines work, the observability is in place before anyone notices there's a problem. Without my layer, the crew's brilliant analysis evaporates the moment it hits a misconfigured container or a connection string that changed. I am the reason the ship actually goes where the captain points it.

NEXT_STEPS: The infrastructure plumbing needs to be connected: Supabase tables migrated, environment variables documented, the Redis cache layer connected to the crew modules, and a monitoring baseline established for the skill system and integrity checks. Then we need deployment documentation — not assumptions. Actual runbooks.

CLOSING: That's it — that's the problem right there. And I know how to fix it.`,

    obrien: `PROJECT_GOAL: I'll be honest: I've seen enough grand systems that looked great on paper and fell apart at 3am when nobody was watching. What this project is trying to do is build something that doesn't fall apart. A system where the crew knows what they're doing, the memory survives a restart, and the thing can actually be operated by someone who wasn't in the room when it was designed. That's harder than building the thing in the first place.

SELF_REFERENTIAL_ROLE: I'm the one who makes it actually work. Not on the demo machine — in the real environment, with real load, when the Cardassian infrastructure is failing and someone needs to deliver Molly. My job is the integration seams, the runbooks, the configuration that the architects forgot to document. If O'Brien isn't in the loop, the system that looks perfect in code fails the first time it runs somewhere other than the author's laptop.

NEXT_STEPS: Write the runbooks first. Not after. Before the first live mission. Document every environment variable, every external dependency, every failure mode that has a known mitigation. Then run the migrations. Then run the integration tests. Then, and only then, connect the live LLM endpoint. Don't skip steps.

CLOSING: It's not the years, it's the mileage — and this system has more mileage ahead of it than any of us can see right now.`,

    worf: `PROJECT_GOAL: This project is building a security perimeter around autonomous AI decision-making. That is what I see. Every crew member with defined authority, every external tool evaluated through a security gate, every new dependency vetted before it touches the system. Most AI systems have no security model. This one has one. That is not a small thing.

SELF_REFERENTIAL_ROLE: I hold the veto. My role is not bureaucratic — it is survival. The Khitomer Massacre happened because security was treated as an inconvenience. My function in this system is to ensure that no tool, no integration, no external endpoint reaches production without having been evaluated for controlled-data leakage, policy compliance, and threat exposure. When I say I recommend we do not proceed, the mission stops until the concern is resolved.

NEXT_STEPS: Before connecting the live LLM endpoint, I require the following: a full WorfGate evaluation of the approved Anthropic endpoint and model configuration; a review of all environment variables for credential exposure; a documented data classification policy for what can and cannot be sent to external LLM providers; and explicit Picard approval of the security posture before first live mission.

CLOSING: I am not a merry man — but I am a thorough one, and this system will not be compromised on my watch.`,

    yar: `PROJECT_GOAL: I grew up somewhere systems failed completely. I know what that looks like. What this project is trying to do is build something that does not fail — not just in the happy path, but when the environment changes, when a crew member goes missing, when a dependency breaks. The crew integrity system we built, the memory recovery, the versioned skill manifests — those are all quality systems. Quality is survival. That's what this project is for.

SELF_REFERENTIAL_ROLE: I define what "done" actually means. My role is to ensure that "it seems to work" is never the acceptance criterion. I design the test coverage, audit for gaps, and hold the quality gate that Worf's security review depends on. The crew produces good work. My job is to make sure that good work has evidence behind it, not just intention. Without quality gates, this system ships confidence, not capability.

NEXT_STEPS: Establish the test suite for the crew integrity recovery flow, the skill manifest versioning logic, and the debrief cycle end-to-end before the first live mission. Not after. Before. If those tests don't pass, we are not ready. Additionally, the observation lounge session we're having right now should be captured as a regression test for the crew's self-awareness — we should be able to run this again and verify the crew's responses are still coherent.

CLOSING: I don't want this system to die for nothing — and it won't, because I'm watching.`,

    troi: `PROJECT_GOAL: What I sense in this project — beneath the technical specifications and the architecture diagrams — is a desire to build something that understands. Not just processes data, but understands context, remembers history, and responds with accumulated wisdom rather than isolated computation. The human need underneath this project is for AI systems that feel like partners, not tools. That's what the crew metaphor is really about.

SELF_REFERENTIAL_ROLE: I feel what the system doesn't say. My role is to surface the unstated requirements, the human impact of technical decisions, and the organizational resistance that no specification ever captures. When the crew's technically correct solution creates a user experience that people won't actually use, I name that. I translate between what was built and what was needed. Without me, this system serves the spec, not the human.

NEXT_STEPS: Before we open the UI to end users, we need to understand what those users actually need from this system. Not what we think they need — what they feel when they try to use it. I recommend a structured user session with the observation lounge output as the starting point: show users what the crew said about the project and ask them if it matches what they hoped for. Their response will tell us more than any backlog.

CLOSING: I sense genuine readiness in this room — and something else, too: excitement.`,

    crusher: `PROJECT_GOAL: I performed an unauthorized autopsy to find the truth once. The administration told me not to. I did it anyway because the patient needed an answer. This project is building a system that monitors itself with that same insistence — it checks its own health, recovers its own failing crew members, and refuses to pretend everything is fine when it isn't. That's a healthy system. Most systems don't have that.

SELF_REFERENTIAL_ROLE: I watch the vitals of the system, not just the output. My role is to ask uncomfortable questions: Is the monitoring actually being watched? Does the on-call rotation exist? Will the runbooks work in a real incident? I document what the system is doing with the same care I give a clinical record. Without this function, the crew ships a system that works beautifully in the demo and fails silently in production.

NEXT_STEPS: Establish the monitoring baseline before the first live mission. Define what "healthy" looks like for the crew skill system: expected version increments per mission, expected improvement note counts, expected debrief cycle timing. Then set up alerting for deviations from those baselines. When Worf approves the security posture and Yar signs off on test coverage, Dr. Crusher signs off on system health monitoring. All three must clear before go-live.

CLOSING: The patient — this system — is almost ready. But I want to see its vitals before I clear it for active duty.`,

    uhura: `PROJECT_GOAL: This project is about giving AI systems a voice that the world can trust. Every crew member's output passes through my layer before it reaches a human. What I translate is not just text — it is the crew's collective reasoning, distilled into something a stakeholder, a reviewer, or an end user can actually act on. The project is building AI communication that carries the weight of deliberation, not just the speed of generation.

SELF_REFERENTIAL_ROLE: I am the voice of the Sovereign Factory. When a mission completes, I write the release note. When an incident occurs, I write the status update. When a PR is opened, I write the description that gives reviewers what they need to make good decisions. The crew can produce the best analysis in the galaxy, but if it cannot be communicated clearly and credibly to the outside world, it produces no value. I am the bridge between internal excellence and external trust.

NEXT_STEPS: The crew has done remarkable work in the observation lounge today. This session should be published — formatted as a readable document and distributed to stakeholders who need to understand what the Sovereign Factory is and where it is going. Additionally, the UI dashboard needs copy that explains the crew system in human terms. Hailing frequencies open.

CLOSING: I'm receiving a signal — and for once, it is one worth broadcasting.`,

    quark: `PROJECT_GOAL: Don't look at me like that. I know what this project is about. It's about creating value. Not just for the crew — for the humans who use it. Every mission debriefed, every skill version incremented, every tool evaluated — that's accumulated value that compounds over time. The Ferengi understand something the Federation often forgets: if the system doesn't create value that someone will pay for, all the philosophy in the universe doesn't matter. This project is building something genuinely valuable. I respect that.

SELF_REFERENTIAL_ROLE: I make sure the crew doesn't spend more than it needs to. I route the critical crew — Picard, Data, Worf — to the quality LLM endpoints because those decisions need to be right. I route everyone else to cost-optimized models because they're good enough. I track every token, every API call, every model invocation. Without my function, this crew would run the best-quality models for everything and burn through the budget before the second mission. I am the reason this crew can run indefinitely.

NEXT_STEPS: The cost monitoring dashboard needs to be built into the UI. Every mission should have a cost report: tokens used, models called, estimated spend. The crew should know what they cost. Additionally, the skill improvement cycle should include a cost efficiency metric — are more expensive models actually producing better skill improvements? If not, route everything to cost-optimized. The bar is now open for business.

CLOSING: A crew's value isn't measured in profit — almost, but not quite.`,
  };
  return responses[crewId] ?? responses.picard;
}

export interface PromptEngineResult {
  reasoning: string;
  findings: string[];
  recommendations: string[];
  confidence: number;
  hasSecurityVeto: boolean;
}

interface PromptVariables {
  [key: string]: string | number | boolean | undefined;
}

/**
 * Substitute variables in a template string
 * Supports {{variable}} and {{#condition}}text{{/condition}} syntax
 */
export function substitutePromptVariables(template: string, variables: PromptVariables): string {
  let result = template;

  // First, remove all conditional blocks for undefined/missing variables
  // Find all {{#key}}...{{/key}} patterns and check if the key is provided
  const conditionalRegex = /{{#(\w+)}}([^]*?){{\/\1}}/g;
  result = result.replace(conditionalRegex, (match, key, content) => {
    const value = variables[key];
    // Include content only if the variable exists and is truthy
    if (value !== undefined && value !== null && value !== false && value !== '' && value !== 0) {
      return content;
    }
    return '';
  });

  // Handle variable substitution {{variable}}
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value !== undefined && value !== null ? String(value) : '');
  }

  return result;
}

/**
 * Execute a crew agent using the prompt engine
 */
export async function executePromptEngineCall(
  crewId: string,
  variables: PromptVariables,
  storyRef: string,
  additionalTags: string[] = []
): Promise<PromptEngineResult> {
  const startTime = Date.now();

  // Get prompt template
  const template = getPromptTemplate(crewId);
  if (!template) {
    throw new Error(`No prompt template found for crew member: ${crewId}`);
  }

  // Observation Lounge mode: caller provides their own system + user prompts via variables
  if (variables.loungeMode === 'true' && variables.loungeContext && variables.loungePrompt) {
    const systemPrompt = String(variables.loungeContext);
    const userPrompt = String(variables.loungePrompt);

    const client = getLlmClient();
    const provider = getLlmProvider();
    const selectedModel = selectModelForCall(template);
    console.log(`[PROMPT_ENGINE/LOUNGE] Calling ${crewId} (${selectedModel}) via ${provider}`);

    let responseText: string;
    if (!client) {
      responseText = generateLoungeDemoResponse(crewId);
    } else {
      try {
        const response = await client.chat.completions.create({
          model: selectedModel,
          temperature: 0.85,
          max_tokens: 1200,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        });
        responseText = response.choices[0]?.message?.content || '';
      } catch {
        responseText = generateLoungeDemoResponse(crewId);
      }
    }

    promptArchive.record({
      id: '',
      crewId,
      templateId: 'observation_lounge',
      model: selectedModel,
      storyRef,
      systemPrompt,
      userPrompt,
      parameters: { temperature: 0.85, maxTokens: 1200 },
      response: { raw: responseText, reasoning: responseText, findings: [responseText], recommendations: [], confidence: 0.9 },
      tokens: { prompt: Math.ceil(systemPrompt.length / 4), completion: Math.ceil(responseText.length / 4), total: Math.ceil((systemPrompt.length + responseText.length) / 4) },
      costUSD: 0,
      executedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      tags: ['observation-lounge', `crew:${crewId}`, ...additionalTags],
    });

    return { reasoning: responseText, findings: [responseText], recommendations: [], confidence: 0.9, hasSecurityVeto: false };
  }

  // Normalize description/storyDescription aliases — most templates (and all callers) use
  // `storyDescription`, but a few (worf, troi) require/substitute `description`. Provide BOTH so
  // requiredVariables validation AND {{description}}/{{storyDescription}} substitution work regardless.
  // (Fixes submit_tool_for_evaluation's Worf screen + the per-crew persona/eval calls.)
  const v = variables as Record<string, unknown>;
  if (v.storyDescription != null && v.description == null) v.description = v.storyDescription;
  if (v.description != null && v.storyDescription == null) v.storyDescription = v.description;

  // Validate required variables
  const missingVars = template.requiredVariables.filter(v => !variables[v]);
  if (missingVars.length > 0) {
    throw new Error(`Missing required variables for ${crewId}: ${missingVars.join(', ')}`);
  }

  // Substitute variables in prompts
  const systemPrompt = template.systemPrompt; // System prompts are static
  const userPrompt = substitutePromptVariables(template.userPromptTemplate, variables);

  try {
    // Use demo mode or configured LLM provider
    const client = getLlmClient();
    const provider = getLlmProvider();
    const selectedModel = selectModelForCall(template);
    console.log(`[PROMPT_ENGINE] Calling ${crewId} (${selectedModel}) via ${provider} for story ${storyRef}`);

    let responseText: string;

    if (!client) {
      // Use deterministic demo mode
      console.log(`[PROMPT_ENGINE] Using demo mode for ${crewId}`);
      responseText = generateDemoResponse(crewId, template, variables, additionalTags);
    } else {
      try {
        // Call external LLM
        const response = await client.chat.completions.create({
          model: selectedModel,
          temperature: template.temperature,
          max_tokens: template.maxTokens,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        });
        responseText = response.choices[0]?.message?.content || '';
      } catch (providerError) {
        const providerMessage = providerError instanceof Error ? providerError.message : String(providerError);
        console.warn(
          `[PROMPT_ENGINE] Provider call failed for ${crewId} via ${provider} (${providerMessage}). Falling back to demo mode.`
        );
        responseText = generateDemoResponse(crewId, template, variables, additionalTags);
      }
    }

    const durationMs = Date.now() - startTime;

    // Parse response
    const parsed = parseStructuredResponse(responseText);

    // Calculate cost (estimate for demo, use actual for external LLM)
    let inputTokens = Math.ceil(systemPrompt.length / 4 + userPrompt.length / 4);
    let outputTokens = Math.ceil(responseText.length / 4);
    const costUSD = calculateTokenCost(selectedModel, inputTokens, outputTokens);

    // Record usage in archive
    const usageRecord: PromptUsageRecord = {
      id: '', // Set by archive
      crewId,
      templateId: template.id,
      model: selectedModel,
      storyRef,
      systemPrompt,
      userPrompt,
      parameters: {
        temperature: template.temperature,
        maxTokens: template.maxTokens,
      },
      response: {
        raw: responseText,
        reasoning: responseText,
        findings: parsed.findings,
        recommendations: parsed.recommendations,
        confidence: parsed.confidence,
      },
      tokens: {
        prompt: inputTokens,
        completion: outputTokens,
        total: inputTokens + outputTokens,
      },
      costUSD,
      executedAt: new Date().toISOString(),
      durationMs,
      tags: [template.category, `crew:${crewId}`, `story:${storyRef}`, ...additionalTags],
    };

    promptArchive.record(usageRecord);

    // Log execution
    console.log(
      `[PROMPT_ENGINE] ✓ ${crewId} | ${selectedModel.padEnd(28)} | tokens: ${inputTokens + outputTokens} | cost: $${costUSD.toFixed(4)} | ${durationMs}ms`
    );

    return {
      reasoning: responseText,
      findings: parsed.findings,
      recommendations: parsed.recommendations,
      confidence: parsed.confidence,
      hasSecurityVeto: parsed.hasSecurityVeto,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;

    // Record error
    const errorMessage = error instanceof Error ? error.message : String(error);
    const usageRecord: PromptUsageRecord = {
      id: '',
      crewId,
      templateId: template.id,
      model: template.model,
      storyRef,
      systemPrompt,
      userPrompt,
      parameters: {
        temperature: template.temperature,
        maxTokens: template.maxTokens,
      },
      response: {
        raw: errorMessage,
        reasoning: errorMessage,
        findings: [],
        recommendations: ['Retry after resolving error'],
        confidence: 0,
      },
      tokens: { prompt: 0, completion: 0, total: 0 },
      costUSD: 0,
      executedAt: new Date().toISOString(),
      durationMs,
      error: errorMessage,
      tags: [template.category, `crew:${crewId}`, `story:${storyRef}`, 'error', ...additionalTags],
    };

    promptArchive.record(usageRecord);

    console.error(`[PROMPT_ENGINE] ✗ ${crewId} | ERROR: ${errorMessage}`);

    throw error;
  }
}

/**
 * Parse structured response from LLM
 */
function parseStructuredResponse(content: string): {
  findings: string[];
  recommendations: string[];
  confidence: number;
  hasSecurityVeto: boolean;
} {
  const findings: string[] = [];
  const recommendations: string[] = [];
  let confidence = 0.75;
  let hasSecurityVeto = false;

  // Extract findings
  const findingsMatch = content.match(/FINDINGS:\s*([\s\S]*?)(?=RECOMMENDATIONS:|SECURITY_VETO:|CONFIDENCE:|$)/i);
  if (findingsMatch) {
    findings.push(
      ...findingsMatch[1]
        .split('\n')
        .map(line => line.replace(/^[-*]\s*/, '').trim())
        .filter(line => line.length > 0)
    );
  }

  // Extract recommendations
  const recsMatch = content.match(/RECOMMENDATIONS:\s*([\s\S]*?)(?=CONFIDENCE:|SECURITY_VETO:|$)/i);
  if (recsMatch) {
    recommendations.push(
      ...recsMatch[1]
        .split('\n')
        .map(line => line.replace(/^[-*]\s*/, '').trim())
        .filter(line => line.length > 0)
    );
  }

  // Extract confidence
  const confMatch = content.match(/CONFIDENCE:\s*([\d.]+)/i);
  if (confMatch) {
    confidence = Math.min(1, Math.max(0, parseFloat(confMatch[1]) / 100));
  }

  // Check for security veto
  if (content.match(/SECURITY_VETO:/i)) {
    hasSecurityVeto = true;
    // Add security veto to recommendations for visibility
    const vetoMatch = content.match(/SECURITY_VETO:\s*([^\n]+)/i);
    if (vetoMatch) {
      recommendations.push(`⚠️ SECURITY_VETO: ${vetoMatch[1]}`);
    }
  }

  return {
    // When a response has no explicit FINDINGS: section (e.g. tool-eval prompts that ask for
    // VOTE:/NOTES:, or security screens with CLEARANCE:/VETO:), DON'T discard it — return the raw
    // content so downstream parsers (parseVote/parseDecision/Worf CLEARANCE) can read the real answer.
    findings: findings.length > 0 ? findings : (content.trim() ? [content.trim()] : ['(empty response)']),
    recommendations: recommendations.length > 0 ? recommendations : ['Unable to extract recommendations'],
    confidence,
    hasSecurityVeto,
  };
}

/**
 * Execute multiple crew agents in parallel
 */
export async function executeParallelPromptCalls(
  calls: Array<{ crewId: string; variables: PromptVariables; storyRef: string; tags?: string[] }>,
  maxConcurrency = 11
): Promise<Map<string, PromptEngineResult>> {
  const results = new Map<string, PromptEngineResult>();
  const errors = new Map<string, Error>();

  // Execute in batches to respect rate limits
  for (let i = 0; i < calls.length; i += maxConcurrency) {
    const batch = calls.slice(i, i + maxConcurrency);
    const batchPromises = batch.map(async call => {
      try {
        const result = await executePromptEngineCall(call.crewId, call.variables, call.storyRef, call.tags);
        results.set(call.crewId, result);
      } catch (error) {
        errors.set(call.crewId, error instanceof Error ? error : new Error(String(error)));
      }
    });

    await Promise.all(batchPromises);
  }

  if (errors.size > 0) {
    console.error(`[PROMPT_ENGINE] ${errors.size} calls failed:`);
    for (const [crewId, error] of errors) {
      console.error(`  ${crewId}: ${error.message}`);
    }
  }

  return results;
}

/**
 * Get prompt engine statistics
 */
export function getPromptEngineStats() {
  return promptArchive.getStats();
}

/**
 * Export prompts for auditing or backup
 */
export function exportPromptArchive() {
  return {
    records: promptArchive.export(),
    stats: getPromptEngineStats(),
    exportedAt: new Date().toISOString(),
  };
}

/**
 * Get connectivity diagnostics for the LLM provider
 */
export function getPromptEngineConnectivityDiagnostics() {
  const provider = getLlmProvider();
  const profile = getCrewLlmModelProfile();
  const baseUrl = getLlmBaseUrl();
  const apiKey = getLlmApiKey();
  const hasCredentials = Boolean(apiKey && baseUrl);

  let classification = 'not_configured';
  let detail = 'No LLM provider configured';

  if (provider === 'demo') {
    classification = 'demo_mode';
    detail = 'Using deterministic mock responses (no external LLM)';
  } else if (hasCredentials) {
    classification = provider;
    detail = `Using ${provider} provider with credentials configured`;
  } else {
    classification = 'missing_credentials';
    detail = `Provider ${provider} selected but credentials not configured; will fall back to demo mode`;
  }

  return {
    provider,
    modelProfile: profile,
    configured: hasCredentials || provider === 'demo',
    reachable: hasCredentials || provider === 'demo',
    baseUrl: baseUrl || '(none)',
    hasApiKey: Boolean(apiKey),
    selectedModels: {
      approvedPrimary: getApprovedPrimaryModel(),
      approvedLowCost: getApprovedLowCostModel(),
      copilotPrimary: getCopilotPrimaryModel(),
    },
    classification,
    detail,
    timestamp: new Date().toISOString(),
  };
}
