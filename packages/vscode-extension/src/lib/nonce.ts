import { randomBytes } from 'crypto';

/**
 * Generate a random nonce for CSP (Content Security Policy)
 * Used in webview HTML meta tags to allow inline scripts
 */
export function getNonce(): string {
  return randomBytes(16).toString('base64');
}
