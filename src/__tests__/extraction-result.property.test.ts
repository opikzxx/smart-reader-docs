import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateExtractionResult } from '../lib/documents/validation';

/**
 * Property 2: ExtractionResult schema validation
 *
 * For any ExtractionResult object, all fields SHALL satisfy their constraints:
 * vendor_name is null or 1–200 characters, date is null or matches YYYY-MM-DD format,
 * total is null or between 0.00 and 999,999,999.99, currency is null or exactly 3 uppercase letters,
 * items contains 0–100 items each with description (1–500 chars), quantity (0.01–999,999.99),
 * unit_price (0.00–999,999,999.99), and amount (0.00–999,999,999.99),
 * and each confidence score is between 0.0 and 1.0 inclusive.
 *
 * **Validates: Requirements 3.1, 3.2**
 */

// --- Generators for valid ExtractionResult objects ---

const validVendorName = fc.oneof(
  fc.constant(null),
  fc.string({ minLength: 1, maxLength: 200 })
);

const validDate = fc.oneof(
  fc.constant(null),
  fc.tuple(
    fc.integer({ min: 1900, max: 2099 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 })
  ).map(([y, m, d]) =>
    `${y.toString().padStart(4, '0')}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`
  )
);

const validTotal = fc.oneof(
  fc.constant(null),
  fc.double({ min: 0, max: 999999999.99, noNaN: true, noDefaultInfinity: true })
);

