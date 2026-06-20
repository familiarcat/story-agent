/**
 * Codebase indexer — full-repo recognition for the crew assistant.
 *
 * Walks the repository source, chunks each file, and upserts the chunks into the cloud
 * `sa_documentation` RAG store under category 'codebase'. The RAG read service's
 * searchDocumentation() then surfaces relevant code to the VS Code assistant, giving it
 * recognition of the whole codebase (not just the open file).
 *
 * Idempotent: clears existing category='codebase' rows, then re-inserts.
 * Run:  zsh -ic 'npx tsx scripts/index-codebase-to-rag.ts'   (cloud-first via shared db)
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, extname } from 'path';
import { createHash } from 'crypto';
import { getDbClient } from '../packages/shared/src/db.js';

const ROOT = process.cwd(); // run from the repo root
const INCLUDE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.sql', '.md']);
const EXCLUDE_DIRS = new Set(['node_modules', 'dist', 'out', '.git', '.next', 'coverage', '.turbo', '.vscode-test']);
const CHUNK_LINES = 120;
const MAX_FILES = 600;

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (EXCLUDE_DIRS.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else if (INCLUDE_EXT.has(extname(name)) && !/\.(test|integration\.test)\./.test(name) && !name.endsWith('.d.ts')) {
      acc.push(full);
    }
    if (acc.length >= MAX_FILES) break;
  }
  return acc;
}

function chunk(text: string): string[] {
  const lines = text.split('\n');
  const out: string[] = [];
  for (let i = 0; i < lines.length; i += CHUNK_LINES) {
    const body = lines.slice(i, i + CHUNK_LINES).join('\n').trim();
    if (body) out.push(body);
  }
  return out.length ? out : [];
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const files = walk(ROOT);
  console.log(`[index] ${files.length} source files to index (cap ${MAX_FILES})${dryRun ? ' — DRY RUN (no upload)' : ''}`);

  if (dryRun) {
    let totalChunks = 0;
    const byDir: Record<string, number> = {};
    for (const file of files) {
      const rel = relative(ROOT, file);
      let content = ''; try { content = readFileSync(file, 'utf8'); } catch { continue; }
      if (content.length > 200_000) continue;
      const n = chunk(content).length;
      totalChunks += n;
      byDir[rel.split('/')[0]] = (byDir[rel.split('/')[0]] ?? 0) + n;
    }
    console.log(`[index] DRY RUN: would write ${totalChunks} chunks. By top-dir:`, JSON.stringify(byDir));
    return;
  }

  const client = await getDbClient();
  console.log('[index] cleared previous codebase chunks:',
    JSON.stringify((await client.from('sa_documentation').delete().eq('category', 'codebase')).error ?? 'ok'));

  let chunks = 0, errors = 0, indexed = 0;
  for (const file of files) {
    const rel = relative(ROOT, file);
    let content: string;
    try { content = readFileSync(file, 'utf8'); } catch { continue; }
    if (content.length > 200_000) continue; // skip very large/generated files
    const parts = chunk(content);
    const topDir = rel.split('/')[0];
    const ext = extname(file).slice(1);
    const hash = createHash('sha256').update(content).digest('hex').slice(0, 16);

    const rows = parts.map((c, i) => ({
      title: rel,
      category: 'codebase',
      source_path: rel,
      filename: rel.split('/').pop(),
      chunk_index: i,
      chunk_count: parts.length,
      chunk_content: c.slice(0, 4000),
      content_hash: `${hash}-${i}`,
      tags: [ext, topDir, 'code'],
      is_searchable: true,
      ingested_at: new Date().toISOString(),
    }));
    if (rows.length === 0) continue;

    const { error } = await client.from('sa_documentation').insert(rows);
    if (error) { errors++; if (errors <= 5) console.warn(`  ✗ ${rel}: ${error.message}`); }
    else { chunks += rows.length; indexed++; }
  }

  console.log(`[index] ✅ indexed ${indexed} files / ${chunks} chunks into sa_documentation (category=codebase); ${errors} errors`);
}

main().catch((e) => { console.error('indexer failed:', e instanceof Error ? e.message : e); process.exit(1); });
