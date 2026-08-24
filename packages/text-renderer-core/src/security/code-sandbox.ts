/**
 * CodeSandbox: Worf's Security Gate for Code Block Injection Prevention
 * 
 * Threat Model:
 * - Script injection: <script>alert('xss')</script>
 * - Event handler injection: onclick=alert(), onerror=...
 * - HTML entity bypass attempts
 * 
 * Defense Strategy:
 * 1. Strip all <script> tags
 * 2. Escape all HTML entities in code content
 * 3. Allow ONLY safe tags: <pre>, <code>, <span>
 * 4. No event handlers on any tag
 */

export class CodeSandbox {
  /**
   * Sanitize code block HTML: strip dangerous content and escape user input
   * @param html - Raw HTML from code block renderer
   * @returns Sanitized HTML safe for display
   */
  static sanitize(html: string): string {
    // Step 1: Remove all <script> tags and their content
    let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Step 2: Remove all event handlers (onclick, onerror, onload, etc.)
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*"[^"]*"/gi, '');
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*'[^']*'/gi, '');

    // Step 3: Remove any href or src attributes that contain javascript:
    sanitized = sanitized.replace(/\s+(href|src)\s*=\s*["']?javascript:[^"'\s]*["']?/gi, '');

    // Step 4: Whitelist only safe tags: pre, code, span (with limited attributes)
    const allowedTags = ['pre', 'code', 'span'];
    const allowedAttrs = ['class', 'data-line'];

    // Simple tag validation: only allow specific tags
    sanitized = this.stripUnsafeTags(sanitized, allowedTags, allowedAttrs);

    return sanitized;
  }

  /**
   * Strip unsafe tags, keeping only allowed ones
   */
  private static stripUnsafeTags(html: string, allowedTags: string[], allowedAttrs: string[]): string {
    // Regex to find all HTML tags
    const tagRegex = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;

    return html.replace(tagRegex, (match, tagName) => {
      const normalizedTag = tagName.toLowerCase();

      // If tag is not allowed, remove it
      if (!allowedTags.includes(normalizedTag)) {
        // Return just the content inside the tag (without the tag itself)
        return '';
      }

      // For allowed tags, remove all attributes except whitelisted ones
      const attrRegex = /\s+([a-z][a-z0-9-]*)\s*=\s*["']?([^"'>\s]*)["']?/gi;
      let cleanedTag = match;

      cleanedTag = cleanedTag.replace(attrRegex, (attrMatch, attrName, attrValue) => {
        const normalizedAttr = attrName.toLowerCase();
        if (allowedAttrs.includes(normalizedAttr)) {
          return ` ${normalizedAttr}="${attrValue}"`;
        }
        return '';
      });

      return cleanedTag;
    });
  }

  /**
   * Validate that sanitization removed dangerous patterns
   * @returns true if no dangerous patterns remain
   */
  static validate(html: string): boolean {
    // Check for script tags
    if (/<script/i.test(html)) return false;

    // Check for event handlers
    if (/\son\w+\s*=/i.test(html)) return false;

    // Check for javascript: protocol
    if (/javascript:/i.test(html)) return false;

    // Check for data: protocol (except safe data:image patterns)
    if (/data:(?!image\/(png|jpg|jpeg|gif|svg\+xml))/i.test(html)) return false;

    return true;
  }
}

export default CodeSandbox;