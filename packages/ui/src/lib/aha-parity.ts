/**
 * UI ↔ Aha! API parity — the single declarative manifest that maps each Aha resource to its local
 * API route + UI route, and a route FACTORY that generates Next.js handlers from a manifest entry
 * (instead of hand-writing one route per resource). Crew unified-nav mission (RAG MEM 28).
 *
 * Concept map (docs/setup/aha-nomenclature.md): firm/client = Aha workspace; project = initiative;
 * epic = epic; story = feature; task = requirement; sprint = release.
 *
 * Security (Worf): READS are open; WRITES require confirm:true (a dry-run preview otherwise) and are
 * audited — exactly as aha-tools.ts gates today. The factory reuses the existing @/lib/aha client.
 */
import {
  listAhaProjects,
  listAhaStoriesForProject,
  listAhaEpicsForProject,
  getAhaEpic,
  getAhaStory,
  updateAhaStory,
  listAhaSprints,
  getAhaSprint,
  getProjectHierarchy,
  createAhaStory,
  createAhaRelease,
  updateAhaRelease,
  listAhaRequirements,
  getAhaRequirement,
  createAhaRequirement,
  updateAhaRequirement,
  deleteAhaRequirement,
} from '@/lib/aha';
import { decideCrewAssignment, resolvePrimaryAhaAssigneeId } from '@story-agent/shared';
import { emitAhaEventSafe, type AhaActor, type AhaResourceType } from '@story-agent/shared/aha-events';

function resolveDefaultAssigneeId(body: Record<string, unknown>): string | undefined {
  const explicit = typeof body.assigneeId === 'string' ? body.assigneeId : undefined;
  if (explicit) return explicit;
  const assignment = decideCrewAssignment({
    title: typeof body.name === 'string' ? body.name : undefined,
    description: typeof body.description === 'string' ? body.description : undefined,
  });
  return resolvePrimaryAhaAssigneeId(assignment, process.env) ?? undefined;
}

export type AhaPrimitive = 'workspace' | 'initiative' | 'epic' | 'feature' | 'requirement' | 'release';
export type ResourceName = 'firm' | 'client' | 'project' | 'epic' | 'story' | 'task' | 'sprint';

export interface AhaResourceDef {
  resource: ResourceName;
  ahaPrimitive: AhaPrimitive;
  parent: ResourceName | null;
  /** Query param naming a SINGLE record (e.g. 'reference'); presence triggers get(). */
  getParam?: string;
  /** Query param naming the PARENT id for a list (e.g. 'projectId'). */
  listParam?: string;
  get?: (id: string) => Promise<unknown>;
  list?: (parentId: string, page: number) => Promise<unknown>;
  create?: (body: Record<string, unknown>) => Promise<unknown>;
  /** Gated write (requires confirm). */
  update?: (id: string, body: Record<string, unknown>) => Promise<unknown>;
  delete?: (id: string) => Promise<void>;
  fields: string[];
  /** 'live' = wired to a client fn; 'planned' = manifested but not yet implemented (returns 501). */
  status: 'live' | 'planned';
}

