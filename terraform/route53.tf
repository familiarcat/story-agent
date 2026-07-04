# A-ALIAS record pointing the subdomain at the ALB (only when var.domain_name is set). An alias (not
# a CNAME) so the zone apex-style record resolves directly to the ALB with no extra hop / cost.
resource "aws_route53_record" "app_alias" {
  count   = var.domain_name == "" ? 0 : 1
  zone_id = data.aws_route53_zone.domain[0].zone_id
  name    = var.domain_name
  type    = "A"
  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}
