# Pre-filled from `aws` discovery (account 860268930466, default VPC vpc-25a3484e, us-east-2).
# Default VPC has only public subnets + no NAT → tasks use them with public IPs.
region             = "us-east-2"
vpc_id             = "vpc-25a3484e"
public_subnet_ids  = ["subnet-a8743dd2", "subnet-8c6b78e4", "subnet-1634855a"]
private_subnet_ids = ["subnet-a8743dd2", "subnet-8c6b78e4", "subnet-1634855a"]
assign_public_ip   = true
mcp_image          = "860268930466.dkr.ecr.us-east-2.amazonaws.com/story-agent-mcp:latest"
ui_image           = "860268930466.dkr.ecr.us-east-2.amazonaws.com/story-agent-ui:latest"
# acm_certificate_arn = ""   # omit → HTTP:80 listener (superseded when domain_name is set)

# Public subdomain: Terraform provisions the ACM cert (DNS-validated) + Route53 A-ALIAS → ALB and
# switches the ALB to HTTPS:443 (HTTP:80 redirects to it). Zone pbradygeorgen.com (Z0759101F61W3MIFHSWK).
domain_name       = "storyagent.pbradygeorgen.com"
route53_zone_name = "pbradygeorgen.com"
