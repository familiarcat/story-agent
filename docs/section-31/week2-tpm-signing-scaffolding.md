# Week 2 Prep: TPM Signing Deployment Scaffolding

**Mission Owner:** Worf  
**Target Delivery:** Friday EOD Week 1 (2026-07-18)  
**Gate Requirement:** Picard requires TPM-backed signing before Week 2 canary launch

---

## Executive Summary

**Objective:** Deploy TPM-backed signing infrastructure so every crew request to OpenRouter includes a cryptographically signed envelope with audit trail.

**Why TPM Signing?**
- Regulatory compliance (e.g., SOC 2, audit trails)
- Proof of crew identity (signer cert + timestamp)
- Tamper detection (signature validates request integrity)
- Audit trail for compliance + debugging

**Success Criteria:**
- [ ] TPM cert provisioned (never in repo, stored in ~/.alexai-secrets)
- [ ] Signing function deployed (crew-mission-pipeline.ts)
- [ ] Signature validation deployed (OpenRouter middleware)
- [ ] Audit trail logged (crew memory or durable table)
- [ ] All 5 test cases pass (sign, tamper, reject, missing sig, invalid cert)
- [ ] rollout.yml populated with live `tpm_sig` + `chain_of_custody_hash`

---

## Architecture Decision

### Design Choices

**Question 1: Where to sign?**
- Option A: Sign at VSCode extension (nativeChatProvider.ts)
- Option B: Sign at crew-mission-pipeline.ts (before OpenRouter dispatch)
- Option C: Sign at OpenRouter middleware (external)

**Decision:** Option B (sign at crew-mission-pipeline.ts)
- Rationale: centralized, all crew requests signed uniformly, easier audit
- Layer: `runMissionPipeline` → calls `signCrewRequest()` → adds X-Signature header → dispatch to OpenRouter

**Question 2: What to sign?**
- Option A: Sign entire request body (payload + context)
- Option B: Sign request hash only (faster, smaller signature)
- Option C: Sign subset (mission + officer, not sensitive data)

**Decision:** Option B (sign request hash)
- Rationale: efficient, tamper detection sufficient, privacy-preserving
- Hash algorithm: SHA256 (industry standard)
- Signature algorithm: RSA-2048 (FIPS-compliant)

**Question 3: Where to validate?**
- Option A: OpenRouter validates signature (requires their support)
- Option B: Middleware validates before dispatch (our control)
- Option C: Validate both places (defense-in-depth)

**Decision:** Option B (middleware validates before dispatch)
- Rationale: we control the validation logic, fail-fast, clear audit trail

---

## Implementation Roadmap

### Phase 1: TPM Cert Provisioning (Tue 2026-07-13)

**Task 1.1: Check existing TPM cert**
```bash
# Check if TPM cert exists in WorfGate credentials
ls ~/.alexai-secrets/tpm_cert.pem
ls ~/.alexai-secrets/tpm_key.pem

# Check AWS KMS or local HSM for cert
aws kms list-keys --region us-east-2  # if using AWS KMS
```

**Task 1.2: Provision TPM cert (if not exists)**

Option A: Use AWS KMS
```bash
# Create KMS key (if not exists)
aws kms create-key --description "Section-31-TPM-Signing" --region us-east-2

# Export cert to ~/.alexai-secrets/tpm_cert.pem (never committed)
# Retrieve via WorfGate: resolveWorfGateCredential('tpm_cert')
```

Option B: Generate local self-signed cert (for dev/dogfood)
```bash
openssl genrsa -out ~/.alexai-secrets/tpm_key.pem 2048
openssl req -new -x509 -key ~/.alexai-secrets/tpm_key.pem -out ~/.alexai-secrets/tpm_cert.pem -days 365 \
  -subj "/CN=storyagent-signer/O=Section31/C=US"
```

**Task 1.3: Extract cert metadata**
```
Cert serial: [extract from cert]
Cert chain: [CN, O, C, validity dates]
Key algorithm: RSA-2048
Signature algorithm: sha256WithRSAEncryption
```

**Deliverable:** TPM cert + key provisioned, metadata documented

---

### Phase 2: Signing Function Implementation (Wed 2026-07-15)

**Task 2.1: Create signCrewRequest() function**

Location: `packages/mcp-server/src/lib/crew-mission-pipeline.ts`

