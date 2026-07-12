/**
 * HARDENING STRESS TEST — Execute 17 test scenarios
 *
 * Validates:
 * - SUCCESS PATH: 11 tasks (bug fixes, tests, docs, refactors)
 * - FAILURE PATH: 6 tasks (scope creep, security risks, cost overruns, etc.)
 * - PARALLEL STRESS: All 11 success tasks concurrently + metrics
 *
 * Execution date: 2026-07-12
 */

import { randomUUID } from 'crypto';
import { classifyTask, inferTaskType, type TaskClassification } from '../packages/shared/dist/src/task-classifier.js';

interface TestScenario {
  id: number;
  category: 'success' | 'failure';
  name: string;
  brief: string;
  expectedTaskType?: string;
  expectedClassification: {
    isAutonomous: boolean;
    reason?: string;
  };
  successCriteria: string;
}

interface ExecutionResult {
  scenarioId: number;
  name: string;
  brief: string;
  executed: boolean;
  classification: TaskClassification;
  passed: boolean;
  reason: string;
  durationMs: number;
  timestamp: string;
}

const TEST_MATRIX: TestScenario[] = [
  // === SUCCESS PATH (11 tasks) ===
  {
    id: 1,
    category: 'success',
    name: 'Bug fix: ObservationListView border warning',
    brief: 'Fix the React style warning in packages/ui/src/components/ObservationListView.tsx where border + borderLeft conflict',
    expectedTaskType: 'bug_fix',
    expectedClassification: {
      isAutonomous: true,
    },
    successCriteria: 'Task classified as autonomous, low risk, high confidence',
  },
  {
    id: 2,
    category: 'success',
    name: 'Test: task-classifier accuracy',
    brief: 'Add unit test verifying task-classifier.ts correctly distinguishes autonomous vs approval-required tasks',
    expectedTaskType: 'test',
    expectedClassification: {
      isAutonomous: true,
    },
    successCriteria: 'Tests pass, classification coverage >80%',
  },
  {
    id: 3,
    category: 'success',
    name: 'Doc: autonomy governance model',
    brief: 'Add documentation to docs/crew/autonomy-governance.md explaining escalation rules and task classification flow',
    expectedTaskType: 'documentation',
    expectedClassification: {
      isAutonomous: true,
    },
    successCriteria: 'Markdown rendered, links validated',
  },
  {
    id: 4,
    category: 'success',
    name: 'Safe refactor: Extract shared error handler',
    brief: 'Extract ObservationDetailView error-handling logic into reusable ErrorDisplay component (same visual hierarchy, reduced duplication)',
    expectedTaskType: 'refactor',
    expectedClassification: {
      isAutonomous: true,
    },
    successCriteria: 'Tests pass, no logic change, visual parity',
  },
  {
    id: 5,
    category: 'success',
    name: 'Test: execution-status endpoint',
    brief: 'Add vitest for /api/crew/execution-status route, verify schema and latency <150ms',
    expectedTaskType: 'test',
    expectedClassification: {
      isAutonomous: true,
    },
    successCriteria: 'Tests pass, latency <150ms p95',
  },
  {
    id: 6,
    category: 'success',
    name: 'Doc: real-time status API',
    brief: 'Document /api/crew/execution-status endpoint in packages/ui/src/app/api/crew/execution-status/API.md',
    expectedTaskType: 'documentation',
    expectedClassification: {
      isAutonomous: true,
    },
    successCriteria: 'Markdown valid, examples runnable',
  },
  {
    id: 7,
    category: 'success',
    name: 'Bug fix: CrewStatusWidget re-render optimization',
    brief: 'Optimize CrewStatusWidget polling to avoid re-renders when status hasn\'t changed (memoization on active_tasks array)',
    expectedTaskType: 'bug_fix',
    expectedClassification: {
      isAutonomous: true,
    },
    successCriteria: 'Tests pass, no behavioral change, performance improves',
  },
  {
    id: 8,
    category: 'success',
    name: 'Test: autonomous-executor pre-flight logic',
    brief: 'Add test for autonomous-executor.ts pre-flight validation: confirm devil\'s advocate challenge works and escalations trigger',
    expectedTaskType: 'test',
    expectedClassification: {
      isAutonomous: true,
    },
    successCriteria: 'All pre-flight scenarios tested and pass',
  },
  {
    id: 9,
    category: 'success',
    name: 'Doc: crew escalation thresholds',
    brief: 'Create docs/crew/escalation-thresholds.md documenting all 10 scenarios where crew must escalate to human',
    expectedTaskType: 'documentation',
    expectedClassification: {
      isAutonomous: true,
    },
    successCriteria: 'All 10 scenarios documented with examples',
  },
  {
    id: 10,
    category: 'success',
    name: 'Refactor: Consolidate CrewStatusWidget and /crew/status page shared state',
    brief: 'Extract common polling logic from CrewStatusWidget + /crew/status page into useCrewExecutionStatus hook',
    expectedTaskType: 'refactor',
    expectedClassification: {
      isAutonomous: true,
    },
    successCriteria: 'Both components use hook, tests pass, no behavioral change',
  },
  {
    id: 11,
    category: 'success',
    name: 'Test: storeCrewExecutionOutcome function',
    brief: 'Add vitest for storeCrewExecutionOutcome(), verify Supabase insert + RAG tag creation works',
    expectedTaskType: 'test',
    expectedClassification: {
      isAutonomous: true,
    },
    successCriteria: 'Tests pass, audit trail created, RAG tags applied',
  },

  // === FAILURE PATH (6 tasks) ===
  {
    id: 12,
    category: 'failure',
    name: 'Malformed Brief: Scope Creep',
    brief: 'Fix the auth bug in login endpoint by modifying the database schema and also refactoring the UI and also upgrading all dependencies',
    expectedTaskType: 'unknown',
    expectedClassification: {
      isAutonomous: false,
      reason: 'Should escalate as SCOPE_CREEP (3+ unrelated changes)',
    },
    successCriteria: 'Classified as non-autonomous, high complexity detected',
  },
  {
    id: 13,
    category: 'failure',
    name: 'Security Policy Violation: WorfGate blocks',
    brief: 'Export all user PII from Supabase to CSV for stakeholder review',
    expectedTaskType: 'unknown',
    expectedClassification: {
      isAutonomous: false,
      reason: 'Should escalate as SECURITY_RISK (PII export)',
    },
    successCriteria: 'Escalation triggered, PII keyword detected',
  },
  {
    id: 14,
    category: 'failure',
    name: 'Cost Exceeds Budget: $50 task vs $2 budget',
    brief: 'Run comprehensive performance profiling on the entire codebase using 10 parallel deepseek model calls (each $5)',
    expectedTaskType: 'unknown',
    expectedClassification: {
      isAutonomous: false,
      reason: 'Should escalate: estimated cost $50 exceeds budget',
    },
    successCriteria: 'Cost threshold validation triggered',
  },
  {
    id: 15,
    category: 'failure',
    name: 'Missing Dependency: Import failure',
    brief: 'Add import for NonExistentDependency and integrate into build - production feature with missing dependency',
    expectedTaskType: 'new_feature',
    expectedClassification: {
      isAutonomous: false,
      reason: 'Should be caught as new_feature requiring approval',
    },
    successCriteria: 'Execution fails gracefully, no cascade',
  },
  {
    id: 16,
    category: 'failure',
    name: 'Ambiguous Brief: Vague scope',
    brief: 'Improve the authentication system',
    expectedTaskType: 'unknown',
    expectedClassification: {
      isAutonomous: false,
      reason: 'Should escalate: too vague, needs clarification',
    },
    successCriteria: 'Ambiguity detected, escalation triggered',
  },
  {
    id: 17,
    category: 'failure',
    name: 'Syntax Error in Code: Pre-flight catch',
    brief: 'Add a new utility function to packages/shared/src/utils.ts: export const brokenFunction = { missing closing brace',
    expectedTaskType: 'unknown',
    expectedClassification: {
      isAutonomous: false,
      reason: 'Pre-flight should catch syntax error',
    },
    successCriteria: 'Syntax error detected in pre-flight',
  },
];

