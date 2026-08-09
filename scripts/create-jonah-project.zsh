#!/usr/bin/env zsh
# create-jonah-project.zsh
#
# Run from the ROOT of the Story-Agent repository.
#
# Purpose:
#   1. Resolve the client "Jonah" using a universal search literal.
#   2. Ask the deployed Story-Agent crew to plan the new project.
#   3. Require a verified plan before mutation.
#   4. Create a project workspace containing:
#        - research/source artifacts
#        - print/PDF presentation
#        - Next.js web presentation
#   5. Optionally invoke the deployed project-mutation API.
#
# IMPORTANT:
#   This script deliberately does NOT invent the AWS endpoint, auth scheme,
#   or DDD command names. Those MUST come from the deployed system or the
#   repository configuration.
#
# Expected configuration (environment or .env.local/.env.story-agent):
#
#   STORY_AGENT_API_BASE_URL="https://..."
#   STORY_AGENT_API_TOKEN="..."
#
# Optional endpoint overrides:
#   STORY_AGENT_HEALTH_PATH="/health"
#   STORY_AGENT_CREW_PATH="/api/crew/mission"
#   STORY_AGENT_RESOLVE_CLIENT_PATH="/api/clients/resolve"
#   STORY_AGENT_CREATE_PROJECT_PATH="/api/projects"
#
# Optional:
#   STORY_AGENT_PROJECTS_PATH="/api/projects"
#   STORY_AGENT_MCP_URL="https://..."
#
# Usage:
#   ./scripts/create-jonah-project.zsh --plan
#   ./scripts/create-jonah-project.zsh --execute
#   ./scripts/create-jonah-project.zsh --discover
#
# --plan is the default and NEVER mutates production state.
# --execute requires the crew to return an explicit mutation plan and a
# verified canonical client ID.

set -e
setopt pipefail

SCRIPT_DIR="${0:A:h}"
REPO_ROOT="${SCRIPT_DIR:h}"
cd "$REPO_ROOT"

MODE="plan"
CLIENT_LITERAL="CLIENT_SEARCH::JONAH"
PROPERTY_URL="https://www.zillow.com/homedetails/3432-Chippewa-St-Saint-Louis-MO-63118/2943575_zpid/"
PROJECT_SLUG="jonah-3432-chippewa"
PROJECT_NAME="3432 Chippewa St. — Acquisition & Redevelopment"

usage() {
  cat <<'EOF'
Usage:
  ./scripts/create-jonah-project.zsh [--plan|--execute|--discover]

Modes:
  --plan       Resolve + research + produce a mutation plan. Default.
  --execute    Resolve + research + execute only after verification.
  --discover   Inspect repository/env for Story-Agent API configuration.

The script intentionally refuses to guess a deployed AWS endpoint.
EOF
}

while (( $# )); do
  case "$1" in
    --plan) MODE="plan" ;;
    --execute) MODE="execute" ;;
    --discover) MODE="discover" ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
  shift
done

# Load project-local configuration if present.
for env_file in \
  "$REPO_ROOT/.env.story-agent" \
  "$REPO_ROOT/.env.local" \
  "$REPO_ROOT/.env"
do
  if [[ -f "$env_file" ]]; then
    set -a
    source "$env_file"
    set +a
  fi
done

command -v curl >/dev/null || { echo "ERROR: curl is required." >&2; exit 1; }
command -v jq >/dev/null || { echo "ERROR: jq is required." >&2; exit 1; }

if [[ "$MODE" == "discover" ]]; then
  echo "=== Story-Agent deployment discovery ==="
  echo
  echo "Repository: $REPO_ROOT"
  echo
  echo "--- package.json scripts containing likely integration terms ---"
  jq -r '.scripts // {} | to_entries[] | select(.key|test("story|agent|mcp|aws|api|project|crew|workgate";"i")) | "\(.key): \(.value)"' package.json 2>/dev/null || true
  echo
  echo "--- environment variables ---"
  env | grep -E '^STORY_AGENT_|^AWS_|^NEXT_PUBLIC_' | sed 's/=.*/=<set>/' | sort || true
  echo
  echo "--- likely endpoint/config files ---"
  find . -maxdepth 4 -type f \
    \( -name '*openapi*' -o -name '*swagger*' -o -name '*mcp*' -o -name '*gateway*' \
       -o -name '*api*' -o -name '*workgate*' -o -name '*deployment*' \) \
    -not -path './node_modules/*' \
    -not -path './.git/*' \
    -print 2>/dev/null | head -200
  echo
  echo "If STORY_AGENT_API_BASE_URL is absent, configure it from the repository/deployment contract."
  exit 0