/** The single source of truth for UI↔Aha parity. Add a resource here → it gets an API + UI route. */
export const PARITY_MANIFEST: Record<ResourceName, AhaResourceDef> = {
  firm: { resource: 'firm', ahaPrimitive: 'workspace', parent: null, fields: ['id', 'name'], status: 'planned' },
  client: { resource: 'client', ahaPrimitive: 'workspace', parent: 'firm', fields: ['id', 'name'], status: 'planned' },
  project: {
    resource: 'project', ahaPrimitive: 'initiative', parent: 'client',
    getParam: 'projectId', get: (id) => getProjectHierarchy(id),
    list: (_parent, page) => listAhaProjects(page),
    fields: ['id', 'name'], status: 'live',
  },
  epic: {
    resource: 'epic', ahaPrimitive: 'epic', parent: 'project',
    getParam: 'epicId', listParam: 'projectId',
    get: (id) => getAhaEpic(id),
    list: (projectId, page) => listAhaEpicsForProject(projectId, page),
    fields: ['id', 'referenceNum', 'name', 'workflowStatus'], status: 'live',
  },
  story: {
    resource: 'story', ahaPrimitive: 'feature', parent: 'project',
    getParam: 'reference', listParam: 'projectId',
    get: (ref) => getAhaStory(ref),
    list: (projectId, page) => listAhaStoriesForProject(projectId, page),
    create: (body) => createAhaStory(String(body.releaseId ?? ''), {
      name: String(body.name ?? ''),
      description: typeof body.description === 'string' ? body.description : undefined,
      assigneeId: resolveDefaultAssigneeId(body),
      storyPoints: typeof body.storyPoints === 'number' ? body.storyPoints : undefined,
    }),
    update: (id, body) => updateAhaStory(id, {
      name: typeof body.name === 'string' ? body.name : undefined,
      description: typeof body.description === 'string' ? body.description : undefined,
      workflowStatus: typeof body.statusName === 'string' ? body.statusName : undefined,
      assigneeId: resolveDefaultAssigneeId(body),
    }),
    fields: ['referenceNum', 'name', 'status'], status: 'live',
  },
  task: {
    resource: 'task', ahaPrimitive: 'requirement', parent: 'story',
    getParam: 'requirementRef', listParam: 'featureRef',
    get: (id) => getAhaRequirement(id),
    list: (featureRef) => listAhaRequirements(featureRef),
    create: (body) => createAhaRequirement(String(body.featureRef ?? ''), {
      name: String(body.name ?? ''),
      description: typeof body.description === 'string' ? body.description : undefined,
      assigneeId: resolveDefaultAssigneeId(body),
    }),
    update: (id, body) => updateAhaRequirement(id, {
      name: typeof body.name === 'string' ? body.name : undefined,
      description: typeof body.description === 'string' ? body.description : undefined,
      workflowStatus: typeof body.statusName === 'string' ? body.statusName : undefined,
      assigneeId: resolveDefaultAssigneeId(body),
    }),
    delete: (id) => deleteAhaRequirement(id),
    fields: ['referenceNum', 'name', 'description'], status: 'live',
  },
  sprint: {
    resource: 'sprint', ahaPrimitive: 'release', parent: 'project',
    getParam: 'releaseId', listParam: 'projectId',
    get: (id) => getAhaSprint(id),
    list: (projectId) => listAhaSprints(projectId),
    create: (body) => createAhaRelease(String(body.projectId ?? ''), {
      name: String(body.name ?? ''),
      startDate: typeof body.startDate === 'string' ? body.startDate : undefined,
      endDate: typeof body.endDate === 'string' ? body.endDate : undefined,
    }),
    update: (id, body) => updateAhaRelease(id, {
      name: typeof body.name === 'string' ? body.name : undefined,
      startDate: typeof body.startDate === 'string' ? body.startDate : undefined,
      endDate: typeof body.endDate === 'string' ? body.endDate : undefined,
    }),
    fields: ['id', 'name'], status: 'live',
  },
};

export const RESOURCES = Object.keys(PARITY_MANIFEST) as ResourceName[];

export function getResourceDef(resource: string): AhaResourceDef | null {
  return (PARITY_MANIFEST as Record<string, AhaResourceDef>)[resource] ?? null;
}

export function resolveApiRoute(resource: ResourceName): string {
  return `/api/aha/${resource}`;
}
export function resolveUiRoute(resource: ResourceName): string {
  return resource === 'story' ? '/story' : `/${resource}`;
}

/** Validate the manifest: parent chain resolves; live resources expose a get or list (pure). */
export function validateManifest(m: Record<ResourceName, AhaResourceDef> = PARITY_MANIFEST): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  for (const [name, def] of Object.entries(m)) {
    if (def.parent && !m[def.parent]) errors.push(`${name}: parent '${def.parent}' missing from manifest`);
    if (def.status === 'live' && !def.get && !def.list) errors.push(`${name}: live resource needs a get or list handler`);
  }
  return { ok: errors.length === 0, errors };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}

