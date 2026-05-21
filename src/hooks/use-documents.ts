'use client';

import { useQuery } from '@tanstack/react-query';
import { documentKeys } from '@/lib/documents/query-keys';
import type { Document, DocumentFilters } from '@/lib/documents/types';

interface DocumentsResponse {
  documents: Document[];
}

async function fetchDocuments(filters: DocumentFilters): Promise<Document[]> {
  const params = new URLSearchParams();

  if (filters.statuses && filters.statuses.length > 0) {
    params.set('statuses', filters.statuses.join(','));
  }

  if (filters.vendor_name) {
    params.set('vendor_name', filters.vendor_name);
  }

  if (filters.date_from) {
    params.set('date_from', filters.date_from);
  }

  if (filters.date_to) {
    params.set('date_to', filters.date_to);
  }

  const queryString = params.toString();
  const url = queryString ? `/api/documents?${queryString}` : '/api/documents';

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch documents');
  }

  const data: DocumentsResponse = await response.json();
  return data.documents;
}

export function useDocuments(filters: DocumentFilters = {}) {
  return useQuery({
    queryKey: documentKeys.list(filters),
    queryFn: () => fetchDocuments(filters),
    staleTime: 30 * 1000,
    retry: 3,
  });
}
