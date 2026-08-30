/**
 * useFileAttachment Hook
 * 
 * Manages file attachment state and operations for chat file input.
 * Validates file types (PNG, JPG, GIF, WebP, PDF) and sizes.
 */

import { useState, useRef, useCallback } from 'react';

export interface AttachedFile {
  name: string;
  mimeType: string;
  size: number;
  dataUrl: string; // base64 data URL
  id: string; // for React keys
}

export interface UseFileAttachmentReturn {
  attachedFiles: AttachedFile[];
  setAttachedFiles: (files: AttachedFile[]) => void;
  handleAttach: (file: File) => Promise<void>;
  removeFile: (id: string) => void;
  clearFiles: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  triggerFileInput: () => void;
}

const VALID_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
const VALID_PDF_TYPE = 'application/pdf';
const IMAGE_SIZE_LIMIT = 10 * 1024 * 1024; // 10 MB
const PDF_SIZE_LIMIT = 50 * 1024 * 1024; // 50 MB

export function useFileAttachment(): UseFileAttachmentReturn {
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAttach = useCallback(async (file: File): Promise<void> => {
    // Validate file type
    const isValidImage = VALID_IMAGE_TYPES.includes(file.type);
    const isValidPdf = file.type === VALID_PDF_TYPE;

    if (!isValidImage && !isValidPdf) {
      throw new Error(
        `Invalid file type: ${file.type}. Supported: PNG, JPG, GIF, WebP, PDF`
      );
    }

    // Validate file size
    const sizeLimit = isValidPdf ? PDF_SIZE_LIMIT : IMAGE_SIZE_LIMIT;
    if (file.size > sizeLimit) {
      const limitMB = sizeLimit / (1024 * 1024);
      throw new Error(`File too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Max: ${limitMB} MB`);
    }

    // Read file as data URL
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const newFile: AttachedFile = {
          name: file.name,
          mimeType: file.type,
          size: file.size,
          dataUrl,
          id: `${Date.now()}-${Math.random()}`, // Simple unique ID
        };
        setAttachedFiles((prev) => [...prev, newFile]);
        resolve();
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsDataURL(file);
    });
  }, []);

  const removeFile = useCallback((id: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const clearFiles = useCallback(() => {
    setAttachedFiles([]);
  }, []);

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return {
    attachedFiles,
    setAttachedFiles,
    handleAttach,
    removeFile,
    clearFiles,
    fileInputRef,
    triggerFileInput,
  };
}
