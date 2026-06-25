resource "aws_ecs_cluster" "main" {
  name = local.name
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

locals {
  runtime_secrets = [
    { name = "CREW_LLM_APPROVED_KEY", valueFrom = "${data.aws_secretsmanager_secret.runtime.arn}:CREW_LLM_APPROVED_KEY::" },
    { name = "SUPABASE_CLOUD_URL", valueFrom = "${data.aws_secretsmanager_secret.runtime.arn}:SUPABASE_CLOUD_URL::" },
    { name = "SUPABASE_CLOUD_KEY", valueFrom = "${data.aws_secretsmanager_secret.runtime.arn}:SUPABASE_CLOUD_KEY::" },
  ]
}

# ── MCP server task ─────────────────────────────────────────────────────────────
resource "aws_ecs_task_definition" "mcp" {
  family                   = "${local.name}-mcp"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "2048"
  memory                   = "4096"
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn
  runtime_platform {
    cpu_architecture        = "ARM64"
    operating_system_family = "LINUX"
  }
  container_definitions = jsonencode([{
    name      = "mcp"
    image     = var.mcp_image
    essential = true
    portMappings = [
      { containerPort = 3101, protocol = "tcp", name = "http-mcp" },
      { containerPort = 3102, protocol = "tcp", name = "rag" },
      { containerPort = 8000, protocol = "tcp", name = "ws" },
    ]
    environment = [
      { name = "SUPABASE_MODE", value = "live" },
      { name = "CREW_LLM_PROVIDER", value = "approved" },
      { name = "CREW_LLM_APPROVED_URL", value = "https://openrouter.ai/api/v1" },
      { name = "CREW_LLM_MODEL_PROFILE", value = "cost_optimized" },
      { name = "CREW_LLM_APPROVED_MODEL", value = var.openrouter_model },
      { name = "CREW_LLM_APPROVED_MODEL_CHEAP", value = var.openrouter_model_cheap },
      { name = "AWS_AHA_SECRET_ID", value = var.aha_secret_name },
      { name = "AWS_REGION", value = var.region },
      { name = "STORY_AGENT_HTTP_PORT", value = "3101" },
      { name = "STORY_AGENT_RAG_PORT", value = "3102" },
      { name = "STORY_AGENT_WS_PORT", value = "8000" },
    ]
    secrets = concat(local.runtime_secrets, [
      { name = "REDIS_URL", valueFrom = "${data.aws_secretsmanager_secret.runtime.arn}:REDIS_URL::" },
    ])
    healthCheck = {
      command     = ["CMD-SHELL", "node -e \"fetch('http://localhost:3102/rag/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))\""]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 30
    }
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.mcp.name
        "awslogs-region"        = var.region
        "awslogs-stream-prefix" = "mcp"
      }
    }
  }])
}

resource "aws_ecs_service" "mcp" {
  name            = "${local.name}-mcp"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.mcp.arn
  desired_count   = 1
  launch_type     = "FARGATE"
  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.service.id]
    assign_public_ip = var.assign_public_ip
  }
  load_balancer {
    target_group_arn = aws_lb_target_group.mcp_http.arn
    container_name   = "mcp"
    container_port   = 3101
  }
  load_balancer {
    target_group_arn = aws_lb_target_group.mcp_ws.arn
    container_name   = "mcp"
    container_port   = 8000
  }
  service_registries {
    # A-record discovery (servicediscovery.tf uses type=A), so no port here — port is SRV-only.
    # The UI connects to the resolved task IP on the known MCP port (3102).
    registry_arn = aws_service_discovery_service.mcp.arn
  }
  health_check_grace_period_seconds = 60
  depends_on                        = [aws_lb_listener.main]
}

# ── UI task ──────────────────────────────────────────────────────────────────
resource "aws_ecs_task_definition" "ui" {
  family                   = "${local.name}-ui"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "1024"
  memory                   = "2048"
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn
  runtime_platform {
    cpu_architecture        = "ARM64"
    operating_system_family = "LINUX"
  }
  container_definitions = jsonencode([{
    name         = "ui"
    image        = var.ui_image
    essential    = true
    portMappings = [{ containerPort = 3000, protocol = "tcp", name = "http" }]
    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "SUPABASE_MODE", value = "live" },
      { name = "STORY_AGENT_RAG_URL", value = "http://mcp.${local.name}.internal:3102" },
    ]
    secrets = local.runtime_secrets
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.ui.name
        "awslogs-region"        = var.region
        "awslogs-stream-prefix" = "ui"
      }
    }
  }])
}

resource "aws_ecs_service" "ui" {
  name            = "${local.name}-ui"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.ui.arn
  desired_count   = 1
  launch_type     = "FARGATE"
  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.service.id]
    assign_public_ip = var.assign_public_ip
  }
  load_balancer {
    target_group_arn = aws_lb_target_group.ui.arn
    container_name   = "ui"
    container_port   = 3000
  }
  depends_on = [aws_lb_listener.main]
}

# ── Autoscaling: MCP 1→4 on CPU 65% (bursty 11-agent missions); UI 1→2 ──────────
resource "aws_appautoscaling_target" "mcp" {
  max_capacity       = 4
  min_capacity       = 1
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.mcp.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}
resource "aws_appautoscaling_policy" "mcp_cpu" {
  name               = "${local.name}-mcp-cpu"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.mcp.resource_id
  scalable_dimension = aws_appautoscaling_target.mcp.scalable_dimension
  service_namespace  = aws_appautoscaling_target.mcp.service_namespace
  target_tracking_scaling_policy_configuration {
    predefined_metric_specification { predefined_metric_type = "ECSServiceAverageCPUUtilization" }
    target_value       = 65
    scale_in_cooldown  = 120
    scale_out_cooldown = 30
  }
}

resource "aws_appautoscaling_target" "ui" {
  max_capacity       = 2
  min_capacity       = 1
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.ui.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}
resource "aws_appautoscaling_policy" "ui_cpu" {
  name               = "${local.name}-ui-cpu"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ui.resource_id
  scalable_dimension = aws_appautoscaling_target.ui.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ui.service_namespace
  target_tracking_scaling_policy_configuration {
    predefined_metric_specification { predefined_metric_type = "ECSServiceAverageCPUUtilization" }
    target_value = 70
  }
}
