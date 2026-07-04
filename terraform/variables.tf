variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-2"
}

variable "project" {
  type    = string
  default = "story-agent"
}

variable "vpc_id" {
  description = "Existing VPC to deploy into"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnets for ECS tasks + ElastiCache"
  type        = list(string)
}

variable "public_subnet_ids" {
  description = "Public subnets for the ALB"
  type        = list(string)
}

variable "assign_public_ip" {
  description = "Give Fargate tasks public IPs. Set true for a default VPC (public subnets, no NAT) so tasks can pull images + reach OpenRouter/Supabase; false when private_subnet_ids have a NAT gateway."
  type        = bool
  default     = false
}

variable "mcp_image" {
  # Data (Observation Lounge): for reproducible deploys, the CI deploy step pins by DIGEST
  # (repo@sha256:…) — the digest is known only after `docker push`, so it's enforced there, not here.
  description = "ECR image URI for the MCP server (docker/Dockerfile.mcp). CI pins by digest at deploy."
  type        = string
  validation {
    condition     = var.mcp_image == "" || can(regex("\\.dkr\\.ecr\\..+\\.amazonaws\\.com/.+(:.+|@sha256:[0-9a-f]{64})$", var.mcp_image))
    error_message = "mcp_image must be a valid ECR URI (…/repo:tag or …/repo@sha256:<digest>)."
  }
}

variable "ui_image" {
  description = "ECR image URI for the Next.js UI (docker/Dockerfile.ui). CI pins by digest at deploy."
  type        = string
  validation {
    condition     = var.ui_image == "" || can(regex("\\.dkr\\.ecr\\..+\\.amazonaws\\.com/.+(:.+|@sha256:[0-9a-f]{64})$", var.ui_image))
    error_message = "ui_image must be a valid ECR URI (…/repo:tag or …/repo@sha256:<digest>)."
  }
}

variable "aha_secret_name" {
  description = "Secrets Manager name holding {AHA_DOMAIN, AHA_API_KEY} (bootstrap: pnpm run aws-secrets:put)"
  type        = string
  default     = "story-agent/aha"
}

variable "runtime_secret_name" {
  description = "Secrets Manager name holding {CREW_LLM_APPROVED_KEY, SUPABASE_CLOUD_URL, SUPABASE_CLOUD_KEY}"
  type        = string
  default     = "story-agent/runtime"
}

variable "acm_certificate_arn" {
  description = "Pre-existing ACM cert for the HTTPS listener. If empty AND domain_name is empty, only an HTTP:80 listener is created. Superseded by the cert Terraform provisions when domain_name is set."
  type        = string
  default     = ""
}

variable "domain_name" {
  description = "Public subdomain to serve the app on (e.g. storyagent.pbradygeorgen.com). When set, Terraform provisions an ACM cert (DNS-validated in route53_zone_name), a Route53 A-ALIAS → the ALB, and switches the ALB to an HTTPS:443 listener with an HTTP:80→443 redirect. Empty = current HTTP:80 behavior."
  type        = string
  default     = ""
}

variable "route53_zone_name" {
  description = "The Route53 public hosted zone that owns domain_name (e.g. pbradygeorgen.com). Only used when domain_name is set."
  type        = string
  default     = "pbradygeorgen.com"
}

variable "redis_transit_encryption" {
  description = "Enable ElastiCache TLS-in-transit. Default TRUE since the 2026-06-26 cutover (enabled in-place, mode=preferred) — keeping the default ON means normal CI deploys preserve encryption instead of reverting it. node-redis negotiates TLS from the rediss:// scheme in REDIS_URL."
  type        = bool
  default     = true
}

variable "redis_transit_mode" {
  description = "ElastiCache transit-encryption mode. Default 'required' (plaintext rejected) — the hardened end state since the 2026-06-26 cutover. NOTE: to enable TLS on a NEW-from-plaintext existing cluster you must first apply with 'preferred' (TLS allowed AND plaintext still accepted, zero dropped connections), then flip to 'required'; a brand-new encrypted cluster can be created as 'required' directly."
  type        = string
  default     = "required"
}

# Redis AUTH token is intentionally NOT a terraform variable: it is managed OUT-OF-BAND (aws
# elasticache modify-replication-group --auth-token --auth-token-update-strategy SET) and mirrored
# into the story-agent/runtime REDIS_URL secret, so the secret never passes through terraform vars or
# CI. The redis resource uses lifecycle.ignore_changes = [auth_token] so deploys don't revert it.

variable "openrouter_model" {
  type    = string
  default = "anthropic/claude-sonnet-4.6"
}

variable "openrouter_model_cheap" {
  type    = string
  default = "anthropic/claude-haiku-4.5"
}

variable "tags" {
  type    = map(string)
  default = { Project = "story-agent", ManagedBy = "terraform" }
}

# Quark (Observation Lounge): cost guardrails so a WebSocket/autoscale spike can't surprise the bill.
variable "monthly_budget_usd" {
  description = "Monthly cost budget (USD). 0 disables the AWS Budgets alarm."
  type        = number
  default     = 0
}

variable "cost_alert_email" {
  description = "Email to notify at 80%/100% of the monthly budget. Required if monthly_budget_usd > 0."
  type        = string
  default     = ""
}
