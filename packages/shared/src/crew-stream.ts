/**
 * Crew Stream — real-time operational logging for warp-speed autonomous teams.
 *
 * Teams A/B/C/D log their progress as they execute, enabling live visibility in VSCode chat.
 * Stream format: NDJSON (newline-delimited JSON), append-only to .claude/crew-stream-log.ndjson.
 *
 * No blocking — logging is fire-and-forget async. Crew execution continues regardless of stream failures.
 */

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const appendFile = promisify(fs.appendFile);

export interface CrewStreamEvent {
  crew_id: string;
  task_id: string;
  iteration: number;
  status: 'start' | 'progress' | 'complete' | 'escalation' | 'error';
  action_description: string;
  metrics?: Record<string, number | string>;
  escalation_reason?: string;
  proposed_fix?: string;
  result?: string;
  timestamp: string;
}

/**
 * Log a crew progress event to the stream.
 * Fire-and-forget: never blocks execution.
 * @param event The crew progress event
 * @param logDir Optional log directory (defaults to .claude in CWD)
 */
export async function logCrewProgress(
  event: Omit<CrewStreamEvent, 'timestamp'> & { timestamp?: string },
  logDir = process.env.CLAUDE_PROJECT_DIR || process.cwd()
): Promise<void> {
  const streamPath = path.join(logDir, '.claude', 'crew-stream-log.ndjson');

  // Ensure .claude directory exists
  const dirPath = path.dirname(streamPath);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const entry: CrewStreamEvent = {
    ...event,
    timestamp: event.timestamp || new Date().toISOString(),
  };

  try {
    await appendFile(streamPath, JSON.stringify(entry) + '\n', 'utf8');
  } catch (err) {
    // Never block crew execution on logging failure
    console.error(`[CrewStream] Failed to log event:`, err);
  }
}

/**
 * Read crew stream events from the log file.
 * Returns all events if no offset provided; returns events since offset if provided.
 * @param offset Optional byte offset to start reading from
 * @param logDir Optional log directory (defaults to .claude in CWD)
 */
export async function readCrewStream(
  offset?: number,
  logDir = process.env.CLAUDE_PROJECT_DIR || process.cwd()
): Promise<CrewStreamEvent[]> {
  const streamPath = path.join(logDir, '.claude', 'crew-stream-log.ndjson');

  if (!fs.existsSync(streamPath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(streamPath, 'utf8');
    const lines = content.split('\n').filter(l => l.trim());

    return lines.map((line, idx) => {
      try {
        return JSON.parse(line) as CrewStreamEvent;
      } catch {
        console.error(`[CrewStream] Failed to parse line ${idx}:`, line.substring(0, 100));
        return null;
      }
    }).filter((e): e is CrewStreamEvent => e !== null);
  } catch (err) {
    console.error(`[CrewStream] Failed to read stream:`, err);
    return [];
  }
}

/**
 * Tail the crew stream: return events since last poll.
 * Tracks position using a simple in-memory offset or file-based checkpoint.
 * @param logDir Optional log directory
 * @returns events since last poll + new offset for next call
 */
export async function tailCrewStream(
  lastOffset = 0,
  logDir = process.env.CLAUDE_PROJECT_DIR || process.cwd()
): Promise<{ events: CrewStreamEvent[]; newOffset: number; lastLineCount: number }> {
  const streamPath = path.join(logDir, '.claude', 'crew-stream-log.ndjson');

  if (!fs.existsSync(streamPath)) {
    return { events: [], newOffset: 0, lastLineCount: 0 };
  }

  try {
    const content = fs.readFileSync(streamPath, 'utf8');
    const lines = content.split('\n').filter(l => l.trim());

    const events = lines
      .slice(lastOffset)
      .map((line, idx) => {
        try {
          return JSON.parse(line) as CrewStreamEvent;
        } catch {
          console.error(`[CrewStream] Failed to parse line ${lastOffset + idx}`);
          return null;
        }
      })
      .filter((e): e is CrewStreamEvent => e !== null);

    return {
      events,
      newOffset: lines.length,
      lastLineCount: lines.length,
    };
  } catch (err) {
    console.error(`[CrewStream] Failed to tail stream:`, err);
    return { events: [], newOffset: lastOffset, lastLineCount: 0 };
  }
}

/**
 * Get live status of all crews: current iteration, elapsed time, last action per crew.
 */
export async function getLiveCrewStatus(
  logDir = process.env.CLAUDE_PROJECT_DIR || process.cwd()
): Promise<Record<string, {
  crew_id: string;
  current_task: string;
  current_iteration: number;
  status: string;
  last_action: string;
  elapsed_seconds: number;
  started_at: string;
}>> {
  const events = await readCrewStream(undefined, logDir);

  if (events.length === 0) return {};

  const status: Record<string, any> = {};
  const startTimes: Record<string, Date> = {};

  for (const event of events) {
    const key = event.crew_id;

    if (!status[key]) {
      status[key] = {
        crew_id: event.crew_id,
        current_task: event.task_id,
        current_iteration: event.iteration,
        status: event.status,
        last_action: event.action_description,
        started_at: event.timestamp,
      };
      startTimes[key] = new Date(event.timestamp);
    }

    // Always update to the latest event for this crew
    status[key].current_task = event.task_id;
    status[key].current_iteration = Math.max(status[key].current_iteration, event.iteration);
    status[key].status = event.status;
    status[key].last_action = event.action_description;
  }

  // Calculate elapsed time for each crew
  const now = new Date();
  for (const key in status) {
    const started = startTimes[key];
    const elapsedMs = now.getTime() - started.getTime();
    status[key].elapsed_seconds = Math.floor(elapsedMs / 1000);
  }

  return status;
}
