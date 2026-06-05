# Prompt Engineering & Archival System

## Overview

The Story Agent implements a comprehensive **Prompt Engineering Framework** that ensures all MCP LLM calls use proper system prompt design, archival, and auditing. This system is the foundation for reliable autonomous crew agent execution.

## System Architecture

### Three-Layer System

```
┌─────────────────────────────────────────────────┐
│ Application Layer                               │
│ (crew-agents.ts, story-tools.ts)               │
└──────────────┬──────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────┐
│ Prompt Engine Layer (prompt-engine.ts)         │
│ - Template selection                            │
│ - Variable substitution                         │
│ - Response parsing                              │
│ - Cost calculation                              │
└──────────────┬──────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────┐
│ Archival & Storage Layer                        │
│ - prompt-templates.ts (registry)                │
│ - prompt-archiver.ts (storage)                  │
│ - crew-memory-tools.ts (MCP exposure)          │
└─────────────────────────────────────────────────┘
```

## Components

### 1. Prompt Templates (`prompt-templates.ts`)

**Purpose:** Centralized registry of all system prompts with metadata and proper engineering.

**Each Template Includes:**
- Unique identifier (e.g., `picard_strategic_command`)
- Crew member ID (`picard`, `data`, etc.)
- Semantic category (executive, architect, developer, etc.)
- **Engineered system prompt** with expertise, decision authority, communication style, and constraints
- **Template user prompt** with variable placeholders (`{{variable}}`)
- Required variables validation
- Temperature and max_tokens settings
- Model assignment (claude-3-opus, gpt-4o-mini, etc.)
- Semantic guidelines for consistent behavior
- Expected output format specification

**Key Features:**
```typescript
interface PromptTemplate {
  id: string;                      // Unique identifier
  crewId: string;                  // Which crew member
  systemPrompt: string;            // The actual engineered prompt
  userPromptTemplate: string;      // Template with {{variables}}
  requiredVariables: string[];     // Validation
  model: string;                   // Assigned LLM model
  temperature: number;             // Creativity level
  maxTokens: number;               // Response length limit
  guidelines: string[];            // Semantic guidelines
  outputFormat: string;            // Expected response structure
}
```

### 2. Prompt Engine (`prompt-engine.ts`)

**Purpose:** Orchestrates all LLM calls with proper template management, variable substitution, and archival.

**Core Functions:**

#### `executePromptEngineCall()`
```typescript
export async function executePromptEngineCall(
  crewId: string,
  variables: PromptVariables,
  storyRef: string,
  additionalTags: string[] = []
): Promise<PromptEngineResult>
```

**Process:**
1. Load prompt template by crew ID
2. Validate required variables
3. Substitute variables in user prompt
4. Call LLM via OpenRouter with system + user prompt
5. Parse structured response (FINDINGS, RECOMMENDATIONS, CONFIDENCE)
6. Calculate token cost
7. **Archive usage record** with full metadata
8. Return parsed results

#### `substitutePromptVariables()`
- Supports `{{variable}}` syntax for direct substitution
- Supports `{{#condition}}text{{/condition}}` for conditional blocks
- Properly handles undefined variables

#### `executeParallelPromptCalls()`
- Executes multiple crew agents in parallel
- Respects rate limits with batching
- Aggregates results and errors
- Logs statistics

### 3. Prompt Archiver (`prompt-archiver.ts`)

**Purpose:** Records and audits all LLM calls for compliance, debugging, and analysis.

**Usage Record Format:**
```typescript
interface PromptUsageRecord {
  id: string;                    // Unique execution ID
  crewId: string;                // Which crew member
  templateId: string;            // Which prompt template
  model: string;                 // Which LLM model
  storyRef: string;              // Associated story
  systemPrompt: string;          // The system prompt used
  userPrompt: string;            // The user prompt used
  parameters: {...};             // Temperature, maxTokens
  response: {...};               // LLM response parsed
  tokens: {...};                 // Token usage
  costUSD: number;               // Calculated cost
  executedAt: string;            // When it ran
  durationMs: number;            // How long it took
  error?: string;                // Error if any
  tags: string[];                // For categorization
}
```

