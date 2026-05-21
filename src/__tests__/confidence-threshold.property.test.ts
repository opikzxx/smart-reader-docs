import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { getConfidenceLevel, CONFIDENCE_THRESHOLD } from '../lib/documents/validation';

/**
 * Property 5: Confidence threshold classification
 *
 * For any numeric confidence score between 0.0 and 1.0, the confidence
 * classification function SHALL return "low" if and only if the score is
 * strictly less than 0.7, and "normal" otherwise.
 *
 * **Validates: Requirements 4.2, 4.3**
 */

describe('Feature: smart-document-reader, Property 5: Confidence threshold classification', () => {
  it('returns "low" if and only if score < 0.7', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1, noNaN: true }),
        (score) => {
          const result = getConfidenceLevel(score);

          if (score < CONFIDENCE_THRESHOLD) {
            expect(result).toBe('low');
          } else {
            expect(result).toBe('normal');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns "normal" if and only if score >= 0.7', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1, noNaN: true }),
        (score) => {
          const result = getConfidenceLevel(score);

          if (score >= CONFIDENCE_THRESHOLD) {
            expect(result).toBe('normal');
          } else {
            expect(result).toBe('low');
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
