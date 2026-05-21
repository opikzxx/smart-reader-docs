'use client';

import { useQuery } from '@tanstack/react-query';
import { documentKeys } from '@/lib/documents/query-keys';
import type { Document } from '@/lib/documents/types';

/**
 * Fetches a single document by ID from the API.
 */
async function fetchDocument(id: number): Promise<Document> {
  const response = await fetch(`/api/documents/${id}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch document: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Hook to fetch a single document with its extracted items.
 * Uses TanStack Query with 30s staleTime and 3 retries.
 *
 * @param id - The document ID to fetch
 */
export function useDocument(id: number) {
  return useQuery({
    queryKey: documentKeys.detail(id),
    queryFn: () => fetchDocument(id),
    staleTime: 30 * 1000,
    retry: 3,
  });
}
