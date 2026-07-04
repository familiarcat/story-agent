# Public subdomain + TLS — provisioned only when var.domain_name is set (default "" = no-op, keeps
# the HTTP:80 listener). The ALB requires its ACM cert in the SAME region as the ALB (us-east-2 here,
# the default provider) — NOT us-east-1 (that's only for CloudFront). DNS-validated via Route53.

locals {
  # want_https is a PURE-variable decision (no resource dependency) so the ALB security group can gate
  # 443 ingress without a dependency cycle on the cert.
  want_https = var.domain_name != "" || var.acm_certificate_arn != ""
  # The cert the HTTPS listener uses: the Terraform-provisioned one when domain_name is set (resolved
  # after validation via one()), else any pre-existing var.acm_certificate_arn.
  effective_cert_arn = var.domain_name != "" ? one(aws_acm_certificate_validation.app[*].certificate_arn) : var.acm_certificate_arn
}

data "aws_route53_zone" "domain" {
  count        = var.domain_name == "" ? 0 : 1
  name         = var.route53_zone_name
  private_zone = false
}

resource "aws_acm_certificate" "app" {
  count             = var.domain_name == "" ? 0 : 1
  domain_name       = var.domain_name
  validation_method = "DNS"
  tags              = var.tags
  lifecycle {
    create_before_destroy = true
  }
}

# DNS validation record(s) in the hosted zone (one per SAN; here just the apex subdomain).
resource "aws_route53_record" "cert_validation" {
  for_each = var.domain_name == "" ? {} : {
    for dvo in aws_acm_certificate.app[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      record = dvo.resource_record_value
    }
  }
  zone_id         = data.aws_route53_zone.domain[0].zone_id
  name            = each.value.name
  type            = each.value.type
  records         = [each.value.record]
  ttl             = 60
  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "app" {
  count                   = var.domain_name == "" ? 0 : 1
  certificate_arn         = aws_acm_certificate.app[0].arn
  validation_record_fqdns = [for r in aws_route53_record.cert_validation : r.fqdn]
}
