import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/**
 * WorfGate view-safety for generated PDFs: Chrome's --print-to-pdf resolves every relative href
 * into an absolute `file:///Users/<name>/...` /URI link annotation — leaking the local filesystem
 * layout (operational metadata) into a shareable artifact. This rewrites those URIs to RELATIVE
 * paths (resolved by PDF viewers against the PDF's own location, so intra-book links keep working
 * when the folder is shared intact).
 *
 * Zero-dependency constraint: PDF xref tables store absolute byte offsets, so replacements must be
 * byte-length-preserving. Relative URIs are padded back to the original length with `./` no-op
 * segments (and one `a/../` when the difference is odd).
 */
export function relinkPdf(pdfPath) {
  const abs = path.resolve(pdfPath);
  const dir = path.dirname(abs);
  const buf = readFileSync(abs);
  const bin = buf.toString('latin1');

  let out = '';
  let last = 0;
  let rewritten = 0;
  let skipped = 0;
  const re = /\/URI \((file:\/\/\/[^)]+)\)/g;
  let m;
  while ((m = re.exec(bin)) !== null) {
    const uri = m[1];
    const targetPath = decodeURIComponent(uri.slice('file://'.length));
    let rel = path.relative(dir, targetPath).split(path.sep).join('/');
    if (!rel || rel.startsWith('/')) { skipped++; continue; }

    let diff = uri.length - rel.length;
    if (diff < 0) { skipped++; continue; }
    if (diff % 2 === 1) {
      if (diff < 5) { skipped++; continue; }
      rel = 'a/../' + rel;
      diff -= 5;
    }
    rel = './'.repeat(diff / 2) + rel;

    const start = m.index + '/URI ('.length;
    out += bin.slice(last, start) + rel;
    last = start + uri.length;
    rewritten++;
  }
  out += bin.slice(last);

  if (rewritten) writeFileSync(abs, Buffer.from(out, 'latin1'));
  return { rewritten, skipped };
}
