# Quark (Observation Lounge): budget-aware cost guardrail.
# Optional AWS Budgets monthly budget that emails at 80% (forecast) and 100% (actual) so an
# unexpected WebSocket/autoscale spike triggers review rather than a surprise invoice. Disabled
# by default (monthly_budget_usd = 0); set the budget + cost_alert_email in tfvars to enable.

resource "aws_budgets_budget" "monthly" {
  count        = var.monthly_budget_usd > 0 ? 1 : 0
  name         = "${local.name}-monthly"
  budget_type  = "COST"
  limit_amount = tostring(var.monthly_budget_usd)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = [var.cost_alert_email]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.cost_alert_email]
  }
}
