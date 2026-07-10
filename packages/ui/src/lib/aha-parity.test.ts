import { describe, it, expect } from 'vitest';
import {
  PARITY_MANIFEST,
  RESOURCES,
  getResourceDef,
  resolveApiRoute,
  resolveUiRoute,
  validateManifest,
  makeAhaResourceRoute,
  type AhaResourceDef,
} from './aha-parity';

describe('parity manifest', () => {
  it('covers the full Aha hierarchy', () => {
    expect(RESOURCES).toEqual(expect.arrayContaining(['firm', 'client', 'project', 'epic', 'story', 'task', 'sprint']));
  });
  it('story maps to the Aha feature primitive under project', () => {
    const story = getResourceDef('story')!;
    expect(story.ahaPrimitive).toBe('feature');
    expect(story.parent).toBe('project');
    expect(story.status).toBe('live');
  });
  it('validateManifest passes (parents resolve; live resources have handlers)', () => {
    expect(validateManifest(PARITY_MANIFEST)).toEqual({ ok: true, errors: [] });
  });
  it('catches a broken manifest (live with no handler, dangling parent)', () => {
    const broken = {
      ...PARITY_MANIFEST,
      epic: { ...PARITY_MANIFEST.epic, status: 'live' as const, get: undefined, list: undefined }, // live but no get/list
    };
    const res = validateManifest(broken as Record<string, AhaResourceDef> as typeof PARITY_MANIFEST);
    expect(res.ok).toBe(false);
    expect(res.errors.join(' ')).toContain('epic');
  });
  it('resolves route pairs', () => {
    expect(resolveApiRoute('story')).toBe('/api/aha/story');
    expect(resolveUiRoute('story')).toBe('/story');
    expect(resolveUiRoute('project')).toBe('/project');
  });
});

const liveStub: AhaResourceDef = {
  resource: 'story',
  ahaPrimitive: 'feature',
  parent: 'project',
  getParam: 'reference',
  listParam: 'projectId',
  get: async (id) => ({ referenceNum: id, name: 'Stub Story', status: 'In Progress' }),
  list: async (projectId, page) => [{ referenceNum: `${projectId}-1`, page }],
  update: async (id, body) => ({ updated: id, statusName: body.statusName }),
  fields: ['referenceNum', 'name', 'status'],
  status: 'live',
};

const post = (body: unknown) =>
  new Request('http://x/api/aha/resource/story', { method: 'POST', body: JSON.stringify(body) });

describe('route factory — reads open', () => {
  it('GET single record via getParam', async () => {
    const r = await makeAhaResourceRoute(liveStub).GET(new Request('http://x?reference=PROD-11'));
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ referenceNum: 'PROD-11' });
  });
  it('GET list via listParam', async () => {
    const r = await makeAhaResourceRoute(liveStub).GET(new Request('http://x?projectId=PROD&page=2'));
    expect(await r.json()).toEqual([{ referenceNum: 'PROD-1', page: 2 }]);
  });
  it('planned resource returns 501', async () => {
    const r = await makeAhaResourceRoute({ ...liveStub, status: 'planned', get: undefined, list: undefined }).GET(new Request('http://x?reference=x'));
    expect(r.status).toBe(501);
  });
});

describe('route factory — writes gated (Worf)', () => {
  it('without confirm → dry-run preview, NO mutation', async () => {
    let called = false;
    const def = { ...liveStub, update: async () => { called = true; return {}; } };
    const r = await makeAhaResourceRoute(def).POST(post({ reference: 'PROD-11', statusName: 'Shipped' }));
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ dryRun: true, id: 'PROD-11' });
    expect(called).toBe(false);
  });
  it('with confirm:true → applies + flags audited', async () => {
    const r = await makeAhaResourceRoute(liveStub).POST(post({ reference: 'PROD-11', statusName: 'Shipped', confirm: true }));
    expect(await r.json()).toMatchObject({ ok: true, id: 'PROD-11', audited: true });
  });
  it('read-only resource (no update) → 405', async () => {
    const r = await makeAhaResourceRoute({ ...liveStub, update: undefined }).POST(post({ reference: 'x', confirm: true }));
    expect(r.status).toBe(405);
  });
  it('missing id → 400', async () => {
    const r = await makeAhaResourceRoute(liveStub).POST(post({ statusName: 'x', confirm: true }));
    expect(r.status).toBe(400);
  });
});
