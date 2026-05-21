import { describe, it, expect } from 'vitest';
import { validateExtractionResult } from '@/lib/documents/validation';

describe('validateExtractionResult', () => {
  const validResult = {
    vendor_name: 'Acme Corp',
    date: '2024-01-15',
    total: 1250.00,
    currency: 'USD',
    items: [
      { description: 'Widget', quantity: 2, unit_price: 625.00, amount: 1250.00 },
    ],
    confidence_scores: {
      vendor_name: 0.95,
      date: 0.88,
      total: 0.92,
      currency: 0.99,
      items: 0.85,
    },
  };

  it('accepts a valid ExtractionResult', () => {
    const result = validateExtractionResult(validResult);
    expect(result.valid).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  it('accepts null fields for vendor_name, date, total, currency', () => {
    const result = validateExtractionResult({
      ...validResult,
      vendor_name: null,
      date: null,
      total: null,
      currency: null,
    });
    expect(result.valid).toBe(true);
  });

  it('accepts empty items array', () => {
    const result = validateExtractionResult({ ...validResult, items: [] });
    expect(result.valid).toBe(true);
  });

  it('rejects null input', () => {
    const result = validateExtractionResult(null);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('result must be a non-null object');
  });

  it('rejects undefined input', () => {
    const result = validateExtractionResult(undefined);
    expect(result.valid).toBe(false);
  });

  it('rejects vendor_name longer than 200 characters', () => {
    const result = validateExtractionResult({
      ...validResult,
      vendor_name: 'a'.repeat(201),
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('vendor_name must be between 1 and 200 characters');
  });

  it('rejects empty vendor_name string', () => {
    const result = validateExtractionResult({
      ...validResult,
      vendor_name: '',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('vendor_name must be between 1 and 200 characters');
  });

  it('rejects invalid date format', () => {
    const result = validateExtractionResult({
      ...validResult,
      date: '01-15-2024',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('date must be in YYYY-MM-DD format');
  });

  it('rejects negative total', () => {
    const result = validateExtractionResult({
      ...validResult,
      total: -1,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('total must be between 0 and 999999999.99');
  });

  it('rejects total exceeding max', () => {
    const result = validateExtractionResult({
      ...validResult,
      total: 1000000000,
    });
    expect(result.valid).toBe(false);
  });

  it('rejects lowercase currency', () => {
    const result = validateExtractionResult({
      ...validResult,
      currency: 'usd',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('currency must be exactly 3 uppercase letters');
  });

  it('rejects currency with wrong length', () => {
    const result = validateExtractionResult({
      ...validResult,
      currency: 'US',
    });
    expect(result.valid).toBe(false);
  });

  it('rejects items array with more than 100 elements', () => {
    const items = Array.from({ length: 101 }, (_, i) => ({
      description: `Item ${i}`,
      quantity: 1,
      unit_price: 10,
      amount: 10,
    }));
    const result = validateExtractionResult({ ...validResult, items });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('items must contain at most 100 elements');
  });

  it('rejects item with empty description', () => {
    const result = validateExtractionResult({
      ...validResult,
      items: [{ description: '', quantity: 1, unit_price: 10, amount: 10 }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('items[0].description must be between 1 and 500 characters');
  });

  it('rejects item with quantity below 0.01', () => {
    const result = validateExtractionResult({
      ...validResult,
      items: [{ description: 'Test', quantity: 0, unit_price: 10, amount: 10 }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('items[0].quantity must be between 0.01 and 999999.99');
  });

  it('rejects confidence score above 1.0', () => {
    const result = validateExtractionResult({
      ...validResult,
      confidence_scores: { ...validResult.confidence_scores, vendor_name: 1.1 },
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('confidence_scores.vendor_name must be between 0.0 and 1.0');
  });

  it('rejects confidence score below 0.0', () => {
    const result = validateExtractionResult({
      ...validResult,
      confidence_scores: { ...validResult.confidence_scores, total: -0.1 },
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('confidence_scores.total must be between 0.0 and 1.0');
  });

  it('rejects missing confidence_scores', () => {
    const { confidence_scores, ...rest } = validResult;
    const result = validateExtractionResult(rest);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('confidence_scores must be an object');
  });

  it('collects multiple errors', () => {
    const result = validateExtractionResult({
      vendor_name: '',
      date: 'invalid',
      total: -5,
      currency: 'x',
      items: 'not-array',
      confidence_scores: null,
    });
    expect(result.valid).toBe(false);
    expect(result.errors!.length).toBeGreaterThan(1);
  });
});