```typescript
import crypto from 'crypto';
import fs from 'fs';

interface CrewRequest {
  mission: string;
  officers: string[];
  context?: Record<string, any>;
}

interface SignedRequest extends CrewRequest {
  signature: string;  // base64-encoded RSA signature
  signingCert: {
    serial: string;
    subject: string;
    issuer: string;
  };
  signedAt: string;   // ISO 8601 timestamp
}

/**
 * Sign a crew request using TPM cert
 * @param request The crew request to sign
 * @param tpmKeyPath Path to TPM private key (from WorfGate)
 * @param tpmCertPath Path to TPM cert (from WorfGate)
 * @returns SignedRequest with signature + metadata
 */
export async function signCrewRequest(
  request: CrewRequest,
  tpmKeyPath: string,
  tpmCertPath: string
): Promise<SignedRequest> {
  // 1. Hash the request (SHA256)
  const requestJson = JSON.stringify(request, null, 0);  // compact JSON
  const hash = crypto.createHash('sha256').update(requestJson).digest();

  // 2. Sign the hash (RSA-2048)
  const privateKey = fs.readFileSync(tpmKeyPath, 'utf8');
  const signature = crypto
    .createSign('RSA-SHA256')
    .update(hash)
    .sign(privateKey, 'base64');

  // 3. Extract cert metadata
  const certPem = fs.readFileSync(tpmCertPath, 'utf8');
  const cert = parseCertificate(certPem);  // custom parser

  // 4. Return signed request
  return {
    ...request,
    signature,
    signingCert: {
      serial: cert.serialNumber,
      subject: cert.subject,
      issuer: cert.issuer,
    },
    signedAt: new Date().toISOString(),
  };
}

/**
 * Validate a signed crew request
 * @param signedRequest The signed request
 * @param tpmCertPath Path to TPM cert (for verification)
 * @returns boolean indicating whether signature is valid
 */
export function validateCrewSignature(
  signedRequest: SignedRequest,
  tpmCertPath: string
): boolean {
  try {
    // 1. Extract the request (without signature + metadata)
    const { signature, signingCert, signedAt, ...request } = signedRequest;

    // 2. Hash the request
    const requestJson = JSON.stringify(request, null, 0);
    const hash = crypto.createHash('sha256').update(requestJson).digest();

    // 3. Verify the signature
    const certPem = fs.readFileSync(tpmCertPath, 'utf8');
    return crypto
      .createVerify('RSA-SHA256')
      .update(hash)
      .verify(certPem, signature, 'base64');
  } catch (err) {
    console.error('Signature validation error:', err);
    return false;
  }
}

// Helper: parse certificate metadata
function parseCertificate(certPem: string) {
  // Use Node.js crypto.X509Certificate (v15.7+) or openssl CLI
  // For now, use openssl CLI as fallback
  const { execSync } = require('child_process');
  const output = execSync(`echo "${certPem}" | openssl x509 -text -noout`).toString();

  return {
    serialNumber: extractField(output, 'Serial Number'),
    subject: extractField(output, 'Subject:'),
    issuer: extractField(output, 'Issuer:'),
  };
}

function extractField(text: string, fieldName: string): string {
  const regex = new RegExp(`${fieldName}\\s*(.+?)(?:\\n|$)`);
  const match = text.match(regex);
  return match ? match[1].trim() : '';
}
```

**Task 2.2: Integrate signing into runMissionPipeline**

Location: `packages/mcp-server/src/lib/crew-mission-pipeline.ts` (runMissionPipeline function)

```typescript
export async function runMissionPipeline(
  mission: UserMission,
  clientId: string
): Promise<MissionResult> {
  // ... existing mission setup ...

  // NEW: Sign the mission request
  const tpmKeyPath = await resolveWorfGateCredentialAsync('tpm_key');
  const tpmCertPath = await resolveWorfGateCredentialAsync('tpm_cert');

  const crewRequest: CrewRequest = {
    mission: mission.objective,
    officers: mission.assignedOfficers || [],
    context: mission.context,
  };

  const signedRequest = await signCrewRequest(crewRequest, tpmKeyPath, tpmCertPath);

  // ... existing mission execution ...

  // Return result with signature metadata
  return {
    ...result,
    metadata: {
      ...result.metadata,
      signedAt: signedRequest.signedAt,
      signingCert: signedRequest.signingCert,
    },
  };
}
```

**Deliverable:** signCrewRequest() + validateCrewSignature() functions implemented

---

### Phase 3: Request Header Injection (Wed 2026-07-15)

**Task 3.1: Add signature headers to OpenRouter dispatch**

Location: `packages/mcp-server/src/lib/prompt-engine.ts` (or OpenRouter API client)

```typescript
/**
 * Dispatch a signed request to OpenRouter
 */
async function dispatchToOpenRouter(
  signedRequest: SignedRequest,
  model: string
): Promise<Response> {
  const headers = {
    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    'User-Agent': 'story-agent/1.0',
    // NEW: Add signature headers
    'X-Signature': signedRequest.signature,
    'X-Signature-Cert': signedRequest.signingCert.serial,
    'X-Signed-At': signedRequest.signedAt,
  };

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers,
    body: JSON.stringify(signedRequest),
  });

  return response;
}
```

