import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PdfInputSchema, checkPdfSize, extractPdfText, hashPdfInput, type PdfInput } from '@story-agent/shared';
import { storeObservationMemory } from '@story-agent/shared/db';

/**
 * process_pdf — PDF text extraction tool. Extracts text from PDFs using:
 * 1. pdfjs-dist for embedded text (fast, ~100ms/page)
 * 2. tesseract.js for OCR fallback on scanned/image-only pages (slow but accurate)
 *
 * SECURITY (Worf): PDFs processed on-device. Base64 input is size-capped to 50 MB.
 * PDF data never logged; only extracted text + metadata are surfaced.
 */

export function registerProcessPdfTool(server: McpServer): void {
  server.tool(
    'process_pdf',
    [
      'Extract text from a PDF using pdfjs-dist (embedded text) + tesseract.js (OCR fallback).',
      'Returns extracted text + metadata (page count, OCR pages, processing time).',
      'Optionally caches result by PDF SHA-256 hash to avoid re-processing.',
      'SECURITY: PDFs processed on-device; base64 capped at 50 MB; data never logged.',
    ].join(' '),
    {
      pdf: PdfInputSchema,
      enableOcr: z.boolean().optional().default(true).describe('Enable OCR fallback for image-only pages'),
      ocrLanguages: z.array(z.string()).optional().default(['eng']).describe('OCR languages (tesseract codes: eng, fra, deu, etc)'),
      storeToRag: z.boolean().optional().default(false).describe('Store extraction result to crew RAG'),
      ragTags: z.array(z.string()).optional(),
      onProgress: z.function().optional().describe('Callback for progress updates during extraction'),
    },
    async ({ pdf, enableOcr, ocrLanguages, storeToRag, ragTags }) => {
      const pdfInput = pdf as PdfInput;

      // Validation
      const sizeErr = checkPdfSize(pdfInput);
      if (sizeErr) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: JSON.stringify({ error: sizeErr }) }],
        };
      }

      let result;
      try {
        result = await extractPdfText(pdfInput, {
          enableOcr,
          ocrLanguages,
          ocrTimeoutMs: 30000,
        });
      } catch (e) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: JSON.stringify({ error: `PDF extraction failed: ${e instanceof Error ? e.message : String(e)}` }) }],
        };
      }

      // Optional: store to RAG
      let ragStored = false;
      if (storeToRag) {
        try {
          // Generate hash for deduplication
          const hash = await hashPdfInput(pdfInput);
          const fileName = 'fileName' in pdfInput ? pdfInput.fileName || 'document.pdf' : 'document.pdf';

          await storeObservationMemory({
            storyId: `PDF-EXTRACTION-${hash}`,
            source: 'mcp',
            transcript: {
              rounds: [
                {
                  title: `process_pdf: ${fileName}`,
                  entries: [],
                },
              ],
              consensusSummary: result.text.slice(0, 500), // Preview in summary
              unresolvedRisks: result.ocrPages.length > 0 ? [`OCR used on ${result.ocrPages.length} pages`] : [],
              finalDecision: 'approved',
              actionItems: [],
            },
            tags: ['pdf-extraction', 'document', ...(ragTags ?? [])],
          });
          ragStored = true;
        } catch (ragErr) {
          console.warn(`Failed to store PDF extraction to RAG: ${ragErr instanceof Error ? ragErr.message : String(ragErr)}`);
          // RAG store is best-effort — never fail the extraction on a memory hiccup
        }
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                success: true,
                pageCount: result.pageCount,
                textLength: result.text.length,
                hasEmbeddedText: result.hasEmbeddedText,
                ocrPagesCount: result.ocrPages.length,
                ocrPages: result.ocrPages,
                ocrConfidence: result.confidence ? (result.confidence * 100).toFixed(1) + '%' : undefined,
                processingTimeMs: result.processingTimeMs,
                ragStored,
              },
              null,
              2
            ),
          },
          {
            type: 'text' as const,
            text: result.text,
          },
        ],
      };
    }
  );
}
