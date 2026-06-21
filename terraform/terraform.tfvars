# Pre-filled from `aws` discovery (account 860268930466, default VPC vpc-25a3484e, us-east-2).
# Default VPC has only public subnets + no NAT → tasks use them with public IPs.
region             = "us-east-2"
vpc_id             = "vpc-25a3484e"
public_subnet_ids  = ["subnet-a8743dd2", "subnet-8c6b78e4", "subnet-1634855a"]
private_subnet_ids = ["subnet-a8743dd2", "subnet-8c6b78e4", "subnet-1634855a"]
assign_public_ip   = true
mcp_image          = "860268930466.dkr.ecr.us-east-2.amazonaws.com/story-agent-mcp:latest"
ui_image           = "860268930466.dkr.ecr.us-east-2.amazonaws.com/story-agent-ui:latest"
# acm_certificate_arn = ""   # omit → HTTP:80 listener