**Deliverable:** Signature headers injected into every OpenRouter request

---

### Phase 4: Signature Validation + Audit Trail (Thu 2026-07-16)

**Task 4.1: Implement middleware validation**

Location: `packages/mcp-server/src/middleware/signature-validator.ts` (new file)

```typescript
/**
 * Middleware: Validate crew request signatures before dispatch
 */
export function createSignatureValidatorMiddleware(tpmCertPath: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    // 1. Check for signature headers
    const signature = req.headers['x-signature'] as string;
    const certSerial = req.headers['x-signature-cert'] as string;
    const signedAt = req.headers['x-signed-at'] as string;

    if (!signature || !certSerial || !signedAt) {
      return res.status(401).json({ error: 'Missing signature headers' });
    }

    // 2. Validate signature
    const signedRequest = req.body as SignedRequest;
    const isValid = validateCrewSignature(signedRequest, tpmCertPath);

    if (!isValid) {
      // Log audit trail: signature validation failed
      await logAuditTrail({
        event: 'signature_validation_failed',
        certSerial,
        requestHash: computeHash(signedRequest),
        reason: 'Signature did not match request',
        timestamp: new Date().toISOString(),
      });
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // 3. Log successful validation to audit trail
    await logAuditTrail({
      event: 'signature_validation_passed',
      certSerial,
      requestHash: computeHash(signedRequest),
      signedAt,
      timestamp: new Date().toISOString(),
    });

    // 4. Attach signature metadata to request for downstream use
    req.body.verifiedSignature = {
      valid: true,
      certSerial,
      signedAt,
    };

    next();
  };
}
```

**Task 4.2: Implement audit trail logging**

Location: `packages/mcp-server/src/lib/audit-trail.ts` (new file)

```typescript
interface AuditTrailEvent {
  event: 'signature_validation_passed' | 'signature_validation_failed' | 'invalid_cert';
  certSerial: string;
  requestHash: string;
  reason?: string;
  signedAt?: string;
  timestamp: string;
}

/**
 * Log crew request to audit trail
 */
export async function logAuditTrail(event: AuditTrailEvent): Promise<void> {
  // Option A: Log to crew memory (crew-side RAG)
  // await storeObservationMemory({
  //   tag: 'audit-trail',
  //   content: JSON.stringify(event),
  // });

  // Option B: Log to durable database table (e.g., supabase.audit_logs)
  const supabase = createClient();
  await supabase.from('audit_logs').insert({
    event: event.event,
    cert_serial: event.certSerial,
    request_hash: event.requestHash,
    signed_at: event.signedAt || null,
    reason: event.reason || null,
    created_at: event.timestamp,
  });

  // Option C: Log to file (for local dev)
  // const fs = require('fs');
  // fs.appendFileSync('/tmp/audit-trail.jsonl', JSON.stringify(event) + '\n');
}

/**
 * Retrieve audit trail (for dashboard + debugging)
 */
export async function getAuditTrail(
  filters?: {
    event?: string;
    certSerial?: string;
    startTime?: string;
    endTime?: string;
  }
): Promise<AuditTrailEvent[]> {
  const supabase = createClient();
  let query = supabase.from('audit_logs').select('*');

  if (filters?.event) query = query.eq('event', filters.event);
  if (filters?.certSerial) query = query.eq('cert_serial', filters.certSerial);
  if (filters?.startTime) query = query.gte('created_at', filters.startTime);
  if (filters?.endTime) query = query.lte('created_at', filters.endTime);

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}
```

**Deliverable:** Middleware validation + audit trail logging implemented

---

### Phase 5: End-to-End Testing (Thu–Fri 2026-07-16–17)

**Task 5.1: Test 1 — Valid Signature**
```bash
# Create a valid signed request
signedRequest = signCrewRequest(crewRequest, tpmKeyPath, tpmCertPath)

# Dispatch to test endpoint
POST /test/validate-signature
  Body: signedRequest

# Expect: 200 OK, "signature_validation_passed" logged to audit trail
```

**Task 5.2: Test 2 — Tampered Request**
```bash
# Create a valid signed request, then modify it
signedRequest = signCrewRequest(crewRequest, tpmKeyPath, tpmCertPath)
signedRequest.mission = "DIFFERENT MISSION"  # tamper

# Dispatch to test endpoint
POST /test/validate-signature
  Body: tampered signedRequest

# Expect: 401 Unauthorized, "signature_validation_failed" logged
```

