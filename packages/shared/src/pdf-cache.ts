/**
 * PDF Extraction Cache — Supabase-backed deduplication
 *
 * Avoids re-processing identical PDFs by storing extracted text + metadata
 * keyed by SHA-256 hash of PDF content.
 *
 * Usage:
 * ```typescript
 * const hash = hashPdfInput(pdf);
 * const cached = await getPdfExtractionCache(hash, clientId);
 * if (cached) return cached;
 * const result = await extractPdfText(pdf, options);
 * await storePdfExtractionCache(hash, result, clientId, originalFilename);
 * return result;
 * ```
 */

import { createClient } from '@supabase/supabase-js';
import type { PdfExtractionResult } from './pdf-processor';

export interface PdfExtractionCacheEntry {
  pdf_hash: string;
  extracted_text: string;
  page_count: number;
  has_embedded_text: boolean;
  ocr_pages: number[];
  processing_time_ms: number;
  confidence?: number;
  original_filename?: string;
  file_size?: number;
  client_id: string;
  created_at: string;
  accessed_at: string;
  expires_at: string;
  access_count: number;
}

/**
 * Get PDF extraction from cache (if exists and not expired)
 * Updates accessed_at and access_count timestamps
 */
export async function getPdfExtractionCache(
  pdfHash: string,
  clientId: string
): Promise<PdfExtractionResult | null> {
  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_KEY || ''
  );

  try {
    const { data, error } = await supabase
      .from('sa_pdf_extraction_cache')
      .select('*')
      .eq('pdf_hash', pdfHash)
      .eq('client_id', clientId)
      .gt('expires_at', new Date().toISOString()) // Not expired
      .single();

    if (error || !data) return null;

    const entry = data as PdfExtractionCacheEntry;

    // Update access metadata (non-blocking, fire and forget)
    supabase
      .from('sa_pdf_extraction_cache')
      .update({
        accessed_at: new Date().toISOString(),
        access_count: entry.access_count + 1,
      })
      .eq('pdf_hash', pdfHash)
      .eq('client_id', clientId)
      .then(() => {}, () => {}); // Non-blocking update, ignore errors

    // Convert database record back to PdfExtractionResult
    return {
      text: entry.extracted_text,
      pageCount: entry.page_count,
      hasEmbeddedText: entry.has_embedded_text,
      ocrPages: entry.ocr_pages || [],
      processingTimeMs: entry.processing_time_ms,
      confidence: entry.confidence,
    };
  } catch (err) {
    console.error('[pdf-cache] Error retrieving from cache:', err);
    return null;
  }
}

/**
 * Store PDF extraction result in cache
 * Overwrites existing entry if pdf_hash matches
 */
export async function storePdfExtractionCache(
  pdfHash: string,
  result: PdfExtractionResult,
  clientId: string,
  originalFilename?: string,
  fileSize?: number,
  createdBy?: string
): Promise<boolean> {
  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_KEY || ''
  );

  try {
    const { error } = await supabase
      .from('sa_pdf_extraction_cache')
      .upsert(
        {
          pdf_hash: pdfHash,
          extracted_text: result.text,
          page_count: result.pageCount,
          has_embedded_text: result.hasEmbeddedText,
          ocr_pages: result.ocrPages || [],
          processing_time_ms: result.processingTimeMs,
          confidence: result.confidence,
          original_filename: originalFilename,
          file_size: fileSize,
          client_id: clientId,
          created_by: createdBy,
          access_count: 0,
          accessed_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        },
        { onConflict: 'pdf_hash' }
      );

    if (error) {
      console.error('[pdf-cache] Error storing to cache:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[pdf-cache] Exception storing to cache:', err);
    return false;
  }
}

/**
 * Clean up expired cache entries (manual trigger)
 * Called by cleanup job or MCP tool
 */
export async function cleanupExpiredPdfCache(
  clientId?: string
): Promise<{ deletedCount: number; error?: string }> {
  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_KEY || ''
  );

  try {
    let query = supabase
      .from('sa_pdf_extraction_cache')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { count, error } = await query;

    if (error) {
      return { deletedCount: 0, error: error.message };
    }

    return { deletedCount: count || 0 };
  } catch (err) {
    return {
      deletedCount: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Get cache statistics for a client
 */
export async function getPdfCacheStats(clientId: string): Promise<{
  totalEntries: number;
  totalTextBytes: number;
  oldestEntry?: string;
  newestEntry?: string;
  avgAccessCount: number;
  error?: string;
}> {
  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_KEY || ''
  );

  try {
    const { data, error } = await supabase
      .from('sa_pdf_extraction_cache')
      .select('extracted_text, created_at, access_count')
      .eq('client_id', clientId)
      .gt('expires_at', new Date().toISOString());

    if (error || !data) {
      return {
        totalEntries: 0,
        totalTextBytes: 0,
        avgAccessCount: 0,
        error: error?.message,
      };
    }

    const totalTextBytes = data.reduce(
      (sum, entry) => sum + (entry.extracted_text?.length || 0),
      0
    );
    const avgAccessCount =
      data.length > 0
        ? data.reduce((sum, entry) => sum + (entry.access_count || 0), 0) /
          data.length
        : 0;

    const timestamps = data
      .map((entry) => new Date(entry.created_at).getTime())
      .sort((a, b) => a - b);

    return {
      totalEntries: data.length,
      totalTextBytes,
      oldestEntry: timestamps.length > 0 ? data[0].created_at : undefined,
      newestEntry:
        timestamps.length > 0
          ? data[data.length - 1].created_at
          : undefined,
      avgAccessCount,
    };
  } catch (err) {
    return {
      totalEntries: 0,
      totalTextBytes: 0,
      avgAccessCount: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
