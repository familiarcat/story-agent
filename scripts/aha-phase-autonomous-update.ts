/**
 * Crew autonomous phased Aha updater.
 *
 * For each target story reference:
 * - posts an idempotent story-level guidance comment (Riker + Quark lanes)
 * - moves workflow status to a target state
 * - posts idempotent guidance comments on all requirements under the story
 *
 * Usage:
 *   npx tsx scripts/aha-phase-autonomous-update.ts --release=7662916454855771284
 *   npx tsx scripts/aha-phase-autonomous-update.ts --refs=PROD-19,PROD-20 --status="In design"
 *   npx tsx scripts/aha-phase-autonomous-update.ts --release=... --dry-run
 */

type Json = Record<string, unknown>;

type UpdateRow = {
  story: string;
  statusTarget: string;
  storyCommentPosted: boolean;
  requirementCount: number;
  requirementCommentsPosted: number;
};

const args = process.argv.slice(2);
const releaseId = argValue('--release');
const refsCsv = argValue('--refs');
const statusName = argValue('--status') || 'In design';
const dryRun = args.includes('--dry-run');

const domain = process.env.AHA_DOMAIN;
const apiKey = process.env.AHA_API_KEY;

if (!domain || !apiKey) {
  console.error('Missing AHA_DOMAIN or AHA_API_KEY');
  process.exit(1);
}

const base = `https://${domain}/api/v1`;

function argValue(prefix: string): string | null {
  const found = args.find((a) => a.startsWith(`${prefix}=`));
  return found ? found.slice(prefix.length + 1) : null;
}

async function aha(path: string, init: RequestInit = {}): Promise<Json> {
  const res = await fetch(`${base}/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Aha ${res.status} ${path}: ${text.slice(0, 260)}`);
  }
  return text ? (JSON.parse(text) as Json) : {};
}

function storyComment(ref: string, storyName: string): string {
  return [
    `[Autonomous crew update] ${ref} implementation guidance`,
    '',
    `Story: ${storyName}`,
    'Riker suggestion: execute in small validated slices and update status whenever outcomes are verified.',
    'Quark suggestion: continuously reassess cost/effort and cut low-ROI work before implementation.',
    '',
    'Dynamic execution loop:',
    '- pull current requirements and blockers',
    '- implement the next highest-value slice',
    '- post evidence and crew notes to Aha comments',
    '- update workflow status in the same cycle',
  ].join('\n');
}

function requirementComment(ref: string, reqName: string): string {
  return [
    `[Autonomous crew task guidance] ${ref}`,
    '',
    `Task: ${reqName}`,
    'Riker: define one concrete deliverable and done criteria before coding.',
    'Quark: keep this requirement proportional to value and remove unnecessary effort.',
    'Close-loop rule: when fulfilled, comment with steps/evidence and then update status.',
  ].join('\n');
}

async function listRefs(): Promise<string[]> {
  if (refsCsv) {
    return refsCsv.split(',').map((s) => s.trim()).filter(Boolean);
  }
  if (!releaseId) {
    throw new Error('Provide --release=<id> or --refs=PROD-1,PROD-2');
  }
  const data = await aha(`releases/${releaseId}/features?per_page=200`);
  const features = Array.isArray(data.features) ? (data.features as Json[]) : [];
  return features
    .map((f) => String(f.reference_num || '').trim())
    .filter(Boolean);
}

async function hasComment(path: string, marker: string): Promise<boolean> {
  const data = await aha(path);
  const comments = Array.isArray(data.comments) ? (data.comments as Json[]) : [];
  return comments.some((c) => String(c.body || '').includes(marker));
}

async function main(): Promise<void> {
  const refs = await listRefs();
  if (!refs.length) {
    console.log(JSON.stringify({ updated: [], note: 'No story references found.' }, null, 2));
    return;
  }

  const rows: UpdateRow[] = [];

  for (const ref of refs) {
    const featureResp = await aha(`features/${ref}`);
    const feature = (featureResp.feature || {}) as Json;
    const storyName = String(feature.name || ref);

    const storyMarker = `[Autonomous crew update] ${ref}`;
    let storyCommentPosted = false;

    if (!(await hasComment(`features/${ref}/comments?per_page=200`, storyMarker))) {
      storyCommentPosted = true;
      if (!dryRun) {
        await aha(`features/${ref}/comments`, {
          method: 'POST',
          body: JSON.stringify({ comment: { body: storyComment(ref, storyName) } }),
        });
      }
    }

    if (!dryRun) {
      await aha(`features/${ref}`, {
        method: 'PUT',
        body: JSON.stringify({ feature: { workflow_status: { name: statusName } } }),
      });
    }

    const reqResp = await aha(`features/${ref}/requirements?per_page=200`);
    const reqs = Array.isArray(reqResp.requirements) ? (reqResp.requirements as Json[]) : [];
    let requirementCommentsPosted = 0;

    for (const req of reqs) {
      const reqRef = String(req.reference_num || req.id || '').trim();
      if (!reqRef) continue;
      const reqName = String(req.name || reqRef);
      const reqMarker = `[Autonomous crew task guidance] ${reqRef}`;

      if (!(await hasComment(`requirements/${reqRef}/comments?per_page=200`, reqMarker))) {
        requirementCommentsPosted += 1;
        if (!dryRun) {
          await aha(`requirements/${reqRef}/comments`, {
            method: 'POST',
            body: JSON.stringify({ comment: { body: requirementComment(reqRef, reqName) } }),
          });
        }
      }
    }

    rows.push({
      story: ref,
      statusTarget: statusName,
      storyCommentPosted,
      requirementCount: reqs.length,
      requirementCommentsPosted,
    });
  }

  console.log(JSON.stringify({
    dryRun,
    releaseId: releaseId || null,
    refs,
    updated: rows,
  }, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
