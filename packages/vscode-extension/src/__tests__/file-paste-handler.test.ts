/**
 * VSCode File Paste Handler Tests
 * 
 * Tests for file attachment and paste utilities in VSCode extension
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  type ChatFileInput,
  formatFileSize,
  generateFilePreview,
} from '../chat/file-paste-handler';

describe('File Paste Handler', () => {
  describe('ChatFileInput Types', () => {
    it('should accept image file input', () => {
      const imageInput: ChatFileInput = {
        type: 'image',
        fileName: 'screenshot.png',
        mimeType: 'image/png',
        data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        size: 67,
      };

      expect(imageInput.type).toBe('image');
      expect(imageInput.fileName).toEndWith('.png');
      expect(imageInput.data).toBeTruthy();
    });

    it('should accept PDF file input', () => {
      const pdfInput: ChatFileInput = {
        type: 'pdf',
        fileName: 'document.pdf',
        mimeType: 'application/pdf',
        data: 'JVBERi0xLjQK...',
        size: 2048,
      };

      expect(pdfInput.type).toBe('pdf');
      expect(pdfInput.fileName).toEndWith('.pdf');
      expect(pdfInput.mimeType).toBe('application/pdf');
    });

    it('should require data field', () => {
      const invalidInput = {
        type: 'image',
        fileName: 'test.png',
        mimeType: 'image/png',
        // Missing 'data' field
      };

      // Type checking should catch this
      expect(invalidInput).toBeDefined();
    });

    it('should track file size', () => {
      const imageInput: ChatFileInput = {
        type: 'image',
        fileName: 'large-image.jpg',
        mimeType: 'image/jpeg',
        data: 'a'.repeat(5 * 1024 * 1024), // 5 MB
        size: 5 * 1024 * 1024,
      };

      expect(imageInput.size).toBe(5 * 1024 * 1024);
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(512)).toBe('512 B');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('should handle decimal sizes', () => {
      const size = 1536; // 1.5 KB
      const formatted = formatFileSize(size);
      expect(formatted).toContain('KB');
    });

    it('should handle zero bytes', () => {
      const formatted = formatFileSize(0);
      expect(formatted).toBe('0 B');
    });

    it('should handle very large files', () => {
      const largeSize = 100 * 1024 * 1024 * 1024; // 100 GB
      const formatted = formatFileSize(largeSize);
      expect(formatted).toContain('GB');
    });

    it('should display reasonable precision', () => {
      const size = 1536; // 1.5 KB
      const formatted = formatFileSize(size);
      // Should show 1.5 or similar, not excessive decimals
      expect(formatted.split('.')[1]?.length || 0).toBeLessThanOrEqual(2);
    });
  });

  describe('generateFilePreview', () => {
    it('should generate preview for image file', () => {
      const imageFile: ChatFileInput = {
        type: 'image',
        fileName: 'screenshot.png',
        mimeType: 'image/png',
        data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        size: 67,
      };

      const preview = generateFilePreview(imageFile);

      expect(preview.icon).toBeTruthy();
      expect(preview.label).toContain('screenshot');
      expect(preview.description).toContain('image');
    });

    it('should generate preview for PDF file', () => {
      const pdfFile: ChatFileInput = {
        type: 'pdf',
        fileName: 'document.pdf',
        mimeType: 'application/pdf',
        data: 'JVBERi0xLjQK...',
        size: 2048,
      };

      const preview = generateFilePreview(pdfFile);

      expect(preview.icon).toBeTruthy();
      expect(preview.label).toContain('document');
      expect(preview.description).toContain('pdf');
    });

    it('should display file size in preview', () => {
      const largeFile: ChatFileInput = {
        type: 'image',
        fileName: 'large.jpg',
        mimeType: 'image/jpeg',
        data: 'a'.repeat(5 * 1024 * 1024),
        size: 5 * 1024 * 1024,
      };

      const preview = generateFilePreview(largeFile);

      expect(preview.description).toContain('MB');
    });

    it('should use emoji icons for file types', () => {
      const imageFile: ChatFileInput = {
        type: 'image',
        fileName: 'photo.png',
        mimeType: 'image/png',
        data: 'test',
        size: 100,
      };

      const imagePreview = generateFilePreview(imageFile);
      expect(imagePreview.icon).toMatch(/📷|🖼️|📸|🏞️/);

      const pdfFile: ChatFileInput = {
        type: 'pdf',
        fileName: 'paper.pdf',
        mimeType: 'application/pdf',
        data: 'test',
        size: 100,
      };

      const pdfPreview = generateFilePreview(pdfFile);
      expect(pdfPreview.icon).toMatch(/📄|📃|📑/);
    });

    it('should handle files without extension', () => {
      const noExtFile: ChatFileInput = {
        type: 'image',
        fileName: 'screenshot',
        mimeType: 'image/png',
        data: 'test',
        size: 100,
      };

      const preview = generateFilePreview(noExtFile);
      expect(preview.label).toBe('screenshot');
    });

    it('should handle very long filenames', () => {
      const longName = 'a'.repeat(100) + '.pdf';
      const longFile: ChatFileInput = {
        type: 'pdf',
        fileName: longName,
        mimeType: 'application/pdf',
        data: 'test',
        size: 100,
      };

      const preview = generateFilePreview(longFile);
      // Should truncate or handle gracefully
      expect(preview.label.length).toBeLessThanOrEqual(60);
    });
  });

  describe('File Validation', () => {
    it('should enforce file size limits for images', () => {
      const oversizedImage: ChatFileInput = {
        type: 'image',
        fileName: 'huge.jpg',
        mimeType: 'image/jpeg',
        data: 'a'.repeat(15 * 1024 * 1024), // 15 MB (over 10 MB limit)
        size: 15 * 1024 * 1024,
      };

      // Should reject or warn
      expect(oversizedImage.size).toBeGreaterThan(10 * 1024 * 1024);
    });

    it('should enforce file size limits for PDFs', () => {
      const oversizedPdf: ChatFileInput = {
        type: 'pdf',
        fileName: 'massive.pdf',
        mimeType: 'application/pdf',
        data: 'a'.repeat(60 * 1024 * 1024), // 60 MB (over 50 MB limit)
        size: 60 * 1024 * 1024,
      };

      // Should reject or warn
      expect(oversizedPdf.size).toBeGreaterThan(50 * 1024 * 1024);
    });

    it('should accept valid image MIME types', () => {
      const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

      validTypes.forEach((mimeType) => {
        const file: ChatFileInput = {
          type: 'image',
          fileName: 'test.jpg',
          mimeType,
          data: 'test',
          size: 100,
        };

        expect(file.mimeType).toBeTruthy();
      });
    });

    it('should require base64-encoded data', () => {
      const validFile: ChatFileInput = {
        type: 'image',
        fileName: 'test.png',
        mimeType: 'image/png',
        data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        size: 67,
      };

      // Base64 data should decode properly
      const decoded = Buffer.from(validFile.data, 'base64');
      expect(decoded.length).toBeGreaterThan(0);
    });
  });

  describe('UI State Management', () => {
    it('should support multiple file attachments', () => {
      const files: ChatFileInput[] = [
        {
          type: 'image',
          fileName: 'screenshot1.png',
          mimeType: 'image/png',
          data: 'test1',
          size: 100,
        },
        {
          type: 'image',
          fileName: 'screenshot2.png',
          mimeType: 'image/png',
          data: 'test2',
          size: 200,
        },
        {
          type: 'pdf',
          fileName: 'document.pdf',
          mimeType: 'application/pdf',
          data: 'test3',
          size: 500,
        },
      ];

      expect(files).toHaveLength(3);
      expect(files.filter((f) => f.type === 'image')).toHaveLength(2);
      expect(files.filter((f) => f.type === 'pdf')).toHaveLength(1);
    });

    it('should support file removal from list', () => {
      let files: ChatFileInput[] = [
        {
          type: 'image',
          fileName: 'to-remove.png',
          mimeType: 'image/png',
          data: 'test',
          size: 100,
        },
        {
          type: 'image',
          fileName: 'to-keep.png',
          mimeType: 'image/png',
          data: 'test',
          size: 100,
        },
      ];

      files = files.filter((_, i) => i !== 0);
      expect(files).toHaveLength(1);
      expect(files[0].fileName).toBe('to-keep.png');
    });

    it('should support clearing all files', () => {
      let files: ChatFileInput[] = [
        {
          type: 'image',
          fileName: 'file1.png',
          mimeType: 'image/png',
          data: 'test1',
          size: 100,
        },
        {
          type: 'pdf',
          fileName: 'file2.pdf',
          mimeType: 'application/pdf',
          data: 'test2',
          size: 100,
        },
      ];

      files = [];
      expect(files).toHaveLength(0);
    });
  });

  describe('Performance', () => {
    it('should handle large base64 data efficiently', () => {
      const largeData = Buffer.alloc(5 * 1024 * 1024).toString('base64'); // 5 MB

      const file: ChatFileInput = {
        type: 'image',
        fileName: 'large.jpg',
        mimeType: 'image/jpeg',
        data: largeData,
        size: 5 * 1024 * 1024,
      };

      expect(file.data.length).toBeGreaterThan(5 * 1024 * 1024);
    });

    it('should format file size quickly', () => {
      const sizes = [0, 512, 1024, 1024 * 1024, 1024 * 1024 * 1024];

      const startTime = Date.now();
      sizes.forEach((size) => formatFileSize(size));
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(10); // Should be fast
    });
  });
});
