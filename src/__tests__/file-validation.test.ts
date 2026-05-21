import { describe, it, expect } from 'vitest';
import { validateFile, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '../lib/documents/validation';

describe('validateFile', () => {
  it('accepts a valid PNG file within size limit', () => {
    const result = validateFile({ type: 'image/png', size: 1024 });
    expect(result).toEqual({ valid: true });
  });

  it('accepts a valid JPEG file within size limit', () => {
    const result = validateFile({ type: 'image/jpeg', size: 5_000_000 });
    expect(result).toEqual({ valid: true });
  });

  it('accepts a valid WebP file within size limit', () => {
    const result = validateFile({ type: 'image/webp', size: 10_485_760 });
    expect(result).toEqual({ valid: true });
  });

  it('accepts a valid PDF file within size limit', () => {
    const result = validateFile({ type: 'application/pdf', size: 10_485_760 });
    expect(result).toEqual({ valid: true });
  });

  it('rejects an unsupported MIME type', () => {
    const result = validateFile({ type: 'text/plain', size: 100 });
    expect(result).toEqual({
      valid: false,
      error: {
        reason: 'invalid_type',
        message: 'File type not supported. Accepted formats: PNG, JPEG, WebP, PDF',
      },
    });
  });

  it('rejects a file exceeding max size', () => {
    const result = validateFile({ type: 'image/png', size: 10_485_761 });
    expect(result).toEqual({
      valid: false,
      error: {
        reason: 'size_exceeded',
        message: 'File size exceeds maximum of 10 MB',
      },
    });
  });

  it('rejects invalid type before checking size', () => {
    const result = validateFile({ type: 'video/mp4', size: 20_000_000 });
    expect(result.error?.reason).toBe('invalid_type');
  });

  it('accepts file at exactly max size boundary', () => {
    const result = validateFile({ type: 'application/pdf', size: MAX_FILE_SIZE });
    expect(result.valid).toBe(true);
  });

  it('rejects file at one byte over max size', () => {
    const result = validateFile({ type: 'application/pdf', size: MAX_FILE_SIZE + 1 });
    expect(result.valid).toBe(false);
    expect(result.error?.reason).toBe('size_exceeded');
  });
});
