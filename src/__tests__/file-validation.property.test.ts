import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateFile, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '../lib/documents/validation';

/**
 * Property 1: File validation accepts only valid MIME types and sizes
 *
 * For any file with a given MIME type and size, the file validation function
 * SHALL accept the file if and only if the MIME type is one of
 * (image/png, image/jpeg, image/webp, application/pdf) AND the file size is
 * less than or equal to 10 MB (10,485,760 bytes). All other combinations
 * SHALL be rejected.
 *
 * **Validates: Requirements 1.5, 1.6, 1.7**
 */
describe('Property 1: File validation accepts only valid MIME types and sizes', () => {
  const validMimeTypes: string[] = [...ALLOWED_MIME_TYPES];
  const invalidMimeTypes = [
    'text/plain',
    'text/html',
    'application/json',
    'image/gif',
    'image/bmp',
    'image/tiff',
    'application/zip',
    'video/mp4',
    'audio/mpeg',
    'application/octet-stream',
    '',
    'invalid',
    'image/svg+xml',
  ];

  // Arbitrary that generates a mix of valid and invalid MIME types
  const mimeTypeArb = fc.oneof(
    fc.constantFrom(...validMimeTypes),
    fc.constantFrom(...invalidMimeTypes),
    fc.string({ minLength: 1, maxLength: 50 })
  );

  // Arbitrary that generates file sizes from 0 to well above 10MB (up to 50MB)
  const fileSizeArb = fc.integer({ min: 0, max: 50 * 1024 * 1024 });

  it('should accept file iff MIME type is allowed AND size <= MAX_FILE_SIZE', () => {
    fc.assert(
      fc.property(mimeTypeArb, fileSizeArb, (mimeType, size) => {
        const result = validateFile({ type: mimeType, size });

        const isValidMime = validMimeTypes.includes(mimeType);
        const isValidSize = size <= MAX_FILE_SIZE;
        const shouldBeValid = isValidMime && isValidSize;

        expect(result.valid).toBe(shouldBeValid);
      }),
      { numRuns: 100 }
    );
  });

  it('should return error reason "invalid_type" when MIME type is not allowed (type check takes priority)', () => {
    fc.assert(
      fc.property(mimeTypeArb, fileSizeArb, (mimeType, size) => {
        const isValidMime = validMimeTypes.includes(mimeType);

        if (!isValidMime) {
          const result = validateFile({ type: mimeType, size });
          expect(result.valid).toBe(false);
          expect(result.error).toBeDefined();
          expect(result.error!.reason).toBe('invalid_type');
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should return error reason "size_exceeded" when MIME is valid but size > MAX_FILE_SIZE', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...validMimeTypes),
        fc.integer({ min: MAX_FILE_SIZE + 1, max: 50 * 1024 * 1024 }),
        (mimeType, size) => {
          const result = validateFile({ type: mimeType, size });
          expect(result.valid).toBe(false);
          expect(result.error).toBeDefined();
          expect(result.error!.reason).toBe('size_exceeded');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return valid with no error when MIME is allowed and size <= MAX_FILE_SIZE', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...validMimeTypes),
        fc.integer({ min: 0, max: MAX_FILE_SIZE }),
        (mimeType, size) => {
          const result = validateFile({ type: mimeType, size });
          expect(result.valid).toBe(true);
          expect(result.error).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});
