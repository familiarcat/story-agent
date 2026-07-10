# Runbook — Redis TLS-in-transit cutover (crew infra-integration #2)

**Owner:** Geordi / O'Brien · **Reviewed:** Worf (secrets), Quark (cost) · **Risk:** cluster
**replacement = downtime.** Run in a maintenance window. Enabling `transit_encryption_enabled` +
`auth_token` on the existing ElastiCache replication group forces a **replacement** (ForceNew), so the
approval pub/sub + cache are briefly unavailable. The crew's strategy: stand up the encrypted group,
validate the WorfGate handoff with mock approval traffic, then cut over `REDIS_URL`.

The IaC is already committed ([terraform/redis.tf](../../terraform/redis.tf),
[terraform/variables.tf](../../terraform/variables.tf)) and `terraform validate` passes. This runbook
is the deploy half.

---

## 0. Prerequisites

- [ ] **AWS creds valid.** `aws sts get-caller-identity` must succeed (last attempt returned
      `InvalidClientTokenId` — refresh before starting).
- [ ] `terraform` ≥ 1.5, authenticated to the S3 backend.
- [ ] A maintenance window agreed (expect a few minutes of Redis unavailability; the app degrades
      gracefully — `db.ts` falls back to Supabase-only and the approval registry to its in-process
      Map, so a single-task deploy still functions, just without cross-task approval brokering).

## 1. Generate + stash the AUTH token (Worf: never commit it)

```bash
# 16–128 printable chars, no spaces/quotes.
export TF_VAR_redis_auth_token="$(openssl rand -base64 32 | tr -d '/+=' | cut -c1-40)"
```

Keep this value — it must also go into the `REDIS_URL` secret (step 4). Do **not** put it in
`terraform.tfvars` (committed) or any file in the repo.

## 2. Plan + apply (replacement)

TLS is gated behind `redis_transit_encryption` (default OFF) so normal deploys never touch Redis.
Flip it ON only here, with the token:

```bash
cd terraform
terraform init -input=false
terraform plan  -input=false -out=redis-tls.plan \
  -var "redis_transit_encryption=true" \
  -var "redis_auth_token=${TF_VAR_redis_auth_token}"   # expect: aws_elasticache_replication_group.redis must be replaced
terraform apply redis-tls.plan
```

> If you want zero-downtime instead of replacement, do a two-phase migration:
> set `transit_encryption_mode = "preferred"` first (accepts both `redis://` and `rediss://`),
> apply, cut over `REDIS_URL`, then set `mode = "required"` and apply again. The committed config goes
> straight to encrypted (downtime-accepted) for a single-node dev cache — add the mode field if you
> need the rolling path.

## 3. Verify encryption is on (acceptance check #1)

```bash
aws elasticache describe-replication-groups \
  --replication-group-id story-agent-redis \
  --query 'ReplicationGroups[0].TransitEncryptionEnabled'
# → true
```

## 4. Update the REDIS_URL secret to rediss:// + auth (acceptance check #2)

```bash
ENDPOINT=$(terraform output -raw redis_primary_endpoint 2>/dev/null \
  || aws elasticache describe-replication-groups --replication-group-id story-agent-redis \
       --query 'ReplicationGroups[0].NodeGroups[0].PrimaryEndpoint.Address' --output text)

aws secretsmanager put-secret-value \
  --secret-id story-agent/runtime \
  --secret-string "$(aws secretsmanager get-secret-value --secret-id story-agent/runtime \
      --query SecretString --output text \
      | jq --arg u "rediss://:${TF_VAR_redis_auth_token}@${ENDPOINT}:6379" '.REDIS_URL=$u')"
```

(`jq` merges so the other runtime secrets — `CREW_LLM_APPROVED_KEY`, `SUPABASE_CLOUD_*` — are
preserved.)

## 5. Roll the mcp service so it picks up the new secret (acceptance check #3)

```bash
aws ecs update-service --cluster story-agent --service story-agent-mcp --force-new-deployment
# Watch for a clean Redis connect (no NOAUTH, no plaintext attempts):
aws logs tail /ecs/story-agent-mcp --since 5m --follow
```

- [ ] mcp logs show a successful Redis connection (no errors). `db.ts` swallows connection errors
      silently, so "no Redis error noise + approvals work" is the signal — confirm via step 6.
- [ ] `curl -s https://<alb>/agent/health` → `{"ok":true,...}`

## 6. Prove the approval round-trip over TLS (acceptance check #4 — the integration test)

Point the committed integration test at the live encrypted endpoint:

```bash
REDIS_URL="rediss://:${TF_VAR_redis_auth_token}@${ENDPOINT}:6379" \
  RUN_MODE=integration pnpm --filter @story-agent/mcp-server exec \
  vitest run src/agent-core/approval-registry.integration.test.ts
# → 4 passed  (delivers approve, deny across connections; timeout→deny; no-waiter→false)
```

## 7. Rollback

- Keep the pre-cutover `REDIS_URL` value. To revert: `put-secret-value` it back, then
  `update-service --force-new-deployment`. The old (plaintext) cluster is gone after replacement, so
  rollback means re-applying with `transit_encryption_enabled = false` (another replacement) —
  prefer rolling **forward** (fix the token/URL) over rolling back.

---

## Done = ready for the front end

When steps 3–6 are green, the approval pub/sub path is encrypted and verified end-to-end, and the
backend contract in [docs/architecture/agent-sse-contract.md](../agent-sse-contract.md) is stable for the UI to
consume. That is the gate to move from infra/backend to front-end work.
