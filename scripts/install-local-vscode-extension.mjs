import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';

const extensionPath = join(process.cwd(), 'packages', 'vscode-extension');

function findLatestVsix(dir) {
  const candidates = readdirSync(dir)
    .filter((name) => name.endsWith('.vsix') && name.startsWith('story-agent-vscode-'))
    .map((name) => {
      const filePath = join(dir, name);
      const mtimeMs = statSync(filePath).mtimeMs;
      return { name, filePath, mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  return candidates[0] ?? null;
}

const latest = findLatestVsix(extensionPath);

if (!latest) {
  console.error('No VSIX found in packages/vscode-extension. Run "pnpm ext:package" first.');
  process.exit(1);
}

console.log(`Installing VS Code extension from ${latest.name}`);

const result = spawnSync('code', ['--install-extension', latest.filePath, '--force'], {
  stdio: 'inherit',
});

if (result.error) {
  console.error(`Failed to install extension: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