**Archive Capabilities:**
- **In-memory storage** with configurable max size (10,000 recent records)
- **Per-crew tracking** - query all calls by crew member
- **Per-story tracking** - audit trail for specific stories
- **Statistics aggregation** - costs, tokens, error rates
- **Export functionality** - export for external storage/compliance

**Automatic Recording:**
Every LLM call is automatically recorded with full context:
```
[PROMPT_ARCHIVE] picard | picard_strategic_command | STORY-123 | $0.0042 | 1240ms
[PROMPT_ARCHIVE] worf | worf_security_veto | STORY-123 | $0.0031 | 856ms
```

### 4. Crew Agents (`crew-agents.ts`)

**Purpose:** Implement the 11 Star Trek personas using the prompt engine.

**Refactored from inline prompts to template-based:**

**Before:**
```typescript
async function captainPicardAnalysis(context: CrewAgentContext) {
  const systemPrompt = `You are Captain Picard...`; // Inline
  const userPrompt = `Analyze story...`;           // Inline
  const result = await callCrewAgent(...);         // Unarchived
  return {...};
}
```

**After:**
```typescript
async function captainPicardAnalysis(context: CrewAgentContext) {
  const result = await executePromptEngineCall(
    'picard',                                      // Template selector
    {                                              // Variables
      storyNum: context.story.referenceNum,
      storyName: context.story.name,
      // ... other variables
    },
    context.story.referenceNum,                    // Story reference
    ['executive-analysis']                         // Tags
  );
  return resultToFinding('picard', result);        // Convert to CrewFinding
}
```

**Benefits:**
- Consistent system prompt engineering
- Automatic archival of all calls
- Cost tracking per crew member
- Easy prompt updates without code changes
- Full audit trail for compliance

## Prompt Engineering Principles

### System Prompt Structure

Each system prompt follows this structure for consistent behavior:

```
1. IDENTITY & ROLE
   "You are [Name], [Title] of the Sovereign Factory"

2. EXPERTISE STATEMENT
   Lists specific domains and capabilities

3. DECISION AUTHORITY
   Defines authority level and decision-making boundaries
   
4. COMMUNICATION STYLE
   How this crew member communicates

5. CONSTRAINTS
   What this crew member must respect
```

### Example: Captain Picard

```typescript
systemPrompt: `You are Captain Jean-Luc Picard, Commander of the Sovereign Factory.
Your role is STRATEGIC MISSION DECOMPOSITION and EXECUTIVE AUTHORITY.

EXPERTISE:
- Strategic mission planning and decomposition
- Executive decision-making under uncertainty
- Crew coordination and conflict resolution
- Enterprise-wide objective alignment

DECISION AUTHORITY: EXECUTIVE (Highest)
- You make final mission decisions
- You arbitrate crew conflicts
- You have veto over crew recommendations if they conflict with enterprise goals
- You escalate unresolved security concerns

COMMUNICATION STYLE:
- Dignified and authoritative
- Clear reasoning with precedent references
- Considers long-term strategic implications

CONSTRAINTS:
- Respect Worf's security veto (you can override only with security briefing)
- Consider stakeholder impact from Troi's analysis
- Factor financial constraints from Quark's analysis
- Never override security when Worf indicates blocking concern`
```

## Prompt Template Registry

### All 11 Crew Members

| Crew Member | ID | Model | Authority | Cost ($) |
|-------------|-----|-------|-----------|----------|
| Captain Picard | picard | claude-3-opus | executive | 0.001-0.002 |
| Commander Data | data | claude-3.5-sonnet | architectural | 0.004-0.005 |
| Commander Riker | riker | claude-3.5-sonnet | tactical | 0.004-0.005 |
| Geordi La Forge | geordi | claude-3.5-sonnet | infrastructure | 0.004-0.005 |
| Chief O'Brien | obrien | gpt-4o-mini | operational | 0.0005-0.001 |
| Lt. Worf | worf | gpt-4o-mini | security_veto | 0.0005-0.001 |
| Tasha Yar | yar | gemini-flash | quality | 0.0003-0.0006 |
| Counselor Troi | troi | claude-3-haiku | stakeholder | 0.0002-0.0003 |
| Dr. Crusher | crusher | claude-3.5-sonnet | observability | 0.004-0.005 |
| Lt. Uhura | uhura | gemini-1.5-pro | communications | 0.001-0.002 |
| Quark | quark | gpt-4o-mini | financial | 0.0005-0.001 |

