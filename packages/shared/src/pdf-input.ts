/**
 * Shared PDF input for text extraction and OCR — used by MCP process_pdf tool
 * and the chat UI /api/chat/process-file route.
 *
 * SECURITY (Worf): PDFs are processed on-device (pdfjs-dist + tesseract.js WASM).
 * No external egress unless explicitly enabled. Base64 is capped to prevent
 * memory exhaustion. PDF data is never logged.
 */

import { z } from 'zod';

/**
 * PDF input: either inline base64 or a local file path (server-side processing).
 * For chat: users will paste files as base64 (browser File API).
 * For API: server may also accept file paths (workspace-bound).
 */
export const PdfInputSchema = z.union([
  z.object({
    type: z.literal('base64'),
    data: z.string().min(1).describe('Base64-encoded PDF data'),
    fileName: z.string().optional().describe('Original filename (for display/cache key)'),
  }),
  z.object({
    type: z.literal('file'),
    path: z.string().min(1).describe('Path to PDF file (server-side, workspace-bound)'),
    fileName: z.string().optional().describe('Original filename'),
  }),
]);

export type PdfInput = z.infer<typeof PdfInputSchema>;

/**
 * Maximum PDF size (50 MB base64 ≈ 37 MB uncompressed).
 * Most PDFs are <5 MB; 50 MB handles large scanned documents.
 */
export const MAX_PDF_BASE64_BYTES = 50 * 1024 * 1024;

/**
 * Validate PDF size before processing (prevents memory exhaustion during extraction).
 * Returns an error string if oversized, null if OK.
 */
export function checkPdfSize(pdf: PdfInput): string | null {
  if (pdf.type === 'base64' && pdf.data.length > MAX_PDF_BASE64_BYTES) {
    return `PDF exceeds the ${(MAX_PDF_BASE64_BYTES / 1024 / 1024).toFixed(0)}MB base64 cap`;
  }
  return null;
}

/**
 * Extract file extension from PDF (for MIME type and cache keys).
 * Always returns 'pdf' (validates input type).
 */
export function getPdfFileName(pdf: PdfInput): string {
  return pdf.fileName ?? 'document.pdf';
}
