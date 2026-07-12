# Unified VSCode Chat Response Architecture — Investigation Brief

## Executive Summary
**Goal**: Design and implement a unified async chat response system across all VSCode chat agents with a standardized response format that supports responsive UI updates, streaming feedback, and consistent state management.

**Scope**: VSCode Extension chat interface, all chat agents (story-agent, context-aware agents, third-party integrations)

**Benefit**: Single source of truth for chat responses → consistent UX, easier agent debugging, reusable async patterns

---

## Current State Analysis

### VSCode Chat Agents Today
```
┌─────────────────────────────────────────────┐
│ VSCode Chat Provider (stock interface)      │
├─────────────────────────────────────────────┤
│ Agent 1          │ Agent 2        │ Agent 3 │
│ (story-agent)    │ (context)      │ (3rd)   │
│ Response format? │ Response fmt?  │ Resp?   │
│ ✗ Inconsistent   │ ✗ Inconsistent │ ✗ None  │
└─────────────────────────────────────────────┘
```

### Pain Points
1. **No unified response format** — each agent returns different structure
2. **Async/streaming unclear** — hard to track progress or state
3. **UI responsiveness** — static blocks vs. live updating sections
4. **Error handling scattered** — no consistent error display pattern
5. **Metadata missing** — no execution time, cost, status tracking
6. **Re-execution opaque** — can't see why agent chose certain path

---

## Proposed Unified Chat Response Format

### Core Structure
```typescript
interface UnifiedChatResponse {
  // Identity
  agentId: string;           // 'story-agent', 'crew-lounge', etc.
  requestId: string;         // trace request through system
  timestamp: ISO8601;

  // Status & Lifecycle
  status: 'pending' | 'processing' | 'streaming' | 'complete' | 'error';
  phase?: string;            // 'analyzing', 'executing', 'synthesizing', etc.
  
  // Content (progressive disclosure)
  sections: ChatSection[];   // see below
  
  // Metadata for transparency
  metadata: {
    executionTimeMs: number;
    costUSD?: number;
    tokensUsed?: { input: number; output: number };
    confidence?: 0..1;
    model?: string;           // which LLM was used
  };
  
  // Interactivity
  actions?: ChatAction[];     // buttons: 'retry', 'debug', 'show-diff', etc.
  errors?: ChatError[];
  
  // Raw data for inspection
  raw?: {
    fullDebugTranscript?: string;
    rawOutput?: string;
  };
}

interface ChatSection {
  type: 'text' | 'code' | 'status' | 'error' | 'metrics' | 'visual';
  id: string;                // for updates
  title?: string;
  content: string;
  
  // Live update support
  isStreaming?: boolean;     // still receiving data
  priority?: 'primary' | 'secondary' | 'debug';
  
  // Styling hints
  severity?: 'info' | 'warning' | 'error' | 'success';
  collapsible?: boolean;
  expandedByDefault?: boolean;
  
  // Related data
  relatedSectionIds?: string[];
}

interface ChatAction {
  id: string;
  label: string;
  icon?: string;
  onClick: () => Promise<void>;
  disabled?: boolean;
}

interface ChatError {
  code: string;
  message: string;
  suggestion?: string;
  retryable?: boolean;
}
```

### Example Response: Crew Mission Pipeline
```json
{
  "agentId": "crew-mission-pipeline",
  "requestId": "req-abc123",
  "status": "complete",
  "sections": [
    {
      "id": "summary",
      "type": "text",
      "title": "Mission Result",
      "content": "Riker assembled team for database optimization task...",
      "priority": "primary"
    },
    {
      "id": "team-composition",
      "type": "text",
      "title": "Team Selected",
      "content": "• Riker (architect)\n• Quark (optimization)\n• Data (implementation)",
      "collapsible": true
    },
    {
      "id": "deliberation",
      "type": "text",
      "title": "Crew Deliberation",
      "content": "Debate on indexing strategy...",
      "collapsible": true,
      "expandedByDefault": false
    },
    {
      "id": "metrics",
      "type": "metrics",
      "content": "Cost: $0.047 | Tokens: 2341 | Time: 1.2s"
    }
  ],
  "metadata": {
    "executionTimeMs": 1234,
    "costUSD": 0.047,
    "confidence": 0.87
  },
  "actions": [
    {
      "id": "view-raw",
      "label": "View Full Deliberation",
      "onClick": "showRawResponse"
    },
    {
      "id": "retry",
      "label": "Re-run with Different Team",
      "onClick": "retryWithOptions"
    }
  ]
}
```

