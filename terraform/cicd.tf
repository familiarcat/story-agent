# GitHub Actions OIDC → AWS deploy role (codifies the CI/CD trust for .github/workflows/deploy.yml).
# Set var.github_repo = "owner/repo". Output github_actions_role_arn → set as repo var AWS_DEPLOY_ROLE_ARN.

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
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repo}:*"]
    }
  }
}

resource "aws_iam_role" "github_actions" {
  name               = "${local.name}-github-deploy"
  assume_role_policy = data.aws_iam_policy_document.github_assume.json
}

# Deploy permissions: ECR push, ECS/ALB/ElastiCache/ServiceDiscovery/autoscaling/logs, read secrets,
# and IAM management scoped to this project's roles (terraform creates the task/exec roles).
data "aws_iam_policy_document" "github_deploy" {
  statement {
    sid       = "EcrPush"
    actions   = ["ecr:GetAuthorizationToken", "ecr:BatchCheckLayerAvailability", "ecr:CompleteLayerUpload", "ecr:InitiateLayerUpload", "ecr:PutImage", "ecr:UploadLayerPart", "ecr:BatchGetImage", "ecr:DescribeRepositories"]
    resources = ["*"]
  }
  statement {
    sid       = "DeployServices"
    actions   = ["ecs:*", "elasticloadbalancing:*", "elasticache:*", "servicediscovery:*", "application-autoscaling:*", "logs:*", "ec2:Describe*", "ec2:CreateSecurityGroup", "ec2:AuthorizeSecurityGroup*", "ec2:RevokeSecurityGroup*", "ec2:CreateTags", "ec2:DeleteSecurityGroup", "ec2:ModifySecurityGroupRules"]
    resources = ["*"]
  }
  statement {
    sid       = "ReadSecrets"
    actions   = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
    resources = [data.aws_secretsmanager_secret.aha.arn, data.aws_secretsmanager_secret.runtime.arn]
  }
  statement {
    sid       = "ManageProjectIamRoles"
    actions   = ["iam:CreateRole", "iam:DeleteRole", "iam:GetRole", "iam:PassRole", "iam:AttachRolePolicy", "iam:DetachRolePolicy", "iam:PutRolePolicy", "iam:DeleteRolePolicy", "iam:GetRolePolicy", "iam:ListRolePolicies", "iam:ListAttachedRolePolicies", "iam:TagRole"]
    resources = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/${local.name}-*"]
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
