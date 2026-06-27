/**
 * UI ↔ Aha! API parity — the single declarative manifest that maps each Aha resource to its local
 * API route + UI route, and a route FACTORY that generates Next.js handlers from a manifest entry
 * (instead of hand-writing one route per resource). Crew unified-nav mission (RAG MEM 28).
 *
 * Concept map (docs/aha-nomenclature.md): firm/client = Aha workspace; project = initiative;
 * epic = epic; story = feature; task = requirement; sprint = release.
 *
 * Security (Worf): READS are open; WRITES require confirm:true (a dry-run preview otherwise) and are
 * audited — exactly as aha-tools.ts gates today. The factory reuses the existing @/lib/aha client.
 */
import {
  listAhaProjects,
  listAhaStoriesForProject,
  getAhaStory,
  updateAhaStoryStatus,
  listAhaSprints,
  getAhaSprint,
  getProjectHierarchy,
} from '@/lib/aha';

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
  /** Gated write (requires confirm). */
  update?: (id: string, body: Record<string, unknown>) => Promise<unknown>;
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
  epic: { resource: 'epic', ahaPrimitive: 'epic', parent: 'project', fields: ['id', 'name'], status: 'planned' },
  story: {
    resource: 'story', ahaPrimitive: 'feature', parent: 'project',
    getParam: 'reference', listParam: 'projectId',
    get: (ref) => getAhaStory(ref),
    list: (projectId, page) => listAhaStoriesForProject(projectId, page),
    update: (id, body) => updateAhaStoryStatus(id, String(body.statusName ?? '')),
    fields: ['referenceNum', 'name', 'status'], status: 'live',
  },
  task: { resource: 'task', ahaPrimitive: 'requirement', parent: 'story', fields: ['id', 'name'], status: 'planned' },
  sprint: {
    resource: 'sprint', ahaPrimitive: 'release', parent: 'project',
    getParam: 'releaseId', listParam: 'projectId',
    get: (id) => getAhaSprint(id),
    list: (projectId) => listAhaSprints(projectId),
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
      if (!def.update) return json({ error: `resource '${def.resource}' is read-only` }, 405);
      let body: Record<string, unknown> = {};
      try { body = await request.json(); } catch { return json({ error: 'bad_json' }, 400); }
      const idKey = def.getParam ?? 'id';
      const id = String(body[idKey] ?? body.id ?? '');
      if (!id) return json({ error: `'${idKey}' required` }, 400);
      // WorfGate: writes require an explicit confirm:true; otherwise return a dry-run preview (no mutation).
      if (body.confirm !== true) {
        return json({ dryRun: true, resource: def.resource, ahaPrimitive: def.ahaPrimitive, id, proposed: body, note: 'Set confirm:true to apply (Worf-gated write).' });
      }
      try {
        const result = await def.update(id, body);
        return json({ ok: true, resource: def.resource, id, result: result ?? null, audited: true });
      } catch (e) {
        return json({ error: `aha ${def.resource} write failed`, details: e instanceof Error ? e.message : String(e) }, 500);
      }
    },
  };
}
