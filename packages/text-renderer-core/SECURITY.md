# Security Recommendations for Text Rendering

## Content Security Policy (CSP)

To prevent XSS attacks, ensure the following CSP headers are set:

```http
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
```

## Code Block Sanitization

All code block content is sanitized using `DOMPurify` with the following strict configuration:
- Allowed tags: `<pre>`, `<code>`, `<span>`
- Allowed attributes: `class`
- Script tags and event handlers are automatically stripped.

## Threat Mitigation

- **XSS Prevention**: All rendered text passes through `CodeSandbox.sanitize()`.
- **HTML Injection**: JSON and plaintext content are escaped before rendering.
- **Performance**: Sanitization overhead is minimized to maintain SLA compliance.
