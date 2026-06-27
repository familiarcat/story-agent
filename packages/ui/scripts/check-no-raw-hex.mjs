// Node script to scan for raw hex color literals in .tsx files
// Usage: node scripts/check-no-raw-hex.mjs
// Exits 1 if violations found, 0 otherwise

import fs from 'fs';
import path from 'path';

const HEX_REGEX = /#[0-9a-f]{3,6}/gi;
const EXCLUDED_PATHS = [
  'app/globals.css',
  'lib/lcars.ts',
  'lib/tokens.ts'
];

function scanFiles(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  let violations = 0;

  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (EXCLUDED_PATHS.some(excluded => fullPath.includes(excluded))) continue;

    if (file.isDirectory()) {
      violations += scanFiles(fullPath);
    } else if (file.name.endsWith('.tsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const matches = content.match(HEX_REGEX);
      if (matches) {
        console.log(`${fullPath}: Found raw hex: ${matches.join(', ')}`);
        violations += matches.length;
      }
    }
  }

  return violations;
}

const violations = scanFiles(path.join(process.cwd(), 'packages/ui/src'));
process.exit(violations > 0 ? 1 : 0);