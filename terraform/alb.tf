# ALB fronting the two services. WebSocket sticky + long deregistration delay so missions
# survive deploys (the crew's top caveat: WS does not survive task replacement).

resource "aws_lb" "main" {
  name               = "${local.name}-alb"
  load_balancer_type = "application"
  subnets            = var.public_subnet_ids
  security_groups    = [aws_security_group.alb.id]
  idle_timeout       = 300 # keep long-lived WS/SSE connections alive
}

# UI (default) — Next.js :3000
resource "aws_lb_target_group" "ui" {
  name        = "${local.name}-ui"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"
  health_check {
    path     = "/dashboard"
    matcher  = "200-399"
    interval = 30
    timeout  = 5
  }
}

# MCP HTTP transport — :3101
resource "aws_lb_target_group" "mcp_http" {
  name                 = "${local.name}-mcp-http"
  port                 = 3101
  protocol             = "HTTP"
  vpc_id               = var.vpc_id
  target_type          = "ip"
  deregistration_delay = 300 # drain in-flight MCP requests
  health_check {
    port     = "3102"
    path     = "/rag/health"
    matcher  = "200"
    interval = 30
    timeout  = 5
  }
}

# MCP WebSocket crew-state — :8000, sticky so a client stays pinned to one task
resource "aws_lb_target_group" "mcp_ws" {
  name                 = "${local.name}-mcp-ws"
  port                 = 8000
  protocol             = "HTTP"
  vpc_id               = var.vpc_id
  target_type          = "ip"
  deregistration_delay = 600 # let an active mission's WS drain (≥ mission length)
  stickiness {
    type            = "lb_cookie"
    enabled         = true
    cookie_duration = 3600
  }
  health_check {
    port     = "3102"
    path     = "/rag/health"
    matcher  = "200"
    interval = 30
    timeout  = 5
  }
}

# Listener — HTTPS if a cert is provided, else HTTP:80.
resource "aws_lb_listener" "main" {
  load_balancer_arn = aws_lb.main.arn
  port              = var.acm_certificate_arn == "" ? 80 : 443
  protocol          = var.acm_certificate_arn == "" ? "HTTP" : "HTTPS"
  ssl_policy        = var.acm_certificate_arn == "" ? null : "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.acm_certificate_arn == "" ? null : var.acm_certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.ui.arn
  }
}

resource "aws_lb_listener_rule" "mcp_http" {
  listener_arn = aws_lb_listener.main.arn
  priority     = 10
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.mcp_http.arn
  }
  condition {
    path_pattern { values = ["/mcp", "/mcp/*", "/rag/*"] }
  }
}

resource "aws_lb_listener_rule" "mcp_ws" {
  listener_arn = aws_lb_listener.main.arn
  priority     = 5
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.mcp_ws.arn
  }
  condition {
    path_pattern { values = ["/ws", "/ws/*"] }
  }
}
