# AWS Fargate deployment — Story Agent crew backend

Crew ruling (OpenRouter debate, stored to RAG `aws-fargate-decision`): **Fargate**, two services,
ElastiCache Redis, Secrets Manager. Rationale: long-running MCP + WebSocket with bursty 11-agent
missions rules out Lambda; App Runner lacks the Redis/sidecar story; EC2-ECS adds management overhead
with no cost win at current scale. LLM cost optimization lives in OpenRouter (per-task haiku/sonnet
tiering), so compute choice is about right-sizing + scale-to-need, which Fargate gives per-task.

## Topology
```
                Internet
                   │
              ALB (HTTPS)         ← WebSocket sticky sessions enabled
            ┌──────┴───────┐
            │              │
  ECS Svc: story-agent-mcp   ECS Svc: story-agent-ui
  2 vCPU / 4 GB              1 vCPU / 2 GB
  scale 1→4 @ CPU>65%        scale 1→2
  :3101 HTTP MCP             :3000 Next.js
  :3102 RAG read svc  ◄──────┘ (UI calls STORY_AGENT_RAG_URL)
  :8000 WebSocket
            │
   ElastiCache Redis (Serverless)   ← ephemeral cache + RAG sync queue (NOT a container)
   Supabase (cloud, hosted)         ← durable RAG (already live: strange-new-world)
   Secrets Manager (VPC endpoint)   ← story-agent/aha + story-agent/runtime
   OpenRouter (external)            ← cost-optimized LLM
```

## Build & push images
```bash
aws ecr create-repository --repository-name story-agent-mcp
aws ecr create-repository --repository-name story-agent-ui
docker build -f docker/Dockerfile.mcp -t <ECR>/story-agent-mcp:latest .
docker build -f docker/Dockerfile.ui  -t <ECR>/story-agent-ui:latest .
docker push <ECR>/story-agent-mcp:latest && docker push <ECR>/story-agent-ui:latest
```

## Secrets (Secrets Manager — single source of truth)
- `story-agent/aha` — `{ "AHA_DOMAIN": "...", "AHA_API_KEY": "..." }` (bootstrap: `pnpm run aws-secrets:put`).
  The MCP server reads it at runtime via the SDK (`AWS_AHA_SECRET_ID`), so the Aha key is never in env.
- `story-agent/runtime` — `{ "CREW_LLM_APPROVED_KEY","SUPABASE_CLOUD_URL","SUPABASE_CLOUD_KEY","REDIS_URL" }`,
  injected by the task `secrets` block (per-key valueFrom). `REDIS_URL` = the ElastiCache endpoint.
- Task role needs `secretsmanager:GetSecretValue` on both ARNs; execution role too (for the `secrets` block).

## Register services
Extract each task def and register, then create services:
```bash
jq '.["story-agent-mcp"]' deploy/ecs-fargate-task-defs.json > /tmp/mcp.json
aws ecs register-task-definition --cli-input-json file:///tmp/mcp.json
# ...same for story-agent-ui; then `aws ecs create-service` with the ALB target groups + autoscaling.
```
- ALB target groups: MCP → `:3102/rag/health` (health) + `:3101` (MCP) + `:8000` (WS, sticky); UI → `:3000`.
- Autoscaling: MCP target-tracking on CPU 65% (1→4); UI 1→2.

## Top caveat (crew-flagged) — WebSocket survival
**WS connections do NOT survive Fargate task replacement** (scale-in / deploy / recycle drops them mid-mission).
Mitigate: ALB sticky sessions + connection draining (`deregistration_delay` ≥ mission length), client
auto-reconnect, and treat crew-state as resumable from RAG (Supabase) rather than in-memory WS state.

## Production config notes
- `SUPABASE_MODE=live` → cloud-only (the resolver hard-fails instead of silently using a local fallback in an AWS runtime).
- `STORY_AGENT_RAG_DISABLE` unset → the RAG read service starts on :3102 (the UI's `STORY_AGENT_RAG_URL` points at it via service discovery).
- ARM64 (`runtimePlatform`) for ~20% Fargate cost savings; switch to X86_64 if a dep lacks arm builds.
