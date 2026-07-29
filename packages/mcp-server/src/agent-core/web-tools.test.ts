import { describe, it, expect } from 'vitest';
import { screenUrl, htmlToText } from './web-tools.js';

// A URL chosen by a model is attacker-influenced input. The classic escalation is
// http://169.254.169.254/ — cloud instance metadata, i.e. credentials — so screening happens BEFORE
// any connection is attempted, and it must fail closed.
describe('screenUrl — SSRF screening', () => {
  const BLOCKED = [
    'http://169.254.169.254/latest/meta-data/',
    'http://metadata.google.internal/computeMetadata/v1/',
    'http://localhost:3000/admin',
    'http://127.0.0.1/',
    'http://[::1]/',
    'http://0.0.0.0/',
    'http://10.0.0.5/internal',
    'http://192.168.1.1/router',
    'http://172.16.0.1/',
    'http://172.31.255.255/',
    'http://db.internal/',
    'http://printer.local/',
  ];

  for (const url of BLOCKED) {
    it(`refuses ${url}`, () => {
      expect(screenUrl(url)).not.toBeNull();
    });
  }

  it('names the host in the refusal so the audit trail is specific', () => {
    expect(screenUrl('http://169.254.169.254/')).toContain('169.254.169.254');
  });

  const ALLOWED = [
    'https://nodejs.org/api/fs.html',
    'https://github.com/familiarcat/story-agent',
    'http://example.com/docs',
    'https://api.example.com/v1/openapi.json?x=1#frag',
  ];

  for (const url of ALLOWED) {
    it(`allows ${url}`, () => {
      expect(screenUrl(url)).toBeNull();
    });
  }

  it('refuses non-http(s) schemes, including file:// and data:', () => {
    expect(screenUrl('file:///etc/passwd')).toContain('scheme');
    expect(screenUrl('data:text/html,<script>x</script>')).toContain('scheme');
    expect(screenUrl('ftp://example.com/f')).toContain('scheme');
  });

  it('refuses input that is not a URL at all', () => {
    expect(screenUrl('not a url')).toContain('not a valid URL');
    expect(screenUrl('')).toContain('not a valid URL');
  });

  // 172.x is only private in 16–31; the regex must not over-block the public ranges.
  it('does not over-block public 172 addresses', () => {
    expect(screenUrl('http://172.15.0.1/')).toBeNull();
    expect(screenUrl('http://172.32.0.1/')).toBeNull();
  });
});

describe('htmlToText', () => {
  it('drops script and style bodies entirely', () => {
    const html = '<html><head><style>body{color:red}</style></head><body><script>steal()</script><p>Hello</p></body></html>';
    const out = htmlToText(html);
    expect(out).toContain('Hello');
    expect(out).not.toContain('steal()');
    expect(out).not.toContain('color:red');
  });

  it('strips tags and collapses whitespace', () => {
    expect(htmlToText('<h1>Title</h1>\n\n   <p>Body   text</p>')).toBe('Title Body text');
  });

  it('decodes the common entities', () => {
    expect(htmlToText('<p>a &amp; b &lt;c&gt; &quot;d&quot;&nbsp;e</p>')).toBe('a & b <c> "d" e');
  });

  it('returns empty string for empty input', () => {
    expect(htmlToText('')).toBe('');
  });
});
