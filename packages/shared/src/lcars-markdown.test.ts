import { describe, it, expect } from 'vitest';
import { renderLcarsMarkdown, escapeHtml, LCARS_MARKDOWN_CSS } from './lcars-markdown.js';

const r = renderLcarsMarkdown;

describe('escapeHtml', () => {
  it('escapes the five significant characters', () => {
    expect(escapeHtml(`<a href="x">&'`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;');
  });
});

// Assistant output is untrusted: it can quote a page fetched by web_fetch. These are the tests that
// matter most — everything else is cosmetic.
describe('renderLcarsMarkdown — XSS safety', () => {
  it('neutralises a script tag', () => {
    const out = r('<script>alert(1)</script>');
    expect(out).not.toContain('<script>');
    expect(out).toContain('&lt;script&gt;');
  });

  it('does not emit an href for a javascript: URL — the label survives as text', () => {
    const out = r('[click me](javascript:alert(1))');
    expect(out).not.toMatch(/href=/);
    expect(out).toContain('click me');
  });

  it('refuses data: and file: URLs too', () => {
    expect(r('[x](data:text/html,<script>1</script>)')).not.toMatch(/href=/);
    expect(r('[x](file:///etc/passwd)')).not.toMatch(/href=/);
  });

  it('allows http and https', () => {
    expect(r('[docs](https://nodejs.org/api)')).toContain('href="https://nodejs.org/api"');
    expect(r('[plain](http://example.com)')).toContain('href="http://example.com"');
  });

  it('adds target=_blank with rel=noopener on links', () => {
    expect(r('[x](https://example.com)')).toContain('rel="noopener noreferrer"');
  });

  it('escapes html INSIDE a fenced code block rather than executing it', () => {
    const out = r('```html\n<img src=x onerror=alert(1)>\n```');
    expect(out).toContain('&lt;img');
    expect(out).not.toContain('<img');
  });

  it('escapes an event-handler attribute in prose', () => {
    expect(r('<div onclick="steal()">hi</div>')).not.toContain('onclick="steal()"');
  });
});

describe('renderLcarsMarkdown — block syntax', () => {
  it('renders the three heading levels with LCARS classes', () => {
    expect(r('# Top')).toContain('<h1 class="lcars-md-h1">Top</h1>');
    expect(r('## Mid')).toContain('<h2 class="lcars-md-h2">Mid</h2>');
    expect(r('### Low')).toContain('<h3 class="lcars-md-h3">Low</h3>');
  });

  it('renders fenced code with the language recorded', () => {
    const out = r('```ts\nconst a = 1;\n```');
    expect(out).toContain('<pre class="lcars-md-pre" data-lang="ts">');
    expect(out).toContain('const a = 1;');
  });

  it('renders inline code', () => {
    expect(r('use `npm run build` now')).toContain('<code class="lcars-md-code">npm run build</code>');
  });

  it('leaves markdown inside inline code literal', () => {
    expect(r('`**not bold**`')).toContain('**not bold**');
  });

  it('renders unordered and ordered lists', () => {
    expect(r('- one\n- two')).toContain('<ul class="lcars-md-ul"><li>one</li><li>two</li></ul>');
    expect(r('1. first\n2. second')).toContain('<ol class="lcars-md-ol"><li>first</li><li>second</li></ol>');
  });

  it('renders blockquotes', () => {
    expect(r('> quoted line')).toContain('<blockquote class="lcars-md-quote">quoted line</blockquote>');
  });

  it('renders a horizontal rule', () => {
    expect(r('---')).toContain('<hr class="lcars-md-hr">');
  });

  it('renders bold and italic', () => {
    expect(r('**strong** and *soft*')).toContain('<strong>strong</strong>');
    expect(r('**strong** and *soft*')).toContain('<em>soft</em>');
  });

  it('does not mangle bold into italic', () => {
    expect(r('**both**')).not.toContain('<em>');
  });
});

// The loop's task_plan tool renders plans as "[x] 1. step", and a plan is the most common structured
// thing a user will see in chat — it must not show up as literal brackets.
describe('renderLcarsMarkdown — task lists', () => {
  it('renders checked and unchecked items as checkboxes', () => {
    const out = r('- [x] done thing\n- [ ] pending thing');
    expect(out).toContain('☑ done thing');
    expect(out).toContain('☐ pending thing');
    expect(out).toContain('lcars-md-task');
  });

  it('does not treat an ordinary bullet as a task', () => {
    expect(r('- plain bullet')).not.toContain('lcars-md-task');
  });
});

describe('renderLcarsMarkdown — tables', () => {
  const table = '| Tool | Tier |\n|---|---|\n| read_file | green |\n| run_shell | yellow |';

  it('renders a header row and body rows', () => {
    const out = r(table);
    expect(out).toContain('<table class="lcars-md-table">');
    expect(out).toContain('<th class="lcars-md-th">Tool</th>');
    expect(out).toContain('<td class="lcars-md-td">read_file</td>');
    expect(out).toContain('<td class="lcars-md-td">yellow</td>');
  });

  it('leaves pipe text alone when there is no separator row', () => {
    expect(r('| not | a table |')).not.toContain('<table');
  });

  it('supports alignment colons in the separator', () => {
    expect(r('| a | b |\n|:--|--:|\n| 1 | 2 |')).toContain('<table');
  });
});

describe('renderLcarsMarkdown — edge cases', () => {
  it('returns empty string for empty or non-string input', () => {
    expect(r('')).toBe('');
    expect(r(undefined as unknown as string)).toBe('');
    expect(r(null as unknown as string)).toBe('');
    expect(r(42 as unknown as string)).toBe('');
  });

  it('converts plain newlines to breaks', () => {
    expect(r('line one\nline two')).toBe('line one<br>line two');
  });

  it('does not insert a stray break directly around a block element', () => {
    expect(r('# Head\ntext')).not.toContain('</h1><br>');
  });

  it('is reentrant — a second render is unaffected by the first', () => {
    const a = r('| x | y |\n|---|---|\n| 1 | 2 |');
    const b = r('| x | y |\n|---|---|\n| 1 | 2 |');
    expect(a).toBe(b);
  });

  it('handles a realistic mixed reply without leaking placeholders', () => {
    const out = r([
      '## Summary',
      'Landed **3** tools. See `AGENT_TOOLS`.',
      '',
      '- [x] glob_files',
      '- [ ] web_search',
      '',
      '```ts',
      'const x = 1;',
      '```',
      '',
      '| a | b |',
      '|---|---|',
      '| 1 | 2 |',
    ].join('\n'));
    expect(out).not.toMatch(/ (CB|TB)\d+ /);
    expect(out).toContain('lcars-md-h2');
    expect(out).toContain('lcars-md-pre');
    expect(out).toContain('lcars-md-table');
    expect(out).toContain('☑ glob_files');
  });
});

describe('LCARS_MARKDOWN_CSS', () => {
  it('styles every emitted class', () => {
    for (const cls of ['lcars-md-h1', 'lcars-md-pre', 'lcars-md-code', 'lcars-md-ul', 'lcars-md-ol',
      'lcars-md-task', 'lcars-md-link', 'lcars-md-quote', 'lcars-md-hr', 'lcars-md-table',
      'lcars-md-th', 'lcars-md-td']) {
      expect(LCARS_MARKDOWN_CSS).toContain(cls);
    }
  });

  // Hardcoded colours would break the dark/light/vscode themes that share this markup.
  it('uses semantic tokens rather than hardcoded hex colours', () => {
    expect(LCARS_MARKDOWN_CSS).toContain('var(--sa-accent)');
    expect(LCARS_MARKDOWN_CSS).not.toMatch(/#[0-9a-fA-F]{6}/);
  });
});
