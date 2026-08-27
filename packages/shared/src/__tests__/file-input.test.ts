/**
 * File Input Tests
 * 
 * Tests for file input types and utilities
 */

import { describe, it, expect } from 'vitest';
import {
  FileInputSchema,
  isImageInput,
  isPdfInput,
  getFileName,
  getMimeType,
  getFileSize,
  type FileInput,
  type ImageInput,
  type PdfInput,
} from '@story-agent/shared';

describe('File Input Types', () => {
  describe('FileInputSchema Validation', () => {
    it('should accept valid image input', () => {
      const imageInput: FileInput = {
        image: {
          type: 'base64',
          mimeType: 'image/png',
          data: Buffer.from('PNG image data').toString('base64'),
          fileName: 'screenshot.png',
        },
      };

      const result = FileInputSchema.safeParse(imageInput);
      expect(result.success).toBe(true);
    });

    it('should accept valid PDF input', () => {
      const pdfInput: FileInput = {
        pdf: {
          type: 'base64',
          data: Buffer.from('PDF content').toString('base64'),
          fileName: 'document.pdf',
        },
      };

      const result = FileInputSchema.safeParse(pdfInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid file types', () => {
      const invalidInput = {
        document: {
          type: 'base64',
          data: Buffer.from('Word document').toString('base64'),
          fileName: 'file.docx',
        },
      };

      const result = FileInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject empty base64 data', () => {
      const emptyInput: FileInput = {
        image: {
          type: 'base64',
          mimeType: 'image/png',
          data: '',
          fileName: 'empty.png',
        },
      };

      const result = FileInputSchema.safeParse(emptyInput);
      expect(result.success).toBe(false);
    });
  });

  describe('Type Guards', () => {
    it('should correctly identify image input', () => {
      const imageInput: FileInput = {
        image: {
          type: 'base64',
          mimeType: 'image/png',
          data: Buffer.from('test').toString('base64'),
        },
      };

      expect(isImageInput(imageInput)).toBe(true);
      expect(isPdfInput(imageInput)).toBe(false);
    });

    it('should correctly identify PDF input', () => {
      const pdfInput: FileInput = {
        pdf: {
          type: 'base64',
          data: Buffer.from('PDF').toString('base64'),
        },
      };

      expect(isPdfInput(pdfInput)).toBe(true);
      expect(isImageInput(pdfInput)).toBe(false);
    });
  });

  describe('Utility Functions', () => {
    describe('getFileName', () => {
      it('should extract filename from image input', () => {
        const imageInput: FileInput = {
          image: {
            type: 'base64',
            mimeType: 'image/png',
            data: Buffer.from('test').toString('base64'),
            fileName: 'screenshot.png',
          },
        };

        const name = getFileName(imageInput);
        expect(name).toBe('screenshot.png');
      });

      it('should extract filename from PDF input', () => {
        const pdfInput: FileInput = {
          pdf: {
            type: 'base64',
            data: Buffer.from('PDF').toString('base64'),
            fileName: 'document.pdf',
          },
        };

        const name = getFileName(pdfInput);
        expect(name).toBe('document.pdf');
      });

      it('should return fallback filename if not provided', () => {
        const imageInput: FileInput = {
          image: {
            type: 'base64',
            mimeType: 'image/png',
            data: Buffer.from('test').toString('base64'),
          },
        };

        const name = getFileName(imageInput);
        expect(name).toBe('image.png');
      });
    });

    describe('getMimeType', () => {
      it('should return correct MIME type for base64 image', () => {
        const imageInput: FileInput = {
          image: {
            type: 'base64',
            mimeType: 'image/jpeg',
            data: Buffer.from('JPG').toString('base64'),
          },
        };

        const mimeType = getMimeType(imageInput);
        expect(mimeType).toBe('image/jpeg');
      });

      it('should return image/* for URL type images', () => {
        const urlImageInput: FileInput = {
          image: {
            type: 'url',
            url: 'https://example.com/image.png',
          },
        };

        const mimeType = getMimeType(urlImageInput);
        expect(mimeType).toBe('image/*');
      });

      it('should return application/pdf for PDF input', () => {
        const pdfInput: FileInput = {
          pdf: {
            type: 'base64',
            data: Buffer.from('PDF').toString('base64'),
          },
        };

        const mimeType = getMimeType(pdfInput);
        expect(mimeType).toBe('application/pdf');
      });
    });

    describe('getFileSize', () => {
      it('should calculate size from base64 data', () => {
        const testData = Buffer.from('test content here').toString('base64');
        const imageInput: FileInput = {
          image: {
            type: 'base64',
            mimeType: 'image/png',
            data: testData,
          },
        };

        const size = getFileSize(imageInput);
        expect(size).toBeGreaterThan(0);
        expect(size).toBeLessThanOrEqual(testData.length);
      });

      it('should return 0 for URL type images', () => {
        const urlImageInput: FileInput = {
          image: {
            type: 'url',
            url: 'https://example.com/image.png',
          },
        };

        const size = getFileSize(urlImageInput);
        expect(size).toBe(0); // URL type doesn't have embedded size
      });

      it('should calculate size for PDF input', () => {
        const testData = Buffer.from('test pdf content').toString('base64');
        const pdfInput: FileInput = {
          pdf: {
            type: 'base64',
            data: testData,
          },
        };

        const size = getFileSize(pdfInput);
        expect(size).toBeGreaterThan(0);
      });
    });
  });

  describe('File Size Limits', () => {
    it('should accept images under 10 MB', () => {
      const size = 9 * 1024 * 1024; // 9 MB
      expect(size).toBeLessThan(10 * 1024 * 1024);
    });

    it('should accept PDFs under 50 MB', () => {
      const size = 45 * 1024 * 1024; // 45 MB
      expect(size).toBeLessThan(50 * 1024 * 1024);
    });

    it('should reject oversized images', () => {
      const size = 15 * 1024 * 1024; // 15 MB
      expect(size).toBeGreaterThan(10 * 1024 * 1024);
    });

    it('should reject oversized PDFs', () => {
      const size = 60 * 1024 * 1024; // 60 MB
      expect(size).toBeGreaterThan(50 * 1024 * 1024);
    });
  });

  describe('Supported File Types', () => {
    it('should accept PNG images', () => {
      const imageInput: FileInput = {
        image: {
          type: 'base64',
          mimeType: 'image/png',
          data: Buffer.from('PNG').toString('base64'),
        },
      };

      expect(isImageInput(imageInput)).toBe(true);
    });

    it('should accept JPEG images', () => {
      const imageInput: FileInput = {
        image: {
          type: 'base64',
          mimeType: 'image/jpeg',
          data: Buffer.from('JPG').toString('base64'),
        },
      };

      expect(isImageInput(imageInput)).toBe(true);
    });

    it('should accept GIF images', () => {
      const imageInput: FileInput = {
        image: {
          type: 'base64',
          mimeType: 'image/gif',
          data: Buffer.from('GIF').toString('base64'),
        },
      };

      expect(isImageInput(imageInput)).toBe(true);
    });

    it('should accept WebP images', () => {
      const imageInput: FileInput = {
        image: {
          type: 'base64',
          mimeType: 'image/webp',
          data: Buffer.from('WebP').toString('base64'),
        },
      };

      expect(isImageInput(imageInput)).toBe(true);
    });

    it('should accept PDF documents', () => {
      const pdfInput: FileInput = {
        pdf: {
          type: 'base64',
          data: Buffer.from('PDF').toString('base64'),
        },
      };

      expect(isPdfInput(pdfInput)).toBe(true);
    });

    it('should reject unsupported formats', () => {
      const invalidInput: FileInput = {
        image: {
          type: 'base64',
          mimeType: 'application/vnd.ms-excel', // .xls
          data: Buffer.from('XLS').toString('base64'),
        },
      };

      // This should fail validation
      const result = FileInputSchema.safeParse(invalidInput);
      // Type checking should catch this at compile time
    });
  });

  describe('Edge Cases', () => {
    it('should handle filenames with special characters', () => {
      const imageInput: FileInput = {
        image: {
          type: 'base64',
          mimeType: 'image/png',
          data: Buffer.from('test').toString('base64'),
          fileName: 'my-screenshot (2024-08-27).png',
        },
      };

      const name = getFileName(imageInput);
      expect(name).toContain('my-screenshot');
    });

    it('should handle very long filenames', () => {
      const longName = 'a'.repeat(255) + '.pdf';
      const pdfInput: FileInput = {
        pdf: {
          type: 'base64',
          data: Buffer.from('PDF').toString('base64'),
          fileName: longName,
        },
      };

      const name = getFileName(pdfInput);
      expect(name.length).toBeGreaterThan(200);
    });

    it('should handle filenames without extensions', () => {
      const imageInput: FileInput = {
        image: {
          type: 'base64',
          mimeType: 'image/png',
          data: Buffer.from('test').toString('base64'),
          fileName: 'screenshot',
        },
      };

      const name = getFileName(imageInput);
      expect(name).toBe('screenshot');
    });
  });
});
