import type { ExtractionResult } from './types';

/**
 * Allowed MIME types for document upload.
 */
export const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
] as const;

/**
 * Maximum file size in bytes (10 MB).
 */
export const MAX_FILE_SIZE = 10_485_760;

/**
 * Confidence score threshold. Scores below this are classified as "low".
 */
export const CONFIDENCE_THRESHOLD = 0.7;

export type FileValidationError = {
  reason: 'invalid_type' | 'size_exceeded';
  message: string;
};

export type FileValidationResult = {
  valid: boolean;
  error?: FileValidationError;
};

export type ExtractionValidationResult = {
  valid: boolean;
  errors?: string[];
};

export type ReviewFormValidationResult = {
  valid: boolean;
  errors?: Record<string, string>;
};

export type ConfidenceLevel = 'low' | 'normal';

/**
 * Validates a file's MIME type and size.
 *
 * Accepts: image/png, image/jpeg, image/webp, application/pdf
 * Max size: 10 MB (10,485,760 bytes)
 *
 * @param file - Object with type (MIME string) and size (bytes)
 * @returns Validation result with optional error details
 */
export function validateFile(file: { type: string; size: number }): FileValidationResult {
  if (!ALLOWED_MIME_TYPES.includes(file.type as typeof ALLOWED_MIME_TYPES[number])) {
    return {
      valid: false,
      error: {
        reason: 'invalid_type',
        message: 'File type not supported. Accepted formats: PNG, JPEG, WebP, PDF',
      },
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: {
        reason: 'size_exceeded',
        message: 'File size exceeds maximum of 10 MB',
      },
    };
  }

  return { valid: true };
}

/**
 * Validates an ExtractionResult object against the schema constraints.
 *
 * Checks all field constraints from the ExtractionResult interface:
 * - vendor_name: null or 1-200 characters
 * - date: null or ISO 8601 YYYY-MM-DD format
 * - total: null or 0.00 - 999,999,999.99
 * - currency: null or exactly 3 uppercase letters
 * - items: 0-100 items with sub-field constraints
 * - confidence_scores: each between 0.0 and 1.0 inclusive
 *
 * @param result - The extraction result to validate (unknown type for runtime safety)
 * @returns Validation result with optional array of error messages
 */
export function validateExtractionResult(result: unknown): ExtractionValidationResult {
  const errors: string[] = [];

  if (result === null || result === undefined || typeof result !== 'object') {
    errors.push('result must be a non-null object');
    return { valid: false, errors };
  }

  const r = result as Record<string, unknown>;

  // Validate vendor_name: null or string with length 1-200
  if (r.vendor_name !== null) {
    if (typeof r.vendor_name !== 'string') {
      errors.push('vendor_name must be null or a string');
    } else if (r.vendor_name.length < 1 || r.vendor_name.length > 200) {
      errors.push('vendor_name must be between 1 and 200 characters');
    }
  }

  // Validate date: null or string matching YYYY-MM-DD
  if (r.date !== null) {
    if (typeof r.date !== 'string') {
      errors.push('date must be null or a string');
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date)) {
      errors.push('date must be in YYYY-MM-DD format');
    }
  }

  // Validate total: null or number >= 0 and <= 999999999.99
  if (r.total !== null) {
    if (typeof r.total !== 'number') {
      errors.push('total must be null or a number');
    } else if (r.total < 0 || r.total > 999999999.99) {
      errors.push('total must be between 0 and 999999999.99');
    }
  }

  // Validate currency: null or string matching 3 uppercase letters
  if (r.currency !== null) {
    if (typeof r.currency !== 'string') {
      errors.push('currency must be null or a string');
    } else if (!/^[A-Z]{3}$/.test(r.currency)) {
      errors.push('currency must be exactly 3 uppercase letters');
    }
  }

  // Validate items: must be an array with 0-100 elements
  if (!Array.isArray(r.items)) {
    errors.push('items must be an array');
  } else {
    if (r.items.length > 100) {
      errors.push('items must contain at most 100 elements');
    }
    for (let i = 0; i < r.items.length; i++) {
      const item = r.items[i] as Record<string, unknown>;
      if (item === null || item === undefined || typeof item !== 'object') {
        errors.push(`items[${i}] must be an object`);
        continue;
      }

      // description: string with length 1-500
      if (typeof item.description !== 'string') {
        errors.push(`items[${i}].description must be a string`);
      } else if (item.description.length < 1 || item.description.length > 500) {
        errors.push(`items[${i}].description must be between 1 and 500 characters`);
      }

      // quantity: number >= 0.01 and <= 999999.99
      if (typeof item.quantity !== 'number') {
        errors.push(`items[${i}].quantity must be a number`);
      } else if (item.quantity < 0.01 || item.quantity > 999999.99) {
        errors.push(`items[${i}].quantity must be between 0.01 and 999999.99`);
      }

      // unit_price: number >= 0 and <= 999999999.99
      if (typeof item.unit_price !== 'number') {
        errors.push(`items[${i}].unit_price must be a number`);
      } else if (item.unit_price < 0 || item.unit_price > 999999999.99) {
        errors.push(`items[${i}].unit_price must be between 0 and 999999999.99`);
      }

      // amount: number >= 0 and <= 999999999.99
      if (typeof item.amount !== 'number') {
        errors.push(`items[${i}].amount must be a number`);
      } else if (item.amount < 0 || item.amount > 999999999.99) {
        errors.push(`items[${i}].amount must be between 0 and 999999999.99`);
      }
    }
  }

  // Validate confidence_scores: object with specific keys, each 0.0-1.0
  if (r.confidence_scores === null || r.confidence_scores === undefined || typeof r.confidence_scores !== 'object') {
    errors.push('confidence_scores must be an object');
  } else {
    const scores = r.confidence_scores as Record<string, unknown>;
    const scoreKeys = ['vendor_name', 'date', 'total', 'currency', 'items'] as const;

    for (const key of scoreKeys) {
      if (typeof scores[key] !== 'number') {
        errors.push(`confidence_scores.${key} must be a number`);
      } else if ((scores[key] as number) < 0 || (scores[key] as number) > 1) {
        errors.push(`confidence_scores.${key} must be between 0.0 and 1.0`);
      }
    }
  }

  return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
}

