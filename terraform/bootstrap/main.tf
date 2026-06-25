# ── Bootstrap state (admin-only) — Observation Lounge architecture (Data/Geordi) ────────────────
# The GitHub OIDC provider + deploy role are PREREQUISITES for CI to authenticate, so they cannot
# live in the CI-managed state (chicken-and-egg). They live here in their OWN LOCAL state, applied
# only by an admin via scripts/worfgate-terraform.ts (WorfGate-brokered). CI never refreshes or
# recreates them — it only ASSUMES the role this module outputs.
#
# Apply (admin, rare):  npx tsx scripts/worfgate-terraform.ts -chdir-bootstrap apply
# Output github_actions_role_arn → GitHub repo var AWS_DEPLOY_ROLE_ARN.

terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.40"
    }
  }
  # Local state by design — admin-only, not shared with CI.
}

provider "aws" {
  region = var.region
  default_tags { tags = var.tags }
}

data "aws_caller_identity" "current" {}

variable "region" {
  type    = string
  default = "us-east-2"
}

variable "project" {
  type    = string
  default = "story-agent"
}

variable "github_repo" {
  description = "GitHub repo allowed to assume the deploy role, e.g. familiarcat/story-agent"
  type        = string
  default     = "familiarcat/story-agent"
}

variable "create_github_oidc_provider" {
  description = "Create the GitHub OIDC provider. Set false if the account already has one."
  type        = bool
  default     = true
}

variable "tags" {
  type    = map(string)
  default = { Project = "story-agent", ManagedBy = "terraform" }
}

locals {
  name = var.project
  # Wildcard for this project's secrets — admin-scoped; avoids a data source (and GetResourcePolicy).
  secret_arn_pattern = "arn:aws:secretsmanager:${var.region}:${data.aws_caller_identity.current.account_id}:secret:${var.project}/*"
}

resource "aws_iam_openid_connect_provider" "github" {
  count           = var.create_github_oidc_provider ? 1 : 0
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1", "1c58a3a8518e8759bf075b76b750d4f2df264fcd"]
}

locals {
  github_oidc_arn = var.create_github_oidc_provider ? aws_iam_openid_connect_provider.github[0].arn : "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/token.actions.githubusercontent.com"
}

data "aws_iam_policy_document" "github_assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [local.github_oidc_arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    # Worf: strict subject-claim — only the main branch may assume the deploy role (no wildcard).
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repo}:ref:refs/heads/main"]
    }
  }
}

resource "aws_iam_role" "github_actions" {
  name               = "${local.name}-github-deploy"
  assume_role_policy = data.aws_iam_policy_document.github_assume.json
}

# Deploy permissions: ECR push, ECS/ALB/ElastiCache/ServiceDiscovery/Route53/autoscaling/logs,
# read this project's secrets, S3+DynamoDB for the remote state backend, and project-scoped IAM.
data "aws_iam_policy_document" "github_deploy" {
  statement {
    sid       = "EcrPush"
    actions   = ["ecr:GetAuthorizationToken", "ecr:BatchCheckLayerAvailability", "ecr:CompleteLayerUpload", "ecr:InitiateLayerUpload", "ecr:PutImage", "ecr:UploadLayerPart", "ecr:BatchGetImage", "ecr:DescribeRepositories"]
    resources = ["*"]
  }
  statement {
    sid       = "DeployServices"
    # route53:* — aws_service_discovery_private_dns_namespace creates a Route53 hosted zone.
    actions   = ["ecs:*", "elasticloadbalancing:*", "elasticache:*", "servicediscovery:*", "route53:*", "application-autoscaling:*", "logs:*", "ec2:Describe*", "ec2:CreateSecurityGroup", "ec2:AuthorizeSecurityGroup*", "ec2:RevokeSecurityGroup*", "ec2:CreateTags", "ec2:DeleteSecurityGroup", "ec2:ModifySecurityGroupRules"]
    resources = ["*"]
  }
  statement {
    sid       = "ReadSecrets"
    actions   = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret", "secretsmanager:GetResourcePolicy"]
    resources = [local.secret_arn_pattern]
  }
  statement {
    sid       = "ManageProjectIamRoles"
    actions   = ["iam:CreateRole", "iam:DeleteRole", "iam:GetRole", "iam:PassRole", "iam:AttachRolePolicy", "iam:DetachRolePolicy", "iam:PutRolePolicy", "iam:DeleteRolePolicy", "iam:GetRolePolicy", "iam:ListRolePolicies", "iam:ListAttachedRolePolicies", "iam:TagRole"]
    resources = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/${local.name}-*"]
  }
  # Remote state backend access (S3 + DynamoDB lock) — so CI can read/write shared state.
  statement {
    sid       = "TerraformStateBackend"
    actions   = ["s3:ListBucket", "s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
    resources = [
      "arn:aws:s3:::tf-state-${data.aws_caller_identity.current.account_id}-${var.region}",
      "arn:aws:s3:::tf-state-${data.aws_caller_identity.current.account_id}-${var.region}/*",
    ]
  }
  statement {
    sid       = "TerraformStateLock"
    actions   = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:DeleteItem"]
    resources = ["arn:aws:dynamodb:${var.region}:${data.aws_caller_identity.current.account_id}:table/tf-locks"]
  }
}

resource "aws_iam_role_policy" "github_deploy" {
  name   = "deploy"
  role   = aws_iam_role.github_actions.id
  policy = data.aws_iam_policy_document.github_deploy.json
}

output "github_actions_role_arn" {
  description = "Set this as the GitHub repo variable AWS_DEPLOY_ROLE_ARN"
  value       = aws_iam_role.github_actions.arn
}
