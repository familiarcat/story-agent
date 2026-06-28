import type { Server } from 'node:http';

/**
 * EADDRINUSE-tolerant listen guard.
 *
 * `pnpm dev` starts the MCP server (which binds RAG :3102, optionally MCP HTTP :3101, agent :3103,
 * WS :8000). If a PREVIOUS instance is still bound — a stale `node --watch` process that didn't exit,
 * or a second `pnpm dev` in another terminal — the OS rejects the bind with EADDRINUSE. Without an
 * 'error' handler that rejection bubbles to `uncaughtException` and floods the log (and the new
 * listener silently never comes up).
 *
 * Attaching this BEFORE `server.listen(...)` turns that fatal noise into a single friendly line: the
 * already-running instance keeps serving the port, which is harmless for local dev. Any non-EADDRINUSE
 * listen error is re-thrown unchanged.
 */
export function guardListen(server: Server, port: number, label: string): void {
  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      process.stderr.write(
        `[port] ${label} :${port} already in use — an existing instance is serving it; skipping this listener. ` +
          `(To take over the port: lsof -ti:${port} | xargs kill)\n`,
      );
      return;
    }
    throw err;
  });
}