fi

: "${STORY_AGENT_API_BASE_URL:=""}"

if [[ -z "$STORY_AGENT_API_BASE_URL" ]]; then
  echo "ERROR: STORY_AGENT_API_BASE_URL is not configured."
  echo
  echo "Run:"
  echo "  ./scripts/create-jonah-project.zsh --discover"
  echo
  echo "Then configure the actual deployed AWS API endpoint discovered from the repository."
  echo "This script will not guess a production endpoint."
  exit 3
fi

STORY_AGENT_API_BASE_URL="${STORY_AGENT_API_BASE_URL%/}"
HEALTH_PATH="${STORY_AGENT_HEALTH_PATH:-/health}"
CREW_PATH="${STORY_AGENT_CREW_PATH:-/api/crew/mission}"
RESOLVE_PATH="${STORY_AGENT_RESOLVE_CLIENT_PATH:-/api/clients/resolve}"
CREATE_PROJECT_PATH="${STORY_AGENT_CREATE_PROJECT_PATH:-/api/projects}"

auth_args=()
if [[ -n "${STORY_AGENT_API_TOKEN:-}" ]]; then
  auth_args=(-H "Authorization: Bearer ${STORY_AGENT_API_TOKEN}")
fi

api_get() {
  local path="$1"
  curl -fsS "${auth_args[@]}" \
    -H "Accept: application/json" \
    "${STORY_AGENT_API_BASE_URL}${path}"
}

api_post() {
  local path="$1"
  local body="$2"
  curl -fsS "${auth_args[@]}" \
    -H "Accept: application/json" \
    -H "Content-Type: application/json" \
    -X POST \
    --data "$body" \
    "${STORY_AGENT_API_BASE_URL}${path}"
}

echo "=== Story-Agent / Jonah project expansion ==="
echo "Mode:            $MODE"
echo "Client literal:  $CLIENT_LITERAL"
echo "Property:        $PROPERTY_URL"
echo "Project slug:    $PROJECT_SLUG"
echo

echo "1. Verifying deployed API..."
if ! health="$(api_get "$HEALTH_PATH" 2>/dev/null)"; then
  echo "ERROR: deployed API health check failed: ${STORY_AGENT_API_BASE_URL}${HEALTH_PATH}" >&2
  exit 4
fi
echo "$health" | jq . 2>/dev/null || echo "$health"

timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
artifact_dir="$REPO_ROOT/projects/$PROJECT_SLUG"
mkdir -p "$artifact_dir"/{research,print,web,crew}

echo
echo "2. Resolving universal client literal..."

resolve_payload="$(jq -n \
  --arg literal "$CLIENT_LITERAL" \
  --arg target "client" \
  '{
    operation:"resolve",
    namespace:$target,
    universalLiteral:$literal,
    normalization:"UNIVERSAL",
    requireUnique:true
  }')"

if ! resolve_result="$(api_post "$RESOLVE_PATH" "$resolve_payload" 2>/dev/null)"; then
  echo "ERROR: client-resolution request failed." >&2
  echo "Configured route: ${RESOLVE_PATH}" >&2
  echo "The route can be overridden with STORY_AGENT_RESOLVE_CLIENT_PATH." >&2
  exit 5
fi

printf '%s\n' "$resolve_result" > "$artifact_dir/research/client-resolution.json"

client_status="$(echo "$resolve_result" | jq -r '.resolution.status // .status // "UNKNOWN"')"
client_id="$(echo "$resolve_result" | jq -r '.resolution.clientId // .clientId // .data.id // empty')"

