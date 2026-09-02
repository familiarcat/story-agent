#!/bin/bash

echo "🖖 STARFLEET COMMAND — WEEK 1 PHASE 2 MISSION LAUNCH"
echo "=================================================="
echo ""
echo "Mission Briefing: Parallel execution of Phase 2 foundational tasks"
echo "Launch Time: $(date)"
echo ""

# Create a mission log directory
MISSION_LOG="/tmp/crew-missions-$(date +%s)"
mkdir -p "$MISSION_LOG"
echo "Mission logs: $MISSION_LOG"
echo ""

# Define crew assignments
echo "CREW ASSIGNMENTS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔴 DATA (Commander Data)"
echo "   Task: Audit trail schema + soft-delete implementation"
echo "   Owner: commander-data | Priority: HIGH | Duration: 3-5 days"
echo ""
echo "🟡 TROI (Counselor Troi)" 
echo "   Task: Dashboard UX design mockup"
echo "   Owner: counselor-troi | Priority: HIGH | Duration: 1 week"
echo ""
echo "🟢 GEORDI (Geordi La Forge)"
echo "   Task: Component scaffolding + API performance baseline"
echo "   Owner: geordi-laforge | Priority: HIGH | Duration: 1-2 weeks"
echo ""
echo "🔵 O'BRIEN (Chief O'Brien)"
echo "   Task: CI/CD pipeline + staging environment scaffold"
echo "   Owner: chief-obrien | Priority: HIGH | Duration: 2 weeks"
echo ""
echo "⚫ WORF (Lt. Worf)"
echo "   Task: RLS security audit + policy review"
echo "   Owner: lt-worf | Priority: CRITICAL | Duration: 3 days"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Launching missions in PARALLEL MODE..."
echo ""

# Launch mission 1: Data (Commander Data) - Audit Trails Design
npx tsx scripts/crew-audit-trails-design.ts > "$MISSION_LOG/data-mission.log" 2>&1 &
DATA_PID=$!
echo "✈️  [LAUNCH] Commander Data mission (PID: $DATA_PID)"

# Launch mission 2: Troi (UX Design) - Dashboard Wireframe
npx tsx scripts/crew-dashboard-ux-design.ts > "$MISSION_LOG/troi-mission.log" 2>&1 &
TROI_PID=$!
echo "✈️  [LAUNCH] Counselor Troi mission (PID: $TROI_PID)"

# Launch mission 3: Geordi (Infrastructure) - Component Scaffolding
npx tsx scripts/crew-component-scaffolding.ts > "$MISSION_LOG/geordi-mission.log" 2>&1 &
GEORDI_PID=$!
echo "✈️  [LAUNCH] Geordi La Forge mission (PID: $GEORDI_PID)"

# Launch mission 4: O'Brien (Operations) - CI/CD Pipeline
npx tsx scripts/crew-cicd-pipeline.ts > "$MISSION_LOG/obrien-mission.log" 2>&1 &
OBRIEN_PID=$!
echo "✈️  [LAUNCH] Chief O'Brien mission (PID: $OBRIEN_PID)"

# Launch mission 5: Worf (Security) - RLS Audit
npx tsx scripts/crew-rls-security-audit.ts > "$MISSION_LOG/worf-mission.log" 2>&1 &
WORF_PID=$!
echo "✈️  [LAUNCH] Lt. Worf mission (PID: $WORF_PID)"

echo ""
echo "All missions launched. Monitoring progress..."
echo ""

# Wait for all missions to complete, monitoring progress
PIDS=($DATA_PID $TROI_PID $GEORDI_PID $OBRIEN_PID $WORF_PID)
CREWS=("Data" "Troi" "Geordi" "O'Brien" "Worf")

# Monitor each mission
for i in "${!PIDS[@]}"; do
  pid=${PIDS[$i]}
  crew=${CREWS[$i]}
  
  if wait $pid 2>/dev/null; then
    echo "✅ [COMPLETE] $crew mission succeeded"
    cat "$MISSION_LOG/${crew,,}-mission.log" 2>/dev/null | tail -20
  else
    echo "❌ [FAILED] $crew mission failed"
    cat "$MISSION_LOG/${crew,,}-mission.log" 2>/dev/null | tail -20
  fi
  echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🖖 MISSION EXECUTION COMPLETE"
echo "All logs preserved in: $MISSION_LOG"
