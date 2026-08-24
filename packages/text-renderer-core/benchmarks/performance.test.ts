import { TextRenderer } from '../src/index';
import { performance } from 'perf_hooks';

describe('Performance Benchmark', () => {
  const sizes = {
    small: 'A'.repeat(1024),
    medium: 'A'.repeat(1024 * 10),
    large: 'A'.repeat(1024 * 100)
  };

  const formats: Array<'markdown' | 'json' | 'code' | 'plaintext'> = ['markdown', 'json', 'code', 'plaintext'];

  for (const [sizeName, text] of Object.entries(sizes)) {
    for (const format of formats) {
      test(`${format} - ${sizeName} (1KB/10KB/100KB)`, async () => {
        const start = performance.now();
        await TextRenderer.render(text, { format });
        const durationMs = performance.now() - start;
        console.log(`${format} - ${sizeName}: ${durationMs.toFixed(2)}ms`);
        expect(durationMs).toBeLessThan(100); // SLA: <100ms for 10KB
      });
    }
  }
});