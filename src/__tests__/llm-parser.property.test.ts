import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { parseLLMResponse } from '../lib/documents/llm-parser';
import { validateExtractionResult } from '../lib/documents/validation';

/**
 * Property 4: LLM response parsing produces valid ExtractionResult
 *
 * For any valid JSON string conforming to the expected LLM response schema,
 * the parsing function SHALL produce an ExtractionResult object that passes
 * schema validation (Property 2).
 *
 * **Validates: Requirements 2.3**
 */

// --- Generators for valid ExtractionResult objects (same as Property 2) ---

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

describe('Feature: smart-document-reader, Property 4: LLM response parsing produces valid ExtractionResult', () => {
  it('valid JSON strings conforming to ExtractionResult schema produce a valid parsed result', () => {
    fc.assert(
      fc.property(validExtractionResult, (extractionResult) => {
        // Serialize the valid ExtractionResult to a JSON string (simulating LLM output)
        const jsonString = JSON.stringify(extractionResult);

        // Parse the JSON string using parseLLMResponse
        const parsed = parseLLMResponse(jsonString);

        // Assert the parsed result passes schema validation
        const validation = validateExtractionResult(parsed);
        expect(validation.valid).toBe(true);
        expect(validation.errors).toBeUndefined();
      }),
      { numRuns: 100 }
    );
  });

  it('invalid JSON strings produce a result that still passes validation (empty result is valid)', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => {
          try {
            JSON.parse(s);
            return false; // exclude valid JSON
          } catch {
            return true; // keep only invalid JSON
          }
        }),
        (invalidJson) => {
          // Parse the invalid JSON string using parseLLMResponse
          const parsed = parseLLMResponse(invalidJson);

          // Assert the parsed result still passes schema validation (empty result)
          const validation = validateExtractionResult(parsed);
          expect(validation.valid).toBe(true);
          expect(validation.errors).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});
