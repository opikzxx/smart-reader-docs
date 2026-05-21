import { describe, it, expect } from 'vitest';
import { validateReviewForm } from '../lib/documents/validation';

describe('validateReviewForm', () => {
  it('returns valid: true for valid form data', () => {
    const result = validateReviewForm({
      vendor_name: 'Acme Corp',
      date: '2024-01-15',
      total: 100.5,
      currency: 'USD',
    });
    expect(result).toEqual({ valid: true });
  });

  it('returns errors for null data', () => {
    const result = validateReviewForm(null);
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.vendor_name).toBe('Vendor name is required');
    expect(result.errors!.date).toBe('Date must be in YYYY-MM-DD format');
    expect(result.errors!.total).toBe('Total must be a number greater than or equal to 0');
    expect(result.errors!.currency).toBe('Currency must be a valid 3-letter ISO 4217 code');
  });

  it('returns errors for undefined data', () => {
    const result = validateReviewForm(undefined);
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
  });

  it('returns error for empty vendor_name', () => {
    const result = validateReviewForm({
      vendor_name: '',
      date: '2024-01-15',
      total: 100,
      currency: 'USD',
    });
    expect(result.valid).toBe(false);
    expect(result.errors!.vendor_name).toBe('Vendor name is required');
  });

  it('returns error for whitespace-only vendor_name', () => {
    const result = validateReviewForm({
      vendor_name: '   ',
      date: '2024-01-15',
      total: 100,
      currency: 'USD',
    });
    expect(result.valid).toBe(false);
    expect(result.errors!.vendor_name).toBe('Vendor name is required');
  });

  it('returns error for invalid date format', () => {
    const result = validateReviewForm({
      vendor_name: 'Acme',
      date: '01-15-2024',
      total: 100,
      currency: 'USD',
    });
    expect(result.valid).toBe(false);
    expect(result.errors!.date).toBe('Date must be in YYYY-MM-DD format');
  });

  it('returns error for negative total', () => {
    const result = validateReviewForm({
      vendor_name: 'Acme',
      date: '2024-01-15',
      total: -1,
      currency: 'USD',
    });
    expect(result.valid).toBe(false);
    expect(result.errors!.total).toBe('Total must be a number greater than or equal to 0');
  });

  it('accepts total of 0', () => {
    const result = validateReviewForm({
      vendor_name: 'Acme',
      date: '2024-01-15',
      total: 0,
      currency: 'USD',
    });
    expect(result.valid).toBe(true);
  });

  it('returns error for lowercase currency', () => {
    const result = validateReviewForm({
      vendor_name: 'Acme',
      date: '2024-01-15',
      total: 100,
      currency: 'usd',
    });
    expect(result.valid).toBe(false);
    expect(result.errors!.currency).toBe('Currency must be a valid 3-letter ISO 4217 code');
  });

  it('returns error for currency with wrong length', () => {
    const result = validateReviewForm({
      vendor_name: 'Acme',
      date: '2024-01-15',
      total: 100,
      currency: 'US',
    });
    expect(result.valid).toBe(false);
    expect(result.errors!.currency).toBe('Currency must be a valid 3-letter ISO 4217 code');
  });

  it('returns multiple errors for multiple invalid fields', () => {
    const result = validateReviewForm({
      vendor_name: '',
      date: 'invalid',
      total: -5,
      currency: 'xx',
    });
    expect(result.valid).toBe(false);
    expect(Object.keys(result.errors!)).toHaveLength(4);
  });

  it('returns error when total is a string', () => {
    const result = validateReviewForm({
      vendor_name: 'Acme',
      date: '2024-01-15',
      total: '100',
      currency: 'USD',
    });
    expect(result.valid).toBe(false);
    expect(result.errors!.total).toBe('Total must be a number greater than or equal to 0');
  });

  it('returns error when total is NaN', () => {
    const result = validateReviewForm({
      vendor_name: 'Acme',
      date: '2024-01-15',
      total: NaN,
      currency: 'USD',
    });
    expect(result.valid).toBe(false);
    expect(result.errors!.total).toBe('Total must be a number greater than or equal to 0');
  });
});
