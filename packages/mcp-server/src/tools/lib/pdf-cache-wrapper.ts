/**
 * PDF Cache Wrapper
 * 
 * Wraps extractPdfText to provide intelligent caching:
 * - Check cache before extraction (SHA-256 key)
 * - Store result after extraction (30-day expiry)
 * - Non-blocking: cache errors never fail extraction
 */

import type { PdfInput, PdfExtractionResult } from '@story-agent/shared';
import { extractPdfText, hashPdfInput, getPdfExtractionCache, storePdfExtractionCache } from '@story-agent/shared';

export interface CachedExtractionOptions {
  enableOcr?: boolean;
  ocrLanguages?: string[];
  ocrTimeoutMs?: number;
  useCache?: boolean;
  clientId?: string;
  onProgress?: (message: string) => void;
}

export interface CachedExtractionResult extends PdfExtractionResult {
  cacheHit: boolean;
  cacheKey?: string;
}

/**
 * Extract PDF text with intelligent caching
 * 
 * Workflow:
 * 1. Hash PDF content (SHA-256)
 * 2. Check cache: if hit, return cached result (fast path ~50ms)
 * 3. If miss: extract via pdfjs + OCR (slow path ~5-10s)
 * 4. Store result to cache (best-effort, non-blocking)
 * 5. Return result with cacheHit flag for diagnostics
 */
export async function getCachedOrExtract(
  pdf: PdfInput,
  options: CachedExtractionOptions = {},
): Promise<CachedExtractionResult> {
  const {
    enableOcr = true,
    ocrLanguages = ['eng'],
    ocrTimeoutMs = 30000,
    useCache = true,
    clientId = 'familiarcat',
    onProgress,
  } = options;

  // Compute hash for cache key
  const pdfHash = await hashPdfInput(pdf);
  onProgress?.(`[Cache] Checking for cached extraction (hash: ${pdfHash.substring(0, 8)}...)`);

  // Check cache (fast path)
  let result: PdfExtractionResult | null = null;
  let cacheHit = false;

  if (useCache) {
    try {
      result = await getPdfExtractionCache(pdfHash, clientId);
      if (result) {
        cacheHit = true;
        onProgress?.('[Cache] ✅ Cache hit! Returning cached result');
      }
    } catch (err) {
      onProgress?.(`[Cache] ⚠️ Cache lookup failed, proceeding with extraction: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Extract if cache miss (slow path)
  if (!cacheHit) {
    onProgress?.('[Extract] Starting PDF text extraction...');
    try {
      result = await extractPdfText(pdf, {
        enableOcr,
        ocrLanguages,
        ocrTimeoutMs,
      });
      onProgress?.(`[Extract] ✅ Extraction complete (${result.pageCount} pages, ${result.processingTimeMs}ms)`);
    } catch (err) {
      throw new Error(`PDF extraction failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Store to cache (best-effort, non-blocking)
    if (useCache && result) {
      try {
        const fileName = 'fileName' in pdf ? pdf.fileName : undefined;
        const fileSize = 'data' in pdf ? Buffer.byteLength(pdf.data, 'base64') : undefined;
        
        // Fire and forget: don't await, don't block extraction
        storePdfExtractionCache(pdfHash, result, clientId, fileName, fileSize)
          .then(() => {
            onProgress?.('[Cache] ✅ Result cached for future use');
          })
          .catch((err) => {
            onProgress?.(`[Cache] ⚠️ Failed to cache result: ${err instanceof Error ? err.message : String(err)}`);
          });
      } catch (err) {
        onProgress?.(`[Cache] ⚠️ Cache store error (non-blocking): ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  if (!result) {
    throw new Error('PDF extraction failed: no result obtained');
  }

  return {
    ...result,
    cacheHit,
    cacheKey: cacheHit ? pdfHash : undefined,
  };
}
