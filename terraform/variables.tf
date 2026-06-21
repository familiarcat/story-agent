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
  description = "ECR image URI for the MCP server (docker/Dockerfile.mcp)"
  type        = string
}

variable "ui_image" {
  description = "ECR image URI for the Next.js UI (docker/Dockerfile.ui)"
  type        = string
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
  description = "ACM cert for the HTTPS listener. If empty, only an HTTP:80 listener is created."
  type        = string
  default     = ""
}

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
