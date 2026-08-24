import { CodeSandbox } from '../src/security/code-sandbox';

describe('CodeSandbox', () => {
  test('strips script tags', () => {
    const malicious = '<script>alert("xss")</script><pre>Hello</pre>';
    expect(CodeSandbox.sanitize(malicious)).toBe('<pre>Hello</pre>');
  });

  test('escapes HTML entities', () => {
    const malicious = '<pre onclick="alert(1)">Click me</pre>';
    expect(CodeSandbox.sanitize(malicious)).toBe('<pre>Click me</pre>');
  });

  test('only allows pre, code, span tags', () => {
    const malicious = '<div>Div</div><code>Code</code>';
    expect(CodeSandbox.sanitize(malicious)).toBe('<code>Code</code>');
  });
});