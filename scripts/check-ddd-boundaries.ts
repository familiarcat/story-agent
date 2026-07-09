import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

type Rule = {
  packageRoot: string;
  forbiddenSpecifiers: string[];
};

type Exception = {
  fileSuffix: string;
  specifier: string;
  reason: string;
};

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts']);

const RULES: Rule[] = [
  {
    packageRoot: 'packages/ui/src',
    forbiddenSpecifiers: [
      '@story-agent/shared/db',
      '@story-agent/shared/client-security-policy',
      '@story-agent/shared/client-registry',
      '@story-agent/shared/worfgate-credentials',
      '@story-agent/shared/worfgate-credential-providers',
      '@story-agent/shared/iam-identity-center',
      '@story-agent/shared/aha-credentials',
    ],
  },
  {
    packageRoot: 'packages/vscode-extension/src',
    forbiddenSpecifiers: [
      '@story-agent/shared/db',
      '@story-agent/shared/client-security-policy',
      '@story-agent/shared/client-registry',
      '@story-agent/shared/worfgate-credentials',
      '@story-agent/shared/worfgate-credential-providers',
      '@story-agent/shared/iam-identity-center',
      '@story-agent/shared/aha-credentials',
    ],
  },
];

// Temporary debt register: these imports are currently needed by existing server-side route handlers
// in the UI package. Keep explicit and small; adding new exceptions should be rare and reviewed.
const EXCEPTIONS: Exception[] = [
  {
    fileSuffix: 'packages/ui/src/lib/db.ts',
    specifier: '@story-agent/shared/db',
    reason: 'UI server-side route data adapters pending extraction to MCP/API boundary',
  },
  {
    fileSuffix: 'packages/ui/src/app/api/chat/stream/route.ts',
    specifier: '@story-agent/shared/client-security-policy',
    reason: 'Chat stream policy gate still resolved in UI route layer',
  },
  {
    fileSuffix: 'packages/ui/src/app/api/crew/security-tiers/route.ts',
    specifier: '@story-agent/shared/db',
    reason: 'Security tiers route still queries shared persistence helper directly',
  },
  {
    fileSuffix: 'packages/ui/src/app/api/crew/security-tiers/route.ts',
    specifier: '@story-agent/shared/client-security-policy',
    reason: 'Security tiers route still resolves policy in UI route layer',
  },
];

function walkFiles(root: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(root)) {
    const full = join(root, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...walkFiles(full));
      continue;
    }
    if (!SOURCE_EXTENSIONS.has(extname(name))) continue;
    out.push(full);
  }
  return out;
}

function collectSpecifiers(content: string): string[] {
  const specifiers = new Set<string>();
  const importFrom = /from\s+['"]([^'"]+)['"]/g;
  const importOnly = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  const requireRe = /require\(\s*['"]([^'"]+)['"]\s*\)/g;

  let m: RegExpExecArray | null;
  while ((m = importFrom.exec(content)) !== null) specifiers.add(m[1]);
  while ((m = importOnly.exec(content)) !== null) specifiers.add(m[1]);
  while ((m = requireRe.exec(content)) !== null) specifiers.add(m[1]);

  return [...specifiers];
}

function isException(filePath: string, specifier: string): Exception | undefined {
  return EXCEPTIONS.find((e) => filePath.endsWith(e.fileSuffix) && e.specifier === specifier);
}

function main(): void {
  const cwd = process.cwd();
  const violations: Array<{ file: string; specifier: string }> = [];
  const exceptionHits: Exception[] = [];

  for (const rule of RULES) {
    const files = walkFiles(join(cwd, rule.packageRoot));
    for (const file of files) {
      const rel = relative(cwd, file).replace(/\\/g, '/');
      const specifiers = collectSpecifiers(readFileSync(file, 'utf8'));
      for (const specifier of specifiers) {
        if (!rule.forbiddenSpecifiers.includes(specifier)) continue;
        const exception = isException(rel, specifier);
        if (exception) {
          exceptionHits.push(exception);
          continue;
        }
        violations.push({ file: rel, specifier });
      }
    }
  }

  if (exceptionHits.length) {
    console.log('DDD boundary check: active temporary exceptions');
    for (const ex of exceptionHits) {
      console.log(`- ${ex.fileSuffix} -> ${ex.specifier}`);
    }
  }

  if (!violations.length) {
    console.log('DDD boundary check passed: no unapproved forbidden shared imports found.');
    return;
  }

  console.error('DDD boundary check failed: forbidden shared imports found.');
  for (const v of violations) {
    console.error(`- ${v.file} imports ${v.specifier}`);
  }
  process.exit(1);
}

main();