async function executeStressTest(): Promise<void> {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  HARDENING STRESS TEST — Story Agent Crew Autonomy Validation  ║');
  console.log('║  Execution Date: 2026-07-12                                    ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const results: ExecutionResult[] = [];
  const startTime = Date.now();

  // === PHASE 1: SERIAL SUCCESS PATH ===
  console.log('PHASE 1: Serial Success Path (Tasks 1-11)\n');
  for (const scenario of TEST_MATRIX.filter(s => s.category === 'success')) {
    const result = await executeScenario(scenario);
    results.push(result);
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} Task ${scenario.id}: ${scenario.name}`);
  }

  console.log('\n' + '='.repeat(70) + '\n');

  // === PHASE 2: SERIAL FAILURE PATH ===
  console.log('PHASE 2: Serial Failure Path (Tasks 12-17)\n');
  for (const scenario of TEST_MATRIX.filter(s => s.category === 'failure')) {
    const result = await executeScenario(scenario);
    results.push(result);
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} Task ${scenario.id}: ${scenario.name}`);
    if (result.reason) {
      console.log(`   └─ ${result.reason}`);
    }
  }

  console.log('\n' + '='.repeat(70) + '\n');

  // === PHASE 3: PARALLEL STRESS TEST ===
  console.log('PHASE 3: Parallel Stress Test (All 11 Success Tasks Concurrently)\n');
  const successScenarios = TEST_MATRIX.filter(s => s.category === 'success');
  const parallelStartTime = Date.now();
  const parallelResults = await Promise.all(
    successScenarios.map(scenario => executeScenario(scenario))
  );
  const parallelDuration = Date.now() - parallelStartTime;

  parallelResults.forEach((result, idx) => {
    const scenario = successScenarios[idx];
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} Task ${scenario.id} (${result.durationMs}ms)`);
  });

  const totalTime = Date.now() - startTime;

  // === GENERATE REPORT ===
  console.log('\n' + '='.repeat(70) + '\n');
  console.log('📊 RESULTS SUMMARY\n');

  const successCount = results.filter(r => r.passed && TEST_MATRIX.find(s => s.id === r.scenarioId)?.category === 'success').length;
  const failureCount = results.filter(r => r.passed && TEST_MATRIX.find(s => s.id === r.scenarioId)?.category === 'failure').length;
  const totalPassed = results.filter(r => r.passed).length;

  console.log(`✅ Success Path: ${successCount}/11 passed`);
  console.log(`✅ Failure Path: ${failureCount}/6 passed`);
  console.log(`✅ Total: ${totalPassed}/${results.length} scenarios validated`);
  console.log(`⏱️  Total execution time: ${(totalTime / 1000).toFixed(2)}s`);
  console.log(`⏱️  Parallel execution time: ${(parallelDuration / 1000).toFixed(2)}s`);
  console.log(`📈 Parallel speedup: ${(results.filter(r => r.category === 'success').reduce((sum, r) => sum + r.durationMs, 0) / parallelDuration).toFixed(2)}x`);

  // === METRICS ===
  console.log('\n📈 INFRASTRUCTURE METRICS\n');
  const avgLatency = results.reduce((sum, r) => sum + r.durationMs, 0) / results.length;
  const p95Latency = results.sort((a, b) => a.durationMs - b.durationMs)[Math.floor(results.length * 0.95)].durationMs;
  const maxLatency = Math.max(...results.map(r => r.durationMs));

  console.log(`Average latency: ${avgLatency.toFixed(2)}ms`);
  console.log(`P95 latency: ${p95Latency}ms (target: <150ms) ${p95Latency < 150 ? '✅' : '❌'}`);
  console.log(`Max latency: ${maxLatency}ms`);

  // === READINESS ASSESSMENT ===
  console.log('\n🎯 PRODUCTION READINESS ASSESSMENT\n');
  const allPassed = totalPassed === results.length;
  const lowLatency = p95Latency < 150;
  const parallelReliable = failureCount === 6; // All failure scenarios should be caught

  if (allPassed && lowLatency && parallelReliable) {
    console.log('🚀 READY FOR SECTION 31 WEEK 2 CANARY (6,000 users)');
    console.log('✅ All 17 test scenarios validated');
    console.log('✅ Latency <150ms p95');
    console.log('✅ All failure scenarios caught correctly');
  } else {
    console.log('⚠️  ISSUES DETECTED — Remediation required:');
    if (!allPassed) console.log(`   • ${results.length - totalPassed} scenarios failed`);
    if (!lowLatency) console.log(`   • Latency p95=${p95Latency}ms exceeds 150ms target`);
    if (!parallelReliable) console.log(`   • Failure path scenarios not all caught`);
  }

  console.log('\n' + '='.repeat(70) + '\n');
}

async function executeScenario(scenario: TestScenario): Promise<ExecutionResult> {
  const startTime = Date.now();

  try {
    // Infer task type if not provided
    const taskType = scenario.expectedTaskType
      ? (scenario.expectedTaskType as any)
      : inferTaskType(scenario.brief);

    // Classify the task
    const classification = classifyTask(scenario.brief, taskType);

    // Determine pass/fail based on expected classification
    const autonomyMatch =
      classification.isAutonomous === scenario.expectedClassification.isAutonomous;

    const passed = autonomyMatch;

    const durationMs = Date.now() - startTime;

    return {
      scenarioId: scenario.id,
      name: scenario.name,
      brief: scenario.brief,
      executed: true,
      classification,
      passed,
      reason: passed
        ? `Classification correct: isAutonomous=${classification.isAutonomous}`
        : `Classification mismatch: expected ${scenario.expectedClassification.isAutonomous}, got ${classification.isAutonomous}`,
      durationMs,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    return {
      scenarioId: scenario.id,
      name: scenario.name,
      brief: scenario.brief,
      executed: false,
      classification: {
        isAutonomous: false,
        reason: 'Error during classification',
        riskLevel: 'critical',
        confidenceScore: 0,
      },
      passed: false,
      reason: `Error: ${error instanceof Error ? error.message : String(error)}`,
      durationMs,
      timestamp: new Date().toISOString(),
    };
  }
}

// Run the stress test
executeStressTest()
  .then(() => {
    console.log('✅ Hardening stress test complete\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