/**
 * Validates review form submission data.
 *
 * Validates:
 * - vendor_name: non-empty, non-whitespace-only string
 * - date: valid ISO 8601 date string (YYYY-MM-DD)
 * - total: numeric value >= 0
 * - currency: exactly 3 uppercase letters (ISO 4217)
 *
 * @param data - The form submission data to validate (unknown type for runtime safety)
 * @returns Validation result with optional field-level error messages
 */
export function validateReviewForm(data: unknown): ReviewFormValidationResult {
  if (data === null || data === undefined || typeof data !== 'object') {
    return {
      valid: false,
      errors: {
        vendor_name: 'Vendor name is required',
        date: 'Date must be in YYYY-MM-DD format',
        total: 'Total must be a number greater than or equal to 0',
        currency: 'Currency must be a valid 3-letter ISO 4217 code',
      },
    };
  }

  const record = data as Record<string, unknown>;
  const errors: Record<string, string> = {};

  // Validate vendor_name: non-empty, non-whitespace-only string
  if (
    typeof record.vendor_name !== 'string' ||
    record.vendor_name.trim().length === 0
  ) {
    errors.vendor_name = 'Vendor name is required';
  }

  // Validate date: valid ISO 8601 YYYY-MM-DD format with valid calendar values
  if (typeof record.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(record.date)) {
    errors.date = 'Date must be in YYYY-MM-DD format';
  } else {
    // Verify the date components represent a valid calendar date
    const [year, month, day] = record.date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    if (
      dateObj.getFullYear() !== year ||
      dateObj.getMonth() !== month - 1 ||
      dateObj.getDate() !== day
    ) {
      errors.date = 'Date must be in YYYY-MM-DD format';
    }
  }

  // Validate total: numeric value >= 0
  if (typeof record.total !== 'number' || isNaN(record.total) || record.total < 0) {
    errors.total = 'Total must be a number greater than or equal to 0';
  }

  // Validate currency: exactly 3 uppercase letters (ISO 4217)
  if (
    typeof record.currency !== 'string' ||
    !/^[A-Z]{3}$/.test(record.currency)
  ) {
    errors.currency = 'Currency must be a valid 3-letter ISO 4217 code';
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return { valid: true };
}

/**
 * Classifies a confidence score into a threshold level.
 *
 * Returns "low" if score < 0.7, "normal" otherwise.
 *
 * @param score - Confidence score between 0.0 and 1.0
 * @returns The confidence level classification
 */
export function getConfidenceLevel(score: number): ConfidenceLevel {
  return score < CONFIDENCE_THRESHOLD ? 'low' : 'normal';
}
