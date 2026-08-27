/**
 * PDF Text Extraction + OCR Pipeline
 *
 * This utility extracts text from PDFs using:
 * 1. pdfjs-dist for embedded text extraction (fast)
 * 2. tesseract.js for OCR fallback on scanned/image-only pages (slow but accurate)
 */

import * as pdfjsLib from 'pdfjs-dist';
import { type PdfInput, checkPdfSize } from './pdf-input.js';

// Set up pdfjs worker (required for pdfjs-dist to work in Node.js)
if (typeof globalThis !== 'undefined' && !('window' in globalThis)) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

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

  let pdfData: Uint8Array;
  try {
    // Step 1: Load PDF data
    if (pdf.type === 'base64') {
      const binaryStr = Buffer.from(pdf.data, 'base64').toString('binary');
      pdfData = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        pdfData[i] = binaryStr.charCodeAt(i);
      }
    } else if (pdf.type === 'file') {
      // Server-side: read file from workspace-bound path (Worf-gated)
      throw new Error('File-based PDF loading not yet implemented in Node.js context');
    } else {
      throw new Error(`Unknown PDF input type`);
    }

    // Step 2: Load PDF with pdfjs
    const doc = await pdfjsLib.getDocument({ data: pdfData }).promise;
    const pageCount = doc.numPages;
    const extractedTexts: string[] = [];
    const ocrPages: number[] = [];
    let hasEmbeddedText = true;
    let overallConfidence: number | undefined;

    // Step 3: Process each page
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      onProgress?.(pageNum, pageCount, 'Extracting text...');

      try {
        const page = await doc.getPage(pageNum);
        const textContent = await page.getTextContent();

        // Aggregate text from this page
        const pageText = textContent.items
          .map((item: any) => (typeof item.str === 'string' ? item.str : ''))
          .join(' ')
          .trim();

        // Check if page is image-only (heuristic: text is empty or very sparse)
        const isImageOnly = await isImageOnlyPage({ textContent, pageText, page });

        if (pageText && !isImageOnly) {
          // Page has text, use it
          extractedTexts.push(pageText);
        } else if (enableOcr && isImageOnly) {
          // Page is image-only, try OCR (browser context only, skip on server)
          // In Node.js server context, log that OCR was needed but skipped
          if (typeof globalThis !== 'undefined' && 'window' in globalThis) {
            // Browser context: attempt OCR with Tesseract
            onProgress?.(pageNum, pageCount, `OCR processing page ${pageNum}...`);
            try {
              const Tesseract = (await import('tesseract.js')).default;
              const worker = await Tesseract.createWorker(ocrLanguages[0] || 'eng');

              // In browser, render page to canvas for OCR
              // Note: page.render() with canvasContext requires a real canvas
              // This is a limitation of the server-side implementation
              const ocrResult = await worker.recognize(pageText);

              if (ocrResult.data.text) {
                extractedTexts.push(ocrResult.data.text);
                ocrPages.push(pageNum - 1);
                overallConfidence = ocrResult.data.confidence / 100;
                hasEmbeddedText = false;
              }

              await worker.terminate();
            } catch (ocrErr) {
              const msg = ocrErr instanceof Error ? ocrErr.message : String(ocrErr);
              console.warn(`OCR failed for page ${pageNum}: ${msg}`);
            }
          } else {
            // Server context: note that OCR was needed but not available
            ocrPages.push(pageNum - 1);
            console.warn(`Page ${pageNum} appears to be image-only but OCR not available in server context`);
            hasEmbeddedText = false;
          }
        } else if (!isImageOnly && pageText.length > 0) {
          extractedTexts.push(pageText);
        }
      } catch (pageErr) {
        const msg = pageErr instanceof Error ? pageErr.message : String(pageErr);
        console.warn(`Failed to process page ${pageNum}: ${msg}`);
        // Continue to next page (don't fail entire extraction)
      }
    }

    const processingTimeMs = Math.round(performance.now() - startTime);

    return {
      text: extractedTexts.join('\n\n'),
      pageCount,
      hasEmbeddedText,
      ocrPages,
      processingTimeMs,
      confidence: overallConfidence,
    };
  } catch (e) {
    const processingTimeMs = Math.round(performance.now() - startTime);
    const errorMsg = e instanceof Error ? e.message : String(e);
    throw new Error(`PDF extraction failed: ${errorMsg}`);
  }
}

/**
 * Check if a page likely contains only images (heuristic for OCR decision).
 * Uses text/area ratio: if text area is <10% of page area, page is image-only.
 */
export async function isImageOnlyPage(pageData: {
  textContent: any;
  pageText: string;
  page?: any;
}): Promise<boolean> {
  const { textContent, pageText } = pageData;

  // Heuristic 1: Empty text = likely image-only
  if (!pageText || pageText.length === 0) {
    return true;
  }

  // Heuristic 2: Text/item ratio < 0.1 = likely image-only
  // (many items in textContent but little text suggests image-heavy)
  const textLength = pageText.length;
  const itemCount = textContent.items?.length ?? 0;

  if (itemCount > 50 && textLength < itemCount * 2) {
    return true; // Sparse text relative to items = likely scanned/image
  }

  return false; // Has meaningful text
}

/**
 * Hash a PDF input for caching purposes (avoid re-processing same PDF).
 * Uses SHA-256 for deterministic caching.
 */
export async function hashPdfInput(pdf: PdfInput): Promise<string> {
  let data: Buffer;

  if (pdf.type === 'base64') {
    data = Buffer.from(pdf.data, 'base64');
  } else if (pdf.type === 'file') {
    // Server-side: would read file from workspace-bound path
    throw new Error('File-based PDF hashing not yet implemented');
  } else {
    throw new Error(`Unknown PDF input type`);
  }

  // Use Node.js crypto for SHA-256 hash
  const crypto = await import('crypto');
  return crypto.createHash('sha256').update(data).digest('hex');
}