**Task 5.3: Test 3 — Missing Signature**
```bash
# Create request without signature headers
request = crewRequest (no signature)

# Dispatch to test endpoint
POST /test/validate-signature
  Headers: (no X-Signature, X-Signature-Cert, X-Signed-At)

# Expect: 401 Unauthorized, "Missing signature headers" error
```

**Task 5.4: Test 4 — Invalid Cert Serial**
```bash
# Create valid signature but with wrong cert serial
signedRequest = signCrewRequest(crewRequest, tpmKeyPath, tpmCertPath)
signedRequest.signingCert.serial = "INVALID-SERIAL"  # tamper

# Dispatch to test endpoint
POST /test/validate-signature

# Expect: 401 Unauthorized, cert validation failed
```

**Task 5.5: Audit Trail Verification**
```bash
# Query audit trail for all validation events
GET /api/audit-trail?event=signature_validation_passed

# Expect: 4 entries (for successful tests)
# Check: all have correct certSerial, timestamps, requestHash

GET /api/audit-trail?event=signature_validation_failed

# Expect: 4 entries (for failed/tamper tests)
# Check: reasons match (tampered, missing header, invalid cert)
```

**Deliverable:** All 5 tests pass, audit trail verified

---

### Phase 6: rollout.yml Population (Fri 2026-07-17)

**Task 6.1: Extract TPM cert metadata**
```bash
openssl x509 -in ~/.alexai-secrets/tpm_cert.pem -text -noout | grep "Serial Number"
# Output: Serial Number: 1a2b3c4d5e6f7g8h

openssl x509 -in ~/.alexai-secrets/tpm_cert.pem -text -noout | grep "Issuer:"
# Output: Issuer: C = US, O = Section31, CN = storyagent-signer
```

**Task 6.2: Compute chain of custody hash**
```bash
# Hash the entire cert chain (including issuer cert if multi-level)
cat ~/.alexai-secrets/tpm_cert.pem ~/.alexai-secrets/tpm_issuer_cert.pem \
  | openssl dgst -sha256
# Output: SHA2-256(...) = a1b2c3d4e5f6g7h8...
```

**Task 6.3: Update rollout.yml**
```yaml
tpm_sig: "1a2b3c4d5e6f7g8h"  # TPM cert serial
chain_of_custody_hash: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0"  # SHA256 of cert chain
```

**Deliverable:** rollout.yml updated with live TPM metadata

---

## Acceptance Criteria (Picard's Gate)

- [ ] TPM cert provisioned (in ~/.alexai-secrets, never in repo)
- [ ] signCrewRequest() function deployed (crew-mission-pipeline.ts)
- [ ] validateCrewSignature() function deployed (middleware)
- [ ] X-Signature, X-Signature-Cert, X-Signed-At headers injected into all OpenRouter requests
- [ ] Audit trail logging deployed (crew memory or durable table)
- [ ] Test 1 (valid signature) PASS
- [ ] Test 2 (tampered request) PASS
- [ ] Test 3 (missing signature) PASS
- [ ] Test 4 (invalid cert serial) PASS
- [ ] Test 5 (audit trail) PASS
- [ ] rollout.yml populated with live `tpm_sig` + `chain_of_custody_hash`
- [ ] Deployment ready by Friday EOD Week 1

---

## Dependencies & Blockers

- **Blocker 1:** TPM cert provisioning (check if already exists in AWS KMS or local HSM)
- **Blocker 2:** WorfGate credential access (need resolveWorfGateCredentialAsync to retrieve cert + key)
- **Blocker 3:** Supabase migration (if using durable audit trail table, need to add table schema)
- **Blocker 4:** OpenRouter API stability (testing requires live dispatch to OpenRouter)

---

## Knowledge Retention

### Crew Memory Tags:
- `#section-31-tpm-signing` — TPM cert provisioning, signing function, audit trail
- `#worfgate-credentials` — TPM cert/key locations, credential access protocol
- `#audit-trail` — Crew request signatures logged, validation events tracked

### Reference Files:
- `packages/mcp-server/src/lib/crew-mission-pipeline.ts` — signCrewRequest() function
- `packages/mcp-server/src/lib/prompt-engine.ts` — OpenRouter dispatch + header injection
- `packages/mcp-server/src/middleware/signature-validator.ts` — Signature validation middleware
- `packages/mcp-server/src/lib/audit-trail.ts` — Audit trail logging
- `rollout.yml` — TPM metadata (tpm_sig, chain_of_custody_hash)

---

## Owner Sign-Off

**Worf (Security):**
- [ ] TPM infrastructure designed
- [ ] Signing function implemented
- [ ] Validation + audit trail verified
- [ ] All tests pass
- [ ] Ready for deployment

---

**Status:** READY FOR EXECUTION (Start Mon 2026-07-15)

🖖 **SECURE THE PERIMETER**
