/**
 * ResponsePane — Universal response renderer for all OpenRouter LLM responses across Story Agent.
 * 
 * Handles: plaintext, markdown, JSON, JavaScript, HTML
 * - Detects format automatically with confidence scoring
 * - Applies LCARS theme consistently via CSS
 * - Enforces container bounds with vertical-only scrolling (horizontal for code/images)
 * - Works across chat, vision, observation-lounge, learnings, and all response surfaces
 * - Single reusable component matching the data contract with OpenRouter
 */

'use client';

import React, { useMemo } from 'react';
import { useTheme } from './ThemeProvider';

export type ResponseFormat = 'plaintext' | 'markdown' | 'json' | 'javascript' | 'html';

export interface ResponsePaneProps {
  content: string;
  format?: ResponseFormat; // If omitted, auto-detects
  maxHeight?: string; // Default: '70vh'
  minHeight?: string; // Default: '200px'
  metadata?: React.ReactNode; // Sticky metadata bar (model, cost, etc.)
  className?: string;
  onFormatDetected?: (format: ResponseFormat) => void;
}

export interface DetectionResult {
  format: ResponseFormat;
  confidence: number; // 0-1
  html: string;
}

/**
 * Detect format and convert to HTML for rendering.
 * Priority: explicit > heuristic detection > plaintext
 */
function detectAndConvert(content: string, suggestedFormat?: ResponseFormat): DetectionResult {
  // If format is provided, use it directly
  if (suggestedFormat) {
    return { 
      format: suggestedFormat, 
      confidence: 1.0, 
      html: formatToHtml(content, suggestedFormat) 
    };
  }

  // Heuristic detection with confidence scoring
  const trimmed = content.trim();

  // JSON detection
  if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && (trimmed.endsWith('}') || trimmed.endsWith(']'))) {
    try {
      JSON.parse(trimmed);
      return { format: 'json', confidence: 0.95, html: formatToHtml(content, 'json') };
    } catch {
      // Not valid JSON, continue
    }
  }

  // JavaScript detection
  if (trimmed.includes('function ') || trimmed.includes('const ') || trimmed.includes('let ') || trimmed.includes('var ')) {
    return { format: 'javascript', confidence: 0.8, html: formatToHtml(content, 'javascript') };
  }

  // HTML detection
  if (trimmed.includes('<html') || trimmed.includes('<!DOCTYPE') || (trimmed.includes('<') && trimmed.includes('>'))) {
    return { format: 'html', confidence: 0.75, html: formatToHtml(content, 'html') };
  }

  // Markdown detection
  if (trimmed.includes('#') || trimmed.includes('**') || trimmed.includes('- ') || trimmed.includes('[') && trimmed.includes(']')) {
    return { format: 'markdown', confidence: 0.7, html: formatToHtml(content, 'markdown') };
  }

  // Default: plaintext
  return { format: 'plaintext', confidence: 0.5, html: formatToHtml(content, 'plaintext') };
}

/**
 * Convert content to HTML based on format.
 * Each formatter respects LCARS CSS and proper escaping.
 */
function formatToHtml(content: string, format: ResponseFormat): string {
  const escape = (s: string) => 
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  switch (format) {
    case 'json':
      return `<pre class="response-json"><code>${escape(content)}</code></pre>`;

    case 'javascript':
      return `<pre class="response-javascript"><code>${escape(content)}</code></pre>`;

    case 'html':
      // HTML is rendered directly (trusted from OpenRouter)
      return `<div class="response-html">${content}</div>`;

    case 'markdown':
      return markdownToHtml(content);

    case 'plaintext':
    default:
      return `<pre class="response-plaintext"><code>${escape(content)}</code></pre>`;
  }
}

/**
 * Markdown to HTML converter.
 * Unified implementation used across chat, vision, and all surfaces.
 */
function markdownToHtml(markdown: string): string {
  let html = markdown;

  // Escape HTML first
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  // Code blocks (```...```)
  html = html.replace(/```([a-z]*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const safeCode = code.trim();
    return `<pre><code class="language-${lang}">${safeCode}</code></pre>`;
  });

  // Inline code (`...`)
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Headers (# ## ###)
  html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');

  // Bold (**text** or __text__)
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // Italic (*text* or _text_)
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

  // Links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  // Blockquotes (> text)
  html = html.replace(/^&gt; (.*?)$/gm, '<blockquote>$1</blockquote>');

  // Line breaks
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');

  // Wrap in paragraphs
  if (!html.includes('<p>')) {
    html = `<p>${html}</p>`;
  }

  // Fix nested tags
  html = html.replace(/<p>(<h[1-6]>|<pre>|<blockquote>)/g, '$1');
  html = html.replace(/(<\/h[1-6]>|<\/pre>|<\/blockquote>)<\/p>/g, '$1');

  return `<div class="response-markdown">${html}</div>`;
}

/**
 * ResponsePane component — single unified response renderer for the entire application.
 */
export function ResponsePane({
  content,
  format: suggestedFormat,
  maxHeight = '70vh',
  minHeight = '200px',
  metadata,
  className = '',
  onFormatDetected,
}: ResponsePaneProps) {
  const theme = useTheme();

  const { formatHtml, detectedFormat, confidence } = useMemo(() => {
    const result = detectAndConvert(content, suggestedFormat);
    if (onFormatDetected) onFormatDetected(result.format);
    return {
      formatHtml: result.html,
      detectedFormat: result.format,
      confidence: result.confidence,
    };
  }, [content, suggestedFormat, onFormatDetected]);

  return (
    <div
      className={`response-pane ${className}`}
      style={{
        maxHeight,
        minHeight,
        overflowY: 'auto',
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        width: '100%',
        boxSizing: 'border-box',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '1rem',
      }}
    >
      {/* Sticky metadata bar */}
      {metadata && (
        <div
          style={{
            fontSize: '0.72rem',
            color: 'var(--text-dim)',
            fontFamily: 'ui-monospace, monospace',
            flexShrink: 0,
            position: 'sticky',
            top: 0,
            background: 'var(--surface)',
            paddingBottom: '0.5rem',
            zIndex: 10,
            borderBottom: '1px solid var(--border)',
          }}
        >
          {metadata}
          {' · '}
          <span style={{ fontSize: '0.65rem' }}>
            Format: {detectedFormat} ({(confidence * 100).toFixed(0)}%)
          </span>
        </div>
      )}

      {/* Content area with proper scrolling and text wrapping */}
      <div
        dangerouslySetInnerHTML={{ __html: formatHtml }}
        className={`response-content response-${detectedFormat}`}
        style={{
          lineHeight: 1.6,
          color: 'var(--text)',
          fontSize: '0.95rem',
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
          whiteSpace: 'normal',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      />
    </div>
  );
}

export default ResponsePane;
