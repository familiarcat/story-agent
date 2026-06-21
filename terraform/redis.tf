# ElastiCache Serverless Redis — ephemeral cache + RAG sync queue. Managed (not a container),
# per the crew ruling. The endpoint is injected into tasks as REDIS_URL.

resource "aws_elasticache_serverless_cache" "redis" {
  engine             = "redis"
  name               = "${local.name}-redis"
  description        = "Story Agent crew ephemeral cache + RAG sync queue"
  security_group_ids = [aws_security_group.redis.id]
  subnet_ids         = var.private_subnet_ids
  cache_usage_limits {
    data_storage {
      maximum = 5
      unit    = "GB"
    }
    ecpu_per_second {
      maximum = 5000
    }
  }
}

# NOTE: resolveAhaCredentials + the app read REDIS_URL from the runtime secret. After apply,
# put the rediss:// endpoint below into the `story-agent/runtime` secret (REDIS_URL):
#   rediss://${aws_elasticache_serverless_cache.redis.endpoint[0].address}:6379
