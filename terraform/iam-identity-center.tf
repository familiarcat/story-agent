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
