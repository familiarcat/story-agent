/**
 * Test suite for crew status display formatting.
 * Verifies Phase 3 crew status streaming implementation.
 */

import {
  CrewStreamEvent,
  CrewStatusCard,
  formatCrewStatusHeader,
  formatCrewCard,
  formatEscalationAlert,
  formatCompletionSummary,
  mergeCrewEvent,
  renderCrewCards,
} from './packages/vscode-extension/src/crew-status-display';

function testFormatCrewStatusHeader() {
  const start = new Date(Date.now() - 125000); // 2m 5s ago
  const header = formatCrewStatusHeader(start);
  console.log('formatCrewStatusHeader:', header);
  if (!header.includes('Section 31')) {
    throw new Error('Header missing mission name');
  }
  if (!header.includes('2m') || !header.includes('05s')) {
    throw new Error('Header missing/wrong elapsed time');
  }
  console.log('✓ formatCrewStatusHeader test passed\n');
}

function testFormatCrewCard() {
  const card: CrewStatusCard = {
    crew_id: 'riker',
    task_id: 'team_a_e2e',
    current_iteration: 3,
    status: 'in_progress',
    action: 'Running E2E tests',
    elapsed_seconds: 85,
    last_update: new Date(),
    is_collapsed: false,
    update_count: 2,
  };

  const formatted = formatCrewCard(card);
  console.log('formatCrewCard:', formatted);
  if (!formatted.includes('RIKER') || !formatted.includes('E2E') || !formatted.includes('1m 25s')) {
    throw new Error('Card missing expected content');
  }
  console.log('✓ formatCrewCard test passed\n');
}

function testFormatEscalationAlert() {
  const event: CrewStreamEvent = {
    crew_id: 'worf',
    task_id: 'team_b_audit',
    iteration: 2,
    status: 'escalation',
    action_description: 'Security audit failed',
    escalation_reason: 'Untrusted dependencies detected',
    proposed_fix: 'Update to latest secure versions',
    timestamp: new Date().toISOString(),
  };

  const alert = formatEscalationAlert(event);
  console.log('formatEscalationAlert:', alert);
  if (
    !alert.includes('ESCALATION') ||
    !alert.includes('WORF') ||
    !alert.includes('Untrusted dependencies') ||
    !alert.includes('secure versions')
  ) {
    throw new Error('Escalation alert missing expected content');
  }
  console.log('✓ formatEscalationAlert test passed\n');
}

function testMergeCrewEvent() {
  const crews = new Map<string, CrewStatusCard>();
  const startTime = new Date();

  const event1: CrewStreamEvent = {
    crew_id: 'geordi',
    task_id: 'team_c_unit',
    iteration: 1,
    status: 'start',
    action_description: 'Running unit tests',
    timestamp: new Date().toISOString(),
  };

  mergeCrewEvent(crews, event1, startTime);

  if (crews.size !== 1) {
    throw new Error('Expected 1 crew card after merge');
  }

  const card = crews.get('geordi');
  if (!card || card.status !== 'in_progress') {
    throw new Error('Card status should be in_progress after start event');
  }

  // Emit progress event
  const event2: CrewStreamEvent = {
    crew_id: 'geordi',
    task_id: 'team_c_unit',
    iteration: 1,
    status: 'progress',
    action_description: 'Running 45/100 tests',
    timestamp: new Date().toISOString(),
  };

  mergeCrewEvent(crews, event2, startTime);
  const updated = crews.get('geordi');
  if (!updated || updated.action !== 'Running 45/100 tests') {
    throw new Error('Card action not updated');
  }

  console.log('✓ mergeCrewEvent test passed\n');
}

function testRenderCrewCards() {
  const crews = new Map<string, CrewStatusCard>();
  crews.set('riker', {
    crew_id: 'riker',
    task_id: 'team_a_e2e',
    current_iteration: 2,
    status: 'in_progress',
    action: 'Running E2E',
    elapsed_seconds: 120,
    last_update: new Date(),
    is_collapsed: false,
    update_count: 1,
  });

  crews.set('worf', {
    crew_id: 'worf',
    task_id: 'team_b_audit',
    current_iteration: 1,
    status: 'complete',
    action: 'Audit complete',
    elapsed_seconds: 85,
    last_update: new Date(),
    is_collapsed: false,
    update_count: 3,
  });

  const rendered = renderCrewCards(crews);
  console.log('renderCrewCards:\n', rendered);

  if (!rendered.includes('RIKER') || !rendered.includes('WORF')) {
    throw new Error('Rendered output missing crew names');
  }

  if (!rendered.includes('IN PROGRESS') || !rendered.includes('COMPLETE')) {
    throw new Error('Rendered output missing status badges');
  }

  // Verify sorted order (alphabetical by crew_id)
  const riker_idx = rendered.indexOf('RIKER');
  const worf_idx = rendered.indexOf('WORF');
  if (riker_idx > worf_idx) {
    throw new Error('Cards not in sorted order');
  }

  console.log('✓ renderCrewCards test passed\n');
}

function testFormatCompletionSummary() {
  const startTime = new Date(Date.now() - 245000); // 4m 5s
  const crews = new Map<string, CrewStatusCard>();
  crews.set('riker', {
    crew_id: 'riker',
    task_id: 'team_a_e2e',
    current_iteration: 3,
    status: 'complete',
    action: 'E2E tests passed',
    elapsed_seconds: 245,
    last_update: new Date(),
    is_collapsed: false,
    update_count: 5,
  });

  crews.set('worf', {
    crew_id: 'worf',
    task_id: 'team_b_audit',
    current_iteration: 2,
    status: 'escalated',
    action: 'Security issue found',
    elapsed_seconds: 245,
    last_update: new Date(),
    is_collapsed: false,
    update_count: 3,
    escalation_reason: 'Dependency vulnerability',
  });

  const summary = formatCompletionSummary(crews, startTime, 1);
  console.log('formatCompletionSummary:\n', summary);

  if (!summary.includes('COMPLETE') || !summary.includes('PASS')) {
    throw new Error('Summary missing complete status');
  }

  if (!summary.includes('ESCALATED')) {
    throw new Error('Summary missing escalation status');
  }

  if (!summary.includes('1 escalation')) {
    throw new Error('Summary missing escalation count');
  }

  if (!summary.includes('4m') || !summary.includes('05s')) {
    throw new Error('Summary missing/wrong elapsed time');
  }

  console.log('✓ formatCompletionSummary test passed\n');
}

async function runAllTests() {
  console.log('=== Phase 3: VSCode Crew Status Streaming Tests ===\n');

  try {
    testFormatCrewStatusHeader();
    testFormatCrewCard();
    testFormatEscalationAlert();
    testMergeCrewEvent();
    testRenderCrewCards();
    testFormatCompletionSummary();

    console.log('=== All tests passed! ✓ ===');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

runAllTests();
