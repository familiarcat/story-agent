#!/bin/bash
# Verification script for Story Agent MCP Crew Environment

echo "🚀 Starting Story Agent Crew Environment Verification..."
echo "========================================================="

# 1. Define Critical Variables
CRITICAL_VARS=(
  "STORY_AGENT_PATH"
  "SUPABASE_URL"
  "SUPABASE_KEY"
  "CREW_LLM_APPROVED_URL"
  "CREW_LLM_APPROVED_KEY"
  "CREW_LLM_MODEL_PROFILE"
  "WORFGATE_ENFORCE"
)

MISSING=0

# 2. Check Environment Variables
for VAR in "${CRITICAL_VARS[@]}"; do
  VALUE="${!VAR}"
  if [ -z "$VALUE" ]; then
    echo "❌ MISSING: $VAR"
    MISSING=$((MISSING + 1))
  else
    # Mask keys for security
    if [[ "$VAR" == *"KEY"* ]]; then
       echo "✅ LOADED:  $VAR (${VALUE:0:8}****************)"
    else
       echo "✅ LOADED:  $VAR ($VALUE)"
    fi
  fi
done

echo "---------------------------------------------------------"

# 3. Test Supabase Connectivity
if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_KEY" ]; then
  echo "📡 Testing Supabase Connectivity (via REST API)..."
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SUPABASE_URL/rest/v1/" -H "apikey: $SUPABASE_KEY")
  
  if [ "$HTTP_STATUS" == "200" ] || [ "$HTTP_STATUS" == "204" ]; then
    echo "✅ Supabase connection successful (HTTP $HTTP_STATUS)"
  else
    echo "❌ Supabase connection failed with status: $HTTP_STATUS"
  fi
else
  echo "❌ Skipping Supabase test: URL or Key not found."
fi

echo "========================================================="