import unified from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { createThemer } from 'unified-themer';
import DOMPurify from 'dompurify';

type MarkdownRendererOptions = {
  theme?: Record<string, string>;
  sanitize?: boolean;
};

export class MarkdownRenderer {
  private processor: unified.Processor;
  private themer: ReturnType<typeof createThemer>;
  private sanitize: boolean;

  constructor(options: MarkdownRendererOptions = {}) {
    const { theme = {}, sanitize = true } = options;
    this.themer = createThemer(theme);
    this.sanitize = sanitize;
    this.processor = unified()
      .use(remarkParse)
      .use(remarkRehype)
      .use(this.themer.plugin)
      .use(rehypeStringify);
  }

  async render(markdown: string): Promise<string> {
    const html = await this.processor.process(markdown);
    const result = String(html);
    return this.sanitize ? DOMPurify.sanitize(result) : result;
  }
}