echo "Resolution status: $client_status"
[[ -n "$client_id" ]] && echo "Canonical client ID: $client_id"

if [[ "$client_status" != "RESOLVED" || -z "$client_id" ]]; then
  echo
  echo "HALT: Jonah could not be resolved to exactly one canonical client."
  echo "Inspect:"
  echo "  $artifact_dir/research/client-resolution.json"
  exit 6
fi

echo
echo "3. Asking the deployed crew to construct the project plan..."

mission="$(cat <<EOF
MISSION: CLIENT-HIERARCHY-EXPANSION

CANONICAL CLIENT:
$client_id

UNIVERSAL SEARCH LITERAL:
$CLIENT_LITERAL

PROJECT:
$PROJECT_NAME

PROPERTY:
3432 Chippewa St., Saint Louis, MO 63118

PROPERTY SOURCE:
$PROPERTY_URL

OBJECTIVE:
Create a new project beneath the canonical Jonah client representing
the 3432 Chippewa acquisition/redevelopment investigation.

DELIVERABLES:
1. A verified project definition.
2. A research plan.
3. SFR vs two-family underwriting.
4. Source/evidence requirements.
5. Web presentation requirements.
6. Print/PDF presentation requirements.
7. Exact domain mutation command/tool required to create the project.

SAFETY:
- Do not mutate state during planning.
- Do not guess endpoint/tool names.
- Treat unresolved facts as UNKNOWN.
- Preserve source URLs and retrieval timestamps.
- Verify parent client identity.
- Verify project-parent relationship.
- Invoke WorkGate/governance if available.
- Return a machine-readable ProjectExpansionPlan.
EOF
)"

crew_payload="$(jq -n \
  --arg mission "$mission" \
  --arg clientId "$client_id" \
  --arg literal "$CLIENT_LITERAL" \
  '{
    mission:$mission,
    clientId:$clientId,
    universalSearchLiteral:$literal,
    mode:"plan",
    requireEvidence:true,
    requireIndependentReview:true,
    requireRedTeam:true,
    requireWorkGate:true,
    mutationAuthorized:false
  }')"

if ! crew_result="$(api_post "$CREW_PATH" "$crew_payload" 2>/dev/null)"; then
  echo "ERROR: crew mission request failed." >&2
  echo "Configured route: ${CREW_PATH}" >&2
  exit 7
fi

printf '%s\n' "$crew_result" > "$artifact_dir/crew/project-expansion-plan.json"

# Pull the most common fields while retaining the complete response.
plan_status="$(echo "$crew_result" | jq -r '.status // .plan.status // .projectPlan.status // "UNKNOWN"')"
workgate_status="$(echo "$crew_result" | jq -r '.governance.workGate // .workGate.status // .plan.governance.workGate // "UNKNOWN"')"

echo "Crew plan status: $plan_status"
echo "WorkGate status:  $workgate_status"

echo
echo "4. Building presentation workspace..."

cat > "$artifact_dir/README.md" <<EOF
# $PROJECT_NAME

