/**
 * Chat file attachment and paste handler — enables image/PDF paste in VSCode extension.
 *
 * Features:
 * - Paste handler (Ctrl+V / Cmd+V): detects image/PDF in clipboard
 * - File attachment via open dialog: select image/PDF files
 * - File preview: shows filename + thumbnail before sending
 * - Automatic base64 conversion for safe transmission
 * - Supports both images (PNG/JPG/GIF/WebP) and PDFs
 *
 * Integration points:
 * - WebviewPanel.setupWebviewHandlers() routes paste → processFile()
 * - sendMessage() includes file attachments in ChatRequest.files
 * - Web UI displays file preview badges before sending
 * - MCP server routes files to analyze_image (images) or process_pdf (PDFs)
 */

import * as vscode from 'vscode';

/**
 * File input for chat (image or PDF).
 * Matches @story-agent/shared FileInput union type.
 */
export interface ChatFileInput {
  type: 'image' | 'pdf';
  fileName?: string;
  mimeType?: string; // For images
  data: string; // Base64 encoded
  size: number; // Bytes
}

/**
 * Process a file (image or PDF) from clipboard or file picker.
 * Returns ChatFileInput with base64-encoded data.
 */
export async function processFileForChat(
  source: 'paste' | 'attach',
  fileOrData?: File | Uint8Array,
  fileName?: string,
): Promise<ChatFileInput | null> {
  let file: { data: Uint8Array; fileName: string; mimeType: string } | null = null;

  if (source === 'paste') {
    // Try clipboard image
    try {
      const clipboardText = await vscode.env.clipboard.readText();
      // Could be a file path or image data—try to read the file if it's a path
      if (clipboardText && /\.(png|jpg|jpeg|gif|webp|pdf)$/i.test(clipboardText)) {
        const uri = vscode.Uri.file(clipboardText);
        const fileData = await vscode.workspace.fs.readFile(uri);
        const fileName = uri.path.split('/').pop() || 'image';
        const mimeType = getMimeType(fileName);
        file = { data: fileData, fileName, mimeType };
      }
    } catch {
      // Clipboard read failed or is not a file path—skip
    }
  } else if (source === 'attach' && fileOrData instanceof File) {
    // File from file picker
    const buffer = await fileOrData.arrayBuffer();
    const mimeType = fileOrData.type || getMimeType(fileOrData.name);
    file = {
      data: new Uint8Array(buffer),
      fileName: fileOrData.name,
      mimeType,
    };
  } else if (source === 'attach' && fileOrData instanceof Uint8Array && fileName) {
    // Direct binary data
    const mimeType = getMimeType(fileName);
    file = { data: fileOrData, fileName, mimeType };
  }

  if (!file) return null;

  // Convert to base64
  const base64 = Buffer.from(file.data).toString('base64');

  // Determine file type
  const isPdf = file.mimeType === 'application/pdf' || file.fileName.endsWith('.pdf');
  const isImage = /^image\//i.test(file.mimeType) || /\.(png|jpg|jpeg|gif|webp)$/i.test(file.fileName);

  if (!isPdf && !isImage) {
    throw new Error(`Unsupported file type: ${file.mimeType || 'unknown'}. Supported: PNG, JPG, GIF, WebP, PDF.`);
  }

  return {
    type: isPdf ? 'pdf' : 'image',
    fileName: file.fileName,
    mimeType: file.mimeType,
    data: base64,
    size: file.data.byteLength,
  };
}

/**
 * Detect MIME type from file name.
 */
function getMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const mimeMap: { [key: string]: string } = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    pdf: 'application/pdf',
  };
  return mimeMap[ext || ''] || 'application/octet-stream';
}

/**
 * Format file size for UI display.
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Generate a preview for file UI display.
 */
export function generateFilePreview(file: ChatFileInput): {
  icon: string;
  label: string;
  description: string;
} {
  if (file.type === 'pdf') {
    return {
      icon: '📄',
      label: file.fileName || 'document.pdf',
      description: `PDF · ${formatFileSize(file.size)}`,
    };
  } else {
    return {
      icon: '🖼️',
      label: file.fileName || 'image',
      description: `Image (${file.mimeType || '?'}) · ${formatFileSize(file.size)}`,
    };
  }
}

/**
 * Create a data URL for image preview in UI (browser context only).
 * Returns null if not an image or in Node.js context.
 */
export function createImagePreviewDataUrl(file: ChatFileInput): string | null {
  if (file.type !== 'image' || typeof window === 'undefined') {
    return null;
  }
  return `data:${file.mimeType || 'image/png'};base64,${file.data}`;
}

/**
 * Convert ChatFileInput to the shared FileInput union type.
 * Used when sending to the MCP server or web API.
 */
export function toChatFileInputFormat(file: ChatFileInput): {
  type: 'image' | 'pdf';
  data: Record<string, unknown>;
} {
  if (file.type === 'image') {
    return {
      type: 'image',
      data: {
        type: 'base64',
        mimeType: file.mimeType || 'image/png',
        data: file.data,
      },
    };
  } else {
    return {
      type: 'pdf',
      data: {
        type: 'base64',
        data: file.data,
        fileName: file.fileName,
      },
    };
  }
}
