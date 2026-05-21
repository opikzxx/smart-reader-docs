'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { documentKeys } from '@/lib/documents/query-keys';
import type { Document, ReviewSubmission } from '@/lib/documents/types';

interface SubmitReviewParams {
  id: number;
  data: ReviewSubmission;
}

async function submitReview({ id, data }: SubmitReviewParams): Promise<Document> {
  const response = await fetch(`/api/documents/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Failed to submit review' })) as { error?: string };
    throw new Error(body.error || 'Failed to submit review');
  }

  return response.json();
}

export function useSubmitReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: submitReview,
    retry: false,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: documentKeys.detail(variables.id) });
    },
  });
}
