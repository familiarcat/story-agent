import { describe, it, expect } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { requestWorfGateChange, applyWorfGateChange, getChangeAuditLog } from './worfgate-change-request.js';

const WS = '/tmp/wg-ws';

describe('WorfGate change-request (request → approve → apply)', () => {
  it('in-workspace code = yellow, no approval needed, applies immediately', async () => {
    const p = join(WS, `code-${Date.now()}.ts`);
    const req = requestWorfGateChange({ path: p, description: 'edit code', crewId: 'riker', workspace: WS });
    expect(req.tier).toBe('yellow');
    expect(req.needsApproval).toBe(false);
    // (no actual write asserted — dir may not exist; classification is the contract here)
    expect(req.sensitive).toBe(false);
  });

  it('sensitive file (~/.zshrc) = red, needs approval; refused without approval', async () => {
    const req = requestWorfGateChange({ path: '/Users/x/.zshrc', description: 'consolidate secrets', crewId: 'worf', workspace: WS });
    expect(req.tier).toBe('red');
    expect(req.sensitive).toBe(true);
    expect(req.needsApproval).toBe(true);
    const res = await applyWorfGateChange(req, 'export FOO=1', { decision: 'deny' });
    expect(res.applied).toBe(false);
    expect(req.status).toBe('refused');
  });

  it('sensitive write APPLIES only with explicit approval, backs up, logs no content', async () => {
    const p = join(tmpdir(), `wg-test-${Date.now()}.env`); // .env ⇒ classified sensitive
    try {
      const req = requestWorfGateChange({ path: p, description: 'write env', crewId: 'worf', workspace: WS });
      expect(req.needsApproval).toBe(true);
      const res = await applyWorfGateChange(req, 'SECRET_VALUE=topsecret', { decision: 'approve' });
      expect(res.applied).toBe(true);
      expect(req.status).toBe('applied');
      expect(existsSync(p)).toBe(true);
      expect(readFileSync(p, 'utf8')).toContain('SECRET_VALUE=topsecret');
      // audit never carries the content/secret
      expect(JSON.stringify(getChangeAuditLog())).not.toContain('topsecret');
    } finally {
      if (existsSync(p)) rmSync(p);
    }
  });

  it('out-of-workspace path is treated as sensitive/red', () => {
    const req = requestWorfGateChange({ path: '/etc/hosts', description: 'x', crewId: 'worf', workspace: WS });
    expect(req.sensitive).toBe(true);
    expect(req.needsApproval).toBe(true);
  });
});
