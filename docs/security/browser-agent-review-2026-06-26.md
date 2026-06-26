# Browser-Driven Agent Security Review (2026-06-26)

## Overview
This report evaluates the security of the browser-driven agent path, focusing on client-scope isolation, input validation, and the WorfGate governor system.

## Findings

### 1. Client-Scope Isolation
- **Issue**: The `/agent` endpoint lacks explicit client-scope isolation beyond token-based authentication.
- **Risk**: Unauthorized cross-client access if a token is compromised.
- **Recommendation**: Enforce client-specific workspace boundaries and access controls within `runAgentLoop`.

### 2. Input Validation
#### File Operations
- **Issue**: Only `apply_patch` explicitly validates paths; other file operations rely on WorfGate.
- **Risk**: Path traversal or injection if governor remediation fails.
- **Recommendation**: Extend explicit path validation to all file operations.

#### Shell Operations
- **Issue**: Limited validation of shell command arguments beyond destructive patterns.
- **Risk**: Command injection or unintended side effects.
- **Recommendation**: Implement stricter allowlisting for shell arguments.

### 3. Governor System Coverage
#### Tier Classification
- **Issue**: Unknown tools default to `yellow` tier, which may not always be safe.
- **Recommendation**: Default unknown tools to `red` tier and require explicit classification.

#### Coverage Gaps
- **Issue**: No monitoring of inter-agent communications or clipboard API usage.
- **Risk**: Data exfiltration or unauthorized interactions.
- **Recommendation**: Extend governor coverage to these areas.

### 4. Audit Trail
- **Issue**: Limited retention of agent invocation logs (`AGENT_AUDIT_MAX = 500`).
- **Risk**: Insufficient forensic data.
- **Recommendation**: Increase retention or offload logs to persistent storage.

## Summary
While the browser-driven agent path has robust protections (e.g., WorfGate governor), gaps remain in client isolation, input validation, and governor coverage. Addressing these will further harden the system against potential attacks.