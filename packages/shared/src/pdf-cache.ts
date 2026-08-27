/**
 * PDF Extraction Cache Client
 * 
 * Supabase-backed cache for PDF extraction results.
 * Per-client isolation via RLS policies.
 * Non-blocking operations: cache errors never fail extraction.
 */

import { createClient } from '@supabase/supabase-js';
import type { PdfExtractionResult } from './pdf-processor';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export interface PdfExtractionCacheEntry {
  pdf_hash: string;
  extracted_text: string;
  page_count: number;
  has_embedded_text: boolean;
  ocr_pages: number[];
  processing_time_ms: number;
  confidence: number;
  original_filename?: string;
  file_size?: number;
  client_id: string;
  created_at: string;
  accessed_at: string;
  expires_at: string;
  access_count: number;
}

export interface CacheStats {
  totalEntries: number;
  totalStorageBytes: number;
  oldestEntryDate: string | null;
  newestEntryDate: string | null;
  averageAccessCount: number;
  hitRate?: number;
}

/**
 * Get cached extraction result
 * Returns null if not found, expired, or cache error
 * Updates accessed_at timestamp on hit (non-blocking)
 */
export async function getPdfExtractionCache(
  pdfHash: string,
  clientId: string,
): Promise<PdfExtractionResult | null> {
  try {
    const { data, error } = await supabase
      .from('sa_pdf_extraction_cache')
      .select('*')
      .eq('pdf_hash', pdfHash)
      .eq('client_id', clientId)
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

    // Return cached extraction result
    return {
      text: entry.extracted_text,
      pageCount: entry.page_count,
      hasEmbeddedText: entry.has_embedded_text,
      ocrPages: entry.ocr_pages || [],
      processingTimeMs: entry.processing_time_ms,
      confidence: entry.confidence,
    };
  } catch (err) {
    console.warn(`PDF cache lookup error: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

/**
 * Store extraction result to cache
 * Non-blocking: errors logged but never rethrown
 * Sets expiry to 30 days from now
 */
export async function storePdfExtractionCache(
  pdfHash: string,
  result: PdfExtractionResult,
  clientId: string,
  fileName?: string,
  fileSize?: number,
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('sa_pdf_extraction_cache')
      .insert({
        pdf_hash: pdfHash,
        extracted_text: result.text,
        page_count: result.pageCount,
        has_embedded_text: result.hasEmbeddedText,
        ocr_pages: result.ocrPages,
        processing_time_ms: result.processingTimeMs ?? 0,
        confidence: result.confidence ?? 0,
        original_filename: fileName,
        file_size: fileSize,
        client_id: clientId,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.warn(`PDF cache store error: ${error.message}`);
      return false;
    }

    return true;
  } catch (err) {
    console.warn(`PDF cache store exception: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

/**
 * Manual cleanup of expired cache entries
 * Admin function: can clear specific client or all clients
 */
export async function cleanupExpiredPdfCache(clientId?: string): Promise<boolean> {
  try {
    let query = supabase
      .from('sa_pdf_extraction_cache')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { error } = await query;

    if (error) {
      console.warn(`PDF cache cleanup error: ${error.message}`);
      return false;
    }

    return true;
  } catch (err) {
    console.warn(`PDF cache cleanup exception: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

/**
 * Get cache statistics for monitoring/analytics
 */
export async function getPdfCacheStats(clientId?: string): Promise<CacheStats | null> {
  try {
    let query = supabase
      .from('sa_pdf_extraction_cache')
      .select('file_size, access_count, created_at, accessed_at', { count: 'exact' });

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data, count, error } = await query;

    if (error || !data || count === null) return null;

    const totalStorage = (data as any[]).reduce((sum, row) => sum + (row.file_size || 0), 0);
    const avgAccess = (data as any[]).reduce((sum, row) => sum + (row.access_count || 0), 0) / count;

    const createdDates = (data as any[])
      .map((row) => new Date(row.created_at).getTime())
      .filter((d) => !isNaN(d));
    const accessedDates = (data as any[])
      .map((row) => new Date(row.accessed_at).getTime())
      .filter((d) => !isNaN(d));

    return {
      totalEntries: count,
      totalStorageBytes: totalStorage,
      oldestEntryDate: createdDates.length > 0 ? new Date(Math.min(...createdDates)).toISOString() : null,
      newestEntryDate: accessedDates.length > 0 ? new Date(Math.max(...accessedDates)).toISOString() : null,
      averageAccessCount: avgAccess,
    };
  } catch (err) {
    console.warn(`PDF cache stats error: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}
