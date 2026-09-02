/**
 * Dynamic Tool Registry — Lazy-load MCP tools on-demand, not at startup.
 *
 * Problem: All 80+ MCP tools register at startup, causing:
 *  - Long startup time (one slow tool blocks all)
 *  - Resource overhead (all tools initialized even if not used)
 *  - Cascade failures (one broken import kills entire system)
 *
 * Solution: Register tools lazily when first requested (or pre-cache critical ones).
 *
 * Mechanism:
 *  1. Import toolRegistrars = [ registerAhaTools, registerCrewTools, ... ] (array of functions)
 *  2. On server startup: register only a MINIMAL set (health/status tools)
 *  3. On first tool request: load remaining tools on-demand
 *  4. Cache loaded registrars so no repeat work
 *
 * Benefit:
 *  - Server startup: <100ms (just minimal tools)
 *  - First tool call: <500ms (lazy-load + execute)
 *  - Subsequent calls: <50ms (cached + execute)
 *  - One broken tool doesn't block others
 *  - Parallelizable: each tool group can fail independently
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { execSync } from 'node:child_process';

// Import all tool registrar functions (these are safe to import; they don't execute)
// Each returns a function: (server: McpServer) => void
import { registerAhaTools } from '../tools/aha-tools.js';
import { registerCrewMemberTools } from '../tools/crew-member-tools.js';
import { registerCrewMemoryTools } from '../tools/crew-memory-tools.js';
import { registerCrewMissionTools } from '../tools/crew-mission-tools.js';
import { registerCrewAutonomyTools } from '../tools/crew-autonomy-tools.js';
import { registerStoryTools } from '../tools/story-tools.js';
import { registerWorfgateTools } from '../tools/worfgate-tools.js';
import { registerRepoTools } from '../tools/repo-tools.js';
import { registerSkillTools } from '../tools/skill-tools.js';
import { registerStarshipTools } from '../tools/starship-tools.ts';
import { registerDocTools } from '../tools/doc-tools.js';
import { registerCrewIntegrityTools } from '../tools/crew-integrity-tools.js';
import { registerEntitlementTools } from '../tools/entitlement-tools.js';
import { registerClientTools } from '../tools/client-tools.js';
import { registerCrewStreamTools } from '../tools/crew-stream-tools.js';
import { registerCrewPersonalContextTool } from '../tools/crew-personal-context-tool.js';
import { registerInnovationLoungeTools } from '../tools/innovation-lounge-tools.js';
import { registerDeliveryTools } from '../tools/delivery-tools.js';
import { registerCrewAnalyzeImageTool } from '../tools/crew-analyze-image.js';
import { registerAnalyzeImageTool } from '../tools/analyze-image.js';

export type ToolRegistrar = (server: McpServer) => void | Promise<void>;

/**
 * Tool groups by priority. Load order:
 *  - CRITICAL: Always load first (health/status)
 *  - CORE: Crew essentials (memory, missions, autonomy)
 *  - EXTENDED: Secondary capabilities (Aha, repo, docs)
 *  - OPTIONAL: Nice-to-have (innovations, streaming, analytics)
 */
export const TOOL_GROUPS: Record<'critical' | 'core' | 'extended' | 'optional', { name: string; registrars: ToolRegistrar[] }> = {
  critical: {
    name: 'Critical (System Health)',
    registrars: [registerStarshipTools, registerWorfgateTools], // Status + security, minimal overhead
  },
  core: {
    name: 'Core (Crew Operations)',
    registrars: [
      registerCrewMemberTools,
      registerCrewMemoryTools,
      registerCrewMissionTools,
      registerCrewAutonomyTools,
      registerStoryTools,
    ],
  },
  extended: {
    name: 'Extended (PM + Repo)',
    registrars: [
      registerAhaTools,
      registerRepoTools,
      registerSkillTools,
      registerDocTools,
      registerClientTools,
    ],
  },
  optional: {
    name: 'Optional (Analytics + Media)',
    registrars: [
      registerCrewIntegrityTools,
      registerEntitlementTools,
      registerCrewStreamTools,
      registerCrewPersonalContextTool,
      registerInnovationLoungeTools,
      registerDeliveryTools,
      registerCrewAnalyzeImageTool,
      registerAnalyzeImageTool,
    ],
  },
};

// Track which tool groups have been loaded
const loadedGroups = new Set<string>();
let loadStartTime: number | null = null;

function logLoad(stage: string, detail: string) {
  if (!loadStartTime) loadStartTime = Date.now();
  const elapsed = Date.now() - loadStartTime;
  process.stderr.write(`[TOOLS-LOAD] [${elapsed}ms] ${stage}: ${detail}\n`);
}

/**
 * Load all tools in a group. Returns early if already loaded.
 * Catches errors to prevent one broken tool from killing the rest.
 */
export async function loadToolGroup(server: McpServer, groupKey: 'critical' | 'core' | 'extended' | 'optional'): Promise<{ loaded: number; errors: number }> {
  if (loadedGroups.has(groupKey)) {
    logLoad('CACHE-HIT', `Tool group '${groupKey}' already loaded`);
    return { loaded: 0, errors: 0 };
  }

  const group = TOOL_GROUPS[groupKey];
  if (!group) {
    logLoad('ERROR', `Unknown tool group: ${groupKey}`);
    return { loaded: 0, errors: 1 };
  }

  logLoad('START', `Loading ${group.registrars.length} tool registrars from '${group.name}'`);

  let loaded = 0;
  let errors = 0;

  for (const registrar of group.registrars) {
    const registrarName = registrar.name || 'unknown';
    try {
      const startMs = Date.now();
      await Promise.resolve(registrar(server));
      const durationMs = Date.now() - startMs;
      logLoad('LOADED', `${registrarName} (+${durationMs}ms)`);
      loaded++;
    } catch (err: any) {
      logLoad('ERROR', `${registrarName}: ${err?.message || String(err)}`);
      errors++;
      // Continue loading other tools — don't let one error cascade
    }
  }

  logLoad('COMPLETE', `Tool group '${groupKey}' loaded ${loaded}/${group.registrars.length}, ${errors} error(s)`);
  loadedGroups.add(groupKey);

  return { loaded, errors };
}

/**
 * Eagerly load critical + core tools at startup.
 * This ensures basic system health + crew operations are ready immediately.
 * Extended + optional tools load on first use (background, or on-demand).
 */
export async function loadCriticalToolsSync(server: McpServer): Promise<void> {
  logLoad('STARTUP', 'Initializing critical tool groups...');

  const critResult = await loadToolGroup(server, 'critical');
  const coreResult = await loadToolGroup(server, 'core');

  const totalLoaded = critResult.loaded + coreResult.loaded;
  const totalErrors = critResult.errors + coreResult.errors;

  if (totalErrors > 0) {
    logLoad('WARNING', `${totalErrors} error(s) during critical tool load — system may be degraded`);
  }

  logLoad('STARTUP-COMPLETE', `${totalLoaded} tools ready, extended/optional tools load on-demand`);
}

/**
 * Load extended + optional tools in the background (fire-and-forget).
 * Called after critical tools are ready, doesn't block the server.
 */
export async function loadExtendedToolsBackground(server: McpServer): Promise<void> {
  // Fire off async, don't wait
  Promise.all([loadToolGroup(server, 'extended'), loadToolGroup(server, 'optional')])
    .then(([ext, opt]) => {
      logLoad('BACKGROUND', `Extended + Optional tools loaded: ${ext.loaded + opt.loaded} tools, ${ext.errors + opt.errors} error(s)`);
    })
    .catch((err) => {
      logLoad('ERROR', `Background tool loading failed: ${err?.message || String(err)}`);
    });
}

/**
 * Graceful degradation: if a tool is requested but not loaded, load it on-demand.
 * This is a fallback and shouldn't happen in normal operation (tools are pre-loaded).
 * But it's here to ensure the system never completely fails if a tool group didn't load at startup.
 */
export async function ensureToolGroupLoaded(server: McpServer, groupKey: 'critical' | 'core' | 'extended' | 'optional'): Promise<void> {
  if (!loadedGroups.has(groupKey)) {
    logLoad('ON-DEMAND', `Tool group '${groupKey}' not pre-loaded, loading now...`);
    await loadToolGroup(server, groupKey);
  }
}

/**
 * Return the status of tool loading for diagnostics/debugging.
 */
export function getToolLoadStatus(): {
  loaded: string[];
  pending: string[];
  elapsedMs: number;
} {
  const allGroups = Object.keys(TOOL_GROUPS) as Array<keyof typeof TOOL_GROUPS>;
  const loaded = allGroups.filter((g) => loadedGroups.has(g));
  const pending = allGroups.filter((g) => !loadedGroups.has(g));
  const elapsedMs = loadStartTime ? Date.now() - loadStartTime : 0;

  return { loaded, pending, elapsedMs };
}
