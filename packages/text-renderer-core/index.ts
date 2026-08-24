import { MarkdownRenderer } from '@story-agent/markdown-renderer';

/**
 * Text Rendering System - Phase 3
 * Unified renderer for Markdown, JSON, Code, and Plaintext formats
 * with auto-detection, theme support, and <100ms/10KB SLA
 */

export type TextFormat = 'markdown' | 'json' | 'code' | 'plaintext';

export interface RenderOptions {
  theme?: 'light' | 'dark';
  language?: string; // Hint for code block language detection
}

export interface RenderResult {
  html: string;
  theme: string;
  format: TextFormat;
  detectionConfidence: number; // 0-1, how confident in format detection
}

/**
 * FormatDetector: Auto-detect input format using heuristics
 */
export class FormatDetector {
  /**
   * Detect format with confidence score
   * Heuristics:
   * - JSON: starts with { or [ (after trimming)
   * - Code: contains triple backticks (```)
   * - Markdown: contains markdown markers (#, *, -, ##, etc.)
   * - Plaintext: default
   */
  static detect(input: string): { format: TextFormat; confidence: number } {
    const trimmed = input.trim();

    // Check for JSON
    if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && this.isValidJson(trimmed)) {
      return { format: 'json', confidence: 0.95 };
    }

    // Check for code blocks (```language\n...\n```)
    if (trimmed.includes('```')) {
      return { format: 'code', confidence: 0.9 };
    }

    // Check for markdown patterns
    const markdownPatterns = /^[#*\-_`>]/m;
    if (markdownPatterns.test(trimmed)) {
      return { format: 'markdown', confidence: 0.85 };
    }

    // Check for common markdown inline patterns
    if (trimmed.includes('**') || trimmed.includes('__') || trimmed.includes('[') || trimmed.includes('](')) {
      return { format: 'markdown', confidence: 0.8 };
    }

    // Default to plaintext
    return { format: 'plaintext', confidence: 0.5 };
  }

  private static isValidJson(str: string): boolean {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * TextRenderer: Main rendering pipeline
 */
export class TextRenderer {
  private markdownRenderer: MarkdownRenderer;
  private theme: 'light' | 'dark';

  constructor(options: RenderOptions = {}) {
    this.theme = options.theme || 'light';
    this.markdownRenderer = new MarkdownRenderer({
      theme: this.theme,
      sanitize: true,
      highlight: true,
    });
  }

  /**
   * Main render function: auto-detect format and render
   */
  async render(input: string, options: RenderOptions = {}): Promise<RenderResult> {
    const startTime = performance.now();
    const { format, confidence } = FormatDetector.detect(input);

    try {
      let html: string;

      switch (format) {
        case 'markdown':
          html = await this.renderMarkdown(input);
          break;
        case 'json':
          html = await this.renderJson(input);
          break;
        case 'code':
          html = await this.renderCode(input);
          break;
        case 'plaintext':
        default:
          html = await this.renderPlaintext(input);
          break;
      }

      const duration = performance.now() - startTime;

      return {
        html,
        theme: this.theme,
        format,
        detectionConfidence: confidence,
      };
    } catch (error) {
      console.error('TextRenderer.render() error:', error);
      throw error;
    }
  }

  /**
   * Render markdown using existing MarkdownRenderer
   */
  private async renderMarkdown(input: string): Promise<string> {
    const result = await this.markdownRenderer.render(input);
    return result.html;
  }

  /**
   * Render JSON with pretty-printing and syntax highlighting
   */
  private async renderJson(input: string): Promise<string> {
    try {
      const parsed = JSON.parse(input);
      const formatted = JSON.stringify(parsed, null, 2);

      // Escape HTML entities for safe display
      const escaped = this.escapeHtml(formatted);

      // Wrap in <pre><code> for display
      return `<pre><code class="language-json">${escaped}</code></pre>`;
    } catch (error) {
      console.error('JSON render error:', error);
      // If invalid JSON, render as plaintext
      return this.renderPlaintext(input);
    }
  }

  /**
   * Render code blocks with language detection
   */
  private async renderCode(input: string): Promise<string> {
    // Extract language and code from triple backtick blocks
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)\n```/g;
    let html = input;

    if (codeBlockRegex.test(input)) {
      html = input.replace(codeBlockRegex, (match, language, code) => {
        const lang = language || 'plaintext';
        const escaped = this.escapeHtml(code.trim());
        return `<pre><code class="language-${lang}">${escaped}</code></pre>`;
      });
    } else {
      // No code blocks found, render as plaintext
      return this.renderPlaintext(input);
    }

    return html;
  }

  /**
   * Render plaintext: preserve whitespace and escape HTML
   */
  private async renderPlaintext(input: string): Promise<string> {
    const escaped = this.escapeHtml(input);
    return `<pre>${escaped}</pre>`;
  }

  /**
   * Escape HTML entities for safe display
   */
  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return text.replace(/[&<>"']/g, (char) => map[char]);
  }

  /**
   * Set theme after instantiation
   */
  setTheme(theme: 'light' | 'dark'): void {
    this.theme = theme;
    this.markdownRenderer.setTheme(theme);
  }

  /**
   * Get current theme
   */
  getTheme(): 'light' | 'dark' {
    return this.theme;
  }
}

export default TextRenderer;