import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, basename } from 'node:path';

/**
 * Render a markdown doc with ```mermaid blocks to a polished PDF.
 *
 *   node scripts/build-pitch-pdf.mjs <input.md> [output.pdf]
 *
 * Pipeline (all local, no network): extract each mermaid fence → render PNG via mermaid-cli (mmdc)
 * → rewrite fences as image refs → pandoc to self-contained HTML → headless Chrome --print-to-pdf.
 * Chrome is used as the PDF engine because it renders emoji + embedded images like a real browser.
 */

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const input = process.argv[2];
if (!input || !existsSync(input)) {
  console.error(`Usage: node scripts/build-pitch-pdf.mjs <input.md> [output.pdf]  (input not found: ${input})`);
  process.exit(1);
}
const output = process.argv[3] || input.replace(/\.md$/, '.pdf');
const dir = dirname(input);
const diagramsDir = join(dir, 'diagrams');
mkdirSync(diagramsDir, { recursive: true });

const md = readFileSync(input, 'utf8');

// 1. Extract mermaid fences, render each to PNG.
let i = 0;
const rewritten = md.replace(/```mermaid\n([\s\S]*?)```/g, (_m, code) => {
  i += 1;
  const mmd = join(diagramsDir, `diagram-${i}.mmd`);
  const png = join(diagramsDir, `diagram-${i}.png`);
  writeFileSync(mmd, code.trim() + '\n', 'utf8');
  console.log(`Rendering diagram ${i} → ${png}`);
  execFileSync('mmdc', ['-i', mmd, '-o', png, '-b', 'white', '-w', '1500', '-s', '2'], { stdio: 'inherit' });
  // Reference relative to the print md (which lives in `dir`).
  return `![Diagram ${i}](diagrams/${basename(png)})`;
});
console.log(`Rendered ${i} diagram(s).`);

// 2. Write the print-variant markdown + a light print stylesheet.
const printMd = join(dir, '.pitch-print.md');
writeFileSync(printMd, rewritten, 'utf8');

const cssPath = join(dir, '.pitch-print.css');
writeFileSync(cssPath, `
  @page { size: Letter; margin: 2cm 1.8cm; }
  body { font-family: -apple-system, "Helvetica Neue", Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #1a1a1a; max-width: 100%; }
  h1 { font-size: 21pt; border-bottom: 3px solid #2b6cb0; padding-bottom: 4px; }
  h2 { font-size: 15pt; color: #2b6cb0; margin-top: 1.4em; border-bottom: 1px solid #ddd; padding-bottom: 2px; }
  h3 { font-size: 12.5pt; color: #2c5282; }
  code { background: #f4f4f5; padding: 1px 4px; border-radius: 3px; font-size: 9.5pt; }
  pre { background: #f7f7f8; padding: 10px; border-radius: 6px; overflow-x: auto; }
  blockquote { border-left: 4px solid #cbd5e0; margin-left: 0; padding-left: 12px; color: #4a5568; }
  table { border-collapse: collapse; width: 100%; font-size: 9.5pt; }
  th, td { border: 1px solid #cbd5e0; padding: 5px 8px; text-align: left; vertical-align: top; }
  th { background: #edf2f7; }
  img { max-width: 100%; display: block; margin: 12px auto; page-break-inside: avoid; }
  h2, h3 { page-break-after: avoid; }
`, 'utf8');

// 3. pandoc → self-contained HTML.
const htmlPath = join(dir, '.pitch-print.html');
console.log('Running pandoc → HTML …');
execFileSync('pandoc', [
  printMd, '-f', 'gfm', '-t', 'html5', '--standalone', '--embed-resources',
  '--resource-path', dir, '--css', cssPath, '--metadata', 'title=', '-o', htmlPath,
], { stdio: 'inherit' });

// 4. headless Chrome → PDF.
console.log('Running Chrome --print-to-pdf → PDF …');
execFileSync(CHROME, [
  '--headless=new', '--disable-gpu', '--no-pdf-header-footer',
  `--print-to-pdf=${output}`, `file://${join(process.cwd(), htmlPath)}`,
], { stdio: 'inherit' });

console.log(`\n✅ PDF written: ${output}`);
