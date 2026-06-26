# ElastiCache Redis — ephemeral cache + RAG sync queue. Managed (not a container), per the crew
# ruling. A standard single-node cache.t4g.micro (Quark: ~$11/mo, ~8x cheaper than the serverless
# floor, and avoids serverless's opaque async create-failures). The endpoint → tasks as REDIS_URL.

resource "aws_elasticache_subnet_group" "redis" {
  name       = "${local.name}-redis"
  subnet_ids = var.private_subnet_ids
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "${local.name}-redis"
  description                = "Story Agent crew ephemeral cache + RAG sync queue"
  engine                     = "redis"
  node_type                  = "cache.t4g.micro"
  num_cache_clusters         = 1
  parameter_group_name       = "default.redis7"
  port                       = 6379
  subnet_group_name          = aws_elasticache_subnet_group.redis.name
  security_group_ids         = [aws_security_group.redis.id]
  at_rest_encryption_enabled = true
  # TLS-in-transit + AUTH (crew infra-integration #2, Worf): the approval pub/sub carries operator
  # decisions, so encrypt + authenticate the channel even inside the private SG. Enabled in-place on
  # 2026-06-26 (no replacement) via mode=preferred, then hardened to mode=required (plaintext rejected).
  # node-redis auto-negotiates TLS from the rediss:// scheme; the auth_token rides in the URL.
  # REDIS_URL is never logged (db.ts swallows connection errors, diagnostics expose only a bool).
  transit_encryption_enabled = var.redis_transit_encryption
  transit_encryption_mode    = var.redis_transit_encryption ? var.redis_transit_mode : null
  # auth_token is managed OUT-OF-BAND (see ignore_changes below) — never a terraform/CI var.
  automatic_failover_enabled = false
  # Required by ElastiCache to modify transit encryption (and applies other changes now, not in the
  # weekly maintenance window — correct for a single-node cache where deferred changes surprise).
  apply_immediately = true

  lifecycle {
    # The Redis AUTH token is set out-of-band (aws CLI) + mirrored into the REDIS_URL secret, so it
    # stays out of terraform state/vars/CI. Ignore it here so normal deploys never try to remove it.
    ignore_changes = [auth_token]
  }
}

# NOTE: after apply, put rediss://:<auth_token>@<endpoint>:6379 into the story-agent/runtime secret (REDIS_URL):
#   rediss://:${var.redis_auth_token}@${aws_elasticache_replication_group.redis.primary_endpoint_address}:6379
