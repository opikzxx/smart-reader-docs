import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { generateCsvContent } from '../lib/csv-export';
import type { Document } from '../lib/documents/types';

/**
 * Property tests for CSV generation with semicolon delimiter.
 */

const SEPARATOR = ';';

function parseSemicolonCsvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < csv.length) {
    const char = csv[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < csv.length && csv[i + 1] === '"') {
          currentField += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        currentField += char;
        i++;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
      } else if (char === SEPARATOR) {
        currentRow.push(currentField);
        currentField = '';
        i++;
      } else if (char === '\n') {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
        i++;
      } else if (char === '\r') {
        i++;
      } else {
        currentField += char;
        i++;
      }
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

function documentArbitrary(): fc.Arbitrary<Document> {
  return fc.record({
    id: fc.integer({ min: 1, max: 10000 }),
    file_name: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
    r2_key: fc.constant('documents/1/file.pdf'),
    status: fc.constantFrom('uploaded', 'processing', 'review', 'ready') as fc.Arbitrary<Document['status']>,
    user_id: fc.constant('user-1'),
    vendor_name: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
    date: fc.option(fc.constant('2024-01-15'), { nil: null }),
    total: fc.option(fc.double({ min: 0, max: 999999, noNaN: true }), { nil: null }),
    currency: fc.option(fc.constantFrom('USD', 'IDR', 'EUR'), { nil: null }),
    confidence_scores: fc.constant(null),
    created_at: fc.constant('2024-01-15T10:00:00Z'),
    updated_at: fc.constant('2024-01-15T10:00:00Z'),
    items: fc.constant(undefined) as any,
  });
}

describe('Feature: smart-document-reader, Property 8: CSV generation round-trip', () => {
  it('CSV header row is always present after sep hint', () => {
    fc.assert(
      fc.property(fc.array(documentArbitrary(), { minLength: 0, maxLength: 5 }), (docs) => {
        const csv = generateCsvContent(docs);
        const lines = csv.split('\n');
        // First line is sep hint, second is header
        expect(lines[0]).toBe('sep=;');
        const headerRow = parseSemicolonCsvRows(lines[1]);
        expect(headerRow[0][0]).toBe('No');
        expect(headerRow[0]).toHaveLength(9);
      })
    );
  });

  it('generates correct number of data rows', () => {
    fc.assert(
      fc.property(fc.array(documentArbitrary(), { minLength: 0, maxLength: 10 }), (docs) => {
        const csv = generateCsvContent(docs);
        const lines = csv.split('\n');
        // sep hint + header + data rows
        expect(lines.length).toBe(2 + docs.length);
      })
    );
  });

  it('fields with special characters (semicolons, quotes, newlines) are properly escaped and recoverable', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
        (vendorName) => {
          const doc: Document = {
            id: 1,
            file_name: 'test.pdf',
            r2_key: 'documents/1/test.pdf',
            status: 'ready',
            user_id: 'user-1',
            vendor_name: vendorName,
            date: '2024-01-15',
            total: 100,
            currency: 'USD',
            confidence_scores: null,
            created_at: '2024-01-15T10:00:00Z',
            updated_at: '2024-01-15T10:00:00Z',
          };

          const csv = generateCsvContent([doc]);
          const rows = parseSemicolonCsvRows(csv);
          // Data row is at index 2 (after sep hint and header)
          const dataRow = rows[2];
          // Vendor name is at index 2 in the row
          expect(dataRow[2]).toBe(vendorName);
        }
      )
    );
  });
});
