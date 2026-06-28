#!/usr/bin/env tsx
/**
 * Documentation RAG ingestion — reads every Markdown file under docs/ and upserts it into sa_documentation (the
 * corpus searchDocumentation reads, now also wired into the agent-core loop's rag_recall). This is
 * the crew's "contemplative basis" — the docs inform their autonomous decision-making.
 *
 * Replaces the old .mjs (which imported @supabase/supabase-js directly and failed to resolve from the
 * repo root). This runs via tsx + the shared db module (storeDocumentationChunk), so resolution works.
 *
 * Usage: npx tsx scripts/ingest-docs-to-rag.ts [--dry-run]
 */
import 'dotenv/config';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { storeDocumentationChunk } from '../packages/shared/src/db.js';

const DOCS_ROOT = path.resolve(process.cwd(), 'docs');
const DRY = process.argv.includes('--dry-run');
const MAX_CHUNK = 2000;

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p));
    else if (e.isFile() && e.name.endsWith('.md')) out.push(p);
  }
  return out;
}

/** Split on blank lines, packing paragraphs up to ~MAX_CHUNK chars (keeps sections coherent). */
function chunk(content: string): string[] {
  const paras = content.split(/\n\s*\n/);
  const chunks: string[] = [];
  let cur = '';
  for (const para of paras) {
    if ((cur + '\n\n' + para).length > MAX_CHUNK && cur) { chunks.push(cur.trim()); cur = para; }
    else cur = cur ? cur + '\n\n' + para : para;
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks.length ? chunks : [content.trim() || '(empty)'];
}

(async () => {
  const files = await walk(DOCS_ROOT);
  console.log(`Found ${files.length} markdown files under docs/`);
  let docCount = 0, chunkCount = 0;
  for (const abs of files) {
    const rel = path.relative(process.cwd(), abs);                       // docs/category/file.md
    const segs = path.relative(DOCS_ROOT, abs).split(path.sep);
    const category = segs.length > 1 ? segs[0] : 'general';
    const filename = path.basename(abs);
    const raw = await fs.readFile(abs, 'utf8');
    const title = (raw.match(/^#\s+(.+)$/m)?.[1] ?? filename.replace(/\.md$/, '')).trim().slice(0, 200);
    const tags = Array.from(new Set([category, ...segs.slice(0, -1), filename.replace(/\.md$/, '')])).filter(Boolean);
    const parts = chunk(raw);
    docCount++;
    for (let i = 0; i < parts.length; i++) {
      chunkCount++;
      if (DRY) continue;
      await storeDocumentationChunk({
        title, category, sourcePath: rel, filename,
        chunkIndex: i, chunkCount: parts.length, content: parts[i],
        contentHash: createHash('sha256').update(parts[i]).digest('hex').slice(0, 16),
        tags,
      });
    }
    if (docCount % 20 === 0) console.log(`  …${docCount}/${files.length} docs (${chunkCount} chunks)`);
  }
  console.log(`${DRY ? '[dry-run] would ingest' : 'Ingested'} ${docCount} docs → ${chunkCount} chunks into sa_documentation`);
  process.exit(0);
})().catch(e => { console.error('ERR', e?.message || e); process.exit(1); });
