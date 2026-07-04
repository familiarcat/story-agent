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
    path    = "/dashboard"
    matcher = "200-399"
    # Fast convergence (Crusher deploy-health charter, OBS 508fa10b): default healthy_threshold=5 ×
    # interval=30 ≈ 150s to mark a task healthy — the deploy's main lag. 2 × 10s ≈ 20s instead.
    interval            = 10
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
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
    port    = "3102"
    path    = "/rag/health"
    matcher = "200"
    # Fast convergence (Crusher deploy-health charter): 2 × 10s ≈ 20s to healthy vs the ~150s default.
    interval            = 10
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
  }
}

# MCP WebSocket crew-state — :8000, sticky so a client stays pinned to one task
resource "aws_lb_target_group" "mcp_ws" {
  name        = "${local.name}-mcp-ws"
  port        = 8000
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"
  # 60s (was 600): under a Fargate vCPU quota of 2, a 10-min WS drain pins the old MCP task's vCPU and
  # starves the new task during a deploy (deadlock). Short drain keeps stop-before-start within quota.
  deregistration_delay = 60
  stickiness {
    type            = "lb_cookie"
    enabled         = true
    cookie_duration = 3600
  }
  health_check {
    port    = "3102"
    path    = "/rag/health"
    matcher = "200"
    # Fast convergence (Crusher deploy-health charter): 2 × 10s ≈ 20s to healthy vs the ~150s default.
    interval            = 10
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
  }
}

# Agent-core SSE endpoint (/agent + /symphony) is mounted on the SAME MCP HTTP server (port 3101)
# as /mcp — so it reuses the existing mcp_http target group. No separate target group, container
# port, or ECS load_balancer block → no slow ECS service replacement (crew deploy-optimization).

# Primary listener — HTTPS:443 when a cert is available (var.domain_name provisioned OR a pre-existing
# var.acm_certificate_arn), else HTTP:80. See locals in acm.tf.
resource "aws_lb_listener" "main" {
  load_balancer_arn = aws_lb.main.arn
  port              = local.want_https ? 443 : 80
  protocol          = local.want_https ? "HTTPS" : "HTTP"
  ssl_policy        = local.want_https ? "ELBSecurityPolicy-TLS13-1-2-2021-06" : null
  certificate_arn   = local.want_https ? local.effective_cert_arn : null

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.ui.arn
  }
}

# When HTTPS is on, redirect all HTTP:80 traffic → HTTPS:443 (301) so the site is HTTPS-only.
resource "aws_lb_listener" "http_redirect" {
  count             = local.want_https ? 1 : 0
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"
  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
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

# Agent-core HTTP routes → mcp_http TG (served on the 3101 server). Split across two rules because
# an ALB path-pattern condition allows at most 5 values.
resource "aws_lb_listener_rule" "mcp_agent" {
  listener_arn = aws_lb_listener.main.arn
  priority     = 8
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.mcp_http.arn
  }
  condition {
    path_pattern { values = ["/agent", "/agent/*", "/symphony", "/chat", "/cost"] }
  }
}

resource "aws_lb_listener_rule" "mcp_agent2" {
  listener_arn = aws_lb_listener.main.arn
  priority     = 7
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.mcp_http.arn
  }
  condition {
    path_pattern { values = ["/learnings", "/aha/*"] }
  }
}
