import unified from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import unifiedThemer from 'unified-themer';
import DOMPurify from 'dompurify';

export const MarkdownRenderer = (markdown, theme = 'default') => {
  const processor = unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(rehypeSanitize)
    .use(unifiedThemer, { theme })
    .use(rehypeStringify);

  const rendered = processor.processSync(markdown).toString();
  return DOMPurify.sanitize(rendered);
};