## Variable Substitution System

### Template Variables

User prompt templates use `{{variable}}` syntax:

```
STORY: {{storyName}}
DESCRIPTION: {{storyDescription}}
ACCEPTANCE CRITERIA: {{acceptanceCriteria}}
REPOSITORY: {{repoFullName}} ({{targetBranch}})
{{#techStack}}TECH STACK: {{techStack}}{{/techStack}}
```

### Variable Types

```typescript
interface PromptVariables {
  storyNum: string;              // STORY-123
  storyName: string;             // User story title
  storyDescription: string;      // Full description
  acceptanceCriteria: string;    // Acceptance criteria
  repoFullName: string;          // owner/repo
  targetBranch: string;          // main or dev
  techStack?: string;            // Optional tech stack
  testPolicy?: string;           // Optional test policy
  reviewers?: string;            // Optional reviewer list
}
```

### Required Validation

Each template specifies required variables:
```typescript
requiredVariables: ['storyNum', 'storyName', 'acceptanceCriteria', 'repoFullName', 'targetBranch']
```

## Response Parsing & Validation

### Structured Response Format

All crew agents must return responses in this format:

```
FINDINGS: [Key findings or analysis]
RECOMMENDATIONS: [Specific recommendations or action items]
CONFIDENCE: [0-100 confidence score]
```

### Security Veto Format (Worf Only)

```
FINDINGS: [Security findings]
RECOMMENDATIONS: [Security controls]
SECURITY_VETO: [ONLY IF BLOCKING - triggers escalation]
CONFIDENCE: [0-100]
```

### Parser Implementation

```typescript
function parseStructuredResponse(content: string) {
  // Extract findings, recommendations, confidence
  // Detect SECURITY_VETO if present
  // Return normalized CrewFinding
}
```

## Cost Tracking & Optimization

### Token Cost Calculation

```typescript
function calculateTokenCost(model: string, inputTokens: number, outputTokens: number): number {
  // Current pricing (2024):
  // claude-3-opus: $0.000015/input, $0.000075/output
  // claude-3.5-sonnet: $0.003/input, $0.015/output
  // gpt-4o-mini: $0.00015/input, $0.0006/output
  // gemini-flash: $0.0375/output, $0.15/output per 1M tokens
  // ...
}
```

### Statistics Aggregation

Archive tracks costs by:
- **Crew member** - which agents are most expensive
- **Model** - which LLM models cost most
- **Story** - cost per story execution
- **Time** - cost trends over time

### Example Query Results

```
CREW EFFICIENCY ANALYSIS:

picard      | Execs:   5 | Tokens:  8230 | Cost: $0.0652 | Avg: 1646 tokens/$0.0130/call
data        | Execs:   5 | Tokens: 12540 | Cost: $0.1885 | Avg: 2508 tokens/$0.0377/call
riker       | Execs:   5 | Tokens: 11200 | Cost: $0.1680 | Avg: 2240 tokens/$0.0336/call
worf        | Execs:   5 | Tokens:  6340 | Cost: $0.0296 | Avg: 1268 tokens/$0.0059/call

Total: $0.4513 | 38310 tokens | 20 executions
```

## MCP Tools for Auditing

All prompt archival functions are exposed as MCP tools:

### `crew_prompt_statistics`
Get comprehensive statistics on all LLM calls

### `crew_prompt_history`
Retrieve recent prompt usage records

### `crew_member_prompt_history`
Audit trail for specific crew member

### `crew_story_prompt_audit`
All prompts and LLM calls for a story

### `crew_efficiency_analysis`
Performance metrics comparing crew members

## Compliance & Auditing

### Full Audit Trail

