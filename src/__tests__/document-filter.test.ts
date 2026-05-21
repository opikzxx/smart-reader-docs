import { describe, it, expect } from 'vitest';
import { filterDocuments } from '@/lib/documents/filter';
import type { Document, DocumentFilters } from '@/lib/documents/types';

function makeDocument(overrides: Partial<Document> = {}): Document {
  return {
    id: 1,
    file_name: 'invoice.pdf',
    r2_key: 'documents/1/invoice.pdf',
    status: 'uploaded',
    vendor_name: 'Acme Corp',
    date: '2024-01-15',
    total: 100.0,
    currency: 'USD',
    confidence_scores: null,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    ...overrides,
  };
}

describe('filterDocuments', () => {
  const documents: Document[] = [
    makeDocument({ id: 1, status: 'uploaded', vendor_name: 'Acme Corp', created_at: '2024-01-10T10:00:00Z' }),
    makeDocument({ id: 2, status: 'processing', vendor_name: 'Beta Inc', created_at: '2024-01-12T10:00:00Z' }),
    makeDocument({ id: 3, status: 'review', vendor_name: 'Acme Solutions', created_at: '2024-01-14T10:00:00Z' }),
    makeDocument({ id: 4, status: 'ready', vendor_name: 'Gamma LLC', created_at: '2024-01-16T10:00:00Z' }),
    makeDocument({ id: 5, status: 'ready', vendor_name: null, created_at: '2024-01-18T10:00:00Z' }),
  ];

  describe('no filters', () => {
    it('returns all documents when filters object is empty', () => {
      const result = filterDocuments(documents, {});
      expect(result).toHaveLength(5);
    });

    it('returns all documents when filters have undefined values', () => {
      const result = filterDocuments(documents, {
        statuses: undefined,
        vendor_name: undefined,
        date_from: undefined,
        date_to: undefined,
      });
      expect(result).toHaveLength(5);
    });
  });

  describe('status filter', () => {
    it('filters by single status', () => {
      const result = filterDocuments(documents, { statuses: ['ready'] });
      expect(result).toHaveLength(2);
      expect(result.every(d => d.status === 'ready')).toBe(true);
    });

    it('filters by multiple statuses', () => {
      const result = filterDocuments(documents, { statuses: ['uploaded', 'processing'] });
      expect(result).toHaveLength(2);
      expect(result.map(d => d.id)).toEqual([1, 2]);
    });

    it('returns no documents when status does not match any', () => {
      const result = filterDocuments(documents, { statuses: ['processing'] });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(2);
    });

    it('includes all when statuses array is empty', () => {
      const result = filterDocuments(documents, { statuses: [] });
      expect(result).toHaveLength(5);
    });
  });

  describe('vendor_name filter', () => {
    it('filters by case-insensitive partial match', () => {
      const result = filterDocuments(documents, { vendor_name: 'acme' });
      expect(result).toHaveLength(2);
      expect(result.map(d => d.id)).toEqual([1, 3]);
    });

    it('matches case-insensitively', () => {
      const result = filterDocuments(documents, { vendor_name: 'BETA' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(2);
    });

    it('excludes documents with null vendor_name', () => {
      const result = filterDocuments(documents, { vendor_name: 'anything' });
      expect(result.find(d => d.id === 5)).toBeUndefined();
    });

    it('includes all when vendor_name is empty string', () => {
      const result = filterDocuments(documents, { vendor_name: '' });
      expect(result).toHaveLength(5);
    });

    it('includes all when vendor_name is whitespace only', () => {
      const result = filterDocuments(documents, { vendor_name: '   ' });
      expect(result).toHaveLength(5);
    });
  });

  describe('date range filter', () => {
    it('filters by date_from (inclusive)', () => {
      const result = filterDocuments(documents, { date_from: '2024-01-14T10:00:00Z' });
      expect(result).toHaveLength(3);
      expect(result.map(d => d.id)).toEqual([3, 4, 5]);
    });

    it('filters by date_to (inclusive)', () => {
      const result = filterDocuments(documents, { date_to: '2024-01-14T10:00:00Z' });
      expect(result).toHaveLength(3);
      expect(result.map(d => d.id)).toEqual([1, 2, 3]);
    });

    it('filters by both date_from and date_to', () => {
      const result = filterDocuments(documents, {
        date_from: '2024-01-12T10:00:00Z',
        date_to: '2024-01-16T10:00:00Z',
      });
      expect(result).toHaveLength(3);
      expect(result.map(d => d.id)).toEqual([2, 3, 4]);
    });

    it('returns empty when date range excludes all', () => {
      const result = filterDocuments(documents, {
        date_from: '2025-01-01T00:00:00Z',
      });
      expect(result).toHaveLength(0);
    });
  });

  describe('combined filters', () => {
    it('applies all filters together', () => {
      const result = filterDocuments(documents, {
        statuses: ['uploaded', 'review', 'ready'],
        vendor_name: 'acme',
        date_from: '2024-01-10T00:00:00Z',
        date_to: '2024-01-15T00:00:00Z',
      });
      // id=1: uploaded, Acme Corp, 2024-01-10 -> matches
      // id=3: review, Acme Solutions, 2024-01-14 -> matches
      expect(result).toHaveLength(2);
      expect(result.map(d => d.id)).toEqual([1, 3]);
    });
  });
});
