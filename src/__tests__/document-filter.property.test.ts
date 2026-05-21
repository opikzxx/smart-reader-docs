import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { filterDocuments } from '../lib/documents/filter';
import type { Document, DocumentFilters, DocumentStatus } from '../lib/documents/types';

/**
 * Property 7: Document filter correctness
 *
 * For any list of documents and any combination of filters (status set, vendor name
 * substring, date range), the filter function SHALL return exactly those documents where:
 * the document's status is in the selected status set (or all if no filter), the document's
 * vendor_name contains the search string case-insensitively (or all if no filter), and the
 * document's created_at falls within the date range (or all if no filter).
 *
 * **Validates: Requirements 5.3, 5.4, 5.5**
 */
describe('Property 7: Document filter correctness', () => {
  const ALL_STATUSES: DocumentStatus[] = ['uploaded', 'processing', 'review', 'ready'];

  // Arbitrary for DocumentStatus
  const statusArb = fc.constantFrom<DocumentStatus>(...ALL_STATUSES);

  // Arbitrary for ISO 8601 timestamp strings (YYYY-MM-DDTHH:MM:SSZ)
  const isoTimestampArb = fc.tuple(
    fc.integer({ min: 2020, max: 2025 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 }),
    fc.integer({ min: 0, max: 23 }),
    fc.integer({ min: 0, max: 59 }),
    fc.integer({ min: 0, max: 59 })
  ).map(([year, month, day, hour, minute, second]) => {
    const m = String(month).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    const h = String(hour).padStart(2, '0');
    const min = String(minute).padStart(2, '0');
    const s = String(second).padStart(2, '0');
    return `${year}-${m}-${d}T${h}:${min}:${s}Z`;
  });

  // Arbitrary for YYYY-MM-DD date strings
  const dateStringArb = fc.tuple(
    fc.integer({ min: 2020, max: 2025 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 })
  ).map(([year, month, day]) => {
    const m = String(month).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  });

  // Arbitrary for vendor names (nullable)
  const vendorNameArb = fc.oneof(
    fc.constant(null),
    fc.string({ minLength: 1, maxLength: 50 })
  );

  // Arbitrary for currency (nullable, 3 uppercase letters)
  const currencyArb = fc.oneof(
    fc.constant(null),
    fc.tuple(
      fc.constantFrom('A', 'B', 'C', 'U', 'S', 'D', 'E', 'R', 'G', 'P'),
      fc.constantFrom('A', 'B', 'C', 'U', 'S', 'D', 'E', 'R', 'G', 'P'),
      fc.constantFrom('A', 'B', 'C', 'U', 'S', 'D', 'E', 'R', 'G', 'P')
    ).map(([a, b, c]) => a + b + c)
  );

  // Arbitrary for a Document object
  const documentArb: fc.Arbitrary<Document> = fc.record({
    id: fc.integer({ min: 1, max: 10000 }),
    file_name: fc.string({ minLength: 1, maxLength: 50 }).map(s => s + '.pdf'),
    r2_key: fc.string({ minLength: 1, maxLength: 50 }).map(s => `documents/${s}`),
    status: statusArb,
    vendor_name: vendorNameArb,
    date: fc.oneof(fc.constant(null), dateStringArb),
    total: fc.oneof(fc.constant(null), fc.double({ min: 0, max: 999999, noNaN: true })),
    currency: currencyArb,
    confidence_scores: fc.constant(null),
    created_at: isoTimestampArb,
    updated_at: isoTimestampArb,
  });

  // Arbitrary for a list of documents
  const documentListArb = fc.array(documentArb, { minLength: 0, maxLength: 20 });

  // Arbitrary for DocumentFilters
  const filtersArb: fc.Arbitrary<DocumentFilters> = fc.record({
    statuses: fc.oneof(
      fc.constant(undefined),
      fc.constant([] as DocumentStatus[]),
      fc.subarray(ALL_STATUSES, { minLength: 1, maxLength: 4 })
    ),
    vendor_name: fc.oneof(
      fc.constant(undefined),
      fc.constant(''),
      fc.constant('   '),
      fc.string({ minLength: 1, maxLength: 20 })
    ),
    date_from: fc.oneof(fc.constant(undefined), isoTimestampArb),
    date_to: fc.oneof(fc.constant(undefined), isoTimestampArb),
  });

  /**
   * Helper: manually compute expected filter results to compare against filterDocuments.
   */
  function expectedFilter(documents: Document[], filters: DocumentFilters): Document[] {
    return documents.filter(doc => {
      // Status filter
      if (filters.statuses && filters.statuses.length > 0) {
        if (!filters.statuses.includes(doc.status)) return false;
      }

      // Vendor name filter (case-insensitive partial match, only if non-empty/non-whitespace)
      if (filters.vendor_name && filters.vendor_name.trim().length > 0) {
        if (!doc.vendor_name) return false;
        if (!doc.vendor_name.toLowerCase().includes(filters.vendor_name.toLowerCase())) return false;
      }

      // Date range filter
      if (filters.date_from) {
        if (doc.created_at < filters.date_from) return false;
      }
      if (filters.date_to) {
        if (doc.created_at > filters.date_to) return false;
      }

      return true;
    });
  }

  it('should return exactly those documents matching all filter criteria', () => {
    fc.assert(
      fc.property(documentListArb, filtersArb, (documents, filters) => {
        const result = filterDocuments(documents, filters);
        const expected = expectedFilter(documents, filters);

        expect(result).toEqual(expected);
      }),
      { numRuns: 100 }
    );
  });

  it('should return all documents when no filters are applied', () => {
    fc.assert(
      fc.property(documentListArb, (documents) => {
        const emptyFilters: DocumentFilters = {};
        const result = filterDocuments(documents, emptyFilters);

        expect(result).toEqual(documents);
      }),
      { numRuns: 100 }
    );
  });

  it('should return subset of documents when status filter is applied', () => {
    fc.assert(
      fc.property(
        documentListArb,
        fc.subarray(ALL_STATUSES, { minLength: 1, maxLength: 4 }),
        (documents, statuses) => {
          const filters: DocumentFilters = { statuses };
          const result = filterDocuments(documents, filters);

          // Every returned document must have a status in the filter set
          for (const doc of result) {
            expect(statuses).toContain(doc.status);
          }

          // Every document with matching status must be in the result
          const expectedDocs = documents.filter(d => statuses.includes(d.status));
          expect(result).toEqual(expectedDocs);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should filter by vendor_name case-insensitively when filter is non-empty/non-whitespace', () => {
    fc.assert(
      fc.property(
        documentListArb,
        fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0),
        (documents, vendorSearch) => {
          const filters: DocumentFilters = { vendor_name: vendorSearch };
          const result = filterDocuments(documents, filters);

          // Every returned document must have vendor_name containing the search string
          for (const doc of result) {
            expect(doc.vendor_name).not.toBeNull();
            expect(doc.vendor_name!.toLowerCase()).toContain(vendorSearch.toLowerCase());
          }

          // Every document matching the criteria must be in the result
          const expectedDocs = documents.filter(d =>
            d.vendor_name !== null &&
            d.vendor_name.toLowerCase().includes(vendorSearch.toLowerCase())
          );
          expect(result).toEqual(expectedDocs);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should filter by date range on created_at field', () => {
    fc.assert(
      fc.property(
        documentListArb,
        isoTimestampArb,
        isoTimestampArb,
        (documents, date1, date2) => {
          // Ensure date_from <= date_to
          const [dateFrom, dateTo] = date1 <= date2 ? [date1, date2] : [date2, date1];
          const filters: DocumentFilters = { date_from: dateFrom, date_to: dateTo };
          const result = filterDocuments(documents, filters);

          // Every returned document must have created_at within range
          for (const doc of result) {
            expect(doc.created_at >= dateFrom).toBe(true);
            expect(doc.created_at <= dateTo).toBe(true);
          }

          // Every document within range must be in the result
          const expectedDocs = documents.filter(d =>
            d.created_at >= dateFrom && d.created_at <= dateTo
          );
          expect(result).toEqual(expectedDocs);
        }
      ),
      { numRuns: 100 }
    );
  });
});
