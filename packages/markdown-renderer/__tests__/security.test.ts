import { MarkdownRenderer } from '../index';
import { test, expect } from '@playwright/test';

test.describe('MarkdownRenderer Security', () => {
  test('sanitizes XSS payloads', async () => {
    const renderer = new MarkdownRenderer({ sanitize: true });
    const maliciousInput = '<script>alert("XSS")</script>';
    const html = await renderer.render(maliciousInput);
    expect(html).not.toContain('<script>');
  });

  test('handles attribute-based XSS', async () => {
    const renderer = new MarkdownRenderer({ sanitize: true });
    const maliciousInput = '<img src="x" onerror="alert(\'XSS\')">';
    const html = await renderer.render(maliciousInput);
    expect(html).not.toContain('onerror');
  });

  test('handles SVG-based XSS', async () => {
    const renderer = new MarkdownRenderer({ sanitize: true });
    const maliciousInput = '<svg><script>alert("XSS")</script></svg>';
    const html = await renderer.render(maliciousInput);
    expect(html).not.toContain('<script>');
  });
});