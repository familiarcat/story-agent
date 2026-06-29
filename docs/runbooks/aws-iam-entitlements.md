# Runbook — AWS IAM Identity Center entitlements (manual setup → hands-free, crew-managed)

> Crew-designed (O'Brien runbook · Worf governance · Geordi/Data automation · Picard ordering; stored
> to RAG). Goal: a **one-time human setup**, after which the **OpenRouter crew manages entitlements
> dynamically** — provisioning is automated; the *approval decision* always stays human (Worf's floor).

Today's blocker: `aws sts get-caller-identity` → **`InvalidClientTokenId`** — the creds in
`~/.alexai-secrets` / `~/.zshrc` are expired. Part 1 fixes that.

---

## Part 1 — MANUAL one-time setup (you, Brady)

### 1.1 Restore AWS access
Pick the path that matches how this account is configured:

```bash
# A) IAM Identity Center / SSO (preferred):
aws configure sso                 # set start URL + region, name the profile e.g. "story-agent"
aws sso login --profile story-agent
export AWS_PROFILE=story-agent    # add to ~/.alexai-secrets so the shell + crew inherit it

# B) Long-lived access keys (simpler, less ideal): put in ~/.alexai-secrets, NOT the repo:
#   export AWS_ACCESS_KEY_ID=...   export AWS_SECRET_ACCESS_KEY=...   export AWS_REGION=us-east-2

# Verify (this must succeed before anything else):
aws sts get-caller-identity
```
✅ **PASS:** returns your account/ARN (no `InvalidClientTokenId`).

### 1.2 Enable IAM Identity Center + capture its IDs
```bash
# Enable it once in the console (AWS IAM Identity Center → Enable), then:
aws sso-admin list-instances                       # → InstanceArn + IdentityStoreId
```
Record `IdentityStoreId` (`d-xxxxxxxxxx`) and the `InstanceArn`.

### 1.3 Apply the Terraform scaffold (already in repo, inert)
[terraform/iam-identity-center.tf](../../terraform/iam-identity-center.tf) creates one SSO group per
hierarchy node. Turn it on:
```bash
cd terraform
terraform apply \
  -var enable_human_entitlements=true \
  -var identity_store_id=d-xxxxxxxxxx
# starts with tier:commercial / tier:enterprise; client:/project: groups are added by the sync (Part 2)
```

### 1.4 Create the crew's least-privilege automation principal (Worf's floor)
A dedicated IAM role/user the crew uses **only** to sync groups + read memberships — **never** to
grant access by itself:
```jsonc
// least-privilege policy (identity store group management + read memberships ONLY)
{ "Effect": "Allow", "Action": [
    "identitystore:CreateGroup", "identitystore:DeleteGroup", "identitystore:ListGroups",
    "identitystore:CreateGroupMembership", "identitystore:DeleteGroupMembership",
    "identitystore:ListGroupMemberships", "identitystore:GetGroupId"
  ], "Resource": "*" }
```
Store its creds in `~/.alexai-secrets` (and AWS Secrets Manager for Fargate). **No `sso-admin` PermissionSet
or IAM-policy-write actions** — the crew can shape *groups*, not *permissions*.

> **The one thing that stays manual forever:** the **manager approval decision** to grant a human
> access at a level. Everything below is automated.

---

## Part 2 — HANDS-FREE automation (the crew builds + runs this)

Three pieces turn the entitlement seam ([entitlements.ts](../../packages/shared/src/entitlements.ts))
into a live, self-managing system:

1. **Hierarchy → IAM groups sync** (Geordi/Data). A crew job reads the Supabase `clients`/projects
   hierarchy and reconciles IAM Identity Center groups: `tier:<t>`, `client:<id>`, `project:<ref>` —
   create on registry growth, prune orphans, with a validation layer + audit log. Runs on change
   (onboard_client / new project) — so adding a client auto-creates its group. **No human step.**
2. **Live `EntitlementResolver`** (Data). Replaces the fail-closed stub via `setEntitlementResolver`:
   given a human, read their IAM Identity Center **group memberships** → `Grant[]` (e.g. membership in
   `client:jonah` → `{ scope:'client', id:'jonah', access:'write' }`). `checkHumanEntitlement` then
   enforces top-down inheritance. **No human step** per check.
3. **Approval → provisioning** (Riker/Worf). A crew MCP tool `request_entitlement` / `grant_entitlement`:
   - a human requests access at a level;
   - a **top-level manager approves** (the irreducible human gate — Worf: no auto-grant);
   - on approval the crew **automatically provisions** the IAM group membership (using the Part-1.4
     role) and records an audit entry. WorfGate enforces the resulting grant on every in-loop action.

### What's automated vs manual
| Step | Who |
|---|---|
| Create/prune IAM groups as clients/projects appear | **crew (auto)** |
| Resolve a human's grants from IAM memberships | **crew (auto)** |
| Enforce entitlement before an in-loop action | **crew / WorfGate (auto)** |
| **Approve** a human's access at a level | **manager (always human)** |
| Provision the membership *after* approval | **crew (auto)** |

## Ordering (Picard)
1. **Part 1** (you, once): restore creds → enable Identity Center → `terraform apply` → create the
   least-privilege automation role.
2. **First automation to build** (crew): the **hierarchy→IAM-groups sync** + the **live
   `EntitlementResolver`** — that alone makes reads/enforcement hands-free.
3. Then the **`request/grant_entitlement` MCP tool** (manager approval → auto-provision).

## Cost / audit (Quark/Worf)
IAM Identity Center itself is free; cost is negligible vs. the control it buys. Every group change +
membership grant is **audited** (CloudTrail + crew RAG); the automation role is least-privilege and
**cannot escalate** (no permission-write actions).
