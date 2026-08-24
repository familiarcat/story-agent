# Phase 3: Format Examples - TextRenderer in Action

## 1. MARKDOWN Format
**Input:**
```
# Hello World
This is **bold** and *italic* text.
- List item 1
- List item 2
```

**Output (via TextRenderer):**
```html
<h1>Hello World</h1>
<p>This is <strong>bold</strong> and <em>italic</em> text.</p>
<ul>
<li>List item 1</li>
<li>List item 2</li>
</ul>
```

**Confidence:** 0.85 (markdown markers detected)
**Handler:** MarkdownRenderer (remark→rehype pipeline)

---

## 2. JSON Format
**Input:**
```json
{"name":"Alice","age":30,"active":true}
```

**Output (via TextRenderer):**
```html
<pre><code class="language-json">{
  "name": "Alice",
  "age": 30,
  "active": true
}</code></pre>
```

**Confidence:** 0.95 (valid JSON syntax detected)
**Handler:** JsonHandler (JSON.stringify with 2-space indent + entity escape)

---

## 3. CODE Format
**Input:**
```
```javascript
const x = 42;
console.log(x);
```
```

**Output (via TextRenderer):**
```html
<pre><code class="language-javascript">const x = 42;
console.log(x);</code></pre>
```

**Confidence:** 0.9 (triple backticks detected)
**Handler:** CodeHandler (language detection + rehype-highlight)

---

## 4. PLAINTEXT Format
**Input:**
```
Line 1
  Line 2 (indented)
Line 3
```

**Output (via TextRenderer):**
```html
<pre>Line 1
  Line 2 (indented)
Line 3</pre>
```

**Confidence:** 0.5 (no markers → default)
**Handler:** PlaintextHandler (preserve whitespace + escape entities)

---

## Theme Support (All Formats)

### Light Theme
```typescript
const renderer = new TextRenderer({ theme: 'light' });
const result = await renderer.render(markdown);
// result.theme = 'light'
// CSS class applied: data-theme="light"
```

### Dark Theme
```typescript
const renderer = new TextRenderer({ theme: 'dark' });
renderer.setTheme('dark');
// CSS class applied: data-theme="dark"
// All 4 formats respect theme setting
```

---

## Security: CodeSandbox Examples

### Attack 1: Script Injection
**Input (Malicious):**
```html
<pre><code><script>alert('xss')</script></code></pre>
```

**After CodeSandbox.sanitize():**
```html
<pre><code></code></pre>
```
✅ Script tag stripped by regex

---

### Attack 2: Event Handler
**Input (Malicious):**
```html
<code onclick="fetch('http://evil.com')">Click me</code>
```

**After CodeSandbox.sanitize():**
```html
<code>Click me</code>
```
✅ Event handler removed by regex

---

### Attack 3: JavaScript Protocol
**Input (Malicious):**
```html
<a href="javascript:alert('xss')">Link</a>
```

**After CodeSandbox.sanitize():**
```html
<a>Link</a>
```
✅ JavaScript protocol blocked

---

## Integration Ready

### Chat Context
```typescript
// User sends: "Here's my config: {"api":"prod"}"
const renderer = new TextRenderer({ theme: 'dark' });
const result = await renderer.render(userInput);
// FormatDetector: JSON (0.95)
// Handler: JsonHandler
// Output: Pretty-printed JSON with syntax highlighting
```

### Vision Context
```typescript
// Claude returns markdown with code examples
const result = await renderer.render(claudeResponse);
// FormatDetector: Markdown (0.85)
// Handler: MarkdownRenderer (remark→rehype)
// Output: Semantic HTML with tables, code blocks, etc.
```

### Dashboard Context
```typescript
// Story description: plain text
const result = await renderer.render(storyDescription);
// FormatDetector: Plaintext (0.5 - default)
// Handler: PlaintextHandler
// Output: <pre> with whitespace preserved
```