---

## Investigation Questions for Crew

### 1. **Architecture & Protocol**
- [ ] Should this be a formal protocol all agents MUST implement?
- [ ] Or a wrapper layer that adapts existing agent responses?
- [ ] Should we use existing VSCode Chat message types or extend?
- [ ] How to handle third-party agents that don't follow format?

### 2. **Streaming & Live Updates**
- [ ] How to stream partial sections as they update?
- [ ] Should sections be updatable (re-render) or append-only?
- [ ] WebSocket vs. polling vs. server-sent events?
- [ ] Conflict resolution if section updates race?

### 3. **UI Rendering**
- [ ] Markdown rendering with collapsible sections?
- [ ] Code blocks with syntax highlighting + copy button?
- [ ] Progress indicators (percentage, spinner)?
- [ ] Should metrics/actions be sticky or scroll with content?

### 4. **Async State Management**
- [ ] How to track request across SSE stream, agent execution, UI?
- [ ] Cancellation support (user stops mid-execution)?
- [ ] Retry logic (network failures, transient errors)?
- [ ] Session persistence (reload page, restore state)?

### 5. **Error Handling & Debugging**
- [ ] Standardized error codes across agents?
- [ ] Debug mode toggle to show raw transcript?
- [ ] Breadcrumb trail of decisions (agent → tool → result)?
- [ ] Cost tracking for cost-conscious users?

### 6. **Backwards Compatibility**
- [ ] Can we migrate existing agents gradually?
- [ ] Adapter layer for legacy responses?
- [ ] Deprecation period?
- [ ] Test coverage for format changes?

---

## Proposed Solution Options

### Option A: Strict Protocol (Best for long-term)
- All agents MUST return UnifiedChatResponse
- Formal schema validation
- Strict TypeScript interfaces
- Pro: Consistent, queryable, debuggable
- Con: Migration effort, potential for agents to bypass

### Option B: Adapter Layer (Pragmatic)
- Agents return existing format
- Wrapper converts to UnifiedChatResponse
- Gradual migration path
- Pro: No agent changes required upfront
- Con: Complex mapping logic, potential data loss

### Option C: Hybrid (Recommended)
- New agents use strict protocol
- Legacy agents wrapped with adapter
- Clear migration path + timeline
- Enforcement increases over time
- Pro: Pragmatic + long-term consistency
- Con: Two code paths temporarily

---

## Deliverables Requested

1. **Architecture Design Document**
   - Finalized UnifiedChatResponse schema
   - Protocol specification
   - Streaming mechanics
   - Error handling patterns

2. **Reference Implementation**
   - One complete agent using new format (story-agent CLI chat)
   - Example adapter for legacy agent
   - Full TypeScript types + validation

3. **UI Component Library**
   - React component to render UnifiedChatResponse
   - Collapsible sections, streaming support
   - Metrics display
   - Action buttons

4. **Migration Guide**
   - Step-by-step for existing agents
   - Breaking changes documented
   - Timeline + rollout plan

5. **Observability**
   - Response format versioning
   - Metrics: how many agents migrated
   - Error tracking: format validation failures

---

## Success Criteria

✅ **Protocol defined** — single source of truth  
✅ **Reference impl** — one agent fully implemented  
✅ **UI works** — responsive, streaming, collapsible  
✅ **Error handling** — standardized across agents  
✅ **Migration path** — clear for legacy agents  
✅ **Backwards compatible** — no breakage during rollout  

---

## Files to Create/Modify

- `packages/shared/src/chat-response-protocol.ts` — schema + types
- `packages/vscode-extension/src/chat/unified-response-renderer.tsx` — UI
- `packages/mcp-server/src/chat/response-formatter.ts` — helpers
- `docs/design/chat-protocol.md` — spec doc
- `packages/vscode-extension/src/chat/adapters/` — legacy converters

## Related Context

- Current VSCode chat implementation: `packages/vscode-extension/src/chatEngine.ts`
- Existing agent responses vary widely (unstructured text, JSON, markdown)
- Users need better visibility into: execution time, cost, confidence, errors
- Crew agents already structured (ObservationMemory), can be pattern source

---

**Severity**: Medium (improves UX, enables future features)  
**Scope**: Crew architecture deliberation + implementation  
**Effort**: 2-3 lounge sessions  
**Impact**: All VSCode chat interactions become consistent, debuggable, traceable
