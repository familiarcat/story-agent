/**
 * PDF Text Extraction + OCR Pipeline
 *
 * This utility extracts text from PDFs using:
 * 1. pdfjs-dist for embedded text extraction (fast)
 * 2. tesseract.js for OCR fallback on scanned/image-only pages (slow but accurate)
 *
 * CREW IMPLEMENTATION NOTE: This is a scaffold. Implement the extraction logic
 * following the interface below. Key decisions:
 * - When to use pdfjs vs Tesseract (heuristic: detect image-only pages)
 * - How to handle OCR timeout (default 30s per page, configurable)
 * - Progress callback for UI (show which page being OCR'd)
 */

import { type PdfInput, checkPdfSize } from './pdf-input.js';

/**
 * Result of PDF text extraction — what the crew will return.
 */
export interface PdfExtractionResult {
  /** Full extracted text (concatenated from all pages) */
  text: string;

  /** Number of pages in the PDF */
  pageCount: number;

  /** Was all text extracted from embedded content (true) or did OCR fallback occur (false)? */
  hasEmbeddedText: boolean;

  /** Array of page numbers (0-indexed) that required OCR fallback */
  ocrPages: number[];

  /** Total processing time in milliseconds */
  processingTimeMs: number;

  /** OCR confidence score (0-1) if OCR was used; undefined if pure embedded text */
  confidence?: number;

  /** Optional error message for partially-extracted PDFs */
  error?: string;
}

/**
 * Configuration options for PDF extraction.
 */
export interface PdfExtractionOptions {
  /** Enable OCR fallback for image-only pages? Default: true */
  enableOcr?: boolean;

  /** Languages for OCR (Tesseract code: 'eng', 'fra', 'deu', etc). Default: ['eng'] */
  ocrLanguages?: string[];

  /** Timeout per OCR page in milliseconds. Default: 30000 (30s) */
  ocrTimeoutMs?: number;

  /** Progress callback: called for each page processed. For UI feedback. */
  onProgress?: (page: number, totalPages: number, status: string) => void;
}

/**
 * Extract text from a PDF (embedded text + optional OCR fallback).
 *
 * CREW: Implement this following the algorithm below.
 *
 * Algorithm:
 * 1. Validate size (checkPdfSize)
 * 2. Decode base64 if needed
 * 3. Load PDF with pdfjs-dist
 * 4. For each page:
 *    a. Try to extract embedded text (pdfjs getTextContent)
 *    b. If text is empty/sparse AND enableOcr:
 *       - Render page to canvas
 *       - Pass canvas to Tesseract.js
 *       - Track page# in ocrPages[]
 *    c. Accumulate text + track processing time
 * 5. Return PdfExtractionResult
 *
 * Error Handling:
 * - Corrupted page: log warning, skip to next page (don't fail entirely)
 * - OCR timeout: log warning, use partial text from that page
 * - Overall timeout: return partial result + error message
 *
 * Performance Notes:
 * - pdfjs: ~100ms per page (text extraction)
 * - Tesseract: ~5-30s per page depending on image quality/language
 * - Lazy-load Tesseract only if enableOcr && OCR is needed
 */
export async function extractPdfText(
  pdf: PdfInput,
  options: PdfExtractionOptions = {}
): Promise<PdfExtractionResult> {
  const startTime = performance.now();

  // Validation
  const sizeErr = checkPdfSize(pdf);
  if (sizeErr) {
    throw new Error(`PDF validation failed: ${sizeErr}`);
  }

  const {
    enableOcr = true,
    ocrLanguages = ['eng'],
    ocrTimeoutMs = 30000,
    onProgress,
  } = options;

  try {
    // TODO (Crew): Implement extraction logic
    // 1. Load PDF based on pdf.type (base64 vs file)
    // 2. Iterate pages
    // 3. Extract embedded text
    // 4. Fallback to OCR if needed
    // 5. Return result

    throw new Error('PDF extraction not yet implemented (awaiting crew)');
  } catch (e) {
    const processingTimeMs = Math.round(performance.now() - startTime);
    throw new Error(`PDF extraction failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Check if a page likely contains only images (heuristic for OCR decision).
 * Crew: Implement heuristic (e.g., text/area ratio <0.1).
 */
export async function isImageOnlyPage(pageData: unknown): Promise<boolean> {
  // TODO (Crew): Analyze page structure to determine if OCR is needed
  // Return true if page is mostly images, false if text is present
  return false; // Placeholder
}

/**
 * Hash a PDF input for caching purposes (avoid re-processing same PDF).
 * Crew: Use crypto.subtle.digest('SHA-256', ...) for base64 inputs.
 */
export async function hashPdfInput(pdf: PdfInput): Promise<string> {
  // TODO (Crew): Return deterministic hash of PDF
  // For base64: hash the data directly
  // For file paths: hash the file content
  return '';
}
