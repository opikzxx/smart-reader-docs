import type { Document, DocumentFilters } from './types';

/**
 * Filters a list of documents based on the provided filter criteria.
 * All filters are optional — if no filters are provided, all documents are returned.
 *
 * - statuses: document must have a status in the provided set (subset match)
 * - vendor_name: case-insensitive partial match on document's vendor_name
 * - date_from / date_to: document's created_at must fall within the range (inclusive)
 */
export function filterDocuments(documents: Document[], filters: DocumentFilters): Document[] {
  return documents.filter(doc => {
    // Status filter: if statuses array is provided and non-empty, doc.status must be in it
    if (filters.statuses && filters.statuses.length > 0) {
      if (!filters.statuses.includes(doc.status)) return false;
    }

    // Vendor name filter: case-insensitive partial match on doc.vendor_name
    if (filters.vendor_name && filters.vendor_name.trim().length > 0) {
      if (!doc.vendor_name) return false;
      if (!doc.vendor_name.toLowerCase().includes(filters.vendor_name.toLowerCase())) return false;
    }

    // Date range filter: created_at within bounds (ISO 8601 strings sort correctly)
    if (filters.date_from) {
      if (doc.created_at < filters.date_from) return false;
    }
    if (filters.date_to) {
      if (doc.created_at > filters.date_to) return false;
    }

    return true;
  });
}
