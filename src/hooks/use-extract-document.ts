'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { documentKeys } from '@/lib/documents/query-keys';
import type { Document } from '@/lib/documents/types';

/**
 * Triggers AI extraction on a document by POSTing to /api/documents/[id]/extract.
 * Invalidates the document detail query on success.
 * No auto-retry on failure (TanStack Query mutation default).
 */
export function useExtractDocument() {
  const queryClient = useQueryClient();

  return useMutation<Document, Error, number>({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/documents/${id}/extract`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(
          errorData?.error || `Extraction failed with status ${response.status}`
        );
      }

      return response.json();
    },
    retry: false,
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: documentKeys.detail(id) });
    },
  });
}
