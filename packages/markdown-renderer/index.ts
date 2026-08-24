import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';

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
 * MarkdownRenderer: Unified markdown rendering with theme support
 * 
 * Architecture:
 * - Parse: remark-parse converts markdown to AST
 * - Transform: remark-gfm adds GFM extensions (tables, strikethrough, etc.)
 * - Render: rehype-stringify converts AST to HTML
 * - Theme: CSS classes applied via output wrapper
 * 
 * Note: DOMPurify sanitization to be added in Phase 3 via crew implementation
 */
export class MarkdownRenderer {
  private processor: any;
  private theme: 'light' | 'dark';
  private sanitizeEnabled: boolean;

  constructor(options: MarkdownRendererOptions = {}) {
    const { theme = 'light', sanitize = true, highlight = true } = options;
    this.theme = theme;
    this.sanitizeEnabled = sanitize;

    let processorChain: any = unified()
      .use(remarkParse)
      .use(remarkGfm);

    if (highlight) {
      processorChain = processorChain
        .use(remarkRehype)
        .use(rehypeHighlight);
    } else {
      processorChain = processorChain.use(remarkRehype);
    }

    processorChain = processorChain.use(rehypeStringify);
    this.processor = processorChain;
  }

  /**
   * Render markdown to theme-aware HTML
   * @param markdown - Raw markdown string
   * @returns Promise<RenderResult> with HTML and applied theme
   */
  async render(markdown: string): Promise<RenderResult> {
    try {
      const file = await this.processor.process(markdown);
      const html = String(file);

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