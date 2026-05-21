import { describe, it, expect } from 'vitest';
import { parseLLMResponse, createEmptyExtractionResult } from '../lib/documents/llm-parser';

describe('LLM Response Parser', () => {
  describe('createEmptyExtractionResult', () => {
    it('returns an ExtractionResult with all fields null/empty and confidence scores 0', () => {
      const result = createEmptyExtractionResult();
      expect(result).toEqual({
        vendor_name: null,
        date: null,
        total: null,
        currency: null,
        items: [],
        confidence_scores: {
          vendor_name: 0,
          date: 0,
          total: 0,
          currency: 0,
          items: 0,
        },
      });
    });
  });

  describe('parseLLMResponse', () => {
    it('returns empty ExtractionResult for invalid JSON', () => {
      const result = parseLLMResponse('not valid json');
      expect(result).toEqual(createEmptyExtractionResult());
    });

    it('returns empty ExtractionResult for empty string', () => {
      const result = parseLLMResponse('');
      expect(result).toEqual(createEmptyExtractionResult());
    });

    it('returns empty ExtractionResult when parsed JSON fails validation', () => {
      const invalidData = JSON.stringify({
        vendor_name: 'Test',
        date: 'not-a-date',
        total: -5,
        currency: 'invalid',
        items: [],
        confidence_scores: {
          vendor_name: 2, // invalid: > 1
          date: 0.5,
          total: 0.8,
          currency: 0.9,
          items: 0.7,
        },
      });
      const result = parseLLMResponse(invalidData);
      expect(result).toEqual(createEmptyExtractionResult());
    });

    it('returns parsed ExtractionResult for valid JSON', () => {
      const validData = {
        vendor_name: 'Acme Corp',
        date: '2024-01-15',
        total: 1250.00,
        currency: 'USD',
        items: [
          {
            description: 'Widget A',
            quantity: 5,
            unit_price: 200.00,
            amount: 1000.00,
          },
          {
            description: 'Widget B',
            quantity: 1,
            unit_price: 250.00,
            amount: 250.00,
          },
        ],
        confidence_scores: {
          vendor_name: 0.95,
          date: 0.9,
          total: 0.85,
          currency: 0.99,
          items: 0.8,
        },
      };
      const result = parseLLMResponse(JSON.stringify(validData));
      expect(result).toEqual(validData);
    });

    it('returns parsed ExtractionResult with null fields when valid', () => {
      const validData = {
        vendor_name: null,
        date: null,
        total: null,
        currency: null,
        items: [],
        confidence_scores: {
          vendor_name: 0,
          date: 0,
          total: 0,
          currency: 0,
          items: 0,
        },
      };
      const result = parseLLMResponse(JSON.stringify(validData));
      expect(result).toEqual(validData);
    });

    it('returns empty ExtractionResult when JSON is valid but missing required fields', () => {
      const incompleteData = JSON.stringify({
        vendor_name: 'Test',
        // missing other fields
      });
      const result = parseLLMResponse(incompleteData);
      expect(result).toEqual(createEmptyExtractionResult());
    });
  });
});
