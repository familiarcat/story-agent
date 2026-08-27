/**
 * Unified file input type for chat: handles both images and PDFs.
 * Single source of truth for paste event handling (VSCode extension + web UI).
 *
 * This type allows the chat UI to accept either media type and delegate processing
 * to the appropriate handler (analyze_image for images, process_pdf for PDFs).
 */

import { z } from 'zod';
import { ImageInputSchema, type ImageInput } from './image-input.js';
import { PdfInputSchema, type PdfInput } from './pdf-input.js';

/**
 * FileInput: union of image or PDF.
 * Chat paste handler converts File API → FileInput → MCP tool dispatch.
 */
export const FileInputSchema = z.union([
  z.object({
    type: z.literal('image'),
    image: ImageInputSchema,
  }),
  z.object({
    type: z.literal('pdf'),
    pdf: PdfInputSchema,
  }),
]);

export type FileInput = z.infer<typeof FileInputSchema>;

/**
 * Type guard: is this input an image?
 */
export function isImageInput(file: FileInput): file is { type: 'image'; image: ImageInput } {
  return file.type === 'image';
}

/**
 * Type guard: is this input a PDF?
 */
export function isPdfInput(file: FileInput): file is { type: 'pdf'; pdf: PdfInput } {
  return file.type === 'pdf';
}

/**
 * Get the file name from either image or PDF (for display in chat).
 */
export function getFileName(file: FileInput): string {
  if (isImageInput(file)) {
    return file.image.type === 'url' ? new URL(file.image.url).pathname.split('/').pop() ?? 'image' : 'image';
  }
  return file.pdf.fileName ?? 'document.pdf';
}

/**
 * Get the MIME type for either image or PDF.
 */
export function getMimeType(file: FileInput): string {
  if (isImageInput(file)) {
    return file.image.type === 'base64' ? file.image.mimeType : 'image/*';
  }
  return 'application/pdf';
}

/**
 * Get file size (bytes) — meaningful only for base64 inputs.
 * For URLs/paths, this returns an estimate or placeholder.
 */
export function getFileSize(file: FileInput): number {
  if (isImageInput(file) && file.image.type === 'base64') {
    return Math.round((file.image.data.length * 3) / 4); // Base64 decode factor
  }
  if (isPdfInput(file) && file.pdf.type === 'base64') {
    return Math.round((file.pdf.data.length * 3) / 4);
  }
  return 0; // URL/path: size unknown
}
