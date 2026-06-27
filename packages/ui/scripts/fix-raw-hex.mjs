// Node codemod to replace raw hex with semantic CSS variables
// Usage: node scripts/fix-raw-hex.mjs

import fs from 'fs';
import path from 'path';

const HEX_TO_VAR = {
  // Light grounds/whites
  '#ffffff': 'var(--surface)',
  '#f8fafc': 'var(--bg)',
  // Gray surfaces
  '#f3f4f6': 'var(--surface-2)',
  // Gray text
  '#6b7280': 'var(--text-dim)',
  '#9ca3af': 'var(--text-dim)',
  // Dark text
  '#111827': 'var(--text)',
  '#374151': 'var(--text)',
  '#1f2937': 'var(--text)',
  '#4b5563': 'var(--text)',
  // Borders
  '#e5e7eb': 'var(--border)',
  '#d1d5db': 'var(--border)',
  // Greens
  '#10b981': 'var(--ok)',
  '#059669': 'var(--ok)',
  // Reds
  '#ef4444': 'var(--danger)',
  '#dc2626': 'var(--danger)',
  // Ambers/Oranges
  '#f59e0b': 'var(--warn)',
  '#d97706': 'var(--warn)',
  // Blues
  '#3b82f6': 'var(--accent4)',
  '#2563eb': 'var(--accent4)',
  // Purples
  '#8b5cf6': 'var(--accent3)',
  '#7c3aed': 'var(--accent3)'
};

const EXCLUDED_PATHS = [
  'app/globals.css',
  'lib/lcars.ts',
  'lib/tokens.ts'
];

function replaceHexInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let updated = false;

  // Replace longest keys first to avoid partial matches
  const sortedHexes = Object.keys(HEX_TO_VAR).sort((a, b) => b.length - a.length);
  for (const hex of sortedHexes) {
    const regex = new RegExp(hex.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    if (content.match(regex)) {
      content = content.replace(regex, HEX_TO_VAR[hex]);
      updated = true;
    }
  }

  if (updated) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}

function scanAndFix(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (EXCLUDED_PATHS.some(excluded => fullPath.includes(excluded))) continue;

    if (file.isDirectory()) {
      scanAndFix(fullPath);
    } else if (file.name.endsWith('.tsx')) {
      replaceHexInFile(fullPath);
    }
  }
}

scanAndFix(path.join(process.cwd(), 'packages/ui/src'));