#!/usr/bin/env node

/**
 * VSCode Extension Hot-Reload Launcher
 *
 * Simplified approach: Just watch esbuild output and show status.
 * VSCode Extension Development Host auto-reloads when dist/extension.js changes.
 *
 * Usage:
 *   pnpm dev:hot
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distFile = path.join(__dirname, 'dist/extension.js');
const srcDir = path.join(__dirname, 'src');

let buildCount = 0;
let lastBuildTime = Date.now();
let isBuilding = false;

/**
 * Calculate build time from last change
 */
function getBuildDuration() {
  const now = Date.now();
  const duration = now - lastBuildTime;
  return duration;
}

/**
 * Watch esbuild output and react to builds
 */
function monitorBuild(process) {
  if (!process.stdout || !process.stderr) return;

  process.stdout.on('data', (data) => {
    const msg = data.toString();

    if (msg.includes('[watch]') && msg.includes('rebuild')) {
      buildCount++;
      isBuilding = true;
      process.stdout.write('⏳ Building...\n');
    }

    if (msg.includes('[watch]') && msg.includes('done')) {
      isBuilding = false;
      lastBuildTime = Date.now();
      const duration = getBuildDuration();
      process.stdout.write(`✨ Build #${buildCount} complete (${duration}ms)\n`);
      process.stdout.write('🔄 VSCode Extension Host auto-reloading...\n');
      process.stdout.write('💡 If reload doesn\'t work, press Cmd+Shift+P → "Restart Extension Host"\n\n');
    }
  });

  process.stderr.on('data', (data) => {
    const msg = data.toString();
    if (msg.includes('error')) {
      process.stderr.write('❌ Build error:\n');
      process.stderr.write(msg);
    }
  });
}

/**
 * Main: Start esbuild in watch mode with enhanced monitoring
 */
function main() {
  console.log('🚀 Story Agent VSCode Extension — Hot-Reload Mode');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('📍 Watching: src/**/*.ts');
  console.log('📝 Output: dist/extension.js');
  console.log('🔄 Reload: VSCode Extension Host (auto)');
  console.log('');
  console.log('💡 Pro tips:');
  console.log('   • Open in VSCode: code --extensionDevelopmentPath=.');
  console.log('   • Or press F5 in VSCode to start Extension Development Host');
  console.log('   • Changes rebuild in ~500ms and reload automatically');
  console.log('   • Manual reload: Cmd+Shift+P → "Restart Extension Host"');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  const esbuild = spawn('pnpm', ['exec', 'esbuild',
    'src/extension.ts',
    '--bundle',
    '--outfile=dist/extension.js',
    '--external:vscode',
    '--format=cjs',
    '--platform=node',
    '--sourcemap',
    '--watch=forever'
  ], {
    cwd: __dirname,
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: true
  });

  monitorBuild(esbuild);

  esbuild.on('error', (err) => {
    console.error('❌ esbuild fatal error:', err);
    process.exit(1);
  });

  esbuild.on('exit', (code) => {
    if (code === 0) {
      console.log('✅ Hot-reload stopped gracefully');
    } else {
      console.error(`❌ esbuild exited with code ${code}`);
    }
    process.exit(code);
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping hot-reload...');
    esbuild.kill();
    process.exit(0);
  });
}

main();
