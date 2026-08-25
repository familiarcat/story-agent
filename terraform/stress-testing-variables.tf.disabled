# Terraform Variables for AWS Lambda + EventBridge Infrastructure

variable "supabase_url" {
  description = "Supabase project URL"
  type        = string
  sensitive   = true
}

variable "supabase_key" {
  description = "Supabase API key"
  type        = string
  sensitive   = true
}

variable "github_token" {
  description = "GitHub personal access token"
  type        = string
  sensitive   = true
}

variable "aws_region" {
  description = "AWS region for Lambda and EventBridge deployment"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "prod"
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "stress_test_schedule_expression" {
  description = "EventBridge cron expression for stress test schedule"
  type        = string
  default     = "cron(0 2 ? * MON)"  # Every 2 weeks on Monday @ 02:00 UTC
}

variable "lambda_timeout_seconds" {
  description = "Lambda function timeout in seconds (max 900)"
  type        = number
  default     = 900  # 15 minutes (AWS Lambda maximum)
}

variable "lambda_memory_mb" {
  description = "Lambda function memory allocation in MB"
  type        = number
  default     = 512  # Worf's security boundary
}

variable "cost_threshold_usd" {
  description = "Cost threshold per stress test run"
  type        = number
  default     = 0.90  # Crew consensus
}

variable "cost_variance_percent" {
  description = "Acceptable cost variance percentage"
  type        = number
  default     = 5.0  # Crew consensus target
}

variable "lambda_p99_threshold_ms" {
  description = "Lambda P99 latency threshold in milliseconds"
  type        = number
  default     = 1200  # Yar's baseline
}

variable "lambda_concurrency_limit" {
  description = "Lambda concurrent execution limit"
  type        = number
  default     = 10  # Crew consensus
}

variable "alerting_email" {
  description = "Email address for SNS alerts (optional)"
  type        = string
  default     = ""
}
