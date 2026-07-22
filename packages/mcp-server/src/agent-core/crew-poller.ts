import fs from 'fs';
import path from 'path';

type EscalationStatus = {
  escalation_status?: 'NEW' | 'HANDLED';
  // ... other fields from code-change-context.json
};

type ControlLaneStatus = {
  activeLane: 'shell' | 'crew' | 'claude';
  lastPollTick: string;
  pollCostUSD: number;
  anthropicWakeupsAvoided: number;
  note?: string;
};

export function decideLane(hasChange: boolean, needsSynthesis: boolean): 'shell' | 'crew' | 'claude' {
  if (!hasChange) return 'shell';
  return needsSynthesis ? 'claude' : 'crew';
}

export async function runCrewPoll(opts?: { workspace?: string }) {
  const workspace = opts?.workspace || '.';
  const changeContextPath = path.join(workspace, '.claude/code-change-context.json');
  const controlLanePath = path.join(workspace, '.claude/control-lane-status.json');

  // Initialize default control lane status
  let controlLaneStatus: ControlLaneStatus = {
    activeLane: 'shell',
    lastPollTick: new Date().toISOString(),
    pollCostUSD: 0,
    anthropicWakeupsAvoided: 0,
    note: 'Initialized by crew-poller',
  };

  // Try to read existing status
  try {
    const existingStatus = JSON.parse(fs.readFileSync(controlLanePath, 'utf-8'));
    controlLaneStatus = {
      ...controlLaneStatus,
      ...existingStatus,
      lastPollTick: new Date().toISOString(),
      pollCostUSD: 0, // Shell ticks always cost $0
    };
  } catch (err) {
    // File doesn't exist or is invalid - we'll create it
  }

  let hasChange = false;
  try {
    const changeContext: EscalationStatus = JSON.parse(fs.readFileSync(changeContextPath, 'utf-8'));
    hasChange = changeContext.escalation_status === 'NEW';
  } catch (err) {
    // No change context file or invalid - assume no change
  }

  const needsSynthesis = false; // Default to false, actual logic would determine this
  const lane = decideLane(hasChange, needsSynthesis);

  // Update status
  controlLaneStatus.activeLane = lane;
  if (!hasChange) {
    controlLaneStatus.anthropicWakeupsAvoided += 1;
  }

  // Write updated status
  fs.mkdirSync(path.dirname(controlLanePath), { recursive: true });
  fs.writeFileSync(controlLanePath, JSON.stringify(controlLaneStatus, null, 2));

  return {
    hasChange,
    lane,
    controlLaneStatus,
  };
}