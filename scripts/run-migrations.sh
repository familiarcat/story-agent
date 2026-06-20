#!/bin/bash
# Automated Supabase migrations runner
# Uses Management API (HTTPS) to bypass corporate network TCP blockage
# Requires: SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_ID in ~/.zshrc

set -e

PROJECT_REF="${SUPABASE_PROJECT_ID:-sqachwmzyuuyyyxekdxp}"
API_TOKEN="${SUPABASE_ACCESS_TOKEN}"
MIGRATIONS_DIR="supabase"

if [ -z "$API_TOKEN" ]; then
  echo "ERROR: SUPABASE_ACCESS_TOKEN not set. Source ~/.zshrc first."
  exit 1
fi

MIGRATIONS=(
  "migration.sql"
  "20260605_crew_state_table.sql"
  "20260605_docs_knowledge_vectors.sql"
  "20260605_crew_memory_vectors.sql"
  "20260606_crew_starship_tables.sql"
  "20260607_client_security_policies.sql"
  "20260607_client_memory_isolation.sql"
  "20260611_create_clients_table.sql"
  "20260611_add_epics_table.sql"
  "20260611_add_client_id_to_audit.sql"
  "20260612_add_console_name_to_personas.sql"
)

echo "=== Supabase Migration Runner (Management API) ==="
echo "Project: $PROJECT_REF"
echo "Migrations: ${#MIGRATIONS[@]}"
echo ""

for i in "${!MIGRATIONS[@]}"; do
  FILE="${MIGRATIONS[$i]}"
  NUM=$((i + 1))
  TOTAL=${#MIGRATIONS[@]}
  
  if [ ! -f "$MIGRATIONS_DIR/$FILE" ]; then
    echo "❌ Migration $NUM/$TOTAL: $FILE NOT FOUND"
    exit 1
  fi
  
  SQL=$(cat "$MIGRATIONS_DIR/$FILE")
  
  echo "▶️  Running migration $NUM/$TOTAL: $FILE"
  
  # Call Supabase Management API to execute SQL
  RESPONSE=$(curl -s -X POST \
    "https://api.supabase.com/v1/projects/$PROJECT_REF/database/query" \
    -H "Authorization: Bearer $API_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"query\": $(echo "$SQL" | jq -Rs .)}" \
    2>&1)
  
  # Check for API errors
  if echo "$RESPONSE" | grep -q "error\|Error"; then
    echo "❌ Failed:"
    echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
    exit 1
  fi
  
  echo "✅ Migration $NUM/$TOTAL complete"
done

echo ""
echo "✅ All migrations completed successfully"
