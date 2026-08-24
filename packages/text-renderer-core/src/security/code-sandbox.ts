import DOMPurify from 'dompurify';

/**
 * Sanitizes code block content to prevent XSS attacks.
 */
export class CodeSandbox {
  static sanitize(html: string): string {
    // Strip all script tags and escape HTML entities
    const sanitized = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['pre', 'code', 'span'],
      ALLOWED_ATTR: ['class']
    });
    return sanitized;
  }
}