#!/bin/bash
# Idempotent git hooks installation for Story Agent

echo "Setting git hooks path to scripts/hooks"
git config core.hooksPath scripts/hooks

# Verify the hooks directory exists
mkdir -p scripts/hooks

# Make post-commit executable if it exists
if [ -f "scripts/hooks/post-commit" ]; then
  chmod +x scripts/hooks/post-commit
fi

echo "Git hooks configured successfully. Current hooks path:"
git config --get core.hooksPath