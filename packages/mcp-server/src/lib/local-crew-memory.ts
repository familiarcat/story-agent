import { readdir, readFile, stat } from 'fs/promises';
import { createHash } from 'crypto';
import { resolve } from 'path';
import type { CrewAgentProfile, ObservationMemoryRecord, ObservationDebateResult } from '@story-agent/shared';

type LegacyObservation = {
  crew_member?: string;
  role?: string;
  title?: string;
  summary?: string;
  key_findings?: string[];
  conclusions?: string[];
  recommendations?: string[];
  tags?: string[];
  category?: string;
  timestamp?: string;
};

export interface ExternalCrewMemorySource {
  label: string;
  path: string;
}

export interface ExternalCrewObservationMemory extends ObservationMemoryRecord {
  crewId: string;
  crewName: string;
  sourceLabel: string;
  rawRole: string;
}

const LEGACY_CREW_ALIASES: Record<string, string> = {
  captain_picard: 'picard',
  captain_picard_strategic: 'picard',
  commander_data: 'data',
  commander_riker: 'riker',
  geordi_la_forge: 'geordi',
  chief_obrien: 'obrien',
  lt_worf: 'worf',
  lt_uhura: 'uhura',
  dr_crusher: 'crusher',
  counselor_troi: 'troi',
  tasha_yar: 'yar',
};

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function sanitizeLegacyJson(raw: string): string {
  return raw.replace(/"recommendations"\s*:\s*,/g, '"recommendations": [],');
}

function buildObservationDebate(record: LegacyObservation, crewName: string): ObservationDebateResult {
  const findings = record.key_findings ?? [];
  const conclusions = record.conclusions ?? [];
  const recommendations = record.recommendations ?? [];

  return {
    rounds: [
      {
        title: record.title ?? `Imported observation for ${crewName}`,
        entries: [
          {
            speakerId: crewName,
            position: 'support',
            statement: record.summary ?? 'Imported legacy observation.',
            evidence: [...findings.slice(0, 3), ...conclusions.slice(0, 2)],
          },
        ],
      },
    ],
    consensusSummary: record.summary ?? conclusions[0] ?? `Imported memory from ${crewName}`,
    unresolvedRisks: [],
    finalDecision: 'approved',
    actionItems: recommendations.length > 0 ? recommendations : conclusions.slice(0, 3),
  };
}

function buildTranscriptText(record: LegacyObservation): string {
  return JSON.stringify({
    summary: record.summary ?? '',
    keyFindings: record.key_findings ?? [],
    conclusions: record.conclusions ?? [],
    recommendations: record.recommendations ?? [],
    tags: record.tags ?? [],
  });
}

function hashText(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function getDefaultMemorySources(): ExternalCrewMemorySource[] {
  const configured = (process.env.LEGACY_CREW_MEMORY_PATHS ?? '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
    .map((entry, index) => ({
      label: `configured-${index + 1}`,
      path: resolve(process.cwd(), entry),
    }));

  const defaults: ExternalCrewMemorySource[] = [
    {
      label: 'ai-enterprise-os',
      path: resolve(process.cwd(), '..', 'ai-enterprise-os', 'crew-memories', 'active'),
    },
    {
      label: 'ai-enterprise-os-workspace-sibling',
      path: resolve(process.cwd(), '..', '..', 'ai-enterprise-os', 'crew-memories', 'active'),
    },
  ];

  const deduped = new Map<string, ExternalCrewMemorySource>();
  for (const source of [...configured, ...defaults]) {
    deduped.set(source.path, source);
  }
  return Array.from(deduped.values());
}

async function pathExists(path: string): Promise<boolean> {
  try {
    const info = await stat(path);
    return info.isDirectory();
  } catch {
    return false;
  }
}

function resolveCrewId(rawCrewName: string, roster: CrewAgentProfile[]): { crewId: string; crewName: string } | null {
  const normalized = normalizeName(rawCrewName);
  const aliased = LEGACY_CREW_ALIASES[normalized] ?? normalized;

  const byId = roster.find(member => member.id === aliased);
  if (byId) {
    return { crewId: byId.id, crewName: byId.name };
  }

  const byName = roster.find(member => normalizeName(member.name) === normalized || normalizeName(member.name) === aliased);
  if (byName) {
    return { crewId: byName.id, crewName: byName.name };
  }

  return null;
}

export async function loadExternalCrewObservationMemories(roster: CrewAgentProfile[]): Promise<ExternalCrewObservationMemory[]> {
  const sources = getDefaultMemorySources();
  const loaded: ExternalCrewObservationMemory[] = [];

  for (const source of sources) {
    if (!(await pathExists(source.path))) {
      continue;
    }

    const entries = await readdir(source.path);
    for (const entry of entries) {
      if (!entry.endsWith('.json')) continue;

      try {
        const raw = await readFile(resolve(source.path, entry), 'utf8');
        const parsed = JSON.parse(sanitizeLegacyJson(raw)) as LegacyObservation;
        if (!parsed.crew_member) continue;

        const resolvedCrew = resolveCrewId(parsed.crew_member, roster);
        if (!resolvedCrew) continue;

        const transcriptText = buildTranscriptText(parsed);
        loaded.push({
          id: `${source.label}:${entry}`,
          crewId: resolvedCrew.crewId,
          crewName: resolvedCrew.crewName,
          source: 'mcp',
          sourceLabel: source.label,
          rawRole: parsed.role ?? '',
          storyId: 'cross-project-legacy-memory',
          clientId: null, // legacy memories are global — accessible to all clients
          transcriptHash: hashText(transcriptText),
          transcriptText,
          transcript: buildObservationDebate(parsed, resolvedCrew.crewName),
          missionReference: parsed.title ?? null,
          tags: parsed.tags ?? [],
          embedding: [],
          createdAt: parsed.timestamp ?? new Date().toISOString(),
        });
      } catch {
        // Ignore malformed legacy records and continue loading the remainder.
      }
    }
  }

  return loaded.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}