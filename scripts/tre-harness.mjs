// T.R.E. (Tactical Reconciliation Engine) test harness scaffold — crew phased plan Phase 1,
// PipelineOps team. Replays schema-aware mock Aha events through the v1.0 contract validator so
// pipeline integration can be exercised without touching Aha or Supabase.
// Usage: node scripts/tre-harness.mjs  (build @story-agent/shared first)
import { validateAhaEventInput, isCompatibleSchemaVersion, AHA_EVENTS_SCHEMA_VERSION } from '../packages/shared/dist/src/schemas/aha-events.schema.js';

const MOCK_EVENTS = [
  { label: 'story created (dashboard)', input: { resourceType: 'story', resourceId: 'PROD-11', operation: 'created', actor: 'dashboard' }, expectOk: true },
  { label: 'epic status change (mcp)', input: { resourceType: 'epic', resourceId: 'PROD-E-1', operation: 'status_changed', actor: 'mcp', meta: { status_from: 'pending', status_to: 'implementing' } }, expectOk: true },
  { label: 'sprint link (extension)', input: { resourceType: 'sprint', resourceId: 'SPRINT-3', operation: 'linked', actor: 'extension', meta: { project_id: 'PROD' } }, expectOk: true },
  { label: 'DRIFT: unknown resource type', input: { resourceType: 'starship', resourceId: 'NCC-1701', operation: 'created', actor: 'mcp' }, expectOk: false },
  { label: 'DRIFT: undocumented meta key', input: { resourceType: 'story', resourceId: 'PROD-12', operation: 'updated', actor: 'mcp', meta: { warp_factor: '9' } }, expectOk: false },
  { label: 'DRIFT: empty resourceId', input: { resourceType: 'story', resourceId: '', operation: 'deleted', actor: 'dashboard' }, expectOk: false },
];

console.log(`T.R.E. harness — replaying ${MOCK_EVENTS.length} mock events against contract v${AHA_EVENTS_SCHEMA_VERSION}\n`);
let failures = 0;
for (const { label, input, expectOk } of MOCK_EVENTS) {
  const result = validateAhaEventInput(input);
  const pass = result.ok === expectOk;
  if (!pass) failures++;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}${result.ok ? '' : `\n      → ${result.errors.join('; ')}`}`);
}

console.log(`\nversion gate: 1.x compatible=${isCompatibleSchemaVersion('1.9.0')}, 2.x compatible=${isCompatibleSchemaVersion('2.0.0')}`);
console.log(failures === 0 ? '\nT.R.E. harness: ALL CHECKS PASS' : `\nT.R.E. harness: ${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
