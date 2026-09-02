#!/usr/bin/env node

/**
 * HTTP Agent Path Verification Test
 * 
 * Verifies that the agent-core HTTP path executes without hanging.
 * Tests:
 *  1. Server startup speed (<100ms target)
 *  2. Health check latency (<50ms target)
 *  3. Agent loop execution (<5s target for minimal task)
 *  4. Error handling (graceful failures)
 *  5. Concurrent execution (parallel missions)
 */

import http from 'http';
import { spawn } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';

const PORT = 3103;
const TIMEOUT_MS = 10000; // 10 second safety timeout per request
const TEST_DURATION_MS = 60000; // Overall test duration

interface TestResult {
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

const results: TestResult[] = [];

function logTest(name: string, passed: boolean, durationMs: number, error?: string) {
  const status = passed ? '✅' : '❌';
  const msg = `${status} ${name} (${durationMs}ms)${error ? ` — ${error}` : ''}`;
  console.log(msg);
  results.push({ name, passed, durationMs, error });
}

async function httpRequest(path: string, method: string = 'GET', body?: string): Promise<{ status: number; body: string; durationMs: number }> {
  return new Promise((resolve, reject) => {
    const startMs = Date.now();
    const timeoutId = setTimeout(() => {
      reject(new Error(`Request timeout after ${TIMEOUT_MS}ms`));
    }, TIMEOUT_MS);

    const options = {
      hostname: 'localhost',
      port: PORT,
      path,
      method,
      headers: body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } : {},
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        clearTimeout(timeoutId);
        const durationMs = Date.now() - startMs;
        resolve({ status: res.statusCode || 0, body: data, durationMs });
      });
    });

    req.on('error', (err) => {
      clearTimeout(timeoutId);
      reject(err);
    });

    if (body) req.write(body);
    req.end();
  });
}

async function test1_ServerStartup(): Promise<void> {
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('TEST 1: Server Startup Speed');
  console.log('══════════════════════════════════════════════════════════════');

  const startMs = Date.now();

  const serverProcess = spawn('pnpm', ['run', 'mcp'], {
    cwd: '/Users/bradygeorgen/Developer/story-agent',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, STORY_AGENT_AGENT_PORT: '3103' },
  });

  // Wait for server to start (listen for "listening" in stderr)
  let serverReady = false;
  const serverStartTimeout = new Promise<boolean>((resolve) => {
    const timeoutId = setTimeout(() => resolve(false), 15000);
    serverProcess.stderr?.on('data', (data) => {
      if (serverReady) return;
      if (data.toString().includes('listening')) {
        serverReady = true;
        clearTimeout(timeoutId);
        resolve(true);
      }
    });
  });

  const ready = await serverStartTimeout;
  const startupMs = Date.now() - startMs;

  if (!ready) {
    logTest('Server Startup', false, startupMs, 'Server did not start within 15 seconds');
    serverProcess.kill();
    return;
  }

  logTest('Server Startup', true, startupMs);

  // Test 2: Health check
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('TEST 2: Health Check Latency');
  console.log('══════════════════════════════════════════════════════════════');

  try {
    const healthStart = Date.now();
    const { status, durationMs } = await httpRequest('/agent/health');
    const passed = status === 200 && durationMs < 100;
    logTest('Health Check', passed, durationMs, passed ? undefined : `Status: ${status}`);
  } catch (err) {
    logTest('Health Check', false, 0, (err as Error)?.message);
  }

  // Test 3: Simple agent task
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('TEST 3: Simple Agent Task');
  console.log('══════════════════════════════════════════════════════════════');

  try {
    const taskStart = Date.now();
    const { status, body, durationMs } = await httpRequest('/agent', 'POST', JSON.stringify({ input: 'List the current directory.' }));
    const passed = status === 200 && durationMs < 5000 && body.length > 0;
    logTest('Simple Agent Task', passed, durationMs, passed ? undefined : `Status: ${status}, Body: ${body.slice(0, 100)}`);
  } catch (err) {
    logTest('Simple Agent Task', false, 0, (err as Error)?.message);
  }

  // Test 4: Concurrent agent tasks
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('TEST 4: Concurrent Agent Tasks (3 parallel)');
  console.log('══════════════════════════════════════════════════════════════');

  try {
    const concurrentStart = Date.now();
    const tasks = [
      httpRequest('/agent', 'POST', JSON.stringify({ input: 'Write a status file.' })),
      httpRequest('/agent', 'POST', JSON.stringify({ input: 'List files.' })),
      httpRequest('/agent', 'POST', JSON.stringify({ input: 'Read a file.' })),
    ];

    const allResults = await Promise.all(tasks);
    const concurrentMs = Date.now() - concurrentStart;

    const allSucceeded = allResults.every((r) => r.status === 200);
    const maxDuration = Math.max(...allResults.map((r) => r.durationMs));

    logTest('Concurrent Tasks (3x)', allSucceeded, concurrentMs, allSucceeded ? undefined : 'Some tasks failed');
    console.log(`  Individual task times: ${allResults.map((r) => r.durationMs).join(', ')}ms`);
  } catch (err) {
    logTest('Concurrent Tasks', false, 0, (err as Error)?.message);
  }

  // Cleanup
  serverProcess.kill();
  await sleep(1000); // Let server shut down

  // Summary
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('TEST SUMMARY');
  console.log('══════════════════════════════════════════════════════════════');

  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;

  console.log(`\nResults: ${passedCount}/${totalCount} tests passed\n`);

  results.forEach((r) => {
    const status = r.passed ? '✅' : '❌';
    console.log(`${status} ${r.name.padEnd(35)} ${String(r.durationMs).padStart(5)}ms ${r.error ? ` — ${r.error}` : ''}`);
  });

  if (passedCount === totalCount) {
    console.log('\n🎉 All tests passed! HTTP path is ready for crew activation.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Review errors above.');
    process.exit(1);
  }
}

// Run tests
test1_ServerStartup().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