const validCurrency = fc.oneof(
  fc.constant(null),
  fc.string({ minLength: 3, maxLength: 3, unit: fc.constantFrom(..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")) })
);

const validItem = fc.record({
  description: fc.string({ minLength: 1, maxLength: 500 }),
  quantity: fc.double({ min: 0.01, max: 999999.99, noNaN: true, noDefaultInfinity: true }),
  unit_price: fc.double({ min: 0, max: 999999999.99, noNaN: true, noDefaultInfinity: true }),
  amount: fc.double({ min: 0, max: 999999999.99, noNaN: true, noDefaultInfinity: true }),
});

const validItems = fc.array(validItem, { minLength: 0, maxLength: 100 });

const validConfidenceScore = fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true });

const validConfidenceScores = fc.record({
  vendor_name: validConfidenceScore,
  date: validConfidenceScore,
  total: validConfidenceScore,
  currency: validConfidenceScore,
  items: validConfidenceScore,
});

const validExtractionResult = fc.record({
  vendor_name: validVendorName,
  date: validDate,
  total: validTotal,
  currency: validCurrency,
  items: validItems,
  confidence_scores: validConfidenceScores,
});

// --- Generators for invalid ExtractionResult objects ---

const invalidVendorName = fc.oneof(
  fc.constant(''),  // empty string (too short)
  fc.string({ minLength: 201, maxLength: 250 }),  // too long
  fc.constant(123 as unknown as string)  // wrong type
);

const invalidDate = fc.oneof(
  fc.constant('not-a-date'),
  fc.constant('2024/01/15'),  // wrong format
  fc.constant('24-01-15'),    // wrong format
  fc.constant(20240115 as unknown as string)  // wrong type
);

const invalidTotal = fc.oneof(
  fc.constant(-1),       // negative
  fc.constant(1000000000),  // exceeds max
  fc.constant('100' as unknown as number)  // wrong type
);

const invalidCurrency = fc.oneof(
  fc.constant('US'),     // too short
  fc.constant('USDD'),   // too long
  fc.constant('usd'),    // lowercase
  fc.constant(123 as unknown as string)  // wrong type
);

const invalidItem = fc.oneof(
  // description too long
  fc.record({
    description: fc.string({ minLength: 501, maxLength: 510 }),
    quantity: fc.double({ min: 0.01, max: 999999.99, noNaN: true, noDefaultInfinity: true }),
    unit_price: fc.double({ min: 0, max: 999999999.99, noNaN: true, noDefaultInfinity: true }),
    amount: fc.double({ min: 0, max: 999999999.99, noNaN: true, noDefaultInfinity: true }),
  }),
  // quantity too small
  fc.record({
    description: fc.string({ minLength: 1, maxLength: 500 }),
    quantity: fc.constant(0),
    unit_price: fc.double({ min: 0, max: 999999999.99, noNaN: true, noDefaultInfinity: true }),
    amount: fc.double({ min: 0, max: 999999999.99, noNaN: true, noDefaultInfinity: true }),
  }),
  // unit_price negative
  fc.record({
    description: fc.string({ minLength: 1, maxLength: 500 }),
    quantity: fc.double({ min: 0.01, max: 999999.99, noNaN: true, noDefaultInfinity: true }),
    unit_price: fc.constant(-1),
    amount: fc.double({ min: 0, max: 999999999.99, noNaN: true, noDefaultInfinity: true }),
  }),
  // amount exceeds max
  fc.record({
    description: fc.string({ minLength: 1, maxLength: 500 }),
    quantity: fc.double({ min: 0.01, max: 999999.99, noNaN: true, noDefaultInfinity: true }),
    unit_price: fc.double({ min: 0, max: 999999999.99, noNaN: true, noDefaultInfinity: true }),
    amount: fc.constant(1000000000),
  })
);

const invalidConfidenceScore = fc.oneof(
  fc.constant(-0.1),  // below 0
  fc.constant(1.1),   // above 1
  fc.constant(2.0)    // well above 1
);

describe('Feature: smart-document-reader, Property 2: ExtractionResult schema validation', () => {
  it('valid ExtractionResult objects pass validation', () => {
    fc.assert(
      fc.property(validExtractionResult, (result) => {
        const validation = validateExtractionResult(result);
        expect(validation.valid).toBe(true);
        expect(validation.errors).toBeUndefined();
      }),
      { numRuns: 100 }
    );
  });

  it('ExtractionResult with invalid vendor_name fails validation', () => {
    fc.assert(
      fc.property(
        invalidVendorName,
        validDate,
        validTotal,
        validCurrency,
        validItems,
        validConfidenceScores,
        (vendor_name, date, total, currency, items, confidence_scores) => {
          const result = { vendor_name, date, total, currency, items, confidence_scores };
          const validation = validateExtractionResult(result);
          expect(validation.valid).toBe(false);
          expect(validation.errors).toBeDefined();
          expect(validation.errors!.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('ExtractionResult with invalid date fails validation', () => {
    fc.assert(
      fc.property(
        validVendorName,
        invalidDate,
        validTotal,
        validCurrency,
        validItems,
        validConfidenceScores,
        (vendor_name, date, total, currency, items, confidence_scores) => {
          const result = { vendor_name, date, total, currency, items, confidence_scores };
          const validation = validateExtractionResult(result);
          expect(validation.valid).toBe(false);
          expect(validation.errors).toBeDefined();
          expect(validation.errors!.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('ExtractionResult with invalid total fails validation', () => {
    fc.assert(
      fc.property(
        validVendorName,
        validDate,
        invalidTotal,
        validCurrency,
        validItems,
        validConfidenceScores,
        (vendor_name, date, total, currency, items, confidence_scores) => {
          const result = { vendor_name, date, total, currency, items, confidence_scores };
          const validation = validateExtractionResult(result);
          expect(validation.valid).toBe(false);
          expect(validation.errors).toBeDefined();
          expect(validation.errors!.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('ExtractionResult with invalid currency fails validation', () => {
    fc.assert(
      fc.property(
        validVendorName,
        validDate,
        validTotal,
        invalidCurrency,
        validItems,
        validConfidenceScores,
        (vendor_name, date, total, currency, items, confidence_scores) => {
          const result = { vendor_name, date, total, currency, items, confidence_scores };
          const validation = validateExtractionResult(result);
          expect(validation.valid).toBe(false);
          expect(validation.errors).toBeDefined();
          expect(validation.errors!.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('ExtractionResult with invalid items fails validation', () => {
    fc.assert(
      fc.property(
        validVendorName,
        validDate,
        validTotal,
        validCurrency,
        fc.tuple(
          fc.array(validItem, { minLength: 0, maxLength: 5 }),
          invalidItem
        ).map(([validItems, invalidItem]) => [...validItems, invalidItem]),
        validConfidenceScores,
        (vendor_name, date, total, currency, items, confidence_scores) => {
          const result = { vendor_name, date, total, currency, items, confidence_scores };
          const validation = validateExtractionResult(result);
          expect(validation.valid).toBe(false);
          expect(validation.errors).toBeDefined();
          expect(validation.errors!.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('ExtractionResult with invalid confidence scores fails validation', () => {
    fc.assert(
      fc.property(
        validVendorName,
        validDate,
        validTotal,
        validCurrency,
        validItems,
        fc.record({
          vendor_name: invalidConfidenceScore,
          date: validConfidenceScore,
          total: validConfidenceScore,
          currency: validConfidenceScore,
          items: validConfidenceScore,
        }),
        (vendor_name, date, total, currency, items, confidence_scores) => {
          const result = { vendor_name, date, total, currency, items, confidence_scores };
          const validation = validateExtractionResult(result);
          expect(validation.valid).toBe(false);
          expect(validation.errors).toBeDefined();
          expect(validation.errors!.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('ExtractionResult with too many items (>100) fails validation', () => {
    fc.assert(
      fc.property(
        validVendorName,
        validDate,
        validTotal,
        validCurrency,
        fc.array(validItem, { minLength: 101, maxLength: 105 }),
        validConfidenceScores,
        (vendor_name, date, total, currency, items, confidence_scores) => {
          const result = { vendor_name, date, total, currency, items, confidence_scores };
          const validation = validateExtractionResult(result);
          expect(validation.valid).toBe(false);
          expect(validation.errors).toBeDefined();
          expect(validation.errors!.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * Property 3: ExtractionResult serialization round-trip
 *
 * For any valid ExtractionResult object, serializing it to JSON and parsing
 * it back SHALL produce a structurally identical object with the same field
 * names, types, and values.
 *
 * **Validates: Requirements 3.4**
 */
describe('Feature: smart-document-reader, Property 3: ExtractionResult serialization round-trip', () => {
  it('serializing to JSON and parsing back produces a structurally identical object', () => {
    fc.assert(
      fc.property(validExtractionResult, (original) => {
        // Verify the generated object is valid
        const validation = validateExtractionResult(original);
        expect(validation.valid).toBe(true);

        // Serialize to JSON
        const serialized = JSON.stringify(original);

        // Parse back
        const parsed = JSON.parse(serialized);

        // Assert structural equality
        expect(parsed).toEqual(original);
      }),
      { numRuns: 100 }
    );
  });
});
