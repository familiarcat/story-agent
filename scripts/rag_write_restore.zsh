#!/bin/zsh

# RAG Write Access Restoration Script
echo "🔵 Initializing RAG write access diagnostics..."

# 1. Environment validation
if [[ $(id -u) -eq 0 ]]; then
  echo "🔴 CRITICAL: Do not run as root" >&2
  exit 1
fi

RAG_DIR="/opt/storyagent/data"
if [[ ! -d "$RAG_DIR" ]]; then
  echo "🔴 MISSING: RAG directory at $RAG_DIR" >&2
  exit 1
fi

# 2. Postgres verification
if ! command -v psql &> /dev/null; then
  echo "🟡 Installing PostgreSQL client..."
  sudo apt-get update && sudo apt-get install -y postgresql-client-15
fi

# 3. Permission remediation
echo "🟢 Adjusting permissions for $RAG_DIR..."
sudo chown -R "$(id -u):$(id -g)" "$RAG_DIR"
chmod 770 "$RAG_DIR"

# Verification
if touch "$RAG_DIR/test_write" &> /dev/null; then
  rm "$RAG_DIR/test_write"
  echo "✅ RAG write access restored"
else
  echo "🔴 Write test failed" >&2
  exit 1
fi