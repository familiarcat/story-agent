/**
 * prebuild guard — prevents the ".next corruption" hazard.
 *
 * Running `next build` while `next dev` is live overwrites packages/ui/.next out from under the dev
 * server, which then 500s with `ENOENT ... vendor-chunks/next@... .js` (fixed by rm -rf .next + restart).
 * This runs automatically before `pnpm build` (npm `prebuild` lifecycle): if a dev server is LISTENING
 * on :3000, it BLOCKS the build with instructions. CI has nothing on :3000, so it passes silently.
 * Override for an intentional build-with-dev-up: FORCE_BUILD=1 pnpm build.
 */
import net from 'node:net';

const PORT = Number(process.env.DEV_PORT || 3000);

const sock = net.connect({ host: '127.0.0.1', port: PORT });
sock.setTimeout(700);

const passClean = () => { try { sock.destroy(); } catch { /* noop */ } process.exit(0); };

sock.on('connect', () => {
  try { sock.destroy(); } catch { /* noop */ }
  if (process.env.FORCE_BUILD) {
    console.warn(`\n⚠️  [prebuild] dev server live on :${PORT} — FORCE_BUILD set, proceeding (this may corrupt .next; run \`pnpm web:dev:clean\` after).\n`);
    process.exit(0);
  }
  console.error(
    `\n⛔ [prebuild] A dev server is LISTENING on :${PORT}.\n` +
    `   Running \`next build\` now will overwrite packages/ui/.next out from under \`next dev\` and\n` +
    `   corrupt it (ENOENT vendor-chunks → runtime 500s). Do ONE of:\n` +
    `     • stop the dev stack first (TaskStop / Ctrl-C the \`pnpm dev\`), then rebuild; or\n` +
    `     • FORCE_BUILD=1 pnpm build   (then \`pnpm web:dev:clean\` to repair the dev cache).\n`
  );
  process.exit(1);
});
sock.on('timeout', passClean);
sock.on('error', passClean); // nothing listening → safe to build