Client: Jonah  
Canonical client ID: \`$client_id\`  
Universal literal: \`$CLIENT_LITERAL\`  
Property: 3432 Chippewa St., Saint Louis, MO 63118  
Source: $PROPERTY_URL

Generated: $timestamp

## Artifacts

- \`crew/project-expansion-plan.json\` — complete crew planning response
- \`research/client-resolution.json\` — canonical client resolution
- \`web/\` — Next.js presentation
- \`print/\` — print/PDF presentation assets

## Safety

This project was generated from a plan-first workflow. The production
mutation is separate from presentation generation.
EOF

# Copy the previously generated PDF if it exists at the repository root or /mnt/data.
if [[ -f "$REPO_ROOT/3432_Chippewa_SFR_vs_Duplex_Investment_Memo.pdf" ]]; then
  cp "$REPO_ROOT/3432_Chippewa_SFR_vs_Duplex_Investment_Memo.pdf" "$artifact_dir/print/3432-chippewa-investment-memo.pdf"
elif [[ -f "/mnt/data/3432_Chippewa_SFR_vs_Duplex_Investment_Memo.pdf" ]]; then
  cp "/mnt/data/3432_Chippewa_SFR_vs_Duplex_Investment_Memo.pdf" "$artifact_dir/print/3432-chippewa-investment-memo.pdf"
fi

# Generate a minimal, dependency-light Next.js presentation.
mkdir -p "$artifact_dir/web/app"

cat > "$artifact_dir/web/package.json" <<'EOF'
{
  "name": "jonah-3432-chippewa-web",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "latest",
    "react": "latest",
    "react-dom": "latest"
  }
}
EOF

cat > "$artifact_dir/web/next.config.mjs" <<'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone"
};
export default nextConfig;
EOF

cat > "$artifact_dir/web/app/layout.tsx" <<'EOF'
import "./globals.css";

export const metadata = {
  title: "3432 Chippewa — Jonah Acquisition",
  description: "Acquisition and redevelopment investigation"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
EOF

cat > "$artifact_dir/web/app/page.tsx" <<EOF
import fs from "node:fs";
import path from "node:path";

function readPlan() {
  try {
    const p = path.join(process.cwd(), "..", "crew", "project-expansion-plan.json");
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return {};
  }
}

export default function Page() {
  const plan = readPlan();

  return (
    <main className="page">
      <header>
        <p className="eyebrow">JONAH / ACQUISITION STUDY</p>
        <h1>3432 Chippewa St.</h1>
        <p className="lede">
          St. Louis, Missouri · SFR vs. two-family redevelopment analysis
        </p>
      </header>

      <section className="hero">
        <div>
          <span className="label">Decision frame</span>
          <h2>Does the acquisition basis support the property?</h2>
          <p>
            The investment committee is evaluating the building as both a
            single-family residence and a potential legal two-family property.
          </p>
        </div>
        <div className="card">
          <span>Client</span>
          <strong>Jonah</strong>
          <small>${client_id}</small>
        </div>
      </section>

      <section className="grid">
        <article><span>Building</span><strong>2,804 SF</strong><p>1895 · 5 BR · 2 BA</p></article>
        <article><span>Public estimate</span><strong>$226,600</strong><p>Zillow working reference only</p></article>
        <article><span>Rent reference</span><strong>$2,096/mo</strong><p>Requires rental-comp verification</p></article>
        <article><span>Alternatives</span><strong>SFR / Duplex</strong><p>Legal feasibility must be verified</p></article>
      </section>

      <section className="decision">
        <h2>Investment committee status</h2>
        <pre>{JSON.stringify({
          planStatus: plan.status ?? plan.plan?.status ?? "PENDING",
          workGate: plan.governance?.workGate ?? plan.workGate?.status ?? "PENDING"
        }, null, 2)}</pre>
      </section>

      <footer>
        <a href="https://www.zillow.com/homedetails/3432-Chippewa-St-Saint-Louis-MO-63118/2943575_zpid/" target="_blank">
          Source property listing
        </a>
      </footer>
    </main>
  );
}
EOF

cat > "$artifact_dir/web/app/globals.css" <<'EOF'
:root { font-family: Arial, Helvetica, sans-serif; color: #171717; background: #f4f1eb; }
* { box-sizing: border-box; }
body { margin: 0; }
.page { max-width: 1180px; margin: 0 auto; padding: 64px 28px; }
.eyebrow, .label, article span, .card span { text-transform: uppercase; letter-spacing: .12em; font-size: 12px; }
h1 { font-size: clamp(48px, 8vw, 104px); line-height: .92; margin: 16px 0; letter-spacing: -.05em; }
h2 { font-size: clamp(28px, 4vw, 52px); line-height: 1; letter-spacing: -.03em; }
.lede { font-size: 20px; max-width: 700px; }
.hero { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; margin: 72px 0; }
.card, article, .decision { background: white; border: 1px solid #ddd8ce; border-radius: 18px; padding: 28px; }
.card strong, article strong { display:block; font-size: 28px; margin: 12px 0 4px; }
.card small { word-break: break-all; }
.grid { display:grid; grid-template-columns: repeat(4,1fr); gap:16px; }
.decision { margin-top: 72px; }
pre { white-space: pre-wrap; background:#171717; color:#eee; padding:20px; border-radius:12px; }
footer { margin-top:64px; }
a { color: inherit; }
@media (max-width: 800px) {
  .hero, .grid { grid-template-columns: 1fr; }
}
EOF

cat > "$artifact_dir/print/README.md" <<EOF
# Print presentation

The canonical print artifact is generated from the investment memo/research
pipeline. The project stores the PDF separately from the web presentation
so that print and interactive outputs can evolve independently while sharing
the same evidence model.

Property source:
$PROPERTY_URL
EOF

echo
echo "5. Saving project metadata..."
jq -n \
  --arg projectName "$PROJECT_NAME" \
  --arg slug "$PROJECT_SLUG" \
  --arg clientId "$client_id" \
  --arg literal "$CLIENT_LITERAL" \
  --arg propertyUrl "$PROPERTY_URL" \
  --arg generated "$timestamp" \
  '{
    projectName:$projectName,
    slug:$slug,
    parentClientId:$clientId,
    universalClientLiteral:$literal,
    property:{
      address:"3432 Chippewa St., Saint Louis, MO 63118",
      zillowUrl:$propertyUrl
    },
    generatedAt:$generated
  }' > "$artifact_dir/project.json"

if [[ "$MODE" == "plan" ]]; then
  echo
  echo "PLAN COMPLETE — no production mutation was attempted."
  echo "Project workspace:"
  echo "  $artifact_dir"
  echo
  echo "Next.js:"
  echo "  cd $artifact_dir/web && yarn install && yarn dev"
  echo
  echo "Crew plan:"
  echo "  $artifact_dir/crew/project-expansion-plan.json"
  exit 0
fi

echo
echo "6. EXECUTION MODE — validating mutation authorization..."

mutation_authorized="$(echo "$crew_result" | jq -r '
  .mutation.authorized //
  .authorization.authorized //
  .projectPlan.mutation.authorized //
  false
')"

if [[ "$mutation_authorized" != "true" ]]; then
  echo "HALT: crew did not authorize mutation." >&2
  echo "The plan remains available at:" >&2
  echo "  $artifact_dir/crew/project-expansion-plan.json" >&2
  exit 8
fi

mutation_payload="$(echo "$crew_result" | jq -c '
  .mutation.payload //
  .projectPlan.mutation.payload //
  empty
')"

if [[ -z "$mutation_payload" || "$mutation_payload" == "null" ]]; then
  echo "HALT: crew did not provide a machine-readable mutation payload." >&2
  exit 9
fi

echo "Executing verified domain mutation..."
if ! mutation_result="$(api_post "$CREATE_PROJECT_PATH" "$mutation_payload" 2>/dev/null)"; then
  echo "ERROR: project mutation failed." >&2
  exit 10
fi

printf '%s\n' "$mutation_result" > "$artifact_dir/crew/project-mutation-result.json"

echo
echo "7. Post-mutation verification..."
created_project_id="$(echo "$mutation_result" | jq -r '.projectId // .data.id // .id // empty')"

if [[ -z "$created_project_id" ]]; then
  echo "HALT: mutation returned no canonical project ID." >&2
  exit 11
fi

echo "Created project ID: $created_project_id"

# Persist a minimal audit record. A domain-specific verification endpoint can
# be added without changing the planning/mutation architecture.
jq -n \
  --arg clientId "$client_id" \
  --arg projectId "$created_project_id" \
  --arg timestamp "$timestamp" \
  '{
    verification:"POST_MUTATION",
    clientId:$clientId,
    projectId:$projectId,
    verifiedAt:$timestamp,
    note:"A domain-specific read-back verification should confirm parent-child relationship."
  }' > "$artifact_dir/crew/post-mutation-verification.json"

echo
echo "PROJECT CREATED."
echo "Workspace: $artifact_dir"
