import unified from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';
import DOMPurify from 'dompurify';

export type MarkdownRendererOptions = {
  theme?: 'light' | 'dark';
  sanitize?: boolean;
  highlight?: boolean;
};

export interface RenderResult {
  html: string;
  theme: string;
}

/**
 * MarkdownRenderer: Unified markdown rendering with theme support and XSS prevention
 * 
 * Architecture:
 * - Parse: remark-parse converts markdown to AST
 * - Transform: remark-gfm adds GFM extensions (tables, strikethrough, etc.)
 * - Render: rehype-stringify converts AST to HTML
 * - Secure: DOMPurify sanitizes output (XSS prevention)
 * - Theme: CSS classes applied via output wrapper
 */
export class MarkdownRenderer {
  private processor: unified.Processor;
  private theme: 'light' | 'dark';
  private sanitizeEnabled: boolean;

  constructor(options: MarkdownRendererOptions = {}) {
    const { theme = 'light', sanitize = true, highlight = true } = options;
    this.theme = theme;
    this.sanitizeEnabled = sanitize;

    const processorChain = unified()
      .use(remarkParse)
      .use(remarkGfm);

    if (highlight) {
      processorChain.use(remarkRehype).use(rehypeHighlight);
    } else {
      processorChain.use(remarkRehype);
    }

    processorChain.use(rehypeStringify);
    this.processor = processorChain;
  }

  /**
   * Render markdown to theme-aware, sanitized HTML
   * @param markdown - Raw markdown string
   * @returns Promise<RenderResult> with HTML and applied theme
   */
  async render(markdown: string): Promise<RenderResult> {
    try {
      const file = await this.processor.process(markdown);
      let html = String(file);

      // Apply security: sanitize with DOMPurify
      if (this.sanitizeEnabled) {
        const config = {
          ALLOWED_TAGS: [
            'p', 'br', 'span', 'em', 'strong', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'table', 'thead', 'tbody', 'tr', 'th', 'td'
          ],
          ALLOWED_ATTR: ['href', 'title', 'target', 'class', 'id'],
          ALLOW_DATA_ATTR: false,
        };
        html = DOMPurify.sanitize(html, config);
      }

      return {
        html,
        theme: this.theme,
      };
    } catch (error) {
      console.error('MarkdownRenderer.render() error:', error);
      throw error;
    }
  }

  /**
   * Render markdown to plain text (strip all HTML)
   */
  async renderPlain(markdown: string): Promise<string> {
    const result = await this.render(markdown);
    return result.html.replace(/<[^>]*>/g, '');
  }

  /**
   * Set theme after instantiation
   */
  setTheme(theme: 'light' | 'dark'): void {
    this.theme = theme;
  }

  /**
   * Get current theme
   */
  getTheme(): 'light' | 'dark' {
    return this.theme;
  }
}