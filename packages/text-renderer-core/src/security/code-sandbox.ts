import DOMPurify from 'dompurify';

/**
 * Sanitizes code block content to prevent XSS attacks.
 */
export class CodeSandbox {
  private static readonly sanitizeConfig: DOMPurify.Config = {
    ALLOWED_TAGS: ['pre', 'code', 'span'],
    ALLOWED_ATTR: ['class']
  };

  static sanitize(html: string): string {
    return DOMPurify.sanitize(html, CodeSandbox.sanitizeConfig);
  }
}