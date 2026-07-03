# Human entitlements — AWS IAM Identity Center (SSO) scaffold.
#
# Models the crew reorg's human-entitlement layer (docs/architecture/hierarchy-and-entitlements.md §4):
# groups that MIRROR the hierarchy tier -> client -> project, with TOP-DOWN inheritance enforced in the
# app (entitlements.ts) — a member of a higher group inherits everything below it.
#
# INERT BY DEFAULT: `enable_human_entitlements = false` so `terraform plan/apply` creates nothing until
# a top-level manager opts in and the Identity Center instance ARN is supplied. This is scaffolding —
# do NOT apply against a live SSO instance without explicit approval (it provisions real access).

variable "enable_human_entitlements" {
  description = "Provision IAM Identity Center groups for human entitlements. Keep false until approved."
  type        = bool
  default     = false
}

variable "identity_store_id" {
  description = "AWS IAM Identity Center identity store id (d-xxxx). Required only when enabled."
  type        = string
  default     = ""
}

# Hierarchy nodes that become groups. Membership at a node grants that node + everything below it
# (inheritance is enforced by the app's checkHumanEntitlement, not by IAM nesting). Seed/extend as the
# client + project registry grows; a manager approves additions.
variable "entitlement_groups" {
  description = "Hierarchy nodes to create as Identity Center groups, e.g. tier:enterprise, client:jonah, project:JONAH-RE-1."
  type        = list(string)
  default = [
    "tier:commercial",
    "tier:enterprise",
    # "client:jonah",
    # "project:JONAH-RE-1",
  ]
}

resource "aws_identitystore_group" "entitlement" {
  for_each          = var.enable_human_entitlements ? toset(var.entitlement_groups) : toset([])
  identity_store_id = var.identity_store_id
  display_name      = each.value
  description       = "Story Agent human entitlement node '${each.value}'. Members inherit this node and all levels below it (enforced in entitlements.ts)."
}

output "entitlement_group_ids" {
  description = "Map of hierarchy node -> Identity Center group id (empty until enabled)."
  value       = { for k, g in aws_identitystore_group.entitlement : k => g.group_id }
}

# Least-privilege policy for the crew's entitlement-automation principal (hardening: run the sync on
# THIS, not broad OpenRouterDeployer). Identity Store GROUP + MEMBERSHIP management + read only — NO
# sso-admin PermissionSets, NO iam:* policy writes. The crew shapes groups, never permissions.
resource "aws_iam_policy" "entitlement_automation" {
  count       = var.enable_human_entitlements ? 1 : 0
  name        = "story-agent-entitlement-automation"
  description = "Crew entitlement sync — IAM Identity Center group + membership management only (least privilege)."
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "IdentityStoreGroupsAndMemberships"
      Effect = "Allow"
      Action = [
        "identitystore:ListGroups", "identitystore:CreateGroup", "identitystore:DeleteGroup",
        "identitystore:DescribeGroup", "identitystore:GetGroupId",
        "identitystore:CreateGroupMembership", "identitystore:DeleteGroupMembership",
        "identitystore:ListGroupMemberships", "identitystore:ListGroupMembershipsForMember",
        "identitystore:ListUsers", "identitystore:DescribeUser",
        "sso-admin:ListInstances",
      ]
      Resource = "*"
    }]
  })
}

output "entitlement_automation_policy_arn" {
  description = "ARN of the least-privilege entitlement-automation policy (empty until enabled)."
  value       = var.enable_human_entitlements ? aws_iam_policy.entitlement_automation[0].arn : ""
}

# Dedicated least-privilege automation PRINCIPAL — the entitlement sync runs as THIS, not the broad
# OpenRouterDeployer. Gated on the same flag. NOTE: no aws_iam_access_key here on purpose — keys in
# tfstate are a leak; mint the access key out-of-band (console/CLI) and store it in ~/.alexai-secrets
# (WorfGate-brokered, never committed), or prefer the Fargate task role for in-cluster runs.
resource "aws_iam_user" "entitlement_bot" {
  count = var.enable_human_entitlements ? 1 : 0
  name  = "story-agent-entitlement-bot"
  tags  = { purpose = "crew-entitlement-automation", managed_by = "terraform", least_privilege = "true" }
}

resource "aws_iam_user_policy_attachment" "entitlement_bot" {
  count      = var.enable_human_entitlements ? 1 : 0
  user       = aws_iam_user.entitlement_bot[0].name
  policy_arn = aws_iam_policy.entitlement_automation[0].arn
}

output "entitlement_bot_user_name" {
  description = "Dedicated least-priv automation user (empty until enabled). Mint its access key out-of-band; store in ~/.alexai-secrets — never in tfstate/repo."
  value       = var.enable_human_entitlements ? aws_iam_user.entitlement_bot[0].name : ""
}
