import { describe, it, expect } from 'vitest';
import { escapeCsvField, generateCsvContent } from '@/lib/csv-export';
import type { Document } from '@/lib/documents/types';

function makeDocument(overrides: Partial<Document> = {}): Document {
  return {
    id: 1,
    file_name: 'invoice.pdf',
    r2_key: 'documents/1/invoice.pdf',
    status: 'ready',
    user_id: 'user-1',
    vendor_name: 'Acme Corp',
    date: '2024-01-15',
    total: 1250.0,
    currency: 'USD',
    confidence_scores: null,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    ...overrides,
  };
}

describe('escapeCsvField', () => {
  it('returns field unchanged when no special characters', () => {
    expect(escapeCsvField('hello')).toBe('hello');
  });

  it('wraps field in double quotes when it contains a semicolon', () => {
    expect(escapeCsvField('Store; Inc.')).toBe('"Store; Inc."');
  });

  it('wraps field in double quotes when it contains a double quote and doubles the quote', () => {
    expect(escapeCsvField('Say "hello"')).toBe('"Say ""hello"""');
  });

  it('wraps field in double quotes when it contains a newline', () => {
    expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"');
  });

  it('wraps field in double quotes when it contains a carriage return', () => {
    expect(escapeCsvField('line1\rline2')).toBe('"line1\rline2"');
  });

  it('returns empty string unchanged', () => {
    expect(escapeCsvField('')).toBe('');
  });
});

describe('generateCsvContent', () => {
  it('generates sep hint and header row', () => {
    const result = generateCsvContent([]);
    const lines = result.split('\n');
    expect(lines[0]).toBe('sep=;');
    expect(lines[1]).toBe('No;File Name;Vendor Name;Document Date;Total Amount;Currency;Status;Items Count;Uploaded At');
  });

  it('generates a data row for a document', () => {
    const doc = makeDocument();
    const result = generateCsvContent([doc]);
    const lines = result.split('\n');
    expect(lines).toHaveLength(3); // sep + header + 1 row
    expect(lines[2]).toContain('1;invoice.pdf;Acme Corp;2024-01-15;1250.00;USD;Ready;0;');
  });

  it('handles null fields with dash', () => {
    const doc = makeDocument({
      vendor_name: null,
      date: null,
      total: null,
      currency: null,
    });
    const result = generateCsvContent([doc]);
    const lines = result.split('\n');
    expect(lines[2]).toContain(';-;-;-;-;');
  });

  it('counts items correctly', () => {
    const doc = makeDocument({
      items: [
        { description: 'Item 1', quantity: 1, unit_price: 10, amount: 10 },
        { description: 'Item 2', quantity: 2, unit_price: 20, amount: 40 },
      ],
    });
    const result = generateCsvContent([doc]);
    const lines = result.split('\n');
    expect(lines[2]).toContain(';2;');
  });

  it('handles multiple documents with correct numbering', () => {
    const docs = [
      makeDocument({ id: 1, file_name: 'doc1.pdf' }),
      makeDocument({ id: 2, file_name: 'doc2.pdf' }),
    ];
    const result = generateCsvContent(docs);
    const lines = result.split('\n');
    expect(lines).toHaveLength(4); // sep + header + 2 rows
    expect(lines[2]).toMatch(/^1;/);
    expect(lines[3]).toMatch(/^2;/);
  });

  it('capitalizes status', () => {
    const doc = makeDocument({ status: 'review' });
    const result = generateCsvContent([doc]);
    expect(result).toContain(';Review;');
  });
});
