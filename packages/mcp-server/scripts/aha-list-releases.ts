import 'dotenv/config';
import { listAhaProjects, listAhaSprints } from '../src/lib/aha.js';
(async () => {
  const projects = await listAhaProjects(1);
  console.log('PROJECTS:', JSON.stringify(projects.slice(0, 6), null, 0));
  for (const p of projects.slice(0, 4)) {
    const pid = String((p as any).id ?? (p as any).referencePrefix ?? (p as any).reference_prefix ?? '');
    try {
      const sprints = await listAhaSprints(pid);
      console.log(`RELEASES[${(p as any).name} / ${pid}]:`, JSON.stringify(sprints.slice(0, 6).map((s: any) => ({ name: s.name, id: s.id })), null, 0));
    } catch (e: any) { console.log(`releases err [${(p as any).name}]:`, e?.message); }
  }
  process.exit(0);
})().catch(e => { console.error('ERR', e?.message || e); process.exit(1); });