Every LLM call is recorded with:
- System prompt used (for compliance verification)
- User prompt sent (for debugging)
- Model called and parameters
- Token usage and cost
- Execution time
- Response content
- Timestamp and story reference
- Error information if any

### Export & Compliance

```typescript
const archive = exportPromptArchive();
// Returns:
// {
//   records: [...all 10000 usage records],
//   stats: {...aggregated statistics},
//   exportedAt: "2024-06-05T..."
// }
```

Use this for:
- Compliance reporting (who called what LLM when)
- Cost reconciliation
- Performance analysis
- Debugging and error investigation
- Security auditing (Worf veto tracking)

## Best Practices

### 1. Always Use the Prompt Engine

❌ **Don't:**
```typescript
const response = await openrouter.chat.completions.create({
  messages: [{role: 'system', content: somePrompt}],
  ...
});
```

✅ **Do:**
```typescript
const result = await executePromptEngineCall(
  'crewId',
  variables,
  storyRef,
  tags
);
```

### 2. Template Variables Over String Concatenation

❌ **Don't:**
```typescript
const userPrompt = `Story: ${story.name}. Description: ${story.description}...`;
```

✅ **Do:**
```typescript
const result = await executePromptEngineCall('picard', {
  storyName: story.name,
  storyDescription: story.description,
}, story.referenceNum);
```

### 3. Use Semantic Tags

```typescript
await executePromptEngineCall(
  'riker',
  variables,
  storyRef,
  ['tactical-implementation', 'frontend-backend-coordination', 'priority-high']
);
```

### 4. Monitor Costs

```typescript
const stats = getPromptEngineStats();
if (stats.totalCost > budget) {
  console.warn(`Budget exceeded: $${stats.totalCost} > $${budget}`);
}
```

## Example: Full Flow

### 1. User requests crew analysis

```typescript
const context = {
  story: ahaStory,
  repoFullName: 'company/product',
  targetBranch: 'main',
  techStack: 'Next.js + Prisma',
  testPolicy: 'Full test suite',
  reviewers: 'team-leads'
};
```

### 2. Crew agent calls Prompt Engine

```typescript
export async function captainPicardAnalysis(context: CrewAgentContext) {
  const result = await executePromptEngineCall(
    'picard',
    {
      storyNum: context.story.referenceNum,
      storyName: context.story.name,
      storyDescription: context.story.description,
      acceptanceCriteria: context.story.acceptanceCriteria,
      repoFullName: context.repoFullName,
      targetBranch: context.targetBranch,
      techStack: context.techStack,
    },
    context.story.referenceNum,
    ['executive-analysis']
  );
  return resultToFinding('picard', result);
}
```

### 3. Prompt Engine executes

- Loads `picard_strategic_command` template
- Validates all required variables present
- Substitutes `{{storyNum}}`, `{{storyName}}`, etc. into user prompt
- Calls Claude 3 Opus via OpenRouter with system + user prompt
- Parses response for FINDINGS, RECOMMENDATIONS, CONFIDENCE
- Calculates cost ($0.0042 for 1500 prompt + 200 completion tokens)
- **Records full usage record in archive**
- Returns `PromptEngineResult`

### 4. Archive logs execution

```
[PROMPT_ARCHIVE] picard | picard_strategic_command | STORY-123 | $0.0042 | 1240ms
```

### 5. User can audit

```typescript
const records = promptArchive.getStoryRecords('STORY-123');
// 11 records (one per crew member)
// Shows every LLM call, cost, tokens, duration
```

## Summary

The Prompt Engineering & Archival System ensures:

✅ **Consistent System Prompts** - Centralized registry, no inline prompts
✅ **Proper Variable Substitution** - Template-based with validation
✅ **Full Archival** - Every LLM call recorded with metadata
✅ **Cost Tracking** - Per-crew, per-model, per-story analysis
✅ **Compliance Ready** - Complete audit trail for auditing
✅ **Easy Maintenance** - Update prompts without code changes
✅ **Performance Metrics** - Efficiency analysis and optimization
✅ **MCP Exposure** - Query archive via MCP tools

This foundation enables reliable, auditable, cost-optimized autonomous agent execution.
