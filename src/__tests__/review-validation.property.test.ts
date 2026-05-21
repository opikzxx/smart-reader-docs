import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateReviewForm } from '../lib/documents/validation';

/**
 * Property 6: Review form validation correctness
 *
 * For any form submission data, the validation function SHALL accept the submission
 * if and only if: vendor_name is a non-empty, non-whitespace-only string; date is a
 * valid ISO 8601 date string (YYYY-MM-DD); total is a numeric value greater than or
 * equal to 0; and currency is a valid 3-letter uppercase ISO 4217 code. All other
 * submissions SHALL be rejected with appropriate error indicators.
 *
 * **Validates: Requirements 4.5, 4.6**
 */

// Generators for valid form data
const validVendorName = fc.string({ minLength: 1 }).filter(s => s.trim().length > 0);

const validDate = fc.tuple(
  fc.integer({ min: 2000, max: 2099 }),
  fc.integer({ min: 1, max: 12 }),
  fc.integer({ min: 1, max: 28 })
).map(([year, month, day]) =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
);

const validTotal = fc.double({ min: 0, max: 999999999.99, noNaN: true });

const validCurrency = fc.tuple(
  fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')),
  fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')),
  fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''))
).map(([a, b, c]) => `${a}${b}${c}`);

describe('Feature: smart-document-reader, Property 6: Review form validation correctness', () => {
  it('accepts form data when all required fields are valid', () => {
    fc.assert(
      fc.property(
        validVendorName,
        validDate,
        validTotal,
        validCurrency,
        (vendor_name, date, total, currency) => {
          const result = validateReviewForm({ vendor_name, date, total, currency });
          expect(result).toEqual({ valid: true });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects form data when at least one field is invalid', () => {
    // Generate invalid form data by making at least one field invalid
    const invalidVendorName = fc.constantFrom('', '   ', '\t', '\n');
    const invalidDate = fc.constantFrom('not-a-date', '2024/01/15', '01-15-2024', '2024-13-01', '2024-1-1', '');
    const invalidTotal = fc.double({ min: -999999, max: -0.01, noNaN: true });
    const invalidCurrency = fc.constantFrom('usd', 'US', 'ABCD', '12A', '', 'ab');

    // Strategy: pick which field(s) to invalidate, keep others valid
    const formWithInvalidVendor = fc.tuple(
      invalidVendorName,
      validDate,
      validTotal,
      validCurrency
    ).map(([vendor_name, date, total, currency]) => ({ vendor_name, date, total, currency }));

    const formWithInvalidDate = fc.tuple(
      validVendorName,
      invalidDate,
      validTotal,
      validCurrency
    ).map(([vendor_name, date, total, currency]) => ({ vendor_name, date, total, currency }));

    const formWithInvalidTotal = fc.tuple(
      validVendorName,
      validDate,
      invalidTotal,
      validCurrency
    ).map(([vendor_name, date, total, currency]) => ({ vendor_name, date, total, currency }));

    const formWithInvalidCurrency = fc.tuple(
      validVendorName,
      validDate,
      validTotal,
      invalidCurrency
    ).map(([vendor_name, date, total, currency]) => ({ vendor_name, date, total, currency }));

    const invalidFormData = fc.oneof(
      formWithInvalidVendor,
      formWithInvalidDate,
      formWithInvalidTotal,
      formWithInvalidCurrency
    );

    fc.assert(
      fc.property(invalidFormData, (data) => {
        const result = validateReviewForm(data);
        expect(result.valid).toBe(false);
        expect(result.errors).toBeDefined();
        expect(Object.keys(result.errors!).length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });
});
