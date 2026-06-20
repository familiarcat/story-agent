#!/bin/bash
# Cloud migration runner for the remote RAG store (strange-new-world).
# Applies ALL schema + RAG migrations via the Supabase Management API over HTTPS.
# Complete, dependency-ordered list — includes crew_personal_memory + documentation_rag
# which the original run-migrations.sh omitted.
#
# Requires: SUPABASE_ACCESS_TOKEN (Management API / PAT). Project ref defaults to
# strange-new-world; override with SUPABASE_PROJECT_ID.
set -euo pipefail

PROJECT_REF="${SUPABASE_PROJECT_ID:-rpkkkbufdwxmjaerbhbn}"
API_TOKEN="${SUPABASE_ACCESS_TOKEN:-}"
MIGRATIONS_DIR="supabase"

if [ -z "$API_TOKEN" ]; then
  echo "ERROR: SUPABASE_ACCESS_TOKEN not set."
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
  "20260607_crew_personal_memory.sql"
  "20260607_documentation_rag.sql"
  "20260610_create_sa_security_audit.sql"
  "20260611_create_clients_table.sql"
  "20260611_add_epics_table.sql"
  "20260611_add_client_id_to_audit.sql"
  "20260612_add_console_name_to_personas.sql"
  "20260613_add_ui_theme_color_to_personas.sql"
  "20260614_fix_documentation_source_unique.sql"
)

echo "=== Cloud Migration Runner (Management API) ==="
echo "Project: $PROJECT_REF | Migrations: ${#MIGRATIONS[@]}"
echo ""

FAILED=0
for i in "${!MIGRATIONS[@]}"; do
  FILE="${MIGRATIONS[$i]}"
  NUM=$((i + 1)); TOTAL=${#MIGRATIONS[@]}
  if [ ! -f "$MIGRATIONS_DIR/$FILE" ]; then
    echo "⚠️  $NUM/$TOTAL: $FILE NOT FOUND — skipping"
    continue
  fi
  SQL=$(cat "$MIGRATIONS_DIR/$FILE")
  echo "▶️  $NUM/$TOTAL: $FILE"
  RESPONSE=$(curl -s -X POST \
    "https://api.supabase.com/v1/projects/$PROJECT_REF/database/query" \
    -H "Authorization: Bearer $API_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"query\": $(echo "$SQL" | jq -Rs .)}")
  # Management API returns [] or rows on success; an object with "message"/"error" on failure.
  if echo "$RESPONSE" | jq -e 'type == "object" and (has("message") or has("error"))' >/dev/null 2>&1; then
    echo "   ❌ $(echo "$RESPONSE" | jq -c '.message // .error')"
    FAILED=$((FAILED + 1))
  else
    echo "   ✅ ok"
  fi
done

echo ""
if [ "$FAILED" -eq 0 ]; then echo "✅ All migrations applied"; else echo "⚠️  $FAILED migration(s) reported errors — review above"; fi