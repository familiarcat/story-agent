# WorfGate Secret Rotation Runbook

This runbook defines the operational method for automated secret updates and rotation using WorfGate plus AWS Secrets Manager.

Primary direction for autonomous ops:

- AWS Secrets Manager is the source of truth.
- GitHub repository secrets are a mirrored consumer for CI/runtime compatibility.

## Objective

1. Resolve credentials through WorfGate (audited, never printed)
2. Synchronize active values into AWS Secrets Manager
3. Optionally trigger AWS-managed rotation when configured
4. Keep billable and consequential production actions behind explicit approval gates

## Preconditions

1. AWS CLI access works (`aws sts get-caller-identity`)
2. Runtime env includes `AHA_DOMAIN` and `AHA_API_KEY` in the secure source
3. `AWS_REGION` is set
4. Repo dependencies installed (`pnpm install`)

## Local Method (Operator)

1. Validate activation and credential presence:
   - `npm_config_yes=true pnpm run activation:status`
2. Dry-run secret sync (safe, no writes):
   - `pnpm run secrets:sync:aws:dry`
3. Apply secret update:
   - `pnpm run secrets:sync:aws`
4. Trigger rotation if the target secret already has rotation configured:
   - `pnpm run secrets:rotate:aws`

## Explicit Targeting

To use a specific AWS secret id:

- Dry-run:
  - `pnpm exec tsx scripts/worfgate-secrets-rotate.ts --secret-id story-agent/aha`
- Apply:
  - `pnpm exec tsx scripts/worfgate-secrets-rotate.ts --secret-id story-agent/aha --apply`
- Apply and trigger rotation:
  - `pnpm exec tsx scripts/worfgate-secrets-rotate.ts --secret-id story-agent/aha --apply --trigger-rotation`

## CI Automation

Workflow: `.github/workflows/worfgate-secret-rotation.yml`

1. Weekly schedule runs dry-run automatically
2. Manual dispatch can apply updates (`apply=true`)
3. Manual dispatch can also trigger rotation (`trigger_rotation=true`)
4. AWS auth uses OIDC role assumptions (no long-lived AWS keys in CI)

Required repository configuration:

1. Variables:
   - `AWS_REGION`
   - `AWS_DEPLOY_ROLE_ARN`
2. Secrets:
   - `AHA_DOMAIN`
   - `AHA_API_KEY`

## AWS Source -> GitHub Sync (Preferred Autonomous Path)

Workflow: `.github/workflows/aws-source-secret-sync.yml`

1. Weekly schedule runs dry-run automatically
2. Manual dispatch with `apply=true` mirrors values from AWS secret JSON into GitHub repo secrets
3. Default mappings are `AHA_DOMAIN` and `AHA_API_KEY`
4. AWS auth uses OIDC role assumptions (no long-lived AWS keys in CI)

Required repository configuration:

1. Variables:
   - `AWS_REGION`
   - `AWS_DEPLOY_ROLE_ARN`
2. GitHub token is provided by Actions automatically (`github.token`)

Local commands:

- Dry-run mirror:
  - `pnpm run secrets:sync:github-from-aws:dry -- --secret-id story-agent/aha`
- Apply mirror:
  - `pnpm run secrets:sync:github-from-aws -- --secret-id story-agent/aha --repo familiarcat/story-agent`

Note:

- Keep `.github/workflows/worfgate-secret-rotation.yml` for controlled AWS write/bootstrap operations.
- Use AWS->GitHub sync workflow for ongoing autonomous secret propagation.

## Security Posture

1. WorfGate broker resolves credentials and audits access
2. Script never prints secret values (only key names and fingerprints)
3. Dry-run is default
4. Apply and rotation are explicit flags

## Troubleshooting

1. `WorfGate missing AHA_API_KEY`:
   - Ensure `AHA_API_KEY` is present in secure env source
2. `aws secretsmanager rotate-secret failed`:
   - Rotation is not configured for that secret in AWS, or rotation Lambda is missing permissions
3. `post-write verification mismatch`:
   - Retry once; if persistent, inspect CloudTrail and Secrets Manager versions