/** UI resource name → aha_events resource type (firm/client have no sync-ledger representation). */
const EVENT_RESOURCE_TYPE: Partial<Record<ResourceName, AhaResourceType>> = {
  story: 'story',
  epic: 'epic',
  sprint: 'release',
  task: 'requirement',
  project: 'project',
};

export function parseAhaActor(value: unknown): AhaActor {
  return value === 'extension' ? 'extension' : 'dashboard';
}

/**
 * Generate Next.js GET/POST handlers for a manifested Aha resource. READS open; WRITES require
 * confirm:true (Worf gate) — a dry-run preview is returned otherwise, and applied writes are flagged
 * audited. One factory drives every resource → the dynamic parity layer.
 */
export function makeAhaResourceRoute(def: AhaResourceDef) {
  return {
    async GET(request: Request): Promise<Response> {
      if (def.status !== 'live') {
        return json({ error: `resource '${def.resource}' is planned, not yet implemented`, ahaPrimitive: def.ahaPrimitive }, 501);
      }
      const { searchParams } = new URL(request.url);
      try {
        const getKey = def.getParam ? searchParams.get(def.getParam) : null;
        if (getKey && def.get) return json(await def.get(getKey));
        if (def.list) {
          const parentId = def.listParam ? searchParams.get(def.listParam) ?? '' : '';
          const page = Number(searchParams.get('page') ?? '1');
          return json(await def.list(parentId, page));
        }
        return json({ error: `provide '${def.getParam ?? def.listParam ?? 'id'}'` }, 400);
      } catch (e) {
        return json({ error: `aha ${def.resource} read failed`, details: e instanceof Error ? e.message : String(e) }, 500);
      }
    },
    async POST(request: Request): Promise<Response> {
      if (!def.create && !def.update && !def.delete) return json({ error: `resource '${def.resource}' is read-only` }, 405);
      let body: Record<string, unknown> = {};
      try { body = await request.json(); } catch { return json({ error: 'bad_json' }, 400); }
      const mode = String(body.mode ?? 'update').toLowerCase();
      const isCreate = mode === 'create';
      const isDelete = mode === 'delete';
      const idKey = def.getParam ?? 'id';
      const id = String(body[idKey] ?? body.id ?? '');
      if (!isCreate && !id) return json({ error: `'${idKey}' required` }, 400);
      // WorfGate: writes require an explicit confirm:true; otherwise return a dry-run preview (no mutation).
      if (body.confirm !== true) {
        return json({ dryRun: true, resource: def.resource, ahaPrimitive: def.ahaPrimitive, id: id || null, mode, proposed: body, note: 'Set confirm:true to apply (Worf-gated write).' });
      }
      try {
        let result: unknown = null;
        let operation: 'created' | 'updated' | 'deleted' = 'updated';
        let resourceId = id;
        if (isCreate) {
          if (!def.create) return json({ error: `resource '${def.resource}' does not support create` }, 405);
          result = await def.create(body);
          operation = 'created';
          resourceId = String((result as Record<string, unknown> | null)?.referenceNum ?? (result as Record<string, unknown> | null)?.id ?? id ?? '');
        } else if (isDelete) {
          if (!def.delete) return json({ error: `resource '${def.resource}' does not support delete` }, 405);
          await def.delete(id);
          result = { deleted: true };
          operation = 'deleted';
        } else {
          if (!def.update) return json({ error: `resource '${def.resource}' does not support update` }, 405);
          result = await def.update(id, body);
          operation = 'updated';
        }
        // Sync ledger (Worf ruling AHA-SYNC-TIERS): emit AFTER the Aha write succeeds; emit failure
        // must never fail the write — emitAhaEventSafe swallows and logs.
        const eventType = EVENT_RESOURCE_TYPE[def.resource];
        if (eventType) {
          await emitAhaEventSafe({
            resourceType: eventType,
            resourceId: resourceId || id,
            operation,
            actor: parseAhaActor(body.actor),
          });
        }
        return json({ ok: true, resource: def.resource, id: resourceId || id, mode, result: result ?? null, audited: true });
      } catch (e) {
        return json({ error: `aha ${def.resource} write failed`, details: e instanceof Error ? e.message : String(e) }, 500);
      }
    },
  };
